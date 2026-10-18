import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;
const connectionString = 'postgresql://postgres:FJm9J64qEHKOL8TA@db.hwdxpvmypxnpfiamcmvs.supabase.co:5432/postgres';

async function main() {
  console.log('Connecting to Supabase PostgreSQL database...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Successfully connected to Supabase PostgreSQL database!');

  // Business ID
  const businessId = '00000000-0000-0000-0000-000000000001';

  // 1. Ensure business exists
  console.log('Upserting Aura Cafe business profile...');
  await client.query(`
    INSERT INTO businesses (id, name, code, business_type, is_active, timezone, currency)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      updated_at = NOW();
  `, [
    businessId,
    'Aura Cafe & Roastery',
    'AURA-CAFE-01',
    'CAFE',
    true,
    'Asia/Kolkata',
    'INR',
  ]);
  console.log('Business record confirmed in Supabase.');

  // 2. Load sales from backend data
  const dbPath = path.resolve('backend/data/aura_pos_db.json');
  let salesData = [];
  if (fs.existsSync(dbPath)) {
    const raw = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    if (raw.sales) salesData = raw.sales;
  }

  // Ensure standard UUID format
  function getUuid(id, receiptNum) {
    if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return id;
    }
    const num = (receiptNum || '').replace(/[^0-9]/g, '').slice(-4).padStart(4, '0') || '1001';
    return `00000000-0000-0000-0000-00000000${num}`;
  }

  // Also include the 7 sales from the terminal screenshot if missing from JSON
  const targetReceipts = [
    { receipt: 'AUR-CF-2026-1001', amount: 231, subtotal: 220, tax: 11, count: 1, method: 'CASH', time: '2026-10-03T10:14:00Z' },
    { receipt: 'AUR-CF-2026-1002', amount: 693, subtotal: 660, tax: 33, count: 4, method: 'CARD', time: '2026-10-03T10:27:00Z' },
    { receipt: 'AUR-CF-2026-1003', amount: 242, subtotal: 230, tax: 11.5, count: 1, method: 'CASH', time: '2026-10-16T07:43:00Z' },
    { receipt: 'AUR-CF-2026-1004', amount: 441, subtotal: 420, tax: 21, count: 3, method: 'CASH', time: '2026-10-17T09:57:00Z' },
    { receipt: 'AUR-CF-2026-1005', amount: 242, subtotal: 230, tax: 11.5, count: 1, method: 'CASH', time: '2026-10-17T10:00:00Z' },
    { receipt: 'AUR-CF-2026-1006', amount: 189, subtotal: 180, tax: 9, count: 1, method: 'CASH', time: '2026-10-17T10:33:00Z' },
    { receipt: 'AUR-CF-2026-1007', amount: 189, subtotal: 180, tax: 9, count: 1, method: 'CASH', time: '2026-10-17T10:33:41Z' },
  ];

  for (const tr of targetReceipts) {
    if (!salesData.some((s) => s.receiptNumber === tr.receipt)) {
      salesData.push({
        id: getUuid(null, tr.receipt),
        receiptNumber: tr.receipt,
        subtotal: tr.subtotal,
        cgst: tr.tax / 2,
        sgst: tr.tax / 2,
        totalGst: tr.tax,
        roundOff: tr.amount - (tr.subtotal + tr.tax),
        totalAmount: tr.amount,
        orderType: 'DINE_IN',
        paymentMethod: tr.method,
        timestamp: new Date(tr.time).getTime(),
        cashierName: 'Barista Ramesh',
        itemCount: tr.count,
        items: [{ productId: 'cafe_1', name: 'Artisanal Cafe Special', price: tr.subtotal, quantity: tr.count }],
      });
    }
  }

  console.log(`Inserting ${salesData.length} sales into Supabase public.sales...`);

  for (const s of salesData) {
    const saleId = getUuid(s.id, s.receiptNumber);
    const clientTimestamp = new Date(s.timestamp || Date.now());

    const subtotalPaise = Math.round((s.subtotal || 0) * 100);
    const cgstPaise = Math.round((s.cgst || (s.totalGst ? s.totalGst / 2 : 0)) * 100);
    const sgstPaise = Math.round((s.sgst || (s.totalGst ? s.totalGst / 2 : 0)) * 100);
    const taxPaise = Math.round((s.totalGst || s.taxAmount || 0) * 100);
    const roundOffPaise = Math.round((s.roundOff || 0) * 100);
    const totalPaise = Math.round((s.totalAmount || 0) * 100);

    const snapshot = {
      receipt_number: s.receiptNumber,
      cashier_name: s.cashierName || 'Barista Ramesh',
      counter_name: s.counterName || 'Espresso Bar 1',
      items: s.items || [],
      payment_method: s.paymentMethod || 'CASH',
      totals: {
        subtotal: s.subtotal,
        tax: s.totalGst,
        total: s.totalAmount,
      },
    };

    // Insert sale
    await client.query(`
      INSERT INTO sales (
        id, business_id, invoice_no, order_type,
        subtotal_paise, discount_paise, tax_paise, cgst_paise, sgst_paise,
        round_off_paise, total_paise, status, client_created_at, receipt_snapshot
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO UPDATE SET
        invoice_no = EXCLUDED.invoice_no,
        total_paise = EXCLUDED.total_paise,
        status = EXCLUDED.status,
        receipt_snapshot = EXCLUDED.receipt_snapshot;
    `, [
      saleId,
      businessId,
      s.receiptNumber,
      s.orderType || 'DINE_IN',
      subtotalPaise,
      0,
      taxPaise,
      cgstPaise,
      sgstPaise,
      roundOffPaise,
      totalPaise,
      'PAID',
      clientTimestamp,
      JSON.stringify(snapshot),
    ]);

    // Insert payment
    const paymentId = `00000000-0000-0000-0001-00000000${(s.receiptNumber || '').replace(/[^0-9]/g, '').slice(-4).padStart(4, '0')}`;
    await client.query(`
      INSERT INTO payments (
        id, sale_id, method, amount_paise, reference
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        amount_paise = EXCLUDED.amount_paise;
    `, [
      paymentId,
      saleId,
      s.paymentMethod || 'CASH',
      totalPaise,
      s.upiRef || 'TERMINAL_TXN',
    ]);

    console.log(`Inserted sale: ${s.receiptNumber} (${saleId}) -> total: ₹${s.totalAmount}`);
  }

  // Verification count
  const countRes = await client.query('SELECT count(*) as total_sales FROM sales;');
  console.log(`\n========================================`);
  console.log(`SUCCESS! Total sales in Supabase public.sales: ${countRes.rows[0].total_sales}`);
  console.log(`========================================\n`);

  const rowsRes = await client.query(`
    SELECT invoice_no, (total_paise / 100.0)::numeric(10,2) as total_inr, status, client_created_at
    FROM sales
    ORDER BY client_created_at DESC;
  `);

  console.log('Live Rows now in your Supabase table:');
  console.table(rowsRes.rows);

  await client.end();
}

main().catch((err) => {
  console.error('Error inserting sales into Supabase:', err);
  process.exit(1);
});
