import { Sale, getUnsyncedSales, updateSaleSyncStatus, getAllSales } from '../db/indexedDb';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { getDeviceId } from '../utils/device';
import { mockServer } from '../api/mockServer';

export type SyncState = 'IDLE' | 'CHECKING_CONNECTION' | 'SYNCING' | 'OFFLINE' | 'STABLE_ONLINE';

export interface SyncStatusInfo {
  state: SyncState;
  isOnline: boolean;
  isStable: boolean;
  pendingCount: number;
  lastSyncedAt: number | null;
  lastError: string | null;
}

type SyncListener = (status: SyncStatusInfo) => void;

class BackgroundSyncServiceImpl {
  private isProcessing = false;
  private intervalTimer: any = null;
  private listeners: Set<SyncListener> = new Set();

  private statusInfo: SyncStatusInfo = {
    state: 'IDLE',
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isStable: true,
    pendingCount: 0,
    lastSyncedAt: null,
    lastError: null,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  /**
   * Starts the background sync service worker.
   * Runs an immediate check and establishes periodic polling.
   */
  public start(pollIntervalMs: number = 25000): void {
    if (this.intervalTimer) return;

    this.checkNetworkAndSync();

    this.intervalTimer = setInterval(() => {
      this.checkNetworkAndSync();
    }, pollIntervalMs);

    // Register PWA Service Worker Background Sync if available
    this.registerServiceWorkerSync();
  }

  /**
   * Stops the background worker timer.
   */
  public stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  /**
   * Subscribe to sync state changes.
   */
  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.statusInfo);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener({ ...this.statusInfo });
      } catch (err) {
        console.error('Error in sync listener:', err);
      }
    }
  }

  /**
   * Actively tests real HTTP connectivity to ensure the device is not behind a captive portal.
   */
  public async isNetworkStable(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      // Probe a small static asset with no-cache to test end-to-end packet transit
      const probeUrl = `${window.location.origin}/favicon.ico?_ping=${Date.now()}`;
      const response = await fetch(probeUrl, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok || response.status === 304;
    } catch (_) {
      // If probe times out or fails, network is unstable/offline
      return false;
    }
  }

  private async handleNetworkChange(isOnline: boolean): Promise<void> {
    this.statusInfo.isOnline = isOnline;
    if (!isOnline) {
      this.statusInfo.isStable = false;
      this.statusInfo.state = 'OFFLINE';
      this.notify();
      return;
    }

    this.statusInfo.state = 'CHECKING_CONNECTION';
    this.notify();

    const isStable = await this.isNetworkStable();
    this.statusInfo.isStable = isStable;

    if (isStable) {
      this.statusInfo.state = 'STABLE_ONLINE';
      this.notify();
      this.triggerSync();
    } else {
      this.statusInfo.state = 'OFFLINE';
      this.notify();
    }
  }

  /**
   * Trigger an immediate sync run.
   */
  public async triggerSync(): Promise<{ synced: number; failed: number }> {
    if (this.isProcessing) {
      return { synced: 0, failed: 0 };
    }

    this.isProcessing = true;
    let syncedCount = 0;
    let failedCount = 0;

    try {
      // 1. Check network stability first
      const isStable = await this.isNetworkStable();
      this.statusInfo.isStable = isStable;
      if (!isStable) {
        this.statusInfo.state = 'OFFLINE';
        this.notify();
        return { synced: 0, failed: 0 };
      }

      // 2. Fetch pending sales from local IndexedDB
      const pendingSales = await getUnsyncedSales();
      this.statusInfo.pendingCount = pendingSales.length;

      if (pendingSales.length === 0) {
        this.statusInfo.state = 'IDLE';
        this.statusInfo.lastError = null;
        this.notify();
        return { synced: 0, failed: 0 };
      }

      this.statusInfo.state = 'SYNCING';
      this.notify();

      // Sort FIFO by timestamp (oldest first to preserve invoice order)
      const sortedQueue = [...pendingSales].sort((a, b) => a.timestamp - b.timestamp);

      for (const sale of sortedQueue) {
        // Mark as SYNCING in IndexedDB
        await updateSaleSyncStatus(sale.id, 'SYNCING');

        try {
          const syncResult = await this.uploadSale(sale);

          if (syncResult.success) {
            await updateSaleSyncStatus(sale.id, 'SYNCED');
            syncedCount += 1;
            this.statusInfo.lastSyncedAt = Date.now();
            this.statusInfo.lastError = null;
          } else {
            failedCount += 1;
            const errMsg = syncResult.error || 'Server rejected sale';
            const newStatus = errMsg === 'Waiting for login' ? 'SAVED_OFFLINE' : 'FAILED';
            await updateSaleSyncStatus(sale.id, newStatus, errMsg);
            this.statusInfo.lastError = errMsg;
            // Stop on rejection to preserve chronological batch ordering
            break;
          }
        } catch (err: any) {
          failedCount += 1;
          const errMsg = err.message || 'Network error during upload';
          await updateSaleSyncStatus(sale.id, 'FAILED', errMsg);
          this.statusInfo.lastError = errMsg;
          // Break on connection drop; backoff will retry on next cycle
          break;
        }
      }
    } finally {
      // Update pending count from DB
      const remaining = await getUnsyncedSales();
      this.statusInfo.pendingCount = remaining.length;
      this.statusInfo.state = this.statusInfo.isStable ? 'IDLE' : 'OFFLINE';
      this.isProcessing = false;
      this.notify();
    }

    return { synced: syncedCount, failed: failedCount };
  }

  /**
   * Uploads a single sale to the configured cloud backend (Supabase RPC).
   * Strictly enforces business_id, device_id, and per-line taxes.
   */
  private async uploadSale(sale: Sale): Promise<{ success: boolean; error?: string }> {
    const authState = useAuthStore.getState();
    const currentBusiness = authState.currentBusiness;
    const user = authState.user;

    // Requirement: When there is no authenticated session or no business,
    // do NOT fall back to mockServer and mark the sale synced. Keep the sale queued with status "Waiting for login".
    if (!user || !currentBusiness || !currentBusiness.id) {
      return {
        success: false,
        error: 'Waiting for login',
      };
    }

    if (isSupabaseConfigured()) {
      try {
        const deviceId = getDeviceId();
        const defaultTaxRate = 5.0; // Standard 5% Cafe GST

        const { data, error } = await supabase.rpc('sync_sale', {
          p_sale: {
            id: sale.id,
            business_id: currentBusiness.id,
            device_id: deviceId,
            receipt_number: sale.receiptNumber,
            order_type: sale.orderType || 'DINE_IN',
            table_name: sale.tableName || null,
            subtotal: sale.subtotal,
            tax_amount: sale.totalGst,
            round_off: sale.roundOff || 0,
            total_amount: sale.totalAmount,
            client_timestamp: new Date(sale.timestamp).toISOString(),
            cashier_name: sale.cashierName,
            items: sale.items.map((it) => {
              const lineSubtotal = Math.round(it.price * it.quantity * 100) / 100;
              const lineTax = Math.round(lineSubtotal * (defaultTaxRate / 100) * 100) / 100;
              return {
                product_id: it.productId,
                product_name: it.name,
                quantity: it.quantity,
                unit_price: it.price,
                tax_rate: defaultTaxRate,
                tax_amount: lineTax,
                discount_amount: 0,
                total_amount: lineSubtotal + lineTax,
              };
            }),
            payments: [
              {
                payment_method: sale.paymentMethod || 'CASH',
                amount: sale.totalAmount,
                tendered_amount: sale.amountTendered || sale.totalAmount,
                change_due: sale.changeDue || 0,
                reference_id: sale.upiRef || null,
                status: 'PENDING', // Requirement: Always store as PENDING, never client VERIFIED
              },
            ],
          },
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data && (data as any).success) {
          return { success: true };
        }
        return { success: false, error: (data as any)?.error || 'RPC validation failed' };
      } catch (err: any) {
        return { success: false, error: err.message || 'Network upload error' };
      }
    }

    return { success: false, error: 'Waiting for login' };
  }

  private async checkNetworkAndSync(): Promise<void> {
    const isStable = await this.isNetworkStable();
    this.statusInfo.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.statusInfo.isStable = isStable;

    if (isStable) {
      await this.triggerSync();
    } else {
      this.statusInfo.state = 'OFFLINE';
      this.notify();
    }
  }

  /**
   * Registers PWA Service Worker background sync if supported by browser.
   */
  private async registerServiceWorkerSync(): Promise<void> {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if ('sync' in registration) {
          await (registration as any).sync.register('sync-offline-sales');
        }
      } catch (_) {
        // Background sync API not supported or permission denied; periodic worker continues
      }
    }
  }

  public getStatus(): SyncStatusInfo {
    return { ...this.statusInfo };
  }
}

export const backgroundSyncService = new BackgroundSyncServiceImpl();
