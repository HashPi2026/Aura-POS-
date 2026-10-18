import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import fs from 'fs';
import path from 'path';

const router = Router();

// In-memory or file-backed configuration for Supabase
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3ZHhwdm15cHhucGZpYW1jbXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxMzE5NDcsImV4cCI6MjEwNzcwNzk0N30.FkTI2Y3cST2Oh2BHlNVpjiX66U2qIDNU1RVUPIeSjcE';
let supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hwdxpvmypxnpfiamcmvs.supabase.co';
let supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

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
if (!supabaseAnonKey) {
  supabaseAnonKey = DEFAULT_ANON_KEY;
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

import { pushSaleToSupabase } from '../db/supabaseClient';

// POST /api/supabase/push-all - Pushes all sales directly to Supabase PostgreSQL database
router.post('/push-all', async (req: Request, res: Response) => {
  try {
    const sales = db.getSales();
    let pushedCount = 0;

    for (const s of sales) {
      const ok = await pushSaleToSupabase(s);
      if (ok) pushedCount++;
    }

    res.json({
      success: true,
      pushedCount,
      message: `Successfully synchronized ${pushedCount} sale(s) to Supabase PostgreSQL (public.sales & public.payments)`,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Error pushing to Supabase',
    });
  }
});

export default router;
