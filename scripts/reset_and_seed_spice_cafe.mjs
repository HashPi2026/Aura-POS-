import pg from 'pg';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const { Client } = pg;
const connectionString = 'postgresql://postgres.hwdxpvmypxnpfiamcmvs:FJm9J64qEHKOL8TA@aws-0-ap-south-1.pooler.supabase.com:5432/postgres';

function hashPassword(password) {
  // SHA-256 with salt or standard digest
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('Connecting to Supabase PostgreSQL database...');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected! Starting full database reset for Spice Cafe...\n');

  // 1. Clean existing records in proper dependency order
  console.log('Cleaning existing rows from all tables...');
  await client.query(`
    TRUNCATE TABLE 
      audit_logs,
      inventory_movements,
      purchase_order_items,
      purchase_orders,
      expenses,
      suppliers,
      kitchen_tickets,
      payments,
      sale_items,
      sales,
      order_items,
      orders,
      product_modifiers,
      products,
      memberships,
      locations,
      users,
      businesses
    CASCADE;
  `);
  console.log('All tables truncated successfully.');

  // 2. Insert Business: Spice Cafe
  const businessId = '11111111-1111-1111-1111-111111111111';
  console.log('Inserting Business: Spice Cafe...');
  await client.query(`
    ALTER TABLE businesses
    ADD COLUMN IF NOT EXISTS address text,
    ADD COLUMN IF NOT EXISTS phone text,
    ADD COLUMN IF NOT EXISTS tax_identifier text;
  `);
  await client.query(`
    INSERT INTO businesses (id, name, code, business_type, is_active, timezone, currency, address, phone, tax_identifier)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
  `, [
    businessId,
    'Spice Cafe',
    'SPICE-CAFE-01',
    'CAFE',
    true,
    'Asia/Kolkata',
    'INR',
    '100ft Road, Indiranagar, Bengaluru, Karnataka',
    '+91 80 2520 8900',
    '29AABCS1234F1Z8',
  ]);

  // 3. Insert Location
  const locationId = '33333333-3333-3333-3333-333333333333';
  await client.query(`
    INSERT INTO locations (id, business_id, name)
    VALUES ($1, $2, $3);
  `, [
    locationId,
    businessId,
    'Spice Cafe - Indiranagar Flagship',
  ]);

  // 4. Insert Users & Memberships
  // Owner: Rahul Patel, spicecafe@gmail.com, Spicecafe@123
  const ownerId = '22222222-2222-2222-2222-222222222222';
  const cashierId = '22222222-2222-2222-2222-222222222223';
  const waiterId = '22222222-2222-2222-2222-222222222224';
  const kitchenId = '22222222-2222-2222-2222-222222222225';

  const pwdHash = hashPassword('Spicecafe@123');

  console.log('Inserting Users & Memberships...');
  const users = [
    { id: ownerId, email: 'spicecafe@gmail.com', name: 'Rahul Patel', role: 'owner', username: 'rahul' },
    { id: cashierId, email: 'priya.cashier@spicecafe.com', name: 'Priya Cashier', role: 'cashier', username: 'priya' },
    { id: waiterId, email: 'vikram.waiter@spicecafe.com', name: 'Vikram Server', role: 'waiter', username: 'vikram' },
    { id: kitchenId, email: 'chef.anand@spicecafe.com', name: 'Chef Anand', role: 'kitchen', username: 'anand' },
  ];

  for (const u of users) {
    await client.query(`
      INSERT INTO users (id, email, password_hash, full_name, is_active)
      VALUES ($1, $2, $3, $4, true);
    `, [u.id, u.email, pwdHash, u.name]);

    await client.query(`
      INSERT INTO memberships (id, business_id, user_id, role, username, is_active, created_by)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, true, $5);
    `, [businessId, u.id, u.role, u.username, ownerId]);
  }

  // 5. Insert Suppliers
  console.log('Inserting Suppliers...');
  const supplierId = '44444444-4444-4444-4444-444444444441';
  await client.query(`
    INSERT INTO suppliers (id, business_id, name, phone, email, address)
    VALUES ($1, $2, $3, $4, $5, $6);
  `, [
    supplierId,
    businessId,
    'Malabar Spice Estate & Roasters',
    '+91 98450 12345',
    'orders@malabarspice.com',
    'Plantation Road, Coorg, Karnataka',
  ]);

  // 6. Insert Expenses
  console.log('Inserting Expenses...');
  await client.query(`
    INSERT INTO expenses (id, business_id, location_id, category, amount_paise, payment_method, supplier_id, expense_date, note, created_by)
    VALUES 
      (gen_random_uuid(), $1, $2, 'MILK_AND_BEANS', 1500000, 'UPI', $3, CURRENT_DATE - 2, 'Monthly organic coffee beans & spices supply', $4),
      (gen_random_uuid(), $1, $2, 'RENT', 4500000, 'NET_BANKING', NULL, CURRENT_DATE - 15, 'Indiranagar store monthly lease', $4),
      (gen_random_uuid(), $1, $2, 'UTILITIES', 850000, 'UPI', NULL, CURRENT_DATE - 5, 'Electricity and high-speed fiber internet', $4);
  `, [businessId, locationId, supplierId, ownerId]);

  // 7. Insert Menu Products
  console.log('Inserting Products catalog...');
  const products = [
    { id: '55555555-5555-5555-5555-555555550001', name: 'Cardamom Spiced Cappuccino', price: 190, sku: 'SPC-001', hsn: '996331' },
    { id: '55555555-5555-5555-5555-555555550002', name: 'Spice Signature Masala Chai Pot', price: 130, sku: 'SPC-002', hsn: '996331' },
    { id: '55555555-5555-5555-5555-555555550003', name: 'Saffron Pistachio Cold Brew', price: 240, sku: 'SPC-003', hsn: '996331' },
    { id: '55555555-5555-5555-5555-555555550004', name: 'Cinnamon Dark Roast Latte', price: 210, sku: 'SPC-004', hsn: '996331' },
    { id: '55555555-5555-5555-5555-555555550005', name: 'Spiced Butter Croissant', price: 150, sku: 'SPC-005', hsn: '996331' },
    { id: '55555555-5555-5555-5555-555555550006', name: 'Peri Peri Paneer Sourdough Toast', price: 270, sku: 'SPC-006', hsn: '996331' },
    { id: '55555555-5555-5555-5555-555555550007', name: 'Masala Chai Tres Leches Slice', price: 220, sku: 'SPC-007', hsn: '996331' },
    { id: '55555555-5555-5555-5555-555555550008', name: 'Ginger Lemon Mint Fizz', price: 140, sku: 'SPC-008', hsn: '996331' },
  ];

  for (const p of products) {
    await client.query(`
      INSERT INTO products (
        id, business_id, name, sku, price_paise, cost_paise, tax_rate_bp,
        hsn_sac_code, track_stock, low_stock_level, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, 10, true);
    `, [
      p.id,
      businessId,
      p.name,
      p.sku,
      p.price * 100,
      Math.round(p.price * 40),
      500, // 5% GST
      p.hsn,
    ]);
  }

  // 8. Insert Orders, Sales, Sale Items & Payments
  console.log('Inserting Sales transactions, items, and payments...');
  const salesSeeds = [
    {
      saleId: '66666666-6666-6666-6666-666666660001',
      orderId: '77777777-7777-7777-7777-777777770001',
      invoiceNo: 'SPC-2026-1001',
      orderType: 'DINE_IN',
      table: 'Table 1',
      cashier: 'Rahul Patel',
      paymentMethod: 'UPI',
      ref: 'UPI88921045',
      time: '2026-10-17T09:30:00Z',
      items: [
        { prod: products[0], qty: 2 }, // Cardamom Cappuccino x2
        { prod: products[4], qty: 2 }, // Spiced Croissant x2
      ],
    },
    {
      saleId: '66666666-6666-6666-6666-666666660002',
      orderId: '77777777-7777-7777-7777-777777770002',
      invoiceNo: 'SPC-2026-1002',
      orderType: 'DINE_IN',
      table: 'Patio P2',
      cashier: 'Priya Cashier',
      paymentMethod: 'CARD',
      ref: 'CARD-AUTH-9041',
      time: '2026-10-17T10:15:00Z',
      items: [
        { prod: products[2], qty: 1 }, // Saffron Cold Brew
        { prod: products[5], qty: 1 }, // Peri Peri Toast
      ],
    },
    {
      saleId: '66666666-6666-6666-6666-666666660003',
      orderId: '77777777-7777-7777-7777-777777770003',
      invoiceNo: 'SPC-2026-1003',
      orderType: 'TAKEAWAY',
      table: null,
      cashier: 'Rahul Patel',
      paymentMethod: 'CASH',
      ref: null,
      time: '2026-10-17T10:45:00Z',
      items: [
        { prod: products[1], qty: 1 }, // Masala Chai Pot
        { prod: products[6], qty: 1 }, // Tres Leches
      ],
    },
    {
      saleId: '66666666-6666-6666-6666-666666660004',
      orderId: '77777777-7777-7777-7777-777777770004',
      invoiceNo: 'SPC-2026-1004',
      orderType: 'DINE_IN',
      table: 'Table 4 (Booth)',
      cashier: 'Priya Cashier',
      paymentMethod: 'UPI',
      ref: 'UPI90123847',
      time: '2026-10-17T11:05:00Z',
      items: [
        { prod: products[3], qty: 2 }, // Cinnamon Latte x2
        { prod: products[5], qty: 2 }, // Peri Peri Toast x2
        { prod: products[7], qty: 2 }, // Ginger Fizz x2
      ],
    },
  ];

  for (const s of salesSeeds) {
    const subtotal = s.items.reduce((acc, it) => acc + it.prod.price * it.qty, 0);
    const tax = Math.round(subtotal * 0.05 * 100) / 100;
    const cgst = Math.round(tax / 2 * 100) / 100;
    const sgst = tax - cgst;
    const rawTotal = subtotal + tax;
    const total = Math.round(rawTotal);
    const roundOff = Math.round((total - rawTotal) * 100) / 100;

    const subtotalPaise = Math.round(subtotal * 100);
    const taxPaise = Math.round(tax * 100);
    const cgstPaise = Math.round(cgst * 100);
    const sgstPaise = Math.round(sgst * 100);
    const roundOffPaise = Math.round(roundOff * 100);
    const totalPaise = Math.round(total * 100);

    // 1. Order
    await client.query(`
      INSERT INTO orders (id, business_id, location_id, order_type, status, opened_by, client_created_at)
      VALUES ($1, $2, $3, $4, 'BILLED', $5, $6);
    `, [s.orderId, businessId, locationId, s.orderType, ownerId, s.time]);

    // 2. Sale
    const snapshot = {
      invoice_no: s.invoiceNo,
      cashier_name: s.cashier,
      business_name: 'Spice Cafe',
      order_type: s.orderType,
      table_name: s.table,
      items: s.items.map((it) => ({
        name: it.prod.name,
        price: it.prod.price,
        quantity: it.qty,
        total: it.prod.price * it.qty,
      })),
      payment_method: s.paymentMethod,
    };

    await client.query(`
      INSERT INTO sales (
        id, business_id, location_id, order_id, invoice_no, order_type,
        subtotal_paise, discount_paise, tax_paise, cgst_paise, sgst_paise,
        round_off_paise, total_paise, status, cashier_id, client_created_at, receipt_snapshot
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9, $10, $11, $12, 'PAID', $13, $14, $15);
    `, [
      s.saleId,
      businessId,
      locationId,
      s.orderId,
      s.invoiceNo,
      s.orderType,
      subtotalPaise,
      taxPaise,
      cgstPaise,
      sgstPaise,
      roundOffPaise,
      totalPaise,
      ownerId,
      s.time,
      JSON.stringify(snapshot),
    ]);

    // 3. Sale Items
    for (const it of s.items) {
      const lineSubtotal = it.prod.price * it.qty;
      const lineTax = Math.round(lineSubtotal * 0.05 * 100) / 100;
      await client.query(`
        INSERT INTO sale_items (
          id, sale_id, product_id, name_snapshot, hsn_sac_code, quantity,
          unit_price_paise, modifiers, tax_rate_bp, line_subtotal_paise, tax_paise, total_paise
        )
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, '[]'::jsonb, 500, $7, $8, $9);
      `, [
        s.saleId,
        it.prod.id,
        it.prod.name,
        it.prod.hsn,
        it.qty,
        it.prod.price * 100,
        lineSubtotal * 100,
        Math.round(lineTax * 100),
        Math.round((lineSubtotal + lineTax) * 100),
      ]);
    }

    // 4. Payment
    await client.query(`
      INSERT INTO payments (
        id, sale_id, method, amount_paise, reference, recorded_by
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5);
    `, [
      s.saleId,
      s.paymentMethod,
      totalPaise,
      s.ref || 'CASH_REGISTER',
      ownerId,
    ]);

    // 5. Kitchen Ticket for DINE_IN
    if (s.orderType === 'DINE_IN') {
      const kotItems = s.items.map((it) => ({
        name: it.prod.name,
        quantity: it.qty,
        notes: 'Spice Chef Special',
      }));

      await client.query(`
        INSERT INTO kitchen_tickets (
          id, business_id, order_id, ticket_no, table_name, order_type, items, status, created_by, client_created_at
        )
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'SERVED', $7, $8);
      `, [
        businessId,
        s.orderId,
        `KOT-#${s.invoiceNo.slice(-4)}`,
        s.table || 'Table',
        s.orderType,
        JSON.stringify(kotItems),
        ownerId,
        s.time,
      ]);
    }
  }

  // 9. Add one active/preparing KOT
  console.log('Inserting live Kitchen Tickets...');
  await client.query(`
    INSERT INTO kitchen_tickets (
      id, business_id, order_id, ticket_no, table_name, order_type, items, status, created_by, client_created_at
    )
    VALUES (gen_random_uuid(), $1, $2, 'KOT-#1005', 'Table 2', 'DINE_IN', $3, 'PREPARING', $4, NOW());
  `, [
    businessId,
    salesSeeds[0].orderId,
    JSON.stringify([
      { name: 'Cardamom Spiced Cappuccino', quantity: 2, notes: 'Oat milk, extra cardamom sprinkle' },
      { name: 'Spiced Butter Croissant', quantity: 1, notes: 'Warmed up crisp' }
    ]),
    ownerId,
  ]);

  console.log('\n--- VERIFICATION STATS ---');
  const countSales = await client.query('SELECT count(*) FROM sales;');
  const countProducts = await client.query('SELECT count(*) FROM products;');
  const countUsers = await client.query('SELECT count(*) FROM users;');
  const countExpenses = await client.query('SELECT count(*) FROM expenses;');
  const countKots = await client.query('SELECT count(*) FROM kitchen_tickets;');

  console.log(`Businesses: 1 (Spice Cafe)`);
  console.log(`Users: ${countUsers.rows[0].count} (Owner: Rahul Patel <spicecafe@gmail.com>)`);
  console.log(`Products: ${countProducts.rows[0].count}`);
  console.log(`Sales: ${countSales.rows[0].count}`);
  console.log(`Expenses: ${countExpenses.rows[0].count}`);
  console.log(`Kitchen Tickets: ${countKots.rows[0].count}`);

  const sampleSales = await client.query(`
    SELECT invoice_no, (total_paise / 100.0)::numeric(10,2) as total_inr, status, order_type, client_created_at
    FROM sales
    ORDER BY client_created_at DESC;
  `);
  console.log('\nSample sales in Supabase public.sales:');
  console.table(sampleSales.rows);

  await client.end();
  console.log('\nSupabase reset and seed complete!');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
