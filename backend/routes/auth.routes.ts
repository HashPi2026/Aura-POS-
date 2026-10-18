import { Router, Request, Response } from 'express';
import { db } from '../db/database';

const router = Router();

// GET /api/auth/me - returns active authenticated session
router.get('/me', (req: Request, res: Response) => {
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
router.post('/login', (req: Request, res: Response) => {
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
    const member = db.findStaffByEmail(email);
    if (!member) {
      // Auto-create or allow demo login
      return res.json({
        success: true,
        token: `token_demo_${Date.now()}`,
        user: {
          id: 'user_owner',
          email,
          fullName: 'Cafe Owner',
          role: 'owner',
        },
        business,
        role: 'owner',
      });
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
