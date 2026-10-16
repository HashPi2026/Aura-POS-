import React from 'react';
import {
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  WifiOff,
  RotateCw,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { usePosStore } from '../store/usePosStore';
import { formatDateTime, formatInr } from '../utils/format';

export const SyncQueueScreen: React.FC = () => {
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
              {unsyncedCount > 0 ? `${unsyncedCount} Pending Sync` : 'All Synced'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Offline-first architecture: sales write to local IndexedDB and sync in order to cloud
          </p>
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

      {/* Simulator Banner (Acceptance test toggle) */}
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
              Simulate Cloud Server Failure (HTTP 503)
            </h4>
            <p className="text-xs text-slate-500">
              {simulateServerFailure
                ? 'Active: Mock server will reject sync requests to test offline queueing and backoff'
                : 'Inactive: Normal operation with ~120ms cloud latency'}
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
                className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {sale.receiptNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {sale.paymentMethod}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDateTime(sale.timestamp)} • {sale.itemCount} items
                  </div>
                  {sale.lastSyncError && (
                    <div className="text-xs text-rose-500 mt-1 font-medium">
                      Error: {sale.lastSyncError}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 justify-between md:justify-end">
                  <div className="text-right">
                    <div className="font-mono font-black text-base text-slate-900 dark:text-white">
                      {formatInr(sale.totalAmount)}
                    </div>
                    <div className="text-[11px] text-slate-400">incl. 18% GST</div>
                  </div>

                  {/* Status Badges */}
                  <div>
                    {sale.syncStatus === 'SYNCED' && (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Synced
                      </span>
                    )}

                    {sale.syncStatus === 'SYNCING' && (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        Syncing...
                      </span>
                    )}

                    {sale.syncStatus === 'FAILED' && (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Failed, will retry
                      </span>
                    )}

                    {sale.syncStatus === 'SAVED_OFFLINE' && (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <WifiOff className="w-3.5 h-3.5" />
                        Saved on device
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    {(sale.syncStatus === 'FAILED' || sale.syncStatus === 'SAVED_OFFLINE') && (
                      <button
                        onClick={() => retrySingleSale(sale.id)}
                        disabled={!isOnline}
                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-teal-700 dark:text-teal-400 disabled:opacity-40"
                        title="Retry sync for this sale"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => viewReceipt(sale)}
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                      title="View & Reprint receipt"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
