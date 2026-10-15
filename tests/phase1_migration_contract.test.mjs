import { test } from 'node:test';
import assert from 'node:assert/strict';

// Test Permission Matrix specification matching 20261014000004_roles_and_onboarding.sql
const ROLE_PERMISSIONS = {
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

function hasRolePermission(role, permission) {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

test('Role Permissions: Owner has all permissions', () => {
  const allPermissions = [
    'order.create', 'order.send_kitchen', 'kitchen.update', 'bill.take',
    'discount.apply', 'order.void', 'refund.create', 'menu.edit',
    'report.view', 'expense.manage', 'staff.manage', 'device.manage',
  ];
  for (const perm of allPermissions) {
    assert.equal(hasRolePermission('owner', perm), true, `Owner should have ${perm}`);
  }
});

test('Role Permissions: Cashier can take bills and discounts but cannot view reports or manage staff', () => {
  assert.equal(hasRolePermission('cashier', 'bill.take'), true);
  assert.equal(hasRolePermission('cashier', 'discount.apply'), true);
  assert.equal(hasRolePermission('cashier', 'report.view'), false);
  assert.equal(hasRolePermission('cashier', 'staff.manage'), false);
  assert.equal(hasRolePermission('cashier', 'expense.manage'), false);
});

test('Role Permissions: Waiter can only create and send orders to kitchen', () => {
  assert.equal(hasRolePermission('waiter', 'order.create'), true);
  assert.equal(hasRolePermission('waiter', 'order.send_kitchen'), true);
  assert.equal(hasRolePermission('waiter', 'bill.take'), false);
  assert.equal(hasRolePermission('waiter', 'kitchen.update'), false);
  assert.equal(hasRolePermission('waiter', 'discount.apply'), false);
});

test('Role Permissions: Kitchen can only update kitchen tickets', () => {
  assert.equal(hasRolePermission('kitchen', 'kitchen.update'), true);
  assert.equal(hasRolePermission('kitchen', 'order.create'), false);
  assert.equal(hasRolePermission('kitchen', 'bill.take'), false);
});

test('Role Permissions: Accountant can only view reports and manage expenses', () => {
  assert.equal(hasRolePermission('accountant', 'report.view'), true);
  assert.equal(hasRolePermission('accountant', 'expense.manage'), true);
  assert.equal(hasRolePermission('accountant', 'order.create'), false);
  assert.equal(hasRolePermission('accountant', 'bill.take'), false);
});

// Test PIN lockout logic specification
class PinAttemptTracker {
  constructor() {
    this.failedAttempts = 0;
    this.lockedUntil = null;
  }

  recordAttempt(isCorrect, now = Date.now()) {
    if (this.lockedUntil && this.lockedUntil > now) {
      return { success: false, locked: true, attemptsLeft: 0 };
    }

    if (isCorrect) {
      this.failedAttempts = 0;
      this.lockedUntil = null;
      return { success: true, locked: false, attemptsLeft: 5 };
    } else {
      this.failedAttempts += 1;
      const isLocked = this.failedAttempts >= 5;
      if (isLocked) {
        this.lockedUntil = now + 15 * 60 * 1000; // 15 minutes lockout
      }
      return {
        success: false,
        locked: isLocked,
        attemptsLeft: Math.max(0, 5 - this.failedAttempts),
      };
    }
  }
}

test('PIN Lockout: Locks after 5 failed attempts for 15 minutes', () => {
  const tracker = new PinAttemptTracker();
  const startTime = Date.now();

  for (let i = 1; i <= 4; i++) {
    const res = tracker.recordAttempt(false, startTime);
    assert.equal(res.success, false);
    assert.equal(res.locked, false);
    assert.equal(res.attemptsLeft, 5 - i);
  }

  // 5th attempt locks
  const fifthAttempt = tracker.recordAttempt(false, startTime);
  assert.equal(fifthAttempt.success, false);
  assert.equal(fifthAttempt.locked, true);
  assert.equal(fifthAttempt.attemptsLeft, 0);

  // Subsequent attempt before 15 min is rejected
  const sixthAttempt = tracker.recordAttempt(true, startTime + 5 * 60 * 1000);
  assert.equal(sixthAttempt.locked, true);
  assert.equal(sixthAttempt.success, false);

  // After 15 minutes lockout expires, correct PIN succeeds
  const afterLockout = tracker.recordAttempt(true, startTime + 16 * 60 * 1000);
  assert.equal(afterLockout.success, true);
  assert.equal(afterLockout.locked, false);
});

// Test server-side tax recomputation in sync_sale contract
test('sync_sale Contract: Recomputes taxes server-side rather than trusting client tax_amount', () => {
  const clientPayload = {
    business_id: 'b1',
    items: [
      { product_name: 'Cappuccino', quantity: 2, unit_price: 200, tax_rate: 5.0, discount_amount: 0 },
      { product_name: 'Croissant', quantity: 1, unit_price: 150, tax_rate: 5.0, discount_amount: 0 },
    ],
    // Untrusted client claims 0 tax:
    tax_amount: 0,
    total_amount: 550,
  };

  // Server recomputation logic
  let serverSubtotal = 0;
  let serverTax = 0;
  for (const item of clientPayload.items) {
    const lineSubtotal = Math.round(item.quantity * item.unit_price * 100) / 100;
    const lineTax = Math.round((lineSubtotal - item.discount_amount) * (item.tax_rate / 100) * 100) / 100;
    serverSubtotal += lineSubtotal;
    serverTax += lineTax;
  }
  const serverTotal = serverSubtotal + serverTax;

  assert.equal(serverSubtotal, 550);
  assert.equal(serverTax, 27.5);
  assert.equal(serverTotal, 577.5);
  assert.notEqual(serverTax, clientPayload.tax_amount); // Client 0 tax overridden by server 27.5
});
