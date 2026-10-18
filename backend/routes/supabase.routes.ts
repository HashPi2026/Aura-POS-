import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import fs from 'fs';
import path from 'path';

const router = Router();

// In-memory or file-backed configuration for Supabase
let supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hwdxpvmypxnpfiamcmvs.supabase.co';
let supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// Load from .env if present
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim().replace(/^['"]|['"]$/g, '');
        if (key === 'VITE_SUPABASE_URL') supabaseUrl = val;
        if (key === 'VITE_SUPABASE_ANON_KEY') supabaseAnonKey = val;
      }
    }
  } catch (_) {}
}

// GET /api/supabase/status
router.get('/status', (req: Request, res: Response) => {
  res.json({
    configured: Boolean(supabaseUrl && supabaseAnonKey && supabaseAnonKey.length > 20),
    url: supabaseUrl,
    hasKey: Boolean(supabaseAnonKey && supabaseAnonKey.length > 20),
    maskedKey: supabaseAnonKey ? `${supabaseAnonKey.slice(0, 10)}...${supabaseAnonKey.slice(-6)}` : null,
    targetProject: 'hwdxpvmypxnpfiamcmvs',
  });
});

// POST /api/supabase/config
router.post('/config', (req: Request, res: Response) => {
  const { url, anonKey } = req.body;
  if (url) supabaseUrl = url.trim();
  if (anonKey) supabaseAnonKey = anonKey.trim();

  // Save to .env
  try {
    const envData = `VITE_SUPABASE_URL=${supabaseUrl}\nVITE_SUPABASE_ANON_KEY=${supabaseAnonKey}\n`;
    fs.writeFileSync(envPath, envData, 'utf-8');
  } catch (err) {
    console.warn('Could not write .env:', err);
  }

  res.json({
    success: true,
    configured: Boolean(supabaseUrl && supabaseAnonKey && supabaseAnonKey.length > 20),
    url: supabaseUrl,
  });
});

// POST /api/supabase/push-all - Pushes all sales directly to Supabase REST API
router.post('/push-all', async (req: Request, res: Response) => {
  const activeUrl = req.body.url || supabaseUrl;
  const activeKey = req.body.anonKey || supabaseAnonKey;

  if (!activeUrl || !activeKey || activeKey.length < 20) {
    return res.status(400).json({
      success: false,
      error: 'Supabase Anon Key is required to push to cloud database',
    });
  }

  try {
    const sales = db.getSales();
    const business = db.getBusiness();

    // 1. Ensure business exists in Supabase
    await fetch(`${activeUrl}/rest/v1/businesses`, {
      method: 'POST',
      headers: {
        'apikey': activeKey,
        'Authorization': `Bearer ${activeKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id: business.id,
        name: business.name,
        business_type: business.businessType || 'cafe',
        currency: business.currency || 'INR',
        timezone: business.timezone || 'Asia/Kolkata',
        tax_identifier: business.taxIdentifier || '29AAAAA0000A1Z5',
      }),
    });

    // 2. Prepare sales payload for public.sales table
    const recordsToPush = sales.map((s) => ({
      id: s.id.includes('-') ? s.id : undefined, // Must be valid UUID if provided
      business_id: business.id,
      receipt_number: s.receiptNumber,
      cashier_name: s.cashierName || 'Barista Ramesh',
      order_type: s.orderType || 'DINE_IN',
      table_name: s.tableName || null,
      subtotal: s.subtotal || 0,
      tax_amount: s.totalGst || 0,
      discount_amount: 0,
      round_off: s.roundOff || 0,
      total_amount: s.totalAmount || 0,
      status: 'COMPLETED',
      client_timestamp: new Date(s.timestamp || Date.now()).toISOString(),
    })).filter((s) => s.id); // Only UUIDs

    const pushRes = await fetch(`${activeUrl}/rest/v1/sales`, {
      method: 'POST',
      headers: {
        'apikey': activeKey,
        'Authorization': `Bearer ${activeKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(recordsToPush),
    });

    if (!pushRes.ok) {
      const errText = await pushRes.text();
      return res.status(pushRes.status).json({
        success: false,
        error: `Supabase returned ${pushRes.status}: ${errText}`,
      });
    }

    res.json({
      success: true,
      pushedCount: recordsToPush.length,
      message: `Successfully pushed ${recordsToPush.length} sales to Supabase public.sales`,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Error pushing to Supabase',
    });
  }
});

export default router;
