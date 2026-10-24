import { Router, Request, Response } from 'express';
import { db, KotRecord } from '../db/database';

const router = Router();

// GET /api/kot - Get active kitchen order tickets for the business
router.get('/', (req: Request, res: Response) => {
  const reqBizId = (req.query.businessId as string) || (req.headers['x-business-id'] as string);
  let kots = db.getKots();
  if (reqBizId) {
    kots = kots.filter((k: any) => k.businessId === reqBizId || (!k.businessId && reqBizId === '11111111-1111-1111-1111-111111111111'));
  }
  res.json({ success: true, kots });
});

// POST /api/kot - Send new KOT to Kitchen/Barista
router.post('/', (req: Request, res: Response) => {
  const kotData: KotRecord = req.body;
  const currentBiz = db.getBusiness();
  const targetBizId = (kotData as any).businessId || req.headers['x-business-id'] || currentBiz.id || '11111111-1111-1111-1111-111111111111';

  const created = db.addKot({
    ...kotData,
    id: kotData.id || `kot_${Date.now()}`,
    timestamp: kotData.timestamp || Date.now(),
    status: kotData.status || 'PREPARING',
    ...({ businessId: targetBizId } as any),
  });
  res.json({ success: true, kot: created });
});

// PATCH /api/kot/:id - Update KOT status
router.patch('/:id', (req: Request, res: Response) => {
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ success: false, error: 'Status is required' });
  }
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const ok = db.updateKotStatus(id, status);
  res.json({ success: ok });
});

// DELETE /api/kot/:id - Delete ticket
router.delete('/:id', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const ok = db.deleteKot(id);
  res.json({ success: ok });
});

export default router;
