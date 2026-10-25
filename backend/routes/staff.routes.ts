import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { getPool } from '../db/supabaseClient';

const router = Router();

// Helper to get next sequential ID for users / memberships
async function getNextSeqId(pool: any, table: string, prefix: string, pad: number = 4): Promise<string> {
  try {
    const res = await pool.query(`
      SELECT id FROM ${table} 
      WHERE id LIKE '${prefix}%' 
      ORDER BY id DESC LIMIT 1
    `);
    if (res.rows && res.rows.length > 0) {
      const lastId = res.rows[0].id;
      const numMatch = lastId.match(/(\d+)$/);
      if (numMatch) {
        const nextNum = parseInt(numMatch[1], 10) + 1;
        return `${prefix}${String(nextNum).padStart(pad, '0')}`;
      }
    }
  } catch (err: any) {
    console.warn(`[Seq ID] Notice querying next ID for ${table}:`, err.message);
  }
  return `${prefix}${String(Date.now()).slice(-pad)}`;
}

// GET /api/staff - Fetch all employees of current business
router.get('/', async (req: Request, res: Response) => {
  const currentBiz = db.getBusiness();
  const businessId = (req.query.businessId as string) || currentBiz?.id || 'KWI-BUS_001';
  const pool = getPool();

  if (pool) {
    try {
      const result = await pool.query(`
        SELECT u.id as user_id, u.email, u.full_name, u.password_hash,
               m.id as membership_id, m.role, m.username, m.is_active, m.created_at
        FROM memberships m
        JOIN users u ON u.id = m.user_id
        WHERE m.business_id = $1 OR m.business_id = 'KWI-BUS_001'
        ORDER BY m.created_at ASC;
      `, [businessId]);

      if (result.rows && result.rows.length > 0) {
        const staff = result.rows.map((row) => ({
          id: row.membership_id,
          userId: row.user_id,
          fullName: row.full_name,
          email: row.email,
          role: row.role || 'cashier',
          username: row.username || row.email?.split('@')[0],
          isActive: row.is_active !== false,
          hasPassword: Boolean(row.password_hash),
          createdAt: row.created_at,
        }));

        return res.json({
          success: true,
          staff,
          source: 'supabase',
        });
      }
    } catch (err: any) {
      console.warn('[Staff API] Supabase query notice:', err.message);
    }
  }

  // Local fallback
  const localStaff = db.getStaff().map((s) => ({
    id: s.id,
    userId: s.userId,
    fullName: s.fullName,
    email: s.email,
    role: s.role,
    username: s.email?.split('@')[0],
    isActive: true,
    hasPassword: true,
  }));

  res.json({
    success: true,
    staff: localStaff,
    source: 'local',
  });
});

// POST /api/staff - Add new employee to Supabase and local DB
router.post('/', async (req: Request, res: Response) => {
  const { fullName, email, role, password, pin, businessId } = req.body;
  if (!fullName || !email) {
    return res.status(400).json({ success: false, error: 'Full name and email/login username are required' });
  }

  const currentBiz = db.getBusiness();
  const targetBizId = businessId || currentBiz?.id || 'KWI-BUS_001';
  const cleanEmail = email.trim().toLowerCase();
  const pool = getPool();

  let newUserId = `KWI-USR-${Date.now().toString().slice(-4)}`;
  let newMemId = `KWI-MEM-${Date.now().toString().slice(-4)}`;

  if (pool) {
    try {
      newUserId = await getNextSeqId(pool, 'users', 'KWI-USR-', 4);
      newMemId = await getNextSeqId(pool, 'memberships', 'KWI-MEM-', 4);

      // 1. Insert into users table
      await pool.query(`
        INSERT INTO users (id, email, password_hash, full_name, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, true, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          full_name = EXCLUDED.full_name,
          password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
          is_active = true,
          updated_at = NOW();
      `, [
        newUserId,
        cleanEmail,
        password || 'default_pass',
        fullName.trim(),
      ]);

      // 2. Insert into memberships table
      await pool.query(`
        INSERT INTO memberships (id, business_id, user_id, role, username, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          role = EXCLUDED.role,
          is_active = true,
          updated_at = NOW();
      `, [
        newMemId,
        targetBizId,
        newUserId,
        role || 'cashier',
        cleanEmail.split('@')[0],
      ]);

      console.log(`[Supabase] Created new employee "${fullName}" (${newUserId}) with role "${role}" for business ${targetBizId}`);
    } catch (err: any) {
      console.warn('[Staff API] Supabase insert notice:', err.message);
    }
  }

  // 3. Sync to local database
  const localMember = db.addStaffMember({
    id: newMemId,
    userId: newUserId,
    fullName: fullName.trim(),
    role: role || 'cashier',
    pin: pin || '1234',
    email: cleanEmail,
  });

  res.json({
    success: true,
    member: {
      id: newMemId,
      userId: newUserId,
      fullName: fullName.trim(),
      email: cleanEmail,
      role: role || 'cashier',
      isActive: true,
    },
  });
});

// DELETE /api/staff/:id - Remove or deactivate employee
router.delete('/:id', async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const pool = getPool();

  if (pool) {
    try {
      await pool.query(`
        UPDATE memberships SET is_active = false, updated_at = NOW() WHERE id = $1 OR user_id = $1;
      `, [id]);
      await pool.query(`
        DELETE FROM memberships WHERE id = $1 OR user_id = $1;
      `, [id]).catch(() => {});
      console.log(`[Supabase] Deactivated/deleted employee membership ID ${id}`);
    } catch (err: any) {
      console.warn('[Staff API] Supabase delete notice:', err.message);
    }
  }

  res.json({ success: true, message: 'Employee removed successfully', id });
});

export default router;
