import { Router, Request, Response } from 'express';
import { db } from '../db/database';

const router = Router();

// GET /api/auth/me - returns active authenticated session
router.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({
      authenticated: false,
      user: null,
      business: null,
      role: null,
    });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return res.json({
      authenticated: false,
      user: null,
      business: null,
      role: null,
    });
  }

  const business = db.getBusiness();
  const staff = db.getStaff();
  const defaultMember = staff.find((s) => s.role === 'owner') || staff[0];

  res.json({
    authenticated: true,
    user: {
      id: defaultMember.userId,
      email: defaultMember.email,
      fullName: defaultMember.fullName,
      role: defaultMember.role,
    },
    business,
    role: defaultMember.role,
  });
});

// POST /api/auth/login - Email & Password or Quick Role login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password, pin, role } = req.body;
  const staff = db.getStaff();
  const business = db.getBusiness();

  if (pin) {
    const member = db.findStaffByPin(pin);
    if (!member) {
      return res.status(401).json({ success: false, error: 'Invalid PIN' });
    }
    return res.json({
      success: true,
      token: `token_${member.userId}_${Date.now()}`,
      user: {
        id: member.userId,
        email: member.email,
        fullName: member.fullName,
        role: member.role,
      },
      business,
      role: member.role,
    });
  }

  if (email) {
    let matchedBusiness: any = null;
    let ownerFullName = 'Store Owner';
    const cleanEmail = email.trim().toLowerCase();

    // 1. Check if there is a registered business matching this owner's email in Supabase
    try {
      const { getPool } = await import('../db/supabaseClient');
      const pool = getPool();
      if (pool) {
        const cloudBizRes = await pool.query(
          `SELECT b.id, b.name, b.business_type, b.address, b.phone, b.tax_identifier, b.owner_name, b.owner_email, b.currency, b.timezone,
                  u.id as user_id, u.full_name as user_full_name, u.password_hash
           FROM businesses b
           LEFT JOIN memberships m ON m.business_id = b.id
           LEFT JOIN users u ON u.id = m.user_id
           WHERE LOWER(b.owner_email) = $1 OR LOWER(u.email) = $1
           ORDER BY b.created_at DESC LIMIT 1`,
          [cleanEmail]
        );
        if (cloudBizRes.rows && cloudBizRes.rows.length > 0) {
          const row = cloudBizRes.rows[0];

          // Check password if present in Supabase users table
          if (row.password_hash && password && row.password_hash !== 'default_hash') {
            if (row.password_hash !== password) {
              return res.status(401).json({
                success: false,
                error: 'Invalid password. Please check your credentials.',
              });
            }
          }

          matchedBusiness = {
            id: row.id,
            name: row.name,
            businessType: (row.business_type || 'cafe').toLowerCase(),
            taxIdentifier: row.tax_identifier || '',
            address: row.address || '',
            phone: row.phone || '',
            ownerName: row.owner_name || row.user_full_name || '',
            ownerEmail: row.owner_email || cleanEmail,
            currency: row.currency || 'INR',
            timezone: row.timezone || 'Asia/Kolkata',
            taxRate: 5,
          };
          ownerFullName = row.owner_name || row.user_full_name || ownerFullName;
          db.updateBusiness(matchedBusiness);
        }
      }
    } catch (err: any) {
      console.warn('Supabase business lookup notice:', err.message);
    }

    // 2. Check local database business if not matched in cloud
    if (!matchedBusiness) {
      const activeLocalBiz = db.getBusiness();
      if (activeLocalBiz && activeLocalBiz.ownerEmail && activeLocalBiz.ownerEmail.toLowerCase() === cleanEmail) {
        matchedBusiness = activeLocalBiz;
      } else if (cleanEmail === 'spicecafe@gmail.com') {
        if (password && password !== 'Spicecafe@123' && password !== 'admin123' && password !== '123456') {
          return res.status(401).json({
            success: false,
            error: 'Invalid password for spicecafe@gmail.com. Password is: Spicecafe@123',
          });
        }
        matchedBusiness = activeLocalBiz;
      }
    }

    // 3. If STILL not matched: DO NOT fall back to Spice Cafe! Return error
    if (!matchedBusiness) {
      return res.status(401).json({
        success: false,
        error: `No registered business found for "${email}". Please register your store in the "New Store / Register" tab first.`,
      });
    }

    const member = db.findStaffByEmail(cleanEmail);
    const userId = member ? member.userId : `owner_${Date.now()}`;
    const fullName = member ? member.fullName : ownerFullName;
    const userRole = member ? member.role : 'owner';

    return res.json({
      success: true,
      token: `token_${userId}_${Date.now()}`,
      user: {
        id: userId,
        email: cleanEmail,
        fullName,
        role: userRole,
      },
      business: matchedBusiness,
      role: userRole,
    });
  }

  // Fallback demo login
  const defaultMember = staff[0];
  res.json({
    success: true,
    token: `token_${defaultMember.userId}`,
    user: {
      id: defaultMember.userId,
      email: defaultMember.email,
      fullName: defaultMember.fullName,
      role: defaultMember.role,
    },
    business,
    role: defaultMember.role,
  });
});

// POST /api/auth/pin-verify - Quick staff PIN verification
router.post('/pin-verify', (req: Request, res: Response) => {
  const { pin, userId, role } = req.body;
  if (!pin) {
    return res.status(400).json({ success: false, error: 'PIN is required' });
  }

  const staff = db.getStaff();
  const matched = staff.find((s) => s.pin === pin);

  if (matched) {
    return res.json({
      success: true,
      member: matched,
    });
  }

  // Standard fast fallback for demo pins
  const pinMap: Record<string, any> = {
    '1111': { id: 'staff_owner_01', userId: 'staff_owner_01', fullName: 'Cafe Owner', role: 'owner' },
    '1234': { id: 'staff_cashier_01', userId: 'staff_cashier_01', fullName: 'Barista Ramesh', role: 'cashier' },
    '2222': { id: 'staff_waiter_01', userId: 'staff_waiter_01', fullName: 'Priya Sharma', role: 'waiter' },
    '3333': { id: 'staff_kitchen_01', userId: 'staff_kitchen_01', fullName: 'Chef Anand', role: 'kitchen' },
    '4444': { id: 'staff_accountant_01', userId: 'staff_accountant_01', fullName: 'Vikram Accountant', role: 'accountant' },
  };

  if (pinMap[pin]) {
    return res.json({
      success: true,
      member: pinMap[pin],
    });
  }

  res.status(401).json({
    success: false,
    error: 'Incorrect PIN. Default PINs: Owner: 1111, Cashier: 1234, Waiter: 2222, Kitchen: 3333',
  });
});

// POST /api/auth/register
router.post('/register', (req: Request, res: Response) => {
  const { email, fullName, businessName } = req.body;
  const business = db.updateBusiness({
    name: businessName || 'Aura Cafe & Roastery',
  });

  res.json({
    success: true,
    token: `token_registered_${Date.now()}`,
    user: {
      id: `user_${Date.now()}`,
      email: email || 'owner@auracafe.com',
      fullName: fullName || 'Cafe Owner',
      role: 'owner',
    },
    business,
    role: 'owner',
  });
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
