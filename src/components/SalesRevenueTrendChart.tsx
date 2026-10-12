import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, Calendar, ArrowUpRight, DollarSign, Receipt, Sparkles } from 'lucide-react';
import { Sale } from '../db/indexedDb';
import { formatInr } from '../utils/format';

interface SalesRevenueTrendChartProps {
  sales: Sale[];
}

export type TimeWindow = '7D' | '14D' | '30D';

interface DayDataPoint {
  dateKey: string;
  displayDate: string;
  fullDate: string;
  revenue: number;
  netSales: number;
  tax: number;
  orderCount: number;
  itemCount: number;
}

export const SalesRevenueTrendChart: React.FC<SalesRevenueTrendChartProps> = ({ sales }) => {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('30D');
  const [activeMetric, setActiveMetric] = useState<'revenue' | 'orders'>('revenue');

  const daysCount = timeWindow === '7D' ? 7 : timeWindow === '14D' ? 14 : 30;

  // Aggregate daily sales over the selected time window (up to 30 days)
  const { chartData, totalRevenue, avgDailyRevenue, peakDay, totalOrders } = useMemo(() => {
    const data: DayDataPoint[] = [];
    const now = new Date();

    // Generate buckets for each of the last N days (oldest to newest)
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      const displayDate = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const fullDate = d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      data.push({
        dateKey,
        displayDate,
        fullDate,
        revenue: 0,
        netSales: 0,
        tax: 0,
        orderCount: 0,
        itemCount: 0,
      });
    }

    const dataMap = new Map<string, DayDataPoint>();
    data.forEach((item) => dataMap.set(item.dateKey, item));

    // Fill data from existing sales
    for (const sale of sales) {
      const saleDate = new Date(sale.timestamp);
      const key = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}-${String(
        saleDate.getDate()
      ).padStart(2, '0')}`;

      const bucket = dataMap.get(key);
      if (bucket) {
        bucket.revenue += sale.totalAmount;
        bucket.netSales += sale.subtotal;
        bucket.tax += sale.totalGst;
        bucket.orderCount += 1;
        bucket.itemCount += sale.itemCount || 1;
      }
    }

    let totRev = 0;
    let totOrders = 0;
    let maxDay: DayDataPoint | null = null;

    for (const pt of data) {
      totRev += pt.revenue;
      totOrders += pt.orderCount;
      if (!maxDay || pt.revenue > maxDay.revenue) {
        maxDay = pt;
      }
    }

    const avgDaily = data.length > 0 ? totRev / data.length : 0;

    return {
      chartData: data,
      totalRevenue: totRev,
      avgDailyRevenue: avgDaily,
      peakDay: maxDay && maxDay.revenue > 0 ? maxDay : null,
      totalOrders: totOrders,
    };
  }, [sales, daysCount]);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: DayDataPoint = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs min-w-[180px]">
          <div className="font-bold text-slate-200 border-b border-slate-800 pb-1.5 mb-1.5 flex items-center justify-between">
            <span>{data.fullDate}</span>
            <span className="text-[10px] text-teal-400 font-normal">
              {data.orderCount} order{data.orderCount === 1 ? '' : 's'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Gross Revenue:</span>
              <span className="font-mono font-bold text-teal-400 text-sm">
                {formatInr(data.revenue)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Net Subtotal:</span>
              <span>{formatInr(data.netSales)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>GST Collected:</span>
              <span>{formatInr(data.tax)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              <span>Items Sold:</span>
              <span className="text-slate-200 font-semibold">{data.itemCount} units</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-4">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950 text-brand flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Revenue &amp; Sales Trends</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-light text-brand uppercase">
                  30 Days
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Daily business performance and cashflow trajectory
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Metric Selector: Revenue vs Orders */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveMetric('revenue')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeMetric === 'revenue'
                  ? 'bg-brand text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Revenue (₹)
            </button>
            <button
              onClick={() => setActiveMetric('orders')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeMetric === 'orders'
                  ? 'bg-brand text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Orders Count
            </button>
          </div>

          {/* Time Window Selector: 7D / 14D / 30D */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            {(['7D', '14D', '30D'] as const).map((tw) => (
              <button
                key={tw}
                onClick={() => setTimeWindow(tw)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  timeWindow === tw
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tw}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Key Summary Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
          <span className="text-[11px] text-slate-500 font-semibold block">
            {timeWindow === '30D' ? '30-Day' : timeWindow} Total Sales
          </span>
          <div className="font-mono font-black text-lg sm:text-xl text-slate-900 dark:text-white mt-1">
            {formatInr(totalRevenue)}
          </div>
          <span className="text-[10px] text-slate-400">{totalOrders} completed invoices</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
          <span className="text-[11px] text-slate-500 font-semibold block">Average Daily Sales</span>
          <div className="font-mono font-black text-lg sm:text-xl text-slate-900 dark:text-white mt-1">
            {formatInr(avgDailyRevenue)}
          </div>
          <span className="text-[10px] text-slate-400">across {daysCount} business days</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
          <span className="text-[11px] text-slate-500 font-semibold block">Peak Revenue Day</span>
          <div className="font-mono font-black text-lg sm:text-xl text-teal-700 dark:text-teal-400 mt-1">
            {peakDay ? formatInr(peakDay.revenue) : '₹0.00'}
          </div>
          <span className="text-[10px] text-slate-400">
            {peakDay ? `${peakDay.displayDate} (${peakDay.orderCount} bills)` : 'No sales yet'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
          <span className="text-[11px] text-slate-500 font-semibold block">Invoice Velocity</span>
          <div className="font-mono font-black text-lg sm:text-xl text-slate-900 dark:text-white mt-1">
            {(totalOrders / daysCount).toFixed(1)}{' '}
            <span className="text-xs font-normal text-slate-400">/ day</span>
          </div>
          <span className="text-[10px] text-slate-400">Average transaction frequency</span>
        </div>
      </div>

      {/* 3. Recharts Line / Area Visualization */}
      <div className="w-full h-64 sm:h-72 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#006874" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#006874" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0284c7" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />

            <XAxis
              dataKey="displayDate"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              interval={daysCount > 14 ? 3 : 1}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickFormatter={(val) => {
                if (activeMetric === 'orders') return `${val}`;
                if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
                return `₹${val}`;
              }}
            />

            <Tooltip content={<CustomTooltip />} />

            {activeMetric === 'revenue' ? (
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#006874"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#revenueGradient)"
                activeDot={{ r: 6, fill: '#006874', stroke: '#ffffff', strokeWidth: 2 }}
              />
            ) : (
              <Area
                type="monotone"
                dataKey="orderCount"
                stroke="#0284c7"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#ordersGradient)"
                activeDot={{ r: 6, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 2 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
