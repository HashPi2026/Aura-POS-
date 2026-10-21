import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { BarChart3, TrendingUp, Calendar, ShoppingBag, Award, ArrowUpRight } from 'lucide-react';
import { Sale } from '../db/indexedDb';
import { formatInr } from '../utils/format';

interface WeeklyRevenueBarChartProps {
  sales: Sale[];
}

interface WeekDayBucket {
  dayName: string; // Mon, Tue, etc.
  dateNumber: number;
  dateKey: string;
  displayDate: string;
  fullDate: string;
  revenue: number;
  netSales: number;
  tax: number;
  orders: number;
  avgOrderValue: number;
  isToday: boolean;
  isPastOrToday: boolean;
}

export const WeeklyRevenueBarChart: React.FC<WeeklyRevenueBarChartProps> = ({ sales }) => {
  const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue');

  // Compute current week buckets (Monday to Sunday)
  const { weekDays, totalWeekRevenue, totalWeekOrders, avgDailyRevenue, peakDay } = useMemo<{
    weekDays: WeekDayBucket[];
    totalWeekRevenue: number;
    totalWeekOrders: number;
    avgDailyRevenue: number;
    peakDay: WeekDayBucket | null;
  }>(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();

    // In JS: 0 = Sun, 1 = Mon, ..., 6 = Sat
    // We want Monday as the first day of the week
    const currentDayOfWeek = now.getDay();
    const distanceToMonday = (currentDayOfWeek + 6) % 7; // 0 for Mon, 1 for Tue, ..., 6 for Sun

    const mondayDate = new Date(currentYear, currentMonth, currentDate - distanceToMonday);
    mondayDate.setHours(0, 0, 0, 0);

    const todayDateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
      currentDate
    ).padStart(2, '0')}`;

    const days: WeekDayBucket[] = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;
      const isToday = dateKey === todayDateKey;
      const isPastOrToday = d.getTime() <= now.getTime() || isToday;

      days.push({
        dayName: dayNames[i],
        dateNumber: d.getDate(),
        dateKey,
        displayDate: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        fullDate: d.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }),
        revenue: 0,
        netSales: 0,
        tax: 0,
        orders: 0,
        avgOrderValue: 0,
        isToday,
        isPastOrToday,
      });
    }

    const dayMap = new Map<string, WeekDayBucket>();
    days.forEach((d) => dayMap.set(d.dateKey, d));

    // Aggregate sales into current week buckets
    for (const sale of sales) {
      const saleDate = new Date(sale.timestamp);
      const yyyy = saleDate.getFullYear();
      const mm = String(saleDate.getMonth() + 1).padStart(2, '0');
      const dd = String(saleDate.getDate()).padStart(2, '0');
      const saleKey = `${yyyy}-${mm}-${dd}`;

      const bucket = dayMap.get(saleKey);
      if (bucket) {
        bucket.revenue += sale.totalAmount;
        bucket.netSales += sale.subtotal;
        bucket.tax += sale.totalGst;
        bucket.orders += 1;
      }
    }

    let totRev = 0;
    let totOrders = 0;

    days.forEach((d) => {
      d.avgOrderValue = d.orders > 0 ? Math.round(d.revenue / d.orders) : 0;
      totRev += d.revenue;
      totOrders += d.orders;
    });

    const peakDay = days.reduce<WeekDayBucket | null>((best, curr) => {
      if (curr.revenue > 0 && (!best || curr.revenue > best.revenue)) {
        return curr;
      }
      return best;
    }, null);

    const avgDaily = Math.round(totRev / 7);

    return {
      weekDays: days,
      totalWeekRevenue: totRev,
      totalWeekOrders: totOrders,
      avgDailyRevenue: avgDaily,
      peakDay,
    };
  }, [sales]);

  // Custom Recharts tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: WeekDayBucket = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xl text-xs font-sans min-w-[180px] z-50">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{data.fullDate}</span>
              {data.isToday && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                  Today
                </span>
              )}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Gross Revenue:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                {formatInr(data.revenue)}
              </span>
            </div>

            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400">Total Orders:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {data.orders} {data.orders === 1 ? 'bill' : 'bills'}
              </span>
            </div>

            {data.orders > 0 && (
              <>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Net (Pre-tax):</span>
                  <span className="font-mono text-slate-600 dark:text-slate-400">
                    {formatInr(data.netSales)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">GST Collected:</span>
                  <span className="font-mono text-slate-600 dark:text-slate-400">
                    {formatInr(data.tax)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800 font-medium text-teal-600 dark:text-teal-400">
                  <span>Avg Ticket Size:</span>
                  <span className="font-mono font-bold">{formatInr(data.avgOrderValue)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-4">
      {/* Header & Metric Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-200/80 dark:border-teal-800/60">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Current Week Daily Revenue
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                Weekly Bar Chart
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily revenue trend across Monday – Sunday for the current week.
            </p>
          </div>
        </div>

        {/* View Mode Switcher: Revenue vs Orders */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto border border-slate-200 dark:border-slate-700/80">
          <button
            onClick={() => setMetric('revenue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              metric === 'revenue'
                ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Revenue (₹)</span>
          </button>
          <button
            onClick={() => setMetric('orders')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              metric === 'orders'
                ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Orders Count</span>
          </button>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">This Week Total</span>
            <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="font-mono font-bold text-base sm:text-lg text-slate-900 dark:text-white">
            {formatInr(totalWeekRevenue)}
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {totalWeekOrders} transactions
          </span>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Daily Average</span>
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="font-mono font-bold text-base sm:text-lg text-slate-900 dark:text-white">
            {formatInr(avgDailyRevenue)}
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Across 7 days</span>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Peak Day</span>
            <Award className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
            {peakDay ? peakDay.fullDate : 'No sales yet'}
          </div>
          <span className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 block mt-0.5">
            {peakDay ? formatInr(peakDay.revenue) : '₹0'}
          </span>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Bills</span>
            <ShoppingBag className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="font-mono font-bold text-base sm:text-lg text-slate-900 dark:text-white">
            {totalWeekOrders}
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Active this week</span>
        </div>
      </div>

      {/* Recharts Bar Chart Container */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weekDays} margin={{ top: 15, right: 10, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.25} />
            <XAxis
              dataKey="dayName"
              stroke="#64748b"
              fontSize={11}
              fontWeight={600}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1', opacity: 0.5 }}
              tickFormatter={(val, idx) => {
                const day = weekDays[idx];
                return day ? `${val} ${day.dateNumber}` : val;
              }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => (metric === 'revenue' ? `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}` : `${v}`)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey={metric === 'revenue' ? 'revenue' : 'orders'}
              radius={[6, 6, 0, 0]}
              maxBarSize={48}
            >
              {weekDays.map((entry, index) => {
                // Different styling for today vs other days vs future days
                let fill = '#0d9488'; // teal-600
                if (entry.isToday) {
                  fill = '#059669'; // emerald-600 for today
                } else if (!entry.isPastOrToday) {
                  fill = '#cbd5e1'; // light slate for upcoming days
                } else if (entry.revenue === 0) {
                  fill = '#e2e8f0'; // empty days
                }

                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={fill}
                    className="transition-all hover:opacity-85 cursor-pointer"
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend / Helper Footer */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Today</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-teal-600" />
            <span>This Week</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 dark:bg-slate-700" />
            <span>Upcoming / Nil</span>
          </span>
        </div>

        <span className="hidden sm:inline italic text-[10px]">
          Hover or tap on any bar for revenue & tax details
        </span>
      </div>
    </div>
  );
};
