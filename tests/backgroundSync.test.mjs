import { test } from 'node:test';
import assert from 'node:assert/strict';

// Test implementation of the Background Sync Worker engine logic
class MockBackgroundSyncWorker {
  constructor() {
    this.isProcessing = false;
    this.isOnline = true;
    this.isStable = true;
    this.syncedIds = [];
    this.failedIds = [];
  }

  setNetworkState(isOnline, isStable) {
    this.isOnline = isOnline;
    this.isStable = isStable;
  }

  async runSync(queue, uploader) {
    if (this.isProcessing) return { synced: 0, failed: 0 };
    if (!this.isOnline || !this.isStable) return { synced: 0, failed: 0, reason: 'NETWORK_NOT_STABLE' };

    this.isProcessing = true;
    let synced = 0;
    let failed = 0;

    // Sort FIFO by timestamp
    const sorted = [...queue].sort((a, b) => a.timestamp - b.timestamp);

    for (const sale of sorted) {
      sale.status = 'SYNCING';
      try {
        const res = await uploader(sale);
        if (res.success) {
          sale.status = 'SYNCED';
          this.syncedIds.push(sale.id);
          synced++;
        } else {
          sale.status = 'FAILED';
          sale.error = res.error;
          this.failedIds.push(sale.id);
          failed++;
          break; // Stop to preserve sequential batch order
        }
      } catch (err) {
        sale.status = 'FAILED';
        sale.error = err.message;
        this.failedIds.push(sale.id);
        failed++;
        break;
      }
    }

    this.isProcessing = false;
    return { synced, failed };
  }
}

test('Background Worker: Skips sync when network is offline or unstable', async () => {
  const worker = new MockBackgroundSyncWorker();
  worker.setNetworkState(false, false);

  const queue = [{ id: 's1', timestamp: 100, status: 'SAVED_OFFLINE' }];
  const res = await worker.runSync(queue, async () => ({ success: true }));

  assert.equal(res.synced, 0);
  assert.equal(res.reason, 'NETWORK_NOT_STABLE');
  assert.equal(queue[0].status, 'SAVED_OFFLINE');
});

test('Background Worker: Processes queue in FIFO order when stable network is detected', async () => {
  const worker = new MockBackgroundSyncWorker();
  worker.setNetworkState(true, true);

  const queue = [
    { id: 's2', timestamp: 200, status: 'SAVED_OFFLINE' },
    { id: 's1', timestamp: 100, status: 'SAVED_OFFLINE' },
    { id: 's3', timestamp: 300, status: 'SAVED_OFFLINE' },
  ];

  const processedOrder = [];
  const res = await worker.runSync(queue, async (sale) => {
    processedOrder.push(sale.id);
    return { success: true };
  });

  assert.equal(res.synced, 3);
  assert.deepEqual(processedOrder, ['s1', 's2', 's3']); // Sorted FIFO
  assert.equal(queue.every((s) => s.status === 'SYNCED'), true);
});

test('Background Worker: Halts on failure to prevent out-of-order execution', async () => {
  const worker = new MockBackgroundSyncWorker();
  worker.setNetworkState(true, true);

  const queue = [
    { id: 's1', timestamp: 100, status: 'SAVED_OFFLINE' },
    { id: 's2', timestamp: 200, status: 'SAVED_OFFLINE' },
    { id: 's3', timestamp: 300, status: 'SAVED_OFFLINE' },
  ];

  const res = await worker.runSync(queue, async (sale) => {
    if (sale.id === 's2') {
      return { success: false, error: 'HTTP 503 Service Unavailable' };
    }
    return { success: true };
  });

  assert.equal(res.synced, 1);
  assert.equal(res.failed, 1);
  assert.equal(queue[0].status, 'SYNCED');
  assert.equal(queue[1].status, 'FAILED');
  assert.equal(queue[2].status, 'SAVED_OFFLINE'); // s3 not processed yet, preserved in queue
});
