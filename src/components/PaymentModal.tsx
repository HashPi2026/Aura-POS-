import React, { useState } from 'react';
import {
  Banknote,
  QrCode,
  CreditCard,
  Check,
  X,
  CheckCircle2,
} from 'lucide-react';
import { usePosStore } from '../store/usePosStore';
import { formatInr } from '../utils/format';

export const PaymentModal: React.FC = () => {
  const {
    showPaymentModal,
    closePaymentModal,
    selectedPaymentMethod,
    setPaymentMethod,
    amountTendered,
    setAmountTendered,
    completeSale,
    getTotals,
  } = usePosStore();

  const [upiVerified, setUpiVerified] = useState(false);

  if (!showPaymentModal) return null;

  const totals = getTotals();
  const changeDue = Math.max(0, amountTendered - totals.totalAmount);
  const canComplete =
    selectedPaymentMethod === 'CASH'
      ? amountTendered >= totals.totalAmount
      : true;

  const quickDenominations = [
    { label: 'Exact', value: totals.totalAmount },
    { label: '+₹100', value: amountTendered + 100 },
    { label: '+₹200', value: amountTendered + 200 },
    { label: '+₹500', value: amountTendered + 500 },
    { label: '₹500', value: 500 },
    { label: '₹2000', value: 2000 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 select-none animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">Payment</h3>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Total {totals.totalItems} items (incl. 18% GST)
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="font-mono font-black text-xl sm:text-2xl text-brand">
              {formatInr(totals.totalAmount)}
            </span>
            <button
              onClick={closePaymentModal}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Payment Method Tabs */}
        <div className="p-4 sm:p-5 flex flex-col gap-3.5 sm:gap-4 overflow-y-auto">
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            <button
              onClick={() => setPaymentMethod('CASH')}
              className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border text-left transition-all ${
                selectedPaymentMethod === 'CASH'
                  ? 'bg-brand text-white border-brand shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100'
              }`}
            >
              <Banknote className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <div>
                <div className="font-bold text-xs sm:text-sm">Cash</div>
                <div
                  className={`text-[9px] sm:text-[10px] hidden xs:block ${
                    selectedPaymentMethod === 'CASH' ? 'text-white/80' : 'text-slate-500'
                  }`}
                >
                  Tender & change
                </div>
              </div>
            </button>

            <button
              onClick={() => setPaymentMethod('UPI')}
              className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border text-left transition-all ${
                selectedPaymentMethod === 'UPI'
                  ? 'bg-brand text-white border-brand shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100'
              }`}
            >
              <QrCode className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <div>
                <div className="font-bold text-xs sm:text-sm">UPI QR</div>
                <div
                  className={`text-[9px] sm:text-[10px] hidden xs:block ${
                    selectedPaymentMethod === 'UPI' ? 'text-white/80' : 'text-slate-500'
                  }`}
                >
                  GPay, PhonePe
                </div>
              </div>
            </button>

            <button
              onClick={() => setPaymentMethod('CARD')}
              className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border text-left transition-all ${
                selectedPaymentMethod === 'CARD'
                  ? 'bg-brand text-white border-brand shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100'
              }`}
            >
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <div>
                <div className="font-bold text-xs sm:text-sm">Card</div>
                <div
                  className={`text-[9px] sm:text-[10px] hidden xs:block ${
                    selectedPaymentMethod === 'CARD' ? 'text-white/80' : 'text-slate-500'
                  }`}
                >
                  Tap, chip, swipe
                </div>
              </div>
            </button>
          </div>

          {/* Payment Method Active Tab View */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 min-h-[160px] flex flex-col justify-center">
            {selectedPaymentMethod === 'CASH' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] sm:text-xs text-slate-500">Amount Tendered</span>
                    <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
                      {formatInr(amountTendered)}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-500">Change Due</span>
                    <div
                      className={`text-xl sm:text-2xl font-black font-mono ${
                        amountTendered >= totals.totalAmount
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {formatInr(changeDue)}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] sm:text-xs font-semibold text-slate-500 mb-1.5">
                    Quick Denominations
                  </div>
                  {/* Responsive grid: 3 columns on mobile, 6 on tablet/desktop */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {quickDenominations.map((denom, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setAmountTendered(denom.value)}
                        className="h-10 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold text-xs text-brand hover:bg-brand-light transition-colors shadow-2xs"
                      >
                        {denom.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {selectedPaymentMethod === 'UPI' && (
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
                {/* Simulated High-contrast QR code */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white p-2 rounded-xl border-2 border-slate-900 shrink-0 flex items-center justify-center shadow-sm">
                  <div className="w-full h-full border border-dashed border-slate-800 flex flex-col items-center justify-center text-center p-1 bg-slate-50">
                    <QrCode className="w-10 h-10 sm:w-12 sm:h-12 text-slate-900" />
                    <span className="text-[8px] sm:text-[9px] font-mono font-bold mt-0.5">₹{totals.totalAmount}</span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-1 text-center sm:text-left">
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    Dynamic UPI QR Code
                  </div>
                  <div className="text-xs font-mono text-slate-500">
                    auramart.indiranagar@hdfcbank
                  </div>
                  <div className="text-xs text-slate-500">
                    Scan with Google Pay, PhonePe, Paytm, BHIM or CRED
                  </div>

                  <div className="mt-2 flex justify-center sm:justify-start">
                    {upiVerified ? (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>UPI Payment Verified</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setUpiVerified(true)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        Simulate payment received
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {selectedPaymentMethod === 'CARD' && (
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                  <CreditCard className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    POS EDC Terminal Ready
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Insert, swipe, or tap contactless card on attached card reader.
                  </p>
                  <p className="text-[10px] sm:text-[11px] font-medium text-teal-700 dark:text-teal-400 mt-1">
                    Accepts: RuPay, Visa, Mastercard, Maestro
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Complete sale button */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={completeSale}
            disabled={!canComplete}
            className="w-full h-13 sm:h-14 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="w-5 h-5" />
            <span>Complete sale ({formatInr(totals.totalAmount)})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
