import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  RotateCw,
  FileText,
  AlertTriangle,
  Database,
  ExternalLink,
  Copy,
  Check,
  Send,
} from 'lucide-react';
import { usePosStore } from '../store/usePosStore';
import { formatDateTime, formatInr } from '../utils/format';
import { backgroundSyncService, SyncStatusInfo } from '../services/BackgroundSyncService';
import { restApi } from '../api/restClient';

export const SyncQueueScreen: React.FC = () => {
  const [workerStatus, setWorkerStatus] = useState<SyncStatusInfo>(() =>
    backgroundSyncService.getStatus()
  );

  // Supabase cloud bridge state
  const [supabaseUrl, setSupabaseUrl] = useState('https://hwdxpvmypxnpfiamcmvs.supabase.co');
  const [anonKey, setAnonKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pushResult, setPushResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSql, setShowSql] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    return backgroundSyncService.subscribe((status) => {
      setWorkerStatus(status);
    });
  }, []);

  useEffect(() => {
    // Check backend Supabase config
    restApi.supabase.getStatus().then((st) => {
      if (st.url) setSupabaseUrl(st.url);
      setIsConfigured(st.configured);
    }).catch(() => {});
  }, []);

  const {
    sales,
    isOnline,
    isSyncing,
    unsyncedCount,
    simulateServerFailure,
    toggleServerFailure,
    drainSyncQueue,
    retrySingleSale,
    viewReceipt,
  } = usePosStore();

  const handleSaveAndPush = async () => {
    setIsPushing(true);
    setPushResult(null);

    try {
      const res = await restApi.supabase.pushAll();
      if (res.success) {
        setPushResult({
          success: true,
          message: `Successfully synchronized ${res.pushedCount ?? sales.length} sales into Supabase PostgreSQL (public.sales & public.payments)!`,
        });
      } else {
        setPushResult({
          success: false,
          message: res.error || 'Failed to push sales to Supabase.',
        });
      }
    } catch (err: any) {
      setPushResult({
        success: false,
        message: err.message || 'Connection error with Supabase.',
      });
    } finally {
      setIsPushing(false);
    }
  };

  const sqlInsertScript = `-- 1. Ensure business exists
INSERT INTO businesses (id, name, business_type, currency, timezone, tax_identifier)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Aura Cafe & Roastery',
  'cafe',
  'INR',
  'Asia/Kolkata',
  '29AAAAA0000A1Z5'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert all ${sales.length} terminal sales into public.sales
INSERT INTO sales (
  id, business_id, receipt_number, cashier_name, order_type,
  subtotal, tax_amount, round_off, total_amount, status, client_timestamp
)
VALUES
${sales
  .map(
    (s) =>
      `  ('${s.id.includes('-') ? s.id : '00000000-0000-0000-0000-00000000' + s.receiptNumber.replace(/[^0-9]/g, '').slice(-4).padStart(4, '0')}', '00000000-0000-0000-0000-000000000001', '${s.receiptNumber}', '${s.cashierName || 'Barista Ramesh'}', '${s.orderType || 'DINE_IN'}', ${s.subtotal || 0}, ${s.totalGst || 0}, ${s.roundOff || 0}, ${s.totalAmount || 0}, 'COMPLETED', '${new Date(s.timestamp).toISOString()}')`
  )
  .join(',\n')}
ON CONFLICT (id) DO NOTHING;`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlInsertScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-100 dark:bg-slate-950 flex flex-col gap-4">
      {/* Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Cloud Sync Queue</h2>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                unsyncedCount > 0
                  ? 'bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
              }`}
            >
              {unsyncedCount > 0 ? `${unsyncedCount} Pending Sync` : 'Local Backend Synced'}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <span className={`w-2 h-2 rounded-full ${workerStatus.isStable ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              REST Background Sync: {workerStatus.isStable ? 'Active' : 'Offline'}
            </span>
            <span className="text-[11px] text-slate-500">
              {workerStatus.lastSyncedAt
                ? `• Last synced: ${formatDateTime(workerStatus.lastSyncedAt)}`
                : '• Polling every 10s'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={drainSyncQueue}
            disabled={!isOnline || isSyncing || unsyncedCount === 0}
            className="h-11 px-4 rounded-xl bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync now'}</span>
          </button>
        </div>
      </div>

      {/* Cloud Database Sync Status Banner */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-950 text-white rounded-2xl p-4 sm:p-5 border border-emerald-700/50 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white">Supabase Cloud Database Sync</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Connected (hwdxpvmypxnpfiamcmvs)</span>
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">
                All POS sales auto-sync to PostgreSQL table <code className="bg-black/30 px-1 py-0.5 rounded text-emerald-300 font-mono text-[11px]">public.sales</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveAndPush}
              disabled={isPushing}
              className="h-9 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              {isPushing ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                  <span>Syncing to Supabase...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-slate-950" />
                  <span>Push All {sales.length} Sales to Supabase</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowSql(!showSql)}
              className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/20 flex items-center gap-1.5 transition-all"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{showSql ? 'Hide SQL' : 'View SQL Script'}</span>
            </button>
          </div>
        </div>

        {pushResult && (
          <div
            className={`p-2.5 rounded-xl text-xs flex items-center gap-2.5 border ${
              pushResult.success
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                : 'bg-rose-500/20 border-rose-400/50 text-rose-200'
            }`}
          >
            {pushResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
            )}
            <span className="font-medium">{pushResult.message}</span>
          </div>
        )}

        {/* Ready-to-Run SQL snippet drawer */}
        {showSql && (
          <div className="bg-slate-950/90 p-4 rounded-xl border border-white/10 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-300">
                SQL for Supabase SQL Editor (Instant Paste):
              </span>
              <button
                onClick={copySql}
                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-[11px] font-bold text-slate-950 flex items-center gap-1.5 transition-all"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL'}</span>
              </button>
            </div>
            <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto p-3 bg-black/60 rounded-lg max-h-48 select-all leading-relaxed">
              {sqlInsertScript}
            </pre>
          </div>
        )}
      </div>

      {/* Simulator Banner */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              simulateServerFailure
                ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              Simulate Network / Cloud Offline Mode
            </h4>
            <p className="text-xs text-slate-500">
              {simulateServerFailure
                ? 'Active: Cloud sync disabled to test offline receipt queuing and auto-recovery'
                : 'Inactive: Normal online cloud synchronization active'}
            </p>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={simulateServerFailure}
            onChange={toggleServerFailure}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
        </label>
      </div>

      {/* Queue List */}
      <div className="flex-1 flex flex-col gap-2.5">
        <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">
          All Terminal Sales ({sales.length})
        </h3>

        {sales.length === 0 ? (
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center justify-center text-slate-400">
            <CheckCircle2 className="w-12 h-12 mb-2 opacity-30" />
            <p className="font-bold text-sm text-slate-600 dark:text-slate-300">No sales recorded</p>
            <p className="text-xs">Ring up orders in Checkout to see them queued here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sales.map((sale) => (
              <div
                key={sale.id}
                className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 font-bold text-xs">
                    {sale.paymentMethod}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                        {sale.receiptNumber}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {sale.paymentMethod}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {formatDateTime(sale.timestamp)} • {sale.itemCount} items
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {formatInr(sale.totalAmount)}
                    </div>
                    <div className="text-[10px] text-slate-400">incl. 18% GST</div>
                  </div>

                  <span
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      sale.syncStatus === 'SYNCED'
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {sale.syncStatus === 'SYNCED' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Synced</span>
                      </>
                    ) : (
                      <>
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Offline</span>
                      </>
                    )}
                  </span>

                  <button
                    onClick={() => viewReceipt(sale)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500"
                    title="View Receipt"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
