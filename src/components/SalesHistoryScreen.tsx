import React, { useMemo } from 'react';
import {
  TrendingUp,
  Receipt,
  Banknote,
  QrCode,
  CreditCard,
  Printer,
  Calendar,
} from 'lucide-react';
import { usePosStore } from '../store/usePosStore';
import { formatDateTime, formatInr } from '../utils/format';

export const SalesHistoryScreen: React.FC = () => {
  const { sales, viewReceipt } = usePosStore();

  const metrics = useMemo(() => {
    const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
    const totalItems = sales.reduce((acc, s) => acc + s.itemCount, 0);
    const cashTotal = sales.filter((s) => s.paymentMethod === 'CASH').reduce((acc, s) => acc + s.totalAmount, 0);
    const upiTotal = sales.filter((s) => s.paymentMethod === 'UPI').reduce((acc, s) => acc + s.totalAmount, 0);
    const cardTotal = sales.filter((s) => s.paymentMethod === 'CARD').reduce((acc, s) => acc + s.totalAmount, 0);
    const totalGst = sales.reduce((acc, s) => acc + s.totalGst, 0);

    return {
      totalRevenue,
      totalItems,
      cashTotal,
      upiTotal,
      cardTotal,
      totalGst,
      count: sales.length,
    };
  }, [sales]);

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-100 dark:bg-slate-950 flex flex-col gap-5">
      {/* Daily Summary / Z-Report Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-700 dark:text-teal-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Today's Register Summary (Z-Report)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Counter 1 • Cashier: Ramesh Sharma • Aura Mart</p>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500">Gross Sales</span>
            <div className="font-mono font-black text-2xl lg:text-3xl text-teal-700 dark:text-teal-400">
              {formatInr(metrics.totalRevenue)}
            </div>
          </div>
        </div>

        {/* Breakdown Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Receipt className="w-4 h-4 text-teal-600" />
              <span>Orders</span>
            </div>
            <div className="font-mono font-bold text-lg text-slate-900 dark:text-white mt-1">
              {metrics.count} <span className="text-xs text-slate-400 font-normal">({metrics.totalItems} items)</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span>Cash Total</span>
            </div>
            <div className="font-mono font-bold text-lg text-slate-900 dark:text-white mt-1">
              {formatInr(metrics.cashTotal)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <QrCode className="w-4 h-4 text-teal-600" />
              <span>UPI Total</span>
            </div>
            <div className="font-mono font-bold text-lg text-slate-900 dark:text-white mt-1">
              {formatInr(metrics.upiTotal)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <span>Card Total</span>
            </div>
            <div className="font-mono font-bold text-lg text-slate-900 dark:text-white mt-1">
              {formatInr(metrics.cardTotal)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span>18% GST Coll.</span>
            </div>
            <div className="font-mono font-bold text-lg text-slate-900 dark:text-white mt-1">
              {formatInr(metrics.totalGst)}
            </div>
          </div>
        </div>
      </div>

      {/* Completed Invoices List */}
      <div className="flex flex-col gap-2.5">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
          Invoices ({sales.length})
        </h3>

        {sales.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center justify-center text-slate-400">
            <Receipt className="w-12 h-12 mb-2 opacity-30" />
            <p className="font-bold text-sm text-slate-600 dark:text-slate-300">No transactions yet</p>
            <p className="text-xs">Completed transactions will be archived here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sales.map((sale) => (
              <div
                key={sale.id}
                className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {sale.receiptNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {sale.paymentMethod}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {formatDateTime(sale.timestamp)} • {sale.itemCount} items
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-mono font-black text-base text-slate-900 dark:text-white">
                      {formatInr(sale.totalAmount)}
                    </div>
                    <div className="text-[10px] text-slate-400">incl. 18% GST</div>
                  </div>

                  <button
                    onClick={() => viewReceipt(sale)}
                    className="h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Receipt</span>
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
