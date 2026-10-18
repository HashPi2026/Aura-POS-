import { Router, Request, Response } from 'express';
import { db } from '../db/database';

const router = Router();

// GET /api/business
router.get('/', (req: Request, res: Response) => {
  const business = db.getBusiness();
  res.json({ success: true, business });
});

// PUT /api/business
router.put('/', (req: Request, res: Response) => {
  const updated = db.updateBusiness(req.body);
  res.json({ success: true, business: updated });
});

// GET /api/business/staff
router.get('/staff', (req: Request, res: Response) => {
  const staff = db.getStaff().map(({ pin, ...rest }) => rest);
  res.json({ success: true, staff });
});

export default router;
