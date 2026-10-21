import React from 'react';
import { Receipt, Printer } from 'lucide-react';
import { usePosStore } from '../store/usePosStore';
import { formatDateTime, formatInr } from '../utils/format';
import { DailySummaryReport } from './DailySummaryReport';
import { SalesRevenueTrendChart } from './SalesRevenueTrendChart';
import { WeeklyRevenueBarChart } from './WeeklyRevenueBarChart';

export const SalesHistoryScreen: React.FC = () => {
  const { sales, viewReceipt } = usePosStore();

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-100 dark:bg-slate-950 flex flex-col gap-5 max-w-7xl mx-auto w-full">
      {/* 1. Current Week Daily Revenue Bar Chart (Recharts) */}
      <WeeklyRevenueBarChart sales={sales} />

      {/* 2. Monthly Revenue Trend Line/Area Chart Dashboard (Recharts) */}
      <SalesRevenueTrendChart sales={sales} />

      {/* 3. Daily Summary Report Component */}
      <DailySummaryReport sales={sales} />

      {/* 2. Completed Invoices List */}
      <div className="flex flex-col gap-2.5">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
          Invoices &amp; Receipts ({sales.length})
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
                    {sale.orderType && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {sale.orderType}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {formatDateTime(sale.timestamp)} • {sale.itemCount} items {sale.tableName ? `• Table ${sale.tableName}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-mono font-black text-base text-slate-900 dark:text-white">
                      {formatInr(sale.totalAmount)}
                    </div>
                    <div className="text-[10px] text-slate-400">tax: {formatInr(sale.totalGst)}</div>
                  </div>

                  <button
                    onClick={() => viewReceipt(sale)}
                    className="h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors text-slate-700 dark:text-slate-300"
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
