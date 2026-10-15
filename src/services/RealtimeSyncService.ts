import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { usePosStore } from '../store/usePosStore';
import { useAuthStore } from '../store/useAuthStore';
import { getUnsyncedSales } from '../db/indexedDb';
import { backgroundSyncService } from './BackgroundSyncService';

export type RealtimeConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'OFFLINE' | 'SYNCING';

export interface RealtimeSyncEvent {
  type: 'SYNC_STARTED' | 'SYNC_COMPLETED' | 'SALE_COMPLETED' | 'KOT_UPDATED' | 'TABLE_CHANGED' | 'CONNECTION_CHANGED';
  syncedCount?: number;
  pendingCount?: number;
  connectionState?: RealtimeConnectionState;
  timestamp: number;
}

type RealtimeSyncListener = (event: RealtimeSyncEvent) => void;

class RealtimeSyncServiceImpl {
  private channel: any = null;
  private isListening = false;
  private isSyncingPending = false;
  private pollTimer: any = null;
  private connectionState: RealtimeConnectionState = 'DISCONNECTED';
  private listeners: Set<RealtimeSyncListener> = new Set();
  private onlineHandler: (() => void) | null = null;
  private offlineHandler: (() => void) | null = null;

  // Adaptive polling intervals
  private readonly FAST_POLL_MS = 8000;   // When pending operations exist or recovering
  private readonly NORMAL_POLL_MS = 25000; // When idle and all synced

  /**
   * Starts the RealtimeSyncService.
   * Initializes WebSocket subscription (if Supabase configured), attaches network listeners,
   * probes network stability, and starts efficient polling strategy.
   */
  public start(): void {
    if (this.isListening) return;

    this.isListening = true;
    this.attachNetworkListeners();
    this.setupWebSocketChannel();
    this.startAdaptivePolling();

    // Immediate check on startup: if network is already stable, sync pending IndexedDB operations
    this.checkAndSyncOnConnection();
  }

  /**
   * Attaches browser online and offline event handlers to react instantly
   * to connection changes without waiting for polling intervals.
   */
  private attachNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    this.onlineHandler = () => {
      this.handleNetworkOnline();
    };

    this.offlineHandler = () => {
      this.handleNetworkOffline();
    };

    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
  }

  /**
   * Handles immediate browser online event:
   * Probes for real internet packet transit, and if stable, triggers immediate IndexedDB sync.
   */
  public async handleNetworkOnline(): Promise<void> {
    const isStable = await this.isNetworkStable();
    if (isStable) {
      this.setConnectionState('CONNECTED');
      usePosStore.getState().setOnline(true);
      await this.syncPendingIndexedDbOperations();
    }
  }

  /**
   * Handles browser offline event.
   */
  public handleNetworkOffline(): void {
    this.setConnectionState('OFFLINE');
    usePosStore.getState().setOnline(false);
  }

  /**
   * Actively tests end-to-end network connectivity.
   * Prevents false positives from captive portals or flapping connections.
   */
  public async isNetworkStable(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }

    if (typeof window === 'undefined') {
      return true;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const probeUrl = `${window.location.origin}/favicon.ico?_ping=${Date.now()}`;
      const response = await fetch(probeUrl, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok || response.status === 304 || response.status === 200;
    } catch (_) {
      return false;
    }
  }

  /**
   * Sets up the WebSocket channel for real-time Postgres CDC and peer broadcast.
   */
  private setupWebSocketChannel(): void {
    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      const getBusinessId = () => useAuthStore.getState().currentBusiness?.id;

      this.setConnectionState('CONNECTING');

      // Dedicated Supabase channel for Postgres CDC and peer broadcast events
      this.channel = supabase
        .channel('public:pos_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sales' },
          () => {
            const bizId = getBusinessId();
            usePosStore.getState().refreshSales();
            if (bizId) {
              usePosStore.getState().reloadBusinessData(bizId);
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'products' },
          () => {
            const bizId = getBusinessId();
            if (bizId) {
              usePosStore.getState().reloadBusinessData(bizId);
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tables' },
          () => {
            const bizId = getBusinessId();
            if (bizId) {
              usePosStore.getState().reloadBusinessData(bizId);
            }
          }
        )
        .on(
          'broadcast',
          { event: 'pos_event' },
          (payload) => {
            const { type, businessId } = payload.payload || {};
            const currentBizId = getBusinessId();
            if (businessId && currentBizId && businessId !== currentBizId) {
              return;
            }

            if (type === 'SALE_COMPLETED' || type === 'KOT_UPDATED' || type === 'TABLE_CHANGED' || type === 'SYNC_COMPLETED') {
              usePosStore.getState().refreshSales();
              usePosStore.getState().reloadBusinessData(currentBizId);
            }
          }
        )
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            this.setConnectionState('CONNECTED');
            // WebSocket connection established: sync pending IndexedDB operations immediately
            await this.syncPendingIndexedDbOperations();
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            this.setConnectionState('DISCONNECTED');
          }
        });
    } catch (err) {
      console.warn('Realtime subscription not available in this environment:', err);
    }
  }

  /**
   * Starts efficient adaptive polling.
   * If there are pending IndexedDB operations, polls at FAST_POLL_MS;
   * otherwise relaxes to NORMAL_POLL_MS to preserve battery and network bandwidth.
   */
  private startAdaptivePolling(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    const scheduleNext = (delayMs: number) => {
      this.pollTimer = setTimeout(async () => {
        if (!this.isListening) return;

        const hasPending = await this.checkAndSyncOnConnection();
        const nextDelay = hasPending ? this.FAST_POLL_MS : this.NORMAL_POLL_MS;
        scheduleNext(nextDelay);
      }, delayMs);
    };

    scheduleNext(this.FAST_POLL_MS);
  }

  /**
   * Probes connection and if stable, immediately executes synchronization
   * for any pending operations in IndexedDB.
   * Returns boolean indicating if pending operations exist.
   */
  private async checkAndSyncOnConnection(): Promise<boolean> {
    try {
      const isStable = await this.isNetworkStable();
      if (!isStable) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          this.setConnectionState('OFFLINE');
          usePosStore.getState().setOnline(false);
        }
        return false;
      }

      this.setConnectionState('CONNECTED');
      usePosStore.getState().setOnline(true);

      const pendingSales = await getUnsyncedSales();
      if (pendingSales.length > 0) {
        await this.syncPendingIndexedDbOperations();
        return true;
      }

      return false;
    } catch (_) {
      return false;
    }
  }

  /**
   * Identifies and syncs pending IndexedDB operations immediately upon detection of a stable network connection,
   * ensuring the UI reflects the synced state instantly without manual refreshes.
   */
  public async syncPendingIndexedDbOperations(): Promise<{ synced: number; failed: number; remaining: number }> {
    if (this.isSyncingPending) {
      const pending = await getUnsyncedSales();
      return { synced: 0, failed: 0, remaining: pending.length };
    }

    // 1. Verify network stability before initiating batch
    const isStable = await this.isNetworkStable();
    if (!isStable) {
      const pending = await getUnsyncedSales();
      return { synced: 0, failed: 0, remaining: pending.length };
    }

    // 2. Identify pending operations in local IndexedDB
    const pendingSales = await getUnsyncedSales();
    if (pendingSales.length === 0) {
      // Ensure UI store reflects 0 unsynced operations
      await usePosStore.getState().refreshSales();
      return { synced: 0, failed: 0, remaining: 0 };
    }

    this.isSyncingPending = true;
    this.setConnectionState('SYNCING');
    this.emitEvent({
      type: 'SYNC_STARTED',
      pendingCount: pendingSales.length,
      timestamp: Date.now(),
    });

    let synced = 0;
    let failed = 0;

    try {
      // 3. Delegate to BackgroundSyncService for atomic upload & sync status updates
      const result = await backgroundSyncService.triggerSync();
      synced = result.synced;
      failed = result.failed;
    } catch (err) {
      console.error('Error during RealtimeSyncService execution:', err);
      failed = pendingSales.length;
    } finally {
      this.isSyncingPending = false;
      this.setConnectionState('CONNECTED');

      // 4. CRITICAL: Instantly update the UI so it reflects the synced state without manual refreshes
      try {
        await usePosStore.getState().refreshSales();
        const bizId = useAuthStore.getState().currentBusiness?.id;
        if (bizId) {
          await usePosStore.getState().reloadBusinessData(bizId);
        }
      } catch (uiErr) {
        console.warn('Error refreshing UI state after sync:', uiErr);
      }

      const remaining = (await getUnsyncedSales()).length;

      // 5. Broadcast to any other open tabs/windows or POS terminals
      if (synced > 0) {
        this.broadcast('SALE_COMPLETED', { syncedCount: synced });
      }

      this.emitEvent({
        type: 'SYNC_COMPLETED',
        syncedCount: synced,
        pendingCount: remaining,
        timestamp: Date.now(),
      });

      return { synced, failed, remaining };
    }
  }

  /**
   * Broadcasts real-time events to all connected terminals/tabs
   */
  public broadcast(type: 'SALE_COMPLETED' | 'KOT_UPDATED' | 'TABLE_CHANGED' | 'SYNC_COMPLETED', payload?: any): void {
    if (this.channel && this.isListening) {
      const businessId = useAuthStore.getState().currentBusiness?.id;
      this.channel.send({
        type: 'broadcast',
        event: 'pos_event',
        payload: { type, businessId, ...payload },
      }).catch(() => {});
    }
  }

  /**
   * Subscribe to real-time sync service lifecycle events
   */
  public subscribe(listener: RealtimeSyncListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitEvent(event: RealtimeSyncEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.warn('RealtimeSyncService listener error:', err);
      }
    });
  }

  private setConnectionState(state: RealtimeConnectionState): void {
    this.connectionState = state;
    this.emitEvent({
      type: 'CONNECTION_CHANGED',
      connectionState: state,
      timestamp: Date.now(),
    });
  }

  public getConnectionState(): RealtimeConnectionState {
    return this.connectionState;
  }

  /**
   * Stops the RealtimeSyncService and cleans up resources.
   */
  public stop(): void {
    this.isListening = false;

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    if (typeof window !== 'undefined') {
      if (this.onlineHandler) {
        window.removeEventListener('online', this.onlineHandler);
        this.onlineHandler = null;
      }
      if (this.offlineHandler) {
        window.removeEventListener('offline', this.offlineHandler);
        this.offlineHandler = null;
      }
    }

    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }

    this.setConnectionState('DISCONNECTED');
  }
}

export const realtimeSyncService = new RealtimeSyncServiceImpl();
