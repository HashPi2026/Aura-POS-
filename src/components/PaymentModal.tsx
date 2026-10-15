import React, { useState } from 'react';
import {
  Banknote,
  QrCode,
  CreditCard,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Split,
  Plus,
  Trash2,
} from 'lucide-react';
import { usePosStore } from '../store/usePosStore';
import { formatInr } from '../utils/format';

export const PaymentModal: React.FC = () => {
  const {
    showPaymentModal,
    closePaymentModal,
    getTotals,
    selectedPaymentMethod,
    setPaymentMethod,
    amountTendered,
    setAmountTendered,
    completeSale,
  } = usePosStore();

  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [activeTab, setActiveTab] = useState<'SINGLE' | 'SPLIT'>('SINGLE');
  const [splitTenders, setSplitTenders] = useState<{ method: 'CASH' | 'UPI' | 'CARD'; amount: number }[]>([
    { method: 'CASH', amount: 0 },
    { method: 'UPI', amount: 0 },
  ]);

  if (!showPaymentModal) return null;

  const totals = getTotals();
  const changeDue = Math.max(0, amountTendered - totals.totalAmount);

  // Split calculation
  const splitTotal = splitTenders.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const splitRemaining = Math.round((totals.totalAmount - splitTotal) * 100) / 100;
  const isSplitValid = activeTab === 'SPLIT' && Math.abs(splitRemaining) < 0.01 && splitTotal > 0;

  const canComplete =
    activeTab === 'SPLIT'
      ? isSplitValid && paymentConfirmed
      : selectedPaymentMethod === 'CASH'
      ? amountTendered >= totals.totalAmount
      : paymentConfirmed;

  const quickDenominations = [
    { label: 'Exact', value: totals.totalAmount },
    { label: '+₹50', value: amountTendered + 50 },
    { label: '+₹100', value: amountTendered + 100 },
    { label: '+₹500', value: amountTendered + 500 },
    { label: '₹500', value: 500 },
    { label: '₹2000', value: 2000 },
  ];

  const handleCompletePayment = () => {
    if (!canComplete) return;
    completeSale();
    setPaymentConfirmed(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 select-none animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">Collect Payment</h3>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Total {totals.totalItems} items (incl. 5% Cafe GST)
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="font-mono font-black text-xl sm:text-2xl text-teal-600 dark:text-teal-400">
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

        {/* Single vs Split Payment Mode Switcher */}
        <div className="px-4 sm:px-5 pt-3 flex gap-2">
          <button
            onClick={() => setActiveTab('SINGLE')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              activeTab === 'SINGLE'
                ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            Single Payment Tender
          </button>
          <button
            onClick={() => {
              setActiveTab('SPLIT');
              // Prepopulate split with total
              const half = Math.round((totals.totalAmount / 2) * 100) / 100;
              setSplitTenders([
                { method: 'CASH', amount: half },
                { method: 'UPI', amount: Math.round((totals.totalAmount - half) * 100) / 100 },
              ]);
            }}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
              activeTab === 'SPLIT'
                ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span>Split Payment</span>
          </button>
        </div>

        {activeTab === 'SINGLE' ? (
          <div className="p-4 sm:p-5 flex flex-col gap-3.5 sm:gap-4 overflow-y-auto">
            {/* Method Tabs */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              <button
                onClick={() => {
                  setPaymentMethod('CASH');
                  setPaymentConfirmed(false);
                }}
                className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border text-left transition-all ${
                  selectedPaymentMethod === 'CASH'
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
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
                onClick={() => {
                  setPaymentMethod('UPI');
                  setPaymentConfirmed(false);
                }}
                className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border text-left transition-all ${
                  selectedPaymentMethod === 'UPI'
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
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
                    Manual recording
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setPaymentMethod('CARD');
                  setPaymentConfirmed(false);
                }}
                className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border text-left transition-all ${
                  selectedPaymentMethod === 'CARD'
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <div>
                  <div className="font-bold text-xs sm:text-sm">Card EDC</div>
                  <div
                    className={`text-[9px] sm:text-[10px] hidden xs:block ${
                      selectedPaymentMethod === 'CARD' ? 'text-white/80' : 'text-slate-500'
                    }`}
                  >
                    Manual recording
                  </div>
                </div>
              </button>
            </div>

            {/* Payment Method View */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 min-h-[160px] flex flex-col justify-center">
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
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {quickDenominations.map((denom, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setAmountTendered(denom.value)}
                          className="h-10 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold text-xs text-teal-700 dark:text-teal-300 hover:bg-teal-50 transition-colors shadow-2xs"
                        >
                          {denom.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedPaymentMethod === 'UPI' && (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white p-2 rounded-2xl border-2 border-slate-900 shrink-0 flex items-center justify-center shadow-sm">
                    <div className="w-full h-full border border-dashed border-slate-800 flex flex-col items-center justify-center text-center p-1 bg-slate-50">
                      <QrCode className="w-10 h-10 text-slate-900" />
                      <span className="text-[9px] font-mono font-bold mt-0.5">₹{totals.totalAmount}</span>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col gap-2 text-center sm:text-left">
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5 justify-center sm:justify-start">
                        <span>UPI Payment</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          Manual payment recording
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Scan with GPay, PhonePe, Paytm, or BHIM. Verify confirmation on your bank/soundbox.
                      </p>
                    </div>

                    <label className="flex items-center gap-2 mt-1 cursor-pointer bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <input
                        type="checkbox"
                        checked={paymentConfirmed}
                        onChange={(e) => setPaymentConfirmed(e.target.checked)}
                        className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        I confirm payment of {formatInr(totals.totalAmount)} received via UPI
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {selectedPaymentMethod === 'CARD' && (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                    <CreditCard className="w-7 h-7" />
                  </div>
                  <div className="flex-1 flex flex-col gap-2 text-center sm:text-left">
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5 justify-center sm:justify-start">
                        <span>Card Payment (Swipe / Tap)</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          Manual payment recording
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Swipe/tap card on your standalone card machine and record approval.
                      </p>
                    </div>

                    <label className="flex items-center gap-2 mt-1 cursor-pointer bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <input
                        type="checkbox"
                        checked={paymentConfirmed}
                        onChange={(e) => setPaymentConfirmed(e.target.checked)}
                        className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        I confirm card transaction approved for {formatInr(totals.totalAmount)}
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* SPLIT PAYMENTS VIEW */
          <div className="p-4 sm:p-5 flex flex-col gap-3 overflow-y-auto">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-600 dark:text-slate-400">Split Tenders:</span>
              <span className={splitRemaining === 0 ? 'text-emerald-600' : 'text-amber-600'}>
                Remaining: {formatInr(splitRemaining)}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {splitTenders.map((tender, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <select
                    value={tender.method}
                    onChange={(e) => {
                      const updated = [...splitTenders];
                      updated[idx].method = e.target.value as any;
                      setSplitTenders(updated);
                    }}
                    className="h-9 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                  </select>

                  <div className="flex-1 flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      value={tender.amount || ''}
                      onChange={(e) => {
                        const updated = [...splitTenders];
                        updated[idx].amount = parseFloat(e.target.value) || 0;
                        setSplitTenders(updated);
                      }}
                      className="w-full h-9 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold"
                      placeholder="0.00"
                    />
                  </div>

                  {splitTenders.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSplitTenders(splitTenders.filter((_, i) => i !== idx))}
                      className="p-1 text-rose-500 hover:text-rose-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {splitTenders.length < 3 && (
              <button
                type="button"
                onClick={() => setSplitTenders([...splitTenders, { method: 'CARD', amount: 0 }])}
                className="py-1.5 px-3 rounded-xl border border-dashed border-teal-400 text-teal-600 dark:text-teal-400 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Tender</span>
              </button>
            )}

            <label className="flex items-center gap-2 mt-2 cursor-pointer bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <input
                type="checkbox"
                checked={paymentConfirmed}
                onChange={(e) => setPaymentConfirmed(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                I confirm payment received for all split tenders
              </span>
            </label>
          </div>
        )}

        {/* Complete sale button */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={handleCompletePayment}
            disabled={!canComplete}
            className="w-full h-13 sm:h-14 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="w-5 h-5" />
            <span>Complete Sale ({formatInr(totals.totalAmount)})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
