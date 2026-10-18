import test from 'node:test';
import assert from 'node:assert/strict';

test('REST API Backend and Offline-First Sync Test Suite', async (t) => {
  // Dynamically import backend app
  const { backendApp } = await import('../backend/server.ts');
  const { db } = await import('../backend/db/database.ts');

  // Start an ephemeral listener on dynamic port
  const server = await new Promise((resolve) => {
    const s = backendApp.listen(0, '127.0.0.1', () => resolve(s));
  });

  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  t.after(() => {
    server.close();
  });

  await t.test('1. GET /api/health returns ONLINE and database connected', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ONLINE');
    assert.equal(data.database, 'CONNECTED');
    assert.equal(data.syncReady, true);
  });

  await t.test('2. POST /api/auth/pin-verify validates staff PINs', async () => {
    // Test Barista Ramesh PIN: 1234
    const res = await fetch(`${baseUrl}/auth/pin-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '1234' }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.member.role, 'cashier');
    assert.equal(data.member.fullName, 'Barista Ramesh');

    // Test Cafe Owner PIN: 1111
    const ownerRes = await fetch(`${baseUrl}/auth/pin-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '1111' }),
    });
    assert.equal(ownerRes.status, 200);
    const ownerData = await ownerRes.json();
    assert.equal(ownerData.success, true);
    assert.equal(ownerData.member.role, 'owner');
  });

  await t.test('3. GET /api/products returns Aura Cafe menu items', async () => {
    const res = await fetch(`${baseUrl}/products`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.products.length >= 10);
    assert.ok(data.products.some((p) => p.name.includes('Cappuccino')));
    assert.ok(data.products.some((p) => p.name.includes('Croissant')));
  });

  await t.test('4. POST /api/sales/sync receives offline sale and persists to database', async () => {
    const testSale = {
      id: `test_sale_${Date.now()}_${Math.random()}`,
      receiptNumber: `AUR-CF-TEST-${Date.now()}`,
      timestamp: Date.now(),
      cashierName: 'Barista Ramesh',
      counterName: 'Espresso Bar 1',
      orderType: 'DINE_IN',
      tableName: 'Table 1',
      items: [
        { productId: 'prod_cappuccino', name: 'Artisanal Cappuccino', price: 180, quantity: 1 },
      ],
      itemCount: 1,
      subtotal: 180,
      cgst: 4.5,
      sgst: 4.5,
      totalGst: 9,
      roundOff: 0,
      totalAmount: 189,
      paymentMethod: 'CASH',
      amountTendered: 200,
      changeDue: 11,
      syncStatus: 'SAVED_OFFLINE',
    };

    const res = await fetch(`${baseUrl}/sales/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sale: testSale }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.synced, 1);
    assert.equal(data.duplicates, 0);

    // Verify stored in DB
    const allSales = db.getSales();
    const stored = allSales.find((s) => s.id === testSale.id);
    assert.ok(stored);
    assert.equal(stored.syncStatus, 'SYNCED');

    // Test Idempotency (Syncing the same sale again does NOT duplicate)
    const resDup = await fetch(`${baseUrl}/sales/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sale: testSale }),
    });
    const dupData = await resDup.json();
    assert.equal(dupData.success, true);
    assert.equal(dupData.duplicates, 1);
  });

  await t.test('5. GET /api/tables and GET /api/business work seamlessly', async () => {
    const tablesRes = await fetch(`${baseUrl}/tables`);
    assert.equal(tablesRes.status, 200);
    const tablesData = await tablesRes.json();
    assert.ok(tablesData.tables.length >= 6);

    const bizRes = await fetch(`${baseUrl}/business`);
    assert.equal(bizRes.status, 200);
    const bizData = await bizRes.json();
    assert.equal(bizData.business.name, 'Aura Cafe & Roastery');
  });
});
