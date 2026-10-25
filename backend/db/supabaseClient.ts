import pg from 'pg';
import { SaleRecord, db } from './database';

const { Pool } = pg;

// Supabase PostgreSQL Connection Strings
// POOLER_URL supports IPv4 and IPv6 universally (works on Render, Vercel, AWS, local dev)
export const POOLER_URL = 'postgresql://postgres.hwdxpvmypxnpfiamcmvs:FJm9J64qEHKOL8TA@aws-0-ap-south-1.pooler.supabase.com:5432/postgres';
export const DIRECT_URL = 'postgresql://postgres:FJm9J64qEHKOL8TA@db.hwdxpvmypxnpfiamcmvs.supabase.co:5432/postgres';

function getValidDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL || '';
  if (envUrl && !envUrl.includes('YuhAKoqD4SlrjR8o')) {
    return envUrl;
  }
  // Default to POOLER_URL for maximum compatibility across cloud hosts like Render
  return POOLER_URL;
}

const connectionString = getValidDatabaseUrl();

let pool: pg.Pool | null = null;

try {
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  pool.on('error', (err) => {
    console.warn('[Supabase Pool Warning]', err.message);
  });
} catch (err) {
  console.error('Failed to initialize Supabase pool:', err);
}

export function getPool(): pg.Pool | null {
  return pool;
}

export function formatSaleId(id: string, receiptNum?: string): string {
  if (id && id.startsWith('KWI-SAL-')) {
    return id;
  }
  const digits = (receiptNum || id || '').replace(/[^0-9]/g, '').slice(-4).padStart(4, '0') || '0001';
  return `KWI-SAL-${digits}`;
}

export async function pushSaleToSupabase(s: SaleRecord): Promise<boolean> {
  if (!pool) return false;

  const currentBiz = db.getBusiness();
  const businessId = (s as any).businessId || currentBiz?.id || 'KWI-BUS_001';
  const saleId = formatSaleId(s.id, s.receiptNumber);
  const clientTimestamp = new Date(s.timestamp || Date.now());

  const subtotalPaise = Math.round((s.subtotal || 0) * 100);
  const cgstPaise = Math.round((s.cgst || (s.totalGst ? s.totalGst / 2 : 0)) * 100);
  const sgstPaise = Math.round((s.sgst || (s.totalGst ? s.totalGst / 2 : 0)) * 100);
  const taxPaise = Math.round((s.totalGst || 0) * 100);
  const roundOffPaise = Math.round((s.roundOff || 0) * 100);
  const totalPaise = Math.round((s.totalAmount || 0) * 100);

  const snapshot = {
    receipt_number: s.receiptNumber,
    cashier_name: s.cashierName || 'Rahul Patel',
    counter_name: s.counterName || 'Counter 1',
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
      INSERT INTO businesses (id, name, code, business_type, is_active, timezone, currency, address, phone, tax_identifier)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING;
    `, [
      businessId,
      currentBiz?.name || 'Spice Cafe',
      businessId,
      'CAFE',
      true,
      'Asia/Kolkata',
      'INR',
      currentBiz?.address || 'Surat, Gujarat',
      currentBiz?.phone || '+91 80 2520 8900',
      currentBiz?.taxIdentifier || '29AABCS1234F1Z8',
    ]);

    // 2. Insert or update sale record
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
        receipt_snapshot = EXCLUDED.receipt_snapshot,
        updated_at = NOW();
    `, [
      saleId,
      businessId,
      s.receiptNumber,
      'DINE_IN',
      subtotalPaise,
      0,
      taxPaise,
      cgstPaise,
      sgstPaise,
      roundOffPaise,
      totalPaise,
      'COMPLETED',
      clientTimestamp,
      JSON.stringify(snapshot),
    ]);

    // 3. Insert line items
    if (Array.isArray(s.items)) {
      for (let i = 0; i < s.items.length; i++) {
        const item = s.items[i];
        const itemId = `${saleId}-ITEM-${String(i + 1).padStart(2, '0')}`;
        const itemTotalPaise = Math.round((item.total || item.price * item.quantity) * 100);
        const itemPricePaise = Math.round(item.price * 100);

        await pool.query(`
          INSERT INTO sale_items (
            id, sale_id, product_id, product_name, quantity, unit_price_paise, total_paise
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            quantity = EXCLUDED.quantity,
            total_paise = EXCLUDED.total_paise;
        `, [
          itemId,
          saleId,
          item.productId || `KWI-PRD-${String(i + 1).padStart(4, '0')}`,
          item.name,
          item.quantity,
          itemPricePaise,
          itemTotalPaise,
        ]).catch(() => {});
      }
    }

    return true;
  } catch (err: any) {
    console.error('Failed to push sale to Supabase:', err.message);
    return false;
  }
}
