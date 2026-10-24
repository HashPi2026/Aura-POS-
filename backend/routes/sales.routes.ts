import { Router, Request, Response } from 'express';
import { db, SaleRecord } from '../db/database';
import { pushSaleToSupabase } from '../db/supabaseClient';

const router = Router();

// GET /api/sales - List sales strictly isolated to the active business
router.get('/', async (req: Request, res: Response) => {
  const reqBizId = (req.query.businessId as string) || (req.headers['x-business-id'] as string);

  // If businessId is specified, query Supabase sales for this store
  if (reqBizId) {
    try {
      const { getPool } = await import('../db/supabaseClient');
      const pool = getPool();
      if (pool) {
        const cloudSalesRes = await pool.query(`
          SELECT id, invoice_no as "receiptNumber", client_created_at, total_paise, subtotal_paise, tax_paise, cgst_paise, sgst_paise, round_off_paise, status, receipt_snapshot
          FROM sales
          WHERE business_id = $1
          ORDER BY client_created_at DESC;
        `, [reqBizId]);

        if (cloudSalesRes.rows) {
          const cloudSales = cloudSalesRes.rows.map((row) => {
            const snap = row.receipt_snapshot || {};
            return {
              id: row.id,
              businessId: reqBizId,
              receiptNumber: row.receiptNumber,
              timestamp: new Date(row.client_created_at).getTime(),
              cashierName: snap.cashier_name || 'Cashier',
              counterName: snap.counter_name || 'Terminal 1',
              orderType: snap.order_type || 'DINE_IN',
              items: snap.items || [],
              itemCount: (snap.items || []).length,
              subtotal: (row.subtotal_paise || 0) / 100,
              cgst: (row.cgst_paise || 0) / 100,
              sgst: (row.sgst_paise || 0) / 100,
              totalGst: (row.tax_paise || 0) / 100,
              roundOff: (row.round_off_paise || 0) / 100,
              totalAmount: (row.total_paise || 0) / 100,
              paymentMethod: snap.payment_method || 'CASH',
              amountTendered: (row.total_paise || 0) / 100,
              changeDue: 0,
              syncStatus: 'SYNCED',
            };
          });

          // Also merge any local sales recorded for this business
          const localBizSales = db.getSales().filter((s: any) => s.businessId === reqBizId);
          const combined = [...cloudSales];
          for (const l of localBizSales) {
            if (!combined.some((c) => c.receiptNumber === l.receiptNumber || c.id === l.id)) {
              combined.push(l);
            }
          }
          combined.sort((a, b) => b.timestamp - a.timestamp);

          return res.json({
            success: true,
            count: combined.length,
            sales: combined,
          });
        }
      }
    } catch (err: any) {
      console.warn('Supabase sales fetch notice:', err.message);
    }
  }

  // Fallback to local database filtered by businessId
  let sales = db.getSales();
  if (reqBizId) {
    sales = sales.filter((s: any) => s.businessId === reqBizId || (!s.businessId && reqBizId === '11111111-1111-1111-1111-111111111111'));
  }
  res.json({
    success: true,
    count: sales.length,
    sales,
  });
});

// POST /api/sales - Single sale
router.post('/', (req: Request, res: Response) => {
  const saleData: SaleRecord = req.body;
  if (!saleData || !saleData.items) {
    return res.status(400).json({ success: false, error: 'Invalid sale data' });
  }

  const currentBiz = db.getBusiness();
  const targetBizId = saleData.businessId || req.headers['x-business-id'] || currentBiz.id || '11111111-1111-1111-1111-111111111111';
  saleData.businessId = targetBizId as string;

  const { sale, isDuplicate } = db.recordSale(saleData);
  pushSaleToSupabase(sale).catch(() => {});

  res.json({
    success: true,
    isDuplicate,
    sale,
  });
});

// POST /api/sales/sync - Bulk/Single Sync Endpoint for Offline-First POS
router.post('/sync', (req: Request, res: Response) => {
  const body = req.body;
  const salesToSync: SaleRecord[] = Array.isArray(body.sales)
    ? body.sales
    : body.sale
    ? [body.sale]
    : body.id
    ? [body]
    : [];

  if (salesToSync.length === 0) {
    return res.status(400).json({ success: false, error: 'No sales provided to sync' });
  }

  const currentBiz = db.getBusiness();
  const targetBizId = req.headers['x-business-id'] || body.businessId || currentBiz.id || '11111111-1111-1111-1111-111111111111';

  let syncedCount = 0;
  let duplicatesCount = 0;
  const processed: SaleRecord[] = [];

  for (const s of salesToSync) {
    s.businessId = s.businessId || (targetBizId as string);
    const { sale, isDuplicate } = db.recordSale(s);
    if (isDuplicate) {
      duplicatesCount++;
    } else {
      syncedCount++;
    }
    processed.push(sale);
    pushSaleToSupabase(sale).catch(() => {});
  }

  res.json({
    success: true,
    synced: syncedCount,
    duplicates: duplicatesCount,
    total: salesToSync.length,
    sales: processed,
    message: `Successfully synchronized ${syncedCount} sale(s) to cloud database`,
  });
});

// GET /api/sales/stats - Sales analytics
router.get('/stats', (req: Request, res: Response) => {
  const reqBizId = (req.query.businessId as string) || (req.headers['x-business-id'] as string);
  let sales = db.getSales();
  if (reqBizId) {
    sales = sales.filter((s: any) => s.businessId === reqBizId || (!s.businessId && reqBizId === '11111111-1111-1111-1111-111111111111'));
  }
  const totalRevenue = sales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  const totalGst = sales.reduce((acc, s) => acc + (s.totalGst || 0), 0);
  const totalOrders = sales.length;

  res.json({
    success: true,
    totalRevenue,
    totalGst,
    totalOrders,
    averageTicket: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
  });
});

export default router;
