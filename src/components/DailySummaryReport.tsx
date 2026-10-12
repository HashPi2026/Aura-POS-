import React, { useState, useMemo } from 'react';
import {
  Calendar,
  TrendingUp,
  Receipt,
  Banknote,
  QrCode,
  CreditCard,
  Printer,
  Package,
  BarChart3,
  Coffee,
  Sparkles,
} from 'lucide-react';
import { Sale } from '../db/indexedDb';
import { usePosStore } from '../store/usePosStore';
import { formatInr } from '../utils/format';

interface DailySummaryReportProps {
  sales: Sale[];
}

export type DateFilterOption = 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'ALL_TIME';

export const DailySummaryReport: React.FC<DailySummaryReportProps> = ({ sales }) => {
  const { storeName, counterName, cashierName, showBanner, printerConnected } = usePosStore();
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('TODAY');

  // Filter sales based on selected date filter
  const filteredSales = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;

    switch (dateFilter) {
      case 'TODAY':
        return sales.filter((s) => s.timestamp >= startOfToday);
      case 'YESTERDAY':
        return sales.filter((s) => s.timestamp >= startOfYesterday && s.timestamp < startOfToday);
      case 'LAST_7_DAYS':
        return sales.filter((s) => s.timestamp >= sevenDaysAgo);
      case 'ALL_TIME':
      default:
        return sales;
    }
  }, [sales, dateFilter]);

  // Aggregate Metrics: Total Sales, Payment Breakdown, Item Volume
  const report = useMemo(() => {
    let totalGrossRevenue = 0;
    let totalSubtotal = 0;
    let totalTax = 0;
    let totalUnitsSold = 0;

    // Payment methods
    const paymentMap: Record<string, { count: number; amount: number }> = {
      CASH: { count: 0, amount: 0 },
      UPI: { count: 0, amount: 0 },
      CARD: { count: 0, amount: 0 },
    };

    // Item-level volume aggregations
    const productVolumeMap: Record<
      string,
      { name: string; category: string; quantity: number; revenue: number }
    > = {};

    const categoryVolumeMap: Record<
      string,
      { category: string; quantity: number; revenue: number }
    > = {};

    for (const sale of filteredSales) {
      totalGrossRevenue += sale.totalAmount;
      totalSubtotal += sale.subtotal;
      totalTax += sale.totalGst;

      // Payment Breakdown
      const method = sale.paymentMethod || 'CASH';
      if (!paymentMap[method]) {
        paymentMap[method] = { count: 0, amount: 0 };
      }
      paymentMap[method].count += 1;
      paymentMap[method].amount += sale.totalAmount;

      // Item Volume
      if (sale.items && sale.items.length > 0) {
        for (const item of sale.items) {
          const qty = Number(item.quantity) || 1;
          const lineRevenue = (Number(item.price) || 0) * qty;
          totalUnitsSold += qty;

          // By Product
          const pKey = item.productId || item.name;
          if (!productVolumeMap[pKey]) {
            productVolumeMap[pKey] = {
              name: item.name,
              category: item.category || 'General',
              quantity: 0,
              revenue: 0,
            };
          }
          productVolumeMap[pKey].quantity += qty;
          productVolumeMap[pKey].revenue += lineRevenue;

          // By Category
          const cat = item.category || 'General';
          if (!categoryVolumeMap[cat]) {
            categoryVolumeMap[cat] = {
              category: cat,
              quantity: 0,
              revenue: 0,
            };
          }
          categoryVolumeMap[cat].quantity += qty;
          categoryVolumeMap[cat].revenue += lineRevenue;
        }
      } else {
        totalUnitsSold += sale.itemCount || 0;
      }
    }

    const orderCount = filteredSales.length;
    const averageOrderValue = orderCount > 0 ? totalGrossRevenue / orderCount : 0;
    const averageItemsPerOrder = orderCount > 0 ? totalUnitsSold / orderCount : 0;

    // Top selling items sorted by volume
    const topProducts = Object.values(productVolumeMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Categories sorted by volume
    const categoryVolume = Object.values(categoryVolumeMap).sort(
      (a, b) => b.quantity - a.quantity
    );

    return {
      totalGrossRevenue,
      totalSubtotal,
      totalTax,
      orderCount,
      totalUnitsSold,
      averageOrderValue,
      averageItemsPerOrder,
      paymentMap,
      topProducts,
      categoryVolume,
    };
  }, [filteredSales]);

  // Handle thermal print of the Z-Report
  const handlePrintZReport = () => {
    if (!printerConnected) {
      showBanner('Printer is disconnected! Please connect your thermal printer in Settings.');
      return;
    }
    showBanner(`Printing Daily Z-Report (${dateFilter}) to thermal printer...`);
    try {
      window.print();
    } catch (_) {}
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-5">
      {/* 1. Header & Date Filter Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950 text-brand flex items-center justify-center font-bold">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Daily Sales &amp; Item Volume Summary</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-light text-brand uppercase">
                  Z-Report
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {storeName} • {counterName} ({cashierName})
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Date Filter Pills */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            {(
              [
                { id: 'TODAY', label: 'Today' },
                { id: 'YESTERDAY', label: 'Yesterday' },
                { id: 'LAST_7_DAYS', label: '7 Days' },
                { id: 'ALL_TIME', label: 'All' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setDateFilter(opt.id)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  dateFilter === opt.id
                    ? 'bg-brand text-white shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Print Summary Button */}
          <button
            onClick={handlePrintZReport}
            title="Print Daily Z-Report Summary"
            className="h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-brand" />
            <span className="hidden sm:inline">Print Slip</span>
          </button>
        </div>
      </div>

      {/* 2. Top-Level Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Gross Sales */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Gross Sales</span>
            <TrendingUp className="w-4 h-4 text-brand" />
          </div>
          <div className="mt-2">
            <div className="font-mono font-black text-xl sm:text-2xl text-slate-900 dark:text-white">
              {formatInr(report.totalGrossRevenue)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Net: {formatInr(report.totalSubtotal)} • Tax: {formatInr(report.totalTax)}
            </div>
          </div>
        </div>

        {/* Orders Count & AOV */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Total Invoices</span>
            <Receipt className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-2">
            <div className="font-mono font-black text-xl sm:text-2xl text-slate-900 dark:text-white">
              {report.orderCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Avg Order Value: {formatInr(report.averageOrderValue)}
            </div>
          </div>
        </div>

        {/* Total Item Volume Sold */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Item Volume Sold</span>
            <Package className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2">
            <div className="font-mono font-black text-xl sm:text-2xl text-slate-900 dark:text-white">
              {report.totalUnitsSold}{' '}
              <span className="text-xs font-normal text-slate-500">units</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Avg {report.averageItemsPerOrder.toFixed(1)} items / order
            </div>
          </div>
        </div>

        {/* Tax Collected */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Total GST Collected</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <div className="font-mono font-black text-xl sm:text-2xl text-slate-900 dark:text-white">
              {formatInr(report.totalTax)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              CGST + SGST (5% Cafe GST)
            </div>
          </div>
        </div>
      </div>

      {/* 3. Deep Breakdown Sections: Payment Breakdown (Left) & Item Volume (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
        {/* Payment Method Breakdown */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Payment Method Breakdown
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              {report.orderCount} total payments
            </span>
          </div>

          {/* Visual Percentage Progress Bar */}
          <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
            {report.totalGrossRevenue > 0 ? (
              <>
                <div
                  style={{
                    width: `${((report.paymentMap.CASH?.amount || 0) / report.totalGrossRevenue) * 100}%`,
                  }}
                  className="bg-emerald-500 h-full"
                  title="Cash"
                />
                <div
                  style={{
                    width: `${((report.paymentMap.UPI?.amount || 0) / report.totalGrossRevenue) * 100}%`,
                  }}
                  className="bg-teal-500 h-full"
                  title="UPI"
                />
                <div
                  style={{
                    width: `${((report.paymentMap.CARD?.amount || 0) / report.totalGrossRevenue) * 100}%`,
                  }}
                  className="bg-indigo-500 h-full"
                  title="Card"
                />
              </>
            ) : (
              <div className="bg-slate-300 dark:bg-slate-600 w-full h-full" />
            )}
          </div>

          {/* Payment Method Cards */}
          <div className="grid grid-cols-3 gap-2 text-xs pt-1">
            {/* CASH */}
            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                <Banknote className="w-3.5 h-3.5" />
                <span>Cash</span>
              </div>
              <div className="font-mono font-bold text-slate-900 dark:text-white mt-1">
                {formatInr(report.paymentMap.CASH?.amount || 0)}
              </div>
              <div className="text-[10px] text-slate-400">
                {report.paymentMap.CASH?.count || 0} bills •{' '}
                {report.totalGrossRevenue > 0
                  ? Math.round(
                      ((report.paymentMap.CASH?.amount || 0) /
                        report.totalGrossRevenue) *
                        100
                    )
                  : 0}
                %
              </div>
            </div>

            {/* UPI */}
            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 font-bold">
                <QrCode className="w-3.5 h-3.5" />
                <span>UPI / QR</span>
              </div>
              <div className="font-mono font-bold text-slate-900 dark:text-white mt-1">
                {formatInr(report.paymentMap.UPI?.amount || 0)}
              </div>
              <div className="text-[10px] text-slate-400">
                {report.paymentMap.UPI?.count || 0} bills •{' '}
                {report.totalGrossRevenue > 0
                  ? Math.round(
                      ((report.paymentMap.UPI?.amount || 0) /
                        report.totalGrossRevenue) *
                        100
                    )
                  : 0}
                %
              </div>
            </div>

            {/* CARD */}
            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Card</span>
              </div>
              <div className="font-mono font-bold text-slate-900 dark:text-white mt-1">
                {formatInr(report.paymentMap.CARD?.amount || 0)}
              </div>
              <div className="text-[10px] text-slate-400">
                {report.paymentMap.CARD?.count || 0} bills •{' '}
                {report.totalGrossRevenue > 0
                  ? Math.round(
                      ((report.paymentMap.CARD?.amount || 0) /
                        report.totalGrossRevenue) *
                        100
                    )
                  : 0}
                %
              </div>
            </div>
          </div>
        </div>

        {/* Item Volume Breakdown: Top Sellers & Volume by Category */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Top Selling Items by Volume
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              {report.totalUnitsSold} items sold
            </span>
          </div>

          {report.topProducts.length === 0 ? (
            <div className="p-6 flex flex-col items-center justify-center text-center text-slate-400 text-xs">
              <Coffee className="w-6 h-6 mb-1 opacity-40" />
              <span>No items sold during this period.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {report.topProducts.map((prod, idx) => {
                const percentOfVolume =
                  report.totalUnitsSold > 0
                    ? Math.round((prod.quantity / report.totalUnitsSold) * 100)
                    : 0;

                return (
                  <div
                    key={prod.name}
                    className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          {prod.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {prod.category}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {prod.quantity}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">
                          sold ({percentOfVolume}%)
                        </span>
                      </div>
                      <span className="font-mono font-bold text-teal-700 dark:text-teal-400 w-16 text-right">
                        {formatInr(prod.revenue)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Category Volume Distribution Pills */}
          {report.categoryVolume.length > 0 && (
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2 flex-wrap text-[11px]">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Categories:</span>
              {report.categoryVolume.map((cat) => (
                <span
                  key={cat.category}
                  className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium"
                >
                  {cat.category}: <strong className="text-slate-900 dark:text-white">{cat.quantity}</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
