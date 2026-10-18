import { Router, Request, Response } from 'express';
import { db, ProductItem } from '../db/database';

const router = Router();

// GET /api/products - Get all menu items
router.get('/', (req: Request, res: Response) => {
  const products = db.getProducts();
  const categories = Array.from(new Set(products.map((p) => p.category)));
  res.json({
    success: true,
    categories,
    products,
  });
});

// POST /api/products - Create or update item
router.post('/', (req: Request, res: Response) => {
  const item: ProductItem = req.body;
  if (!item.name || !item.price) {
    return res.status(400).json({ success: false, error: 'Product name and price required' });
  }

  const saved = db.addOrUpdateProduct({
    ...item,
    id: item.id || `prod_${Date.now()}`,
    available: item.available !== false,
  });

  res.json({ success: true, product: saved });
});

// DELETE /api/products/:id - Delete item
router.delete('/:id', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const ok = db.deleteProduct(id);
  if (ok) {
    res.json({ success: true, message: 'Product deleted' });
  } else {
    res.status(404).json({ success: false, error: 'Product not found' });
  }
});

export default router;
