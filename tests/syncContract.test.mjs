import { test } from 'node:test';
import assert from 'node:assert/strict';

// Test simulated server-side idempotency contract matching sync_sale RPC behavior
class SyncEngine {
  constructor() {
    this.sales = new Map();
  }

  processSyncSale(payload) {
    if (!payload.id || !payload.business_id) {
      return { success: false, error: 'Missing required ID or business_id' };
    }

    const existing = this.sales.get(payload.id);
    if (existing) {
      // Conflicting business
      if (existing.business_id !== payload.business_id) {
        return { success: false, error: 'UUID collision across different business tenants' };
      }
      // Idempotent return: exactly the same acknowledgment without duplicate insert
      return {
        success: true,
        duplicate: true,
        sale_id: existing.id,
        receipt_number: existing.receipt_number,
        message: 'Sale already synchronized (idempotent)',
      };
    }

    // Persist
    this.sales.set(payload.id, { ...payload, synced_at: Date.now() });
    return {
      success: true,
      duplicate: false,
      sale_id: payload.id,
      receipt_number: payload.receipt_number,
      message: 'Sale persisted successfully',
    };
  }
}

test('Idempotency: Re-syncing existing sale returns duplicate: true without creating duplicates', () => {
  const engine = new SyncEngine();
  const salePayload = {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    business_id: 'c9bf9e57-1685-4c89-bafb-ff5af830be8a',
    receipt_number: 'AUR-CAFE-1042',
    total_amount: 462.00,
  };

  const res1 = engine.processSyncSale(salePayload);
  assert.equal(res1.success, true);
  assert.equal(res1.duplicate, false);

  // Retry same sale
  const res2 = engine.processSyncSale(salePayload);
  assert.equal(res2.success, true);
  assert.equal(res2.duplicate, true);
  assert.equal(engine.sales.size, 1);
});

test('Cross-tenant security: Reusing UUID across different businesses is rejected', () => {
  const engine = new SyncEngine();
  const salePayloadA = {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    business_id: 'business_aaa',
    receipt_number: 'AUR-001',
  };
  const salePayloadB = {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    business_id: 'business_bbb',
    receipt_number: 'AUR-002',
  };

  engine.processSyncSale(salePayloadA);
  const resB = engine.processSyncSale(salePayloadB);

  assert.equal(resB.success, false);
  assert.match(resB.error, /UUID collision across different business tenants/);
});
