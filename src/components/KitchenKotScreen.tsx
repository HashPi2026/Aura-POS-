import React, { useState } from 'react';
import {
  ChefHat,
  Clock,
  Printer,
  CheckCircle2,
  CheckCheck,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { usePosStore } from '../store/usePosStore';
import { KOTRecord } from '../db/indexedDb';

export const KitchenKotScreen: React.FC = () => {
  const { kots, updateKotStatus, deleteKotTicket, clearServedKotTickets, printerConnected, showBanner } = usePosStore();
  const [filter, setFilter] = useState<'ALL' | 'PREPARING' | 'READY' | 'SERVED'>('ALL');

  const handlePrintKot = (kot: KOTRecord) => {
    if (!printerConnected) {
      showBanner('Printer disconnected. Please connect thermal printer in Settings.');
      return;
    }
    showBanner(`Printing ${kot.kotNumber} for Barista & Kitchen...`);
    try {
      window.print();
    } catch (_) {}
  };

  const filteredKots = kots.filter(
    (k) => filter === 'ALL' || k.status === filter
  );

  const servedCount = kots.filter((k) => k.status === 'SERVED').length;

  const formatElapsed = (timestamp: number) => {
    const mins = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
    return `${mins} min${mins > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-100 dark:bg-slate-950 flex flex-col gap-4 max-w-7xl mx-auto w-full">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-brand" />
            <span>Barista & Kitchen Display System (KDS)</span>
          </h2>
          <p className="text-xs text-slate-500">
            Real-time coffee and food preparation tickets for baristas and kitchen staff
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {(['ALL', 'PREPARING', 'READY', 'SERVED'] as const).map((st) => {
              const count = st === 'ALL' ? kots.length : kots.filter((k) => k.status === st).length;
              return (
                <button
                  key={st}
                  onClick={() => setFilter(st)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    filter === st
                      ? 'bg-brand text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <span>{st === 'ALL' ? 'All Tickets' : st}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      filter === st ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Clear Served Tickets button */}
          {servedCount > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear all completed/served tickets from the kitchen screen?')) {
                  clearServedKotTickets();
                }
              }}
              title="Remove all completed tickets"
              className="h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1 shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Served ({servedCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* KOT Cards Grid */}
      {filteredKots.length === 0 ? (
        <div className="min-h-[280px] flex flex-col items-center justify-center text-slate-400 text-center p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <ChefHat className="w-12 h-12 mb-3 opacity-30 text-brand" />
          <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
            No tickets in this view
          </h4>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            When orders are sent with "Send to Barista (KOT)", kitchen tickets will appear here with live preparation timers.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredKots.map((kot) => {
            const isPreparing = kot.status === 'PREPARING';
            const isReady = kot.status === 'READY';
            const isServed = kot.status === 'SERVED';

            return (
              <div
                key={kot.id}
                className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border flex flex-col justify-between shadow-xs transition-all ${
                  isPreparing
                    ? 'border-amber-400 dark:border-amber-700 ring-2 ring-amber-400/20'
                    : isReady
                    ? 'border-emerald-400 dark:border-emerald-700 ring-2 ring-emerald-400/20'
                    : 'border-slate-200 dark:border-slate-800 opacity-80'
                }`}
              >
                <div>
                  {/* Top Bar: Ticket # & Table */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="font-black text-base text-slate-900 dark:text-white">
                        {kot.kotNumber}
                      </span>
                      <span className="ml-2 px-2 py-0.5 rounded-full font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {kot.tableName || kot.orderType}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isPreparing
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : isReady
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {kot.status}
                    </span>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 py-2">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      {formatElapsed(kot.timestamp)}
                    </span>
                    <span>Server: {kot.serverName}</span>
                  </div>

                  {/* Items List */}
                  <div className="flex flex-col gap-2 py-2">
                    {kot.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-start justify-between gap-2 text-xs"
                      >
                        <div className="flex-1">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-md bg-brand-light text-brand flex items-center justify-center font-black text-xs shrink-0">
                              {item.quantity}×
                            </span>
                            <span>{item.name}</span>
                          </div>
                          {item.customNotes && (
                            <div className="text-[11px] text-amber-700 dark:text-amber-300 mt-1 pl-6 font-semibold italic">
                              ☕ {item.customNotes}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Special Kitchen instructions */}
                  {kot.specialInstructions && (
                    <div className="mt-1 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300">
                      <strong>Chef / Barista Note:</strong> {kot.specialInstructions}
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  {isPreparing && (
                    <button
                      onClick={() => updateKotStatus(kot.id, 'READY')}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-[0.98]"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Ready</span>
                    </button>
                  )}

                  {isReady && (
                    <button
                      onClick={() => updateKotStatus(kot.id, 'SERVED')}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-[0.98]"
                    >
                      <CheckCheck className="w-4 h-4" />
                      <span>Mark Served</span>
                    </button>
                  )}

                  {isServed && (
                    <div className="flex-1 flex items-center justify-between text-xs font-semibold text-slate-400 py-1">
                      <span>✓ Completed & Served</span>
                      <button
                        onClick={() => deleteKotTicket(kot.id)}
                        title="Delete Ticket"
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => handlePrintKot(kot)}
                    title="Print KOT Slip"
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
