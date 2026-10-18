import { Router, Request, Response } from 'express';
import { db, KotRecord } from '../db/database';

const router = Router();

// GET /api/kot - Get all active kitchen order tickets
router.get('/', (req: Request, res: Response) => {
  const kots = db.getKots();
  res.json({ success: true, kots });
});

// POST /api/kot - Send new KOT to Kitchen/Barista
router.post('/', (req: Request, res: Response) => {
  const kotData: KotRecord = req.body;
  const created = db.addKot({
    ...kotData,
    id: kotData.id || `kot_${Date.now()}`,
    timestamp: kotData.timestamp || Date.now(),
    status: kotData.status || 'PREPARING',
  });
  res.json({ success: true, kot: created });
});

// PATCH /api/kot/:id - Update KOT status
router.patch('/:id', (req: Request, res: Response) => {
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ success: false, error: 'Status is required' });
  }
  const ok = db.updateKotStatus(req.params.id, status);
  res.json({ success: ok });
});

// DELETE /api/kot/:id - Delete ticket
router.delete('/:id', (req: Request, res: Response) => {
  const ok = db.deleteKot(req.params.id);
  res.json({ success: ok });
});

export default router;
