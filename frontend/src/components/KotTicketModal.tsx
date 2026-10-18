import React from 'react';
import { ChefHat, Printer, X, Check } from 'lucide-react';
import { usePosStore } from '../store/usePosStore';

export const KotTicketModal: React.FC = () => {
  const { activeKotModal, closeKotModal, printerConnected, showBanner } = usePosStore();

  if (!activeKotModal) return null;

  const handlePrint = () => {
    if (!printerConnected) {
      showBanner('Printer disconnected. Please turn on printer in Settings.');
      return;
    }
    showBanner(`Printing ${activeKotModal.kotNumber} for Chef & Barista...`);
    try {
      window.print();
    } catch (_) {}
  };

  const formatKotTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} • ${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 select-none animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-sm w-full flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-light text-brand flex items-center justify-center font-bold">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Kitchen Order Ticket</h3>
              <p className="text-[10px] text-slate-500">Sent to Kitchen & Barista</p>
            </div>
          </div>

          <button
            onClick={closeKotModal}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 58mm Thermal Preview Paper */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 flex justify-center">
          <div className="w-[260px] bg-white text-slate-900 p-4 rounded-xl shadow-md border border-slate-200 font-mono text-xs leading-relaxed">
            <div className="text-center font-black text-sm tracking-wider uppercase border-b-2 border-dashed border-slate-900 pb-2">
              *** KITCHEN TICKET ***
            </div>

            <div className="py-2 text-[11px] border-b border-dashed border-slate-400 flex flex-col gap-0.5">
              <div className="flex justify-between font-bold">
                <span>{activeKotModal.kotNumber}</span>
                <span className="bg-slate-900 text-white px-1.5 py-0.2 rounded text-[10px]">
                  {activeKotModal.tableName || activeKotModal.orderType}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-600">
                <span>Time:</span>
                <span>{formatKotTime(activeKotModal.timestamp)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-600">
                <span>Server / Captain:</span>
                <span>{activeKotModal.serverName}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-600">
                <span>Type:</span>
                <span className="font-bold">{activeKotModal.orderType}</span>
              </div>
            </div>

            {/* Items for Chef */}
            <div className="py-2.5 flex flex-col gap-2 border-b-2 border-dashed border-slate-900">
              {activeKotModal.items.map((it, idx) => (
                <div key={idx} className="flex flex-col">
                  <div className="flex justify-between items-baseline font-bold text-xs">
                    <span>
                      {it.quantity} × {it.name}
                    </span>
                  </div>
                  {it.customNotes && (
                    <div className="text-[10px] text-red-700 pl-4 font-bold mt-0.5">
                      &gt;&gt; {it.customNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {activeKotModal.specialInstructions && (
              <div className="py-2 border-b border-dashed border-slate-400 text-[10px]">
                <strong>NOTE:</strong> {activeKotModal.specialInstructions}
              </div>
            )}

            <div className="pt-2 text-center text-[9px] text-slate-500 tracking-wide uppercase">
              Aura POS • Smart Kitchen System
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print KOT</span>
          </button>

          <button
            onClick={closeKotModal}
            className="flex-1.5 h-11 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Check className="w-4 h-4" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
