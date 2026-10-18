import { Sale, getUnsyncedSales, updateSaleSyncStatus } from '../db/indexedDb';
import { restApi } from '../api/restClient';

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
  public start(pollIntervalMs: number = 10000): void {
    if (this.intervalTimer) return;

    this.checkNetworkAndSync();

    this.intervalTimer = setInterval(() => {
      this.checkNetworkAndSync();
    }, pollIntervalMs);

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
   * Actively tests real HTTP connectivity to the REST API backend.
   */
  public async isNetworkStable(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      // Probe backend /api/health
      const response = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (_) {
      // Fallback probe
      try {
        const probeUrl = `${window.location.origin}/favicon.ico?_ping=${Date.now()}`;
        const res = await fetch(probeUrl, { method: 'HEAD', cache: 'no-store' });
        return res.ok || res.status === 304;
      } catch {
        return false;
      }
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
   * Trigger an immediate sync run across all unsynced sales.
   */
  public async triggerSync(): Promise<{ synced: number; failed: number }> {
    if (this.isProcessing) {
      return { synced: 0, failed: 0 };
    }

    this.isProcessing = true;
    let syncedCount = 0;
    let failedCount = 0;

    try {
      // 1. Check network stability
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

      // Sort FIFO by timestamp (oldest first to preserve chronological invoicing)
      const sortedQueue = [...pendingSales].sort((a, b) => a.timestamp - b.timestamp);

      for (const sale of sortedQueue) {
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
            await updateSaleSyncStatus(sale.id, 'SAVED_OFFLINE', errMsg);
            this.statusInfo.lastError = errMsg;
            break;
          }
        } catch (err: any) {
          failedCount += 1;
          const errMsg = err.message || 'Network upload error';
          await updateSaleSyncStatus(sale.id, 'SAVED_OFFLINE', errMsg);
          this.statusInfo.lastError = errMsg;
          break;
        }
      }
    } finally {
      const remaining = await getUnsyncedSales();
      this.statusInfo.pendingCount = remaining.length;
      this.statusInfo.state = this.statusInfo.isStable ? 'IDLE' : 'OFFLINE';
      this.isProcessing = false;
      this.notify();
    }

    return { synced: syncedCount, failed: failedCount };
  }

  /**
   * Uploads a single sale to the REST API backend.
   */
  private async uploadSale(sale: Sale): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await restApi.sales.sync(sale);
      if (result && result.success) {
        return { success: true };
      }
      return { success: false, error: result?.error || 'REST backend sync failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'REST API network error' };
    }
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

  private async registerServiceWorkerSync(): Promise<void> {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if ('sync' in registration) {
          await (registration as any).sync.register('sync-offline-sales');
        }
      } catch (_) {}
    }
  }

  public getStatus(): SyncStatusInfo {
    return { ...this.statusInfo };
  }
}

export const backgroundSyncService = new BackgroundSyncServiceImpl();
