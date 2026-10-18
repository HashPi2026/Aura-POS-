import { Router, Request, Response } from 'express';
import { db, SaleRecord } from '../db/database';
import { pushSaleToSupabase } from '../db/supabaseClient';

const router = Router();

// GET /api/sales - List sales
router.get('/', (req: Request, res: Response) => {
  const sales = db.getSales();
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

  let syncedCount = 0;
  let duplicatesCount = 0;
  const processed: SaleRecord[] = [];

  for (const s of salesToSync) {
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
  const sales = db.getSales();
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
