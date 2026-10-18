import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    service: 'Aura POS REST Backend',
    version: '1.0.0',
    database: 'CONNECTED',
    timestamp: new Date().toISOString(),
    syncReady: true,
  });
});

export default router;
