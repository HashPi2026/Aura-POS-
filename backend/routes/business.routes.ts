import { Router, Request, Response } from 'express';
import { db } from '../db/database';

const router = Router();

// GET /api/business
router.get('/', (req: Request, res: Response) => {
  const business = db.getBusiness();
  res.json({ success: true, business });
});

// PUT /api/business
router.put('/', async (req: Request, res: Response) => {
  const updated = db.updateBusiness(req.body);

  // Synchronize to cloud Supabase if connected
  try {
    const { getPool } = await import('../db/supabaseClient.ts');
    const pool = getPool();
    if (pool) {
      await pool.query(`
        UPDATE businesses
        SET name = COALESCE($1, name),
            address = COALESCE($2, address),
            phone = COALESCE($3, phone),
            tax_identifier = COALESCE($4, tax_identifier)
        WHERE id = $5 OR name = $6;
      `, [
        updated.name,
        updated.address,
        updated.phone,
        updated.taxIdentifier,
        updated.id,
        'Spice Cafe',
      ]);
    }
  } catch (err) {
    console.warn('Notice: Could not sync business update to Supabase:', err);
  }

  res.json({ success: true, business: updated });
});

// GET /api/business/staff
router.get('/staff', (req: Request, res: Response) => {
  const staff = db.getStaff().map(({ pin, ...rest }) => rest);
  res.json({ success: true, staff });
});

export default router;
