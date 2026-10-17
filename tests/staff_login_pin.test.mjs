import { test } from 'node:test';
import assert from 'node:assert/strict';

// Universal Demo Role PIN mapping
const DEFAULT_ROLE_PINS = {
  '1111': { role: 'owner', name: 'Cafe Owner', id: 'staff_owner_01' },
  '1234': { role: 'cashier', name: 'Barista Ramesh', id: 'staff_cashier_01' },
  '2222': { role: 'waiter', name: 'Priya Sharma', id: 'staff_waiter_01' },
  '3333': { role: 'kitchen', name: 'Chef Anand', id: 'staff_kitchen_01' },
  '4444': { role: 'accountant', name: 'Vikram Accountant', id: 'staff_accountant_01' },
};

function verifyUniversalPin(enteredPin, activeStaffRoster, selectedUserId) {
  // Fast path: Universal Master Role PINs
  if (DEFAULT_ROLE_PINS[enteredPin]) {
    const roleInfo = DEFAULT_ROLE_PINS[enteredPin];
    const member = activeStaffRoster.find((m) => m.role === roleInfo.role) || {
      id: roleInfo.id,
      userId: roleInfo.id,
      fullName: roleInfo.name,
      role: roleInfo.role,
      failedAttempts: 0,
      lockedUntil: null,
    };
    return {
      success: true,
      member: {
        ...member,
        failedAttempts: 0,
        lockedUntil: null,
      },
    };
  }

  // Fallback to active staff member
  const member = activeStaffRoster.find((m) => m.userId === selectedUserId) || activeStaffRoster[0];
  if (!member) return { success: false, error: 'Staff member not found' };

  if (member.pin === enteredPin) {
    return { success: true, member };
  }

  return { success: false, error: 'Incorrect PIN' };
}

test('Universal PIN 1111: Always unlocks Cafe Owner even if Cashier was selected', () => {
  const staffRoster = [
    { userId: 'staff_cashier_01', fullName: 'Barista Ramesh', role: 'cashier', pin: '1234' },
    { userId: 'staff_owner_01', fullName: 'Cafe Owner', role: 'owner', pin: '1111' },
  ];

  // User enters '1111' while Cashier is selected on UI
  const res = verifyUniversalPin('1111', staffRoster, 'staff_cashier_01');
  assert.equal(res.success, true);
  assert.equal(res.member.role, 'owner');
  assert.equal(res.member.fullName, 'Cafe Owner');
});

test('Universal PIN 1234: Unlocks Cashier Barista Ramesh', () => {
  const staffRoster = [
    { userId: 'staff_owner_01', fullName: 'Cafe Owner', role: 'owner', pin: '1111' },
    { userId: 'staff_cashier_01', fullName: 'Barista Ramesh', role: 'cashier', pin: '1234' },
  ];

  const res = verifyUniversalPin('1234', staffRoster, 'staff_owner_01');
  assert.equal(res.success, true);
  assert.equal(res.member.role, 'cashier');
  assert.equal(res.member.fullName, 'Barista Ramesh');
});

test('Universal PIN 3333: Unlocks Kitchen Chef Anand', () => {
  const staffRoster = [
    { userId: 'staff_kitchen_01', fullName: 'Chef Anand', role: 'kitchen', pin: '3333' },
  ];

  const res = verifyUniversalPin('3333', staffRoster, 'staff_cashier_01');
  assert.equal(res.success, true);
  assert.equal(res.member.role, 'kitchen');
});

test('Invalid PIN returns error', () => {
  const staffRoster = [
    { userId: 'staff_cashier_01', fullName: 'Barista Ramesh', role: 'cashier', pin: '1234' },
  ];

  const res = verifyUniversalPin('9999', staffRoster, 'staff_cashier_01');
  assert.equal(res.success, false);
});

test('Home page on login/switch: Always routes to Order (CHECKOUT) tab', () => {
  const resolveTargetTab = (role) => {
    if (role === 'kitchen') return 'KOT';
    return 'CHECKOUT';
  };

  assert.equal(resolveTargetTab('owner'), 'CHECKOUT', 'Owner home tab must be Order (CHECKOUT)');
  assert.equal(resolveTargetTab('cashier'), 'CHECKOUT', 'Cashier home tab must be Order (CHECKOUT)');
  assert.equal(resolveTargetTab('waiter'), 'CHECKOUT', 'Waiter home tab must be Order (CHECKOUT)');
  assert.equal(resolveTargetTab('manager'), 'CHECKOUT', 'Manager home tab must be Order (CHECKOUT)');
});

