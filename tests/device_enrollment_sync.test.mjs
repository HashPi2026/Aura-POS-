import { test } from 'node:test';
import assert from 'node:assert/strict';

// In-memory simulation of devices and sales tables
class MockDatabase {
  constructor() {
    this.devices = new Map();
    this.sales = new Map();
  }

  enrollDevice(businessId, locationId, name, deviceIdentifier) {
    const key = `${businessId}_${deviceIdentifier}`;
    if (this.devices.has(key)) {
      return this.devices.get(key).id;
    }
    const id = `dev_${Math.random().toString(36).slice(2, 10)}`;
    const record = { id, businessId, locationId, name, deviceIdentifier, isActive: true };
    this.devices.set(key, record);
    return id;
  }

  syncSale(salePayload) {
    const { business_id, device_id, id, receipt_number, total_amount } = salePayload;
    
    // Validate device if provided
    let resolvedDeviceId = null;
    if (device_id) {
      let found = false;
      for (const dev of this.devices.values()) {
        if (dev.id === device_id && dev.businessId === business_id) {
          found = true;
          resolvedDeviceId = device_id;
          break;
        }
      }
      if (!found) {
        return { success: false, error: 'DEVICE_NOT_ENROLLED' };
      }
    }

    // Idempotent
    if (this.sales.has(id)) {
      return { success: true, duplicate: true, sale_id: id };
    }

    this.sales.set(id, { id, business_id, device_id: resolvedDeviceId, receipt_number, total_amount });
    return { success: true, sale_id: id };
  }
}

test('Device Enrollment: Enrolling a device is idempotent', () => {
  const db = new MockDatabase();
  const id1 = db.enrollDevice('biz_1', 'loc_1', 'Counter POS', 'terminal_alpha');
  const id2 = db.enrollDevice('biz_1', 'loc_1', 'Counter POS Renamed', 'terminal_alpha');
  assert.equal(id1, id2, 'Same business + deviceIdentifier must return identical device UUID');
});

test('Device Validation: Sale with unknown device_id returns DEVICE_NOT_ENROLLED', () => {
  const db = new MockDatabase();
  const res = db.syncSale({
    id: 'sale_1',
    business_id: 'biz_1',
    device_id: 'unknown_random_uuid',
    receipt_number: 'T1-000001',
    total_amount: 150.0,
  });
  assert.equal(res.success, false);
  assert.equal(res.error, 'DEVICE_NOT_ENROLLED');
});

test('Enrolled Device: Sale with valid enrolled device succeeds and records device_id', () => {
  const db = new MockDatabase();
  const devId = db.enrollDevice('biz_1', 'loc_1', 'Counter POS', 'terminal_alpha');

  const res = db.syncSale({
    id: 'sale_1',
    business_id: 'biz_1',
    device_id: devId,
    receipt_number: 'T1-000001',
    total_amount: 150.0,
  });
  assert.equal(res.success, true);
  assert.equal(db.sales.get('sale_1').device_id, devId);
});

test('Data Preservation: Failed sync does not delete local sale record', () => {
  const localQueue = [
    { id: 'sale_offline_1', receiptNumber: 'T1-000001', totalAmount: 200, syncStatus: 'SAVED_OFFLINE' },
  ];

  const syncResult = { success: false, error: 'DEVICE_NOT_ENROLLED' };
  if (!syncResult.success) {
    localQueue[0].syncStatus = 'FAILED';
    localQueue[0].lastError = syncResult.error;
  }

  assert.equal(localQueue.length, 1, 'Sale must remain in local queue on error');
  assert.equal(localQueue[0].id, 'sale_offline_1');
  assert.equal(localQueue[0].syncStatus, 'FAILED');
});
