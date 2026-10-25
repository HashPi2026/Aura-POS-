import { Router, Request, Response } from 'express';
import { db, ProductItem } from '../db/database';
import { getPool } from '../db/supabaseClient';

const router = Router();

// Helper to generate next sequential Product ID (e.g. KWI-PRD-0001, KWI-PRD-0002)
async function getNextProductId(pool: any): Promise<string> {
  try {
    const res = await pool.query(`
      SELECT id FROM products 
      WHERE id LIKE 'KWI-PRD-%' 
      ORDER BY id DESC LIMIT 1
    `);
    if (res.rows && res.rows.length > 0) {
      const lastId = res.rows[0].id;
      const numMatch = lastId.match(/KWI-PRD-(\d+)/);
      if (numMatch) {
        const nextNum = parseInt(numMatch[1], 10) + 1;
        return `KWI-PRD-${String(nextNum).padStart(4, '0')}`;
      }
    }
  } catch (err: any) {
    console.warn('Notice querying next product id:', err.message);
  }

  // Fallback checking local db
  const local = db.getProducts();
  const maxLocal = local.reduce((max, p) => {
    const m = (p.id || '').match(/KWI-PRD-(\d+)/);
    return m ? Math.max(max, parseInt(m[1], 10)) : max;
  }, 0);
  return `KWI-PRD-${String(maxLocal + 1).padStart(4, '0')}`;
}

// GET /api/products - Get all menu items from Supabase with local fallback
router.get('/', async (req: Request, res: Response) => {
  const businessId = (req.query.businessId as string) || db.getBusiness()?.id || 'KWI-BUS_001';
  const pool = getPool();

  if (pool) {
    try {
      const result = await pool.query(`
        SELECT id, business_id, name, sku, price_paise, track_stock, low_stock_level, is_active, created_at
        FROM products
        WHERE (business_id = $1 OR business_id = 'KWI-BUS_001')
          AND is_deleted = false
        ORDER BY id ASC;
      `, [businessId]);

      if (result.rows && result.rows.length > 0) {
        const products = result.rows.map((row) => {
          const category = row.name.toLowerCase().includes('tea') || row.name.toLowerCase().includes('chai') || row.name.toLowerCase().includes('fizz')
            ? 'Tea & Refreshers'
            : row.name.toLowerCase().includes('croissant') || row.name.toLowerCase().includes('cake') || row.name.toLowerCase().includes('slice') || row.name.toLowerCase().includes('brownie')
            ? 'Bakery & Pastry'
            : row.name.toLowerCase().includes('toast') || row.name.toLowerCase().includes('sandwich') || row.name.toLowerCase().includes('panini')
            ? 'Cafe Bites'
            : 'Coffee & Espresso';

          return {
            id: row.id,
            name: row.name,
            category,
            price: Number(row.price_paise) / 100,
            unit: 'Cup',
            barcode: row.sku || row.id,
            stock: row.track_stock ? 50 : 99,
            isVeg: !row.name.toLowerCase().includes('chicken') && !row.name.toLowerCase().includes('egg'),
            available: row.is_active,
          };
        });

        // Sync fresh Supabase products into local JSON db
        products.forEach((p) => db.addOrUpdateProduct(p as any));

        const categories = Array.from(new Set(products.map((p) => p.category)));
        return res.json({
          success: true,
          categories,
          products,
          source: 'supabase',
        });
      }
    } catch (err: any) {
      console.warn('[Products API] Supabase query notice:', err.message);
    }
  }

  // Fallback to local DB
  const products = db.getProducts();
  const categories = Array.from(new Set(products.map((p) => p.category)));
  res.json({
    success: true,
    categories,
    products,
    source: 'local',
  });
});

// POST /api/products - Create or update item in Supabase and local DB
router.post('/', async (req: Request, res: Response) => {
  const item: ProductItem = req.body;
  if (!item.name || !item.price) {
    return res.status(400).json({ success: false, error: 'Product name and price required' });
  }

  const pool = getPool();
  let productId = item.id;

  if (!productId || !productId.startsWith('KWI-PRD-')) {
    productId = await getNextProductId(pool);
  }

  const currentBiz = db.getBusiness();
  const businessId = (req.body.businessId as string) || currentBiz?.id || 'KWI-BUS_001';
  const pricePaise = Math.round(Number(item.price) * 100);
  const sku = item.barcode || productId.replace('KWI-PRD-', 'SPC-');

  // 1. Sync to Supabase
  if (pool) {
    try {
      await pool.query(`
        INSERT INTO products (
          id, business_id, name, sku, price_paise, tax_rate_bp, hsn_sac_code, track_stock, low_stock_level, is_active, is_deleted, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, 500, '996331', true, 10, true, false, NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          sku = EXCLUDED.sku,
          price_paise = EXCLUDED.price_paise,
          is_active = true,
          is_deleted = false,
          updated_at = NOW();
      `, [
        productId,
        businessId,
        item.name.trim(),
        sku,
        pricePaise,
      ]);
      console.log(`[Supabase] Synced product "${item.name}" with ID ${productId}`);
    } catch (err: any) {
      console.warn('[Products API] Failed to push to Supabase:', err.message);
    }
  }

  // 2. Save in local database
  const saved = db.addOrUpdateProduct({
    ...item,
    id: productId,
    barcode: sku,
    available: item.available !== false,
  });

  res.json({ success: true, product: saved });
});

// DELETE /api/products/:id - Delete item from Supabase and local DB
router.delete('/:id', async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const pool = getPool();

  if (pool) {
    try {
      // Delete or soft-delete in Supabase
      await pool.query(`
        UPDATE products 
        SET is_deleted = true, is_active = false, updated_at = NOW()
        WHERE id = $1;
      `, [id]);
      await pool.query(`DELETE FROM products WHERE id = $1;`, [id]).catch(() => {});
      console.log(`[Supabase] Deleted product ID ${id}`);
    } catch (err: any) {
      console.warn('[Products API] Failed to delete from Supabase:', err.message);
    }
  }

  const ok = db.deleteProduct(id);
  res.json({ success: true, message: 'Product deleted', id });
});

export default router;
