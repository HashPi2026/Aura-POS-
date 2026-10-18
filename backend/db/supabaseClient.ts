import pg from 'pg';
import { SaleRecord } from './database';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:FJm9J64qEHKOL8TA@db.hwdxpvmypxnpfiamcmvs.supabase.co:5432/postgres';

let pool: pg.Pool | null = null;

try {
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
  });
} catch (err) {
  console.warn('Could not initialize Supabase PG pool:', err);
}

function getUuid(id: string, receiptNum?: string): string {
  if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  const num = (receiptNum || '').replace(/[^0-9]/g, '').slice(-4).padStart(4, '0') || '1001';
  return `00000000-0000-0000-0000-00000000${num}`;
}

export async function pushSaleToSupabase(s: SaleRecord): Promise<boolean> {
  if (!pool) return false;

  const businessId = '11111111-1111-1111-1111-111111111111';
  const saleId = getUuid(s.id, s.receiptNumber);
  const clientTimestamp = new Date(s.timestamp || Date.now());

  const subtotalPaise = Math.round((s.subtotal || 0) * 100);
  const cgstPaise = Math.round((s.cgst || (s.totalGst ? s.totalGst / 2 : 0)) * 100);
  const sgstPaise = Math.round((s.sgst || (s.totalGst ? s.totalGst / 2 : 0)) * 100);
  const taxPaise = Math.round((s.totalGst || 0) * 100);
  const roundOffPaise = Math.round((s.roundOff || 0) * 100);
  const totalPaise = Math.round((s.totalAmount || 0) * 100);

  const snapshot = {
    receipt_number: s.receiptNumber,
    cashier_name: s.cashierName || 'Priya Cashier',
    counter_name: s.counterName || 'Espresso Bar 1',
    items: s.items || [],
    payment_method: s.paymentMethod || 'CASH',
    totals: {
      subtotal: s.subtotal,
      tax: s.totalGst,
      total: s.totalAmount,
    },
  };

  try {
    // 1. Ensure business exists
    await pool.query(`
      INSERT INTO businesses (id, name, code, business_type, is_active, timezone, currency)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING;
    `, [
      businessId,
      'Spice Cafe',
      'SPICE-CAFE-01',
      'CAFE',
      true,
      'Asia/Kolkata',
      'INR',
    ]);

    // 2. Insert sale
    await pool.query(`
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

    // 3. Insert payment
    const paymentId = `00000000-0000-0000-0001-00000000${(s.receiptNumber || '').replace(/[^0-9]/g, '').slice(-4).padStart(4, '0')}`;
    await pool.query(`
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

    console.log(`[Supabase Cloud Sync] Pushed sale ${s.receiptNumber} (${saleId}) to Supabase`);
    return true;
  } catch (err: any) {
    console.error(`[Supabase Cloud Sync Error] Could not push sale ${s.receiptNumber}:`, err.message);
    return false;
  }
}
