import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Mock implementation of RealtimeSyncService engine for Node.js unit testing
 */
class MockRealtimeSyncServiceEngine {
  constructor() {
    this.isListening = false;
    this.isSyncing = false;
    this.isOnline = true;
    this.isStable = true;
    this.connectionState = 'DISCONNECTED';
    this.uiRefreshCallCount = 0;
    this.syncedSales = [];
  }

  setNetworkState(isOnline, isStable) {
    this.isOnline = isOnline;
    this.isStable = isStable;
  }

  async checkNetworkStability() {
    return this.isOnline && this.isStable;
  }

  /**
   * Identifies pending IndexedDB operations and syncs them immediately
   * upon detection of a stable network connection, ensuring UI reflects synced state instantly.
   */
  async syncPendingIndexedDbOperations(pendingQueue, uploader, uiRefreshCallback) {
    if (this.isSyncing) {
      return { synced: 0, pending: pendingQueue.length, reason: 'ALREADY_SYNCING' };
    }

    const stable = await this.checkNetworkStability();
    if (!stable) {
      this.connectionState = 'OFFLINE';
      return { synced: 0, pending: pendingQueue.length, reason: 'NETWORK_NOT_STABLE' };
    }

    this.connectionState = 'SYNCING';
    this.isSyncing = true;
    let synced = 0;

    try {
      const sorted = [...pendingQueue].sort((a, b) => a.timestamp - b.timestamp);
      for (const item of sorted) {
        if (item.syncStatus !== 'SYNCED') {
          const res = await uploader(item);
          if (res.success) {
            item.syncStatus = 'SYNCED';
            this.syncedSales.push(item.id);
            synced++;
          } else {
            item.syncStatus = 'FAILED';
            break;
          }
        }
      }
    } finally {
      this.isSyncing = false;
      this.connectionState = 'CONNECTED';
      // UI refresh is triggered instantly without manual refreshes
      if (uiRefreshCallback) {
        uiRefreshCallback();
        this.uiRefreshCallCount++;
      }
    }

    const remaining = pendingQueue.filter((s) => s.syncStatus !== 'SYNCED').length;
    return { synced, remaining };
  }

  /**
   * Calculates next polling interval dynamically:
   * Fast polling (8s) if operations are pending; relaxed polling (25s) when idle
   */
  getAdaptivePollingInterval(pendingCount) {
    const FAST_POLL_MS = 8000;
    const NORMAL_POLL_MS = 25000;
    return pendingCount > 0 ? FAST_POLL_MS : NORMAL_POLL_MS;
  }
}

test('RealtimeSyncService: Identifies and syncs pending IndexedDB operations immediately upon detection of a stable network connection', async () => {
  const engine = new MockRealtimeSyncServiceEngine();
  engine.setNetworkState(true, true);

  const pendingSales = [
    { id: 'sale-101', timestamp: 1000, syncStatus: 'SAVED_OFFLINE', total: 450 },
    { id: 'sale-102', timestamp: 2000, syncStatus: 'SAVED_OFFLINE', total: 320 },
  ];

  let refreshedUI = false;
  const result = await engine.syncPendingIndexedDbOperations(
    pendingSales,
    async () => ({ success: true }),
    () => { refreshedUI = true; }
  );

  assert.equal(result.synced, 2, 'Should immediately sync all pending items');
  assert.equal(result.remaining, 0, 'No pending operations should remain');
  assert.equal(refreshedUI, true, 'UI refresh should be called instantly without manual refresh');
  assert.equal(engine.uiRefreshCallCount, 1);
  assert.equal(pendingSales[0].syncStatus, 'SYNCED');
  assert.equal(pendingSales[1].syncStatus, 'SYNCED');
});

test('RealtimeSyncService: Skips sync when network is offline or unstable, preserving offline records', async () => {
  const engine = new MockRealtimeSyncServiceEngine();
  engine.setNetworkState(false, false);

  const pendingSales = [
    { id: 'sale-201', timestamp: 1000, syncStatus: 'SAVED_OFFLINE', total: 500 },
  ];

  let refreshedUI = false;
  const result = await engine.syncPendingIndexedDbOperations(
    pendingSales,
    async () => ({ success: true }),
    () => { refreshedUI = true; }
  );

  assert.equal(result.synced, 0);
  assert.equal(result.reason, 'NETWORK_NOT_STABLE');
  assert.equal(pendingSales[0].syncStatus, 'SAVED_OFFLINE', 'Record must not be modified or deleted');
  assert.equal(refreshedUI, false, 'No UI refresh when sync was skipped');
});

test('RealtimeSyncService: Uses adaptive polling interval based on pending queue depth', () => {
  const engine = new MockRealtimeSyncServiceEngine();

  const activeInterval = engine.getAdaptivePollingInterval(3);
  assert.equal(activeInterval, 8000, 'Should use fast 8s interval when pending operations exist');

  const idleInterval = engine.getAdaptivePollingInterval(0);
  assert.equal(idleInterval, 25000, 'Should use relaxed 25s interval when idle to save resources');
});

test('RealtimeSyncService: UI state reflects synced state immediately when network recovers', async () => {
  const engine = new MockRealtimeSyncServiceEngine();
  // Simulate starting offline
  engine.setNetworkState(false, false);

  const pendingSales = [
    { id: 'sale-301', timestamp: 1000, syncStatus: 'SAVED_OFFLINE', total: 150 },
  ];

  let uiState = { unsyncedCount: 1, isOnline: false };

  // Offline attempt
  await engine.syncPendingIndexedDbOperations(
    pendingSales,
    async () => ({ success: true }),
    () => {
      uiState = { unsyncedCount: pendingSales.filter(s => s.syncStatus !== 'SYNCED').length, isOnline: true };
    }
  );
  assert.equal(uiState.unsyncedCount, 1);

  // Network recovered and stable
  engine.setNetworkState(true, true);
  await engine.syncPendingIndexedDbOperations(
    pendingSales,
    async () => ({ success: true }),
    () => {
      uiState = { unsyncedCount: pendingSales.filter(s => s.syncStatus !== 'SYNCED').length, isOnline: true };
    }
  );

  assert.equal(uiState.isOnline, true, 'Online state should be true');
  assert.equal(uiState.unsyncedCount, 0, 'Unsynced count should instantly reflect 0');
});
