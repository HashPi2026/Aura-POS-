import { Router, Request, Response } from 'express';
import { db, TableItem } from '../db/database';

const router = Router();

// GET /api/tables
router.get('/', (req: Request, res: Response) => {
  const tables = db.getTables();
  res.json({
    success: true,
    tables,
  });
});

// PUT /api/tables/:id
router.put('/:id', (req: Request, res: Response) => {
  const tableData: TableItem = req.body;
  const updated = db.updateTable({
    ...tableData,
    id: req.params.id,
  });
  res.json({ success: true, table: updated });
});

// POST /api/tables/reset
router.post('/reset', (req: Request, res: Response) => {
  const tables = db.resetTables();
  res.json({ success: true, tables });
});

export default router;
