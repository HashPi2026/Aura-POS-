import React from 'react';
import {
  CheckCircle,
  CheckCircle2,
  Printer,
  Plus,
  WifiOff,
  AlertTriangle,
  RotateCw,
  X,
} from 'lucide-react';
import { usePosStore } from '../store/usePosStore';
import { formatInr, formatReceiptDateTime } from '../utils/format';

export const ReceiptModal: React.FC = () => {
  const {
    showReceiptModal,
    completedSale,
    closeReceiptModal,
    printStatus,
    printerConnected,
    printReceipt,
    isOnline,
    storeName,
    storeAddress,
    storeGstin,
  } = usePosStore();

  if (!showReceiptModal || !completedSale) return null;

  const isOffline = completedSale.syncStatus !== 'SYNCED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Sale Complete</h3>
              <p className="text-xs font-mono text-slate-500">{completedSale.receiptNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOffline ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <WifiOff className="w-3.5 h-3.5" />
                Saved on device
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Synced
              </span>
            )}
            <button
              onClick={closeReceiptModal}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Offline & Printer Warnings */}
        <div className="px-4 pt-3 flex flex-col gap-2">
          {isOffline && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-xs">
              <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Saved on this device. Will sync when online.</span>
            </div>
          )}

          {(!printerConnected || printStatus === 'DISCONNECTED_ERROR') && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Printer disconnected. Sale is safely saved on device.</span>
            </div>
          )}
        </div>

        {/* Monospace 58mm Thermal Receipt Preview */}
        <div className="p-4 overflow-y-auto flex-1 flex justify-center bg-slate-100 dark:bg-slate-950/50">
          <div className="bg-[#FAF8F5] text-slate-900 font-mono text-xs p-5 rounded-md shadow-md w-full max-w-[320px] border border-amber-100 select-text leading-tight">
            {/* Store Title */}
            <div className="text-center font-bold text-sm tracking-wider uppercase">{storeName}</div>
            <div className="text-center text-[10px] text-slate-600">{storeAddress}</div>
            <div className="text-center text-[10px] text-slate-600">GSTIN: {storeGstin}</div>
            <div className="text-center text-[10px] text-slate-600">Ph: +91 80 2520 8900</div>

            <div className="border-b border-dashed border-slate-400 my-2"></div>

            {/* Bill Details */}
            <div className="flex justify-between text-[11px]">
              <span>Bill No:</span>
              <span className="font-semibold">{completedSale.receiptNumber}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span>Date:</span>
              <span>{formatReceiptDateTime(completedSale.timestamp)}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span>Cashier:</span>
              <span>
                {completedSale.cashierName} ({completedSale.counterName})
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span>Payment:</span>
              <span className="font-semibold">
                {completedSale.paymentMethod} {completedSale.upiRef ? `(${completedSale.upiRef})` : ''}
              </span>
            </div>

            <div className="border-b border-dashed border-slate-400 my-2"></div>

            {/* Items Header */}
            <div className="grid grid-cols-12 font-bold text-[10px] uppercase border-b border-slate-300 pb-1 mb-1">
              <span className="col-span-6">Item</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-2 text-right">Rate</span>
              <span className="col-span-2 text-right">Total</span>
            </div>

            {/* Items Rows */}
            <div className="flex flex-col gap-1 text-[11px]">
              {completedSale.items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 items-baseline">
                  <span className="col-span-6 truncate pr-1">{it.name}</span>
                  <span className="col-span-2 text-center">{it.quantity}</span>
                  <span className="col-span-2 text-right">{formatInr(it.price, false)}</span>
                  <span className="col-span-2 text-right font-medium">
                    {formatInr(it.price * it.quantity, false)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-b border-dashed border-slate-400 my-2"></div>

            {/* Tax & Totals Breakdown */}
            <div className="flex justify-between text-[11px]">
              <span>Items Count:</span>
              <span>{completedSale.itemCount}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span>Subtotal:</span>
              <span>{formatInr(completedSale.subtotal)}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span>CGST @ 9%:</span>
              <span>{formatInr(completedSale.cgst)}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span>SGST @ 9%:</span>
              <span>{formatInr(completedSale.sgst)}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span>Total 18% GST:</span>
              <span>{formatInr(completedSale.totalGst)}</span>
            </div>
            {completedSale.roundOff !== 0 && (
              <div className="flex justify-between text-[11px]">
                <span>Round Off:</span>
                <span>
                  {completedSale.roundOff > 0 ? '+' : ''}
                  {formatInr(completedSale.roundOff)}
                </span>
              </div>
            )}

            <div className="border-b border-dashed border-slate-400 my-2"></div>

            {/* Net Total */}
            <div className="flex justify-between text-sm font-bold pt-0.5">
              <span>TOTAL PAYABLE:</span>
              <span>{formatInr(completedSale.totalAmount)}</span>
            </div>

            {completedSale.paymentMethod === 'CASH' && completedSale.amountTendered > 0 && (
              <div className="mt-1 pt-1 border-t border-dotted border-slate-300 text-[10px] text-slate-700">
                <div className="flex justify-between">
                  <span>Cash Tendered:</span>
                  <span>{formatInr(completedSale.amountTendered)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Change Due:</span>
                  <span>{formatInr(completedSale.changeDue)}</span>
                </div>
              </div>
            )}

            <div className="border-b border-dashed border-slate-400 my-3"></div>

            <div className="text-center text-[10px] text-slate-600">
              <div>*** THANK YOU FOR VISITING ***</div>
              <div>GST Tax Invoice • Aura POS India</div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
          <button
            onClick={printReceipt}
            disabled={printStatus === 'PRINTING'}
            className="flex-1 h-12 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {printStatus === 'PRINTING' ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin text-teal-600" />
                <span>Printing...</span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                <span>{printStatus === 'DISCONNECTED_ERROR' ? 'Retry print' : 'Print receipt'}</span>
              </>
            )}
          </button>

          <button
            onClick={closeReceiptModal}
            className="flex-1.5 h-12 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>New sale</span>
          </button>
        </div>
      </div>

      {/* Hidden container dedicated to window.print() 58mm thermal output */}
      <div id="thermal-receipt-print-area" className="hidden print:block">
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px' }}>{storeName}</div>
        <div style={{ textAlign: 'center', fontSize: '9px' }}>{storeAddress}</div>
        <div style={{ textAlign: 'center', fontSize: '9px' }}>GSTIN: {storeGstin}</div>
        <div style={{ borderBottom: '1px dashed #000', margin: '4px 0' }}></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
          <span>Bill No:</span>
          <span>{completedSale.receiptNumber}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
          <span>Date:</span>
          <span>{formatReceiptDateTime(completedSale.timestamp)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
          <span>Payment:</span>
          <span>{completedSale.paymentMethod}</span>
        </div>
        <div style={{ borderBottom: '1px dashed #000', margin: '4px 0' }}></div>
        {completedSale.items.map((it, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
            <span>
              {it.name} x{it.quantity}
            </span>
            <span>{formatInr(it.price * it.quantity, false)}</span>
          </div>
        ))}
        <div style={{ borderBottom: '1px dashed #000', margin: '4px 0' }}></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
          <span>Subtotal:</span>
          <span>{formatInr(completedSale.subtotal)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
          <span>GST (18%):</span>
          <span>{formatInr(completedSale.totalGst)}</span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            fontWeight: 'bold',
            marginTop: '2px',
          }}
        >
          <span>TOTAL:</span>
          <span>{formatInr(completedSale.totalAmount)}</span>
        </div>
        <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }}></div>
        <div style={{ textAlign: 'center', fontSize: '9px' }}>Thank you for shopping!</div>
      </div>
    </div>
  );
};
