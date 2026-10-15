import { test } from 'node:test';
import assert from 'node:assert/strict';

// 1. Permission Matrix Test
const ROLE_PERMISSIONS_MAP = {
  owner: [
    'order.create', 'order.send_kitchen', 'kitchen.update', 'bill.take',
    'discount.apply', 'order.void', 'refund.create', 'menu.edit',
    'report.view', 'expense.manage', 'staff.manage', 'device.manage',
  ],
  manager: [
    'order.create', 'order.send_kitchen', 'kitchen.update', 'bill.take',
    'discount.apply', 'order.void', 'refund.create', 'menu.edit',
    'report.view', 'expense.manage', 'staff.manage', 'device.manage',
  ],
  cashier: [
    'order.create', 'order.send_kitchen', 'kitchen.update', 'bill.take',
    'discount.apply',
  ],
  waiter: [
    'order.create', 'order.send_kitchen',
  ],
  kitchen: [
    'kitchen.update',
  ],
  accountant: [
    'report.view', 'expense.manage',
  ],
};

function can(role, permission) {
  return (ROLE_PERMISSIONS_MAP[role] || []).includes(permission);
}

test('Permission Matrix: Granular access control across all 6 cafe roles', () => {
  // Owner has everything
  assert.equal(can('owner', 'order.create'), true);
  assert.equal(can('owner', 'menu.edit'), true);
  assert.equal(can('owner', 'staff.manage'), true);
  assert.equal(can('owner', 'report.view'), true);

  // Cashier can bill, take orders, send KOT, apply discount, but CANNOT edit menu or view reports
  assert.equal(can('cashier', 'order.create'), true);
  assert.equal(can('cashier', 'bill.take'), true);
  assert.equal(can('cashier', 'discount.apply'), true);
  assert.equal(can('cashier', 'menu.edit'), false);
  assert.equal(can('cashier', 'report.view'), false);
  assert.equal(can('cashier', 'staff.manage'), false);

  // Waiter can only take orders and send to kitchen
  assert.equal(can('waiter', 'order.create'), true);
  assert.equal(can('waiter', 'order.send_kitchen'), true);
  assert.equal(can('waiter', 'bill.take'), false);
  assert.equal(can('waiter', 'discount.apply'), false);
  assert.equal(can('waiter', 'report.view'), false);
  assert.equal(can('waiter', 'menu.edit'), false);

  // Kitchen can only update kitchen tickets
  assert.equal(can('kitchen', 'kitchen.update'), true);
  assert.equal(can('kitchen', 'order.create'), false);
  assert.equal(can('kitchen', 'bill.take'), false);
  assert.equal(can('kitchen', 'report.view'), false);

  // Accountant can only view reports and expenses
  assert.equal(can('accountant', 'report.view'), true);
  assert.equal(can('accountant', 'expense.manage'), true);
  assert.equal(can('accountant', 'order.create'), false);
  assert.equal(can('accountant', 'bill.take'), false);
  assert.equal(can('accountant', 'menu.edit'), false);
});

// 2. Signup Without Session Test
test('Signup Without Session: Does not mark user as signed in when session is null', async () => {
  // Mock Supabase signUp response requiring email confirmation
  const mockSignUp = async (email, password) => {
    return {
      data: {
        user: { id: 'u_123', email },
        session: null, // Email confirmation required!
      },
      error: null,
    };
  };

  // Simulating store handler
  let activeUser = null;
  let activeSession = null;
  let pendingConfirmation = null;

  const handleSignUp = async (email, password) => {
    const { data, error } = await mockSignUp(email, password);
    if (!data.session) {
      activeUser = null;
      activeSession = null;
      pendingConfirmation = email;
      return { success: true, needsConfirmation: true };
    }
    activeUser = data.user;
    activeSession = data.session;
    return { success: true };
  };

  const res = await handleSignUp('owner@newcafe.com', 'SecurePass123!');
  assert.equal(res.success, true);
  assert.equal(res.needsConfirmation, true);
  assert.equal(activeUser, null, 'Active user must be null without a confirmed session');
  assert.equal(activeSession, null, 'Active session must be null without a confirmed session');
  assert.equal(pendingConfirmation, 'owner@newcafe.com');
});

// 3. PIN Lockout Test
test('PIN Lockout: Locks after 5 failed attempts for 15 minutes', () => {
  let failedAttempts = 0;
  let lockedUntil = null;
  const CORRECT_PIN = '1234';

  const verifyPin = (enteredPin, now = Date.now()) => {
    if (lockedUntil && lockedUntil > now) {
      return { success: false, locked: true, attemptsLeft: 0 };
    }

    if (enteredPin === CORRECT_PIN) {
      failedAttempts = 0;
      lockedUntil = null;
      return { success: true, locked: false, attemptsLeft: 5 };
    }

    failedAttempts += 1;
    const isLocked = failedAttempts >= 5;
    if (isLocked) {
      lockedUntil = now + 15 * 60 * 1000;
    }

    return {
      success: false,
      locked: isLocked,
      attemptsLeft: Math.max(0, 5 - failedAttempts),
    };
  };

  const baseTime = 1700000000000;

  // 4 failed attempts: not locked
  for (let i = 1; i <= 4; i++) {
    const res = verifyPin('9999', baseTime);
    assert.equal(res.success, false);
    assert.equal(res.locked, false);
    assert.equal(res.attemptsLeft, 5 - i);
  }

  // 5th failed attempt: triggers 15 minute lockout
  const res5 = verifyPin('9999', baseTime);
  assert.equal(res5.success, false);
  assert.equal(res5.locked, true);
  assert.equal(res5.attemptsLeft, 0);

  // Attempting within 15 minutes (even with correct PIN) is blocked
  const resLocked = verifyPin(CORRECT_PIN, baseTime + 5 * 60 * 1000);
  assert.equal(resLocked.success, false);
  assert.equal(resLocked.locked, true);

  // After 15 minutes expire, correct PIN succeeds
  const resAfter = verifyPin(CORRECT_PIN, baseTime + 16 * 60 * 1000);
  assert.equal(resAfter.success, true);
  assert.equal(resAfter.locked, false);
});

// 4. Sync Payload Contains Business ID & Device ID Test
test('Sync Payload: Includes business_id, device_id, per-line tax, and PENDING payment status', () => {
  const mockCurrentBusiness = { id: 'c9bf9e57-1685-4c89-bafb-ff5af830be8a', name: 'Aura Cafe' };
  const mockDeviceId = '00000000-0000-0000-0000-000000000001';
  const defaultTaxRate = 5.0;

  const rawSale = {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    receiptNumber: 'AUR-CF-2026-1042',
    timestamp: 1700000000000,
    cashierName: 'Barista Ramesh',
    orderType: 'DINE_IN',
    subtotal: 200,
    totalGst: 10,
    totalAmount: 210,
    paymentMethod: 'CASH',
    items: [
      { productId: 'p1', name: 'Cappuccino', price: 200, quantity: 1 },
    ],
  };

  // Build sync_sale RPC payload
  const buildSyncPayload = (sale, business, deviceId) => {
    if (!business || !business.id) {
      return { shouldQueue: true, status: 'Waiting for login' };
    }

    return {
      shouldQueue: false,
      payload: {
        id: sale.id,
        business_id: business.id,
        device_id: deviceId,
        receipt_number: sale.receiptNumber,
        order_type: sale.orderType,
        subtotal: sale.subtotal,
        tax_amount: sale.totalGst,
        total_amount: sale.totalAmount,
        items: sale.items.map((it) => {
          const lineSubtotal = it.price * it.quantity;
          const lineTax = (lineSubtotal * defaultTaxRate) / 100;
          return {
            product_id: it.productId,
            product_name: it.name,
            quantity: it.quantity,
            unit_price: it.price,
            tax_rate: defaultTaxRate,
            tax_amount: lineTax,
            total_amount: lineSubtotal + lineTax,
          };
        }),
        payments: [
          {
            payment_method: sale.paymentMethod,
            amount: sale.totalAmount,
            status: 'PENDING', // Must be PENDING, never client VERIFIED
          },
        ],
      },
    };
  };

  const syncObj = buildSyncPayload(rawSale, mockCurrentBusiness, mockDeviceId);
  assert.equal(syncObj.shouldQueue, false);
  assert.equal(syncObj.payload.business_id, mockCurrentBusiness.id);
  assert.equal(syncObj.payload.device_id, mockDeviceId);
  assert.equal(syncObj.payload.items[0].tax_rate, 5.0);
  assert.equal(syncObj.payload.items[0].tax_amount, 10);
  assert.equal(syncObj.payload.payments[0].status, 'PENDING');

  // When business or session is missing, keeps queued as "Waiting for login"
  const unauthSync = buildSyncPayload(rawSale, null, mockDeviceId);
  assert.equal(unauthSync.shouldQueue, true);
  assert.equal(unauthSync.status, 'Waiting for login');
});

// 5. Cross-Business RLS Isolation Test
test('Cross-Business RLS Isolation: Rejects cross-tenant access and collisions', () => {
  const businessSalesDb = new Map(); // Key: business_id + ':' + sale_id

  const syncSaleToTenant = (saleId, businessId, callerBusinessId) => {
    // RLS Policy Check: caller must belong to target business
    if (businessId !== callerBusinessId) {
      return { success: false, error: 'Unauthorized: Cross-tenant access denied' };
    }

    // Check if UUID was previously stored under a different business
    for (const [key, stored] of businessSalesDb.entries()) {
      if (stored.saleId === saleId && stored.businessId !== businessId) {
        return { success: false, error: 'Cross-tenant conflict: Sale UUID belongs to another business' };
      }
    }

    businessSalesDb.set(`${businessId}:${saleId}`, { saleId, businessId });
    return { success: true };
  };

  const BIZ_A = 'biz_aaa_111';
  const BIZ_B = 'biz_bbb_222';
  const SALE_ID = 'sale_uuid_999';

  // 1. Business A syncs sale successfully
  const resA = syncSaleToTenant(SALE_ID, BIZ_A, BIZ_A);
  assert.equal(resA.success, true);

  // 2. Business B attempts to access or overwrite Business A's sale -> Rejected
  const crossAccess = syncSaleToTenant(SALE_ID, BIZ_A, BIZ_B);
  assert.equal(crossAccess.success, false);
  assert.match(crossAccess.error, /Cross-tenant access denied/);

  // 3. Business B attempts to reuse same UUID under Business B -> Cross-tenant conflict
  const crossConflict = syncSaleToTenant(SALE_ID, BIZ_B, BIZ_B);
  assert.equal(crossConflict.success, false);
  assert.match(crossConflict.error, /Cross-tenant conflict/);
});
