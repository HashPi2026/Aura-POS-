import { Router, Request, Response } from 'express';
import { db } from '../db/database';

const router = Router();

// GET /api/business
router.get('/', async (req: Request, res: Response) => {
  let business = db.getBusiness();

  // Pull latest business details from cloud Supabase if connected
  try {
    const { getBusinessFromSupabase } = await import('../db/supabaseClient');
    const cloudBiz = await getBusinessFromSupabase();
    if (cloudBiz) {
      business = db.updateBusiness({
        name: cloudBiz.name || business.name,
        address: cloudBiz.address || business.address,
        phone: cloudBiz.phone || business.phone,
        taxIdentifier: cloudBiz.tax_identifier || business.taxIdentifier,
        currency: cloudBiz.currency || business.currency,
        timezone: cloudBiz.timezone || business.timezone,
      });
    }
  } catch (err: any) {
    console.warn('Notice: Could not fetch business from Supabase:', err?.message);
  }

  res.json({ success: true, business });
});

// POST /api/business - Create a new business row in Supabase and local database
router.post('/', async (req: Request, res: Response) => {
  const {
    name,
    businessType,
    taxIdentifier,
    address,
    phone,
    ownerName,
    ownerPhone,
    ownerEmail,
    password,
  } = req.body;

  const crypto = await import('crypto');
  const newId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const locId = crypto.randomUUID();
  const membershipId = crypto.randomUUID();
  const cleanCode = (name || 'STORE').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) + '-' + Math.floor(1000 + Math.random() * 9000);

  const newBusiness = db.updateBusiness({
    id: newId,
    name: name || 'New Store',
    businessType: businessType || 'cafe',
    taxIdentifier: taxIdentifier || '',
    address: address || '',
    phone: phone || ownerPhone || '',
    ownerName: ownerName || 'Owner',
    ownerPhone: ownerPhone || phone || '',
    ownerEmail: ownerEmail || '',
  });

  // Insert fresh business, location, owner user & membership into Supabase
  try {
    const { getPool } = await import('../db/supabaseClient');
    const pool = getPool();
    if (pool) {
      // 1. Insert into businesses
      const insertRes = await pool.query(`
        INSERT INTO businesses (
          id, name, code, business_type, is_active, timezone, currency, address, phone, tax_identifier, owner_name, owner_phone, owner_email, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, true, 'Asia/Kolkata', 'INR', $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *;
      `, [
        newId,
        name || 'New Store',
        cleanCode,
        (businessType || 'cafe').toUpperCase(),
        address || '',
        phone || ownerPhone || '',
        taxIdentifier || '',
        ownerName || 'Owner',
        ownerPhone || '',
        ownerEmail || '',
      ]);

      if (insertRes.rows && insertRes.rows.length > 0) {
        console.log(`[Supabase] Created new business "${insertRes.rows[0].name}" with ID ${insertRes.rows[0].id}`);
      }

      // 2. Insert into locations
      try {
        await pool.query(`
          INSERT INTO locations (id, business_id, name, created_at, updated_at)
          VALUES ($1, $2, 'Main Outlet', NOW(), NOW())
          ON CONFLICT (id) DO NOTHING;
        `, [locId, newId]);
      } catch (locErr: any) {
        console.warn('Locations insert notice:', locErr.message);
      }

      // 3. Insert into public.users if ownerEmail provided
      if (ownerEmail) {
        let actualUserId = userId;
        try {
          const userRes = await pool.query(`
            INSERT INTO users (id, email, full_name, password_hash, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, true, NOW(), NOW())
            ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, password_hash = EXCLUDED.password_hash
            RETURNING id;
          `, [
            userId,
            ownerEmail.trim().toLowerCase(),
            ownerName || 'Owner',
            password || 'default_hash',
          ]);
          if (userRes.rows && userRes.rows.length > 0) {
            actualUserId = userRes.rows[0].id;
          }
        } catch (uErr: any) {
          console.warn('Users insert notice:', uErr.message);
        }

        // 4. Insert into public.memberships
        try {
          await pool.query(`
            INSERT INTO memberships (id, business_id, user_id, role, username, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, 'owner', $4, true, NOW(), NOW())
            ON CONFLICT (business_id, user_id) DO UPDATE SET role = 'owner', is_active = true;
          `, [
            membershipId,
            newId,
            actualUserId,
            ownerEmail.split('@')[0],
          ]);
        } catch (mErr: any) {
          console.warn('Memberships insert notice:', mErr.message);
        }
      }
    }
  } catch (err: any) {
    console.error('[Supabase] Failed to insert new business:', err.message);
  }

  res.json({
    success: true,
    business: newBusiness,
    user: {
      id: userId,
      email: ownerEmail || '',
      fullName: ownerName || 'Owner',
      role: 'owner',
    },
    token: `token_${userId}_${Date.now()}`,
  });
});

// PUT /api/business
router.put('/', async (req: Request, res: Response) => {
  const updated = db.updateBusiness(req.body);

  // Synchronize to cloud Supabase if connected
  try {
    const { getPool } = await import('../db/supabaseClient');
    const pool = getPool();
    if (pool) {
      await pool.query(`
        UPDATE businesses
        SET name = COALESCE($1, name),
            address = COALESCE($2, address),
            phone = COALESCE($3, phone),
            tax_identifier = COALESCE($4, tax_identifier),
            owner_name = COALESCE($5, owner_name),
            owner_phone = COALESCE($6, owner_phone),
            owner_email = COALESCE($7, owner_email)
        WHERE id = $8 OR name = $9;
      `, [
        updated.name,
        updated.address,
        updated.phone,
        updated.taxIdentifier,
        updated.ownerName,
        updated.ownerPhone,
        updated.ownerEmail,
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
router.get('/staff', async (req: Request, res: Response) => {
  const reqBizId = (req.query.businessId as string) || (req.headers['x-business-id'] as string);

  // If businessId is specified and not Spice Cafe, fetch specific staff from Supabase
  if (reqBizId && reqBizId !== '11111111-1111-1111-1111-111111111111') {
    try {
      const { getPool } = await import('../db/supabaseClient');
      const pool = getPool();
      if (pool) {
        const staffRes = await pool.query(`
          SELECT m.id, m.user_id as "userId", u.full_name as "fullName", u.email, m.role, '1111' as pin, m.is_active as "isActive"
          FROM memberships m
          JOIN users u ON u.id = m.user_id
          WHERE m.business_id = $1 AND m.is_active = true
          ORDER BY CASE WHEN m.role = 'owner' THEN 1 ELSE 2 END;
        `, [reqBizId]);

        if (staffRes.rows && staffRes.rows.length > 0) {
          return res.json({ success: true, staff: staffRes.rows });
        }

        // If no memberships found, check business owner in businesses table
        const bizRes = await pool.query(
          'SELECT id, name, owner_name, owner_email FROM businesses WHERE id = $1 LIMIT 1',
          [reqBizId]
        );
        if (bizRes.rows && bizRes.rows.length > 0) {
          const row = bizRes.rows[0];
          const ownerStaff = [
            {
              id: `owner_${row.id}`,
              userId: `owner_${row.id}`,
              fullName: row.owner_name || 'Store Owner',
              email: row.owner_email || 'owner@store.com',
              role: 'owner',
              pin: '1111',
              isActive: true,
            },
          ];
          return res.json({ success: true, staff: ownerStaff });
        }
      }
    } catch (err: any) {
      console.warn('Supabase staff lookup notice:', err.message);
    }

    // Local active business check
    const currentBiz = db.getBusiness();
    if (currentBiz.id === reqBizId && currentBiz.name !== 'Spice Cafe') {
      return res.json({
        success: true,
        staff: [
          {
            id: `owner_${currentBiz.id}`,
            userId: `owner_${currentBiz.id}`,
            fullName: currentBiz.ownerName || 'Store Owner',
            email: currentBiz.ownerEmail || 'owner@store.com',
            role: 'owner',
            pin: '1111',
            isActive: true,
          },
        ],
      });
    }
    return res.json({ success: true, staff: [] });
  }

  // Fallback for default Spice Cafe
  const staff = db.getStaff().map(({ pin, ...rest }) => rest);
  res.json({ success: true, staff });
});

export default router;
