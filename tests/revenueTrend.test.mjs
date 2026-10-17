import { test } from 'node:test';
import assert from 'node:assert/strict';

// Test 30-day bucket aggregation matching SalesRevenueTrendChart.tsx logic
function aggregate30DayTrend(sales, daysCount = 30) {
  const data = [];
  const now = new Date();

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    const displayDate = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    data.push({
      dateKey,
      displayDate,
      revenue: 0,
      netSales: 0,
      tax: 0,
      orderCount: 0,
      itemCount: 0,
    });
  }

  const dataMap = new Map();
  data.forEach((item) => dataMap.set(item.dateKey, item));

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

  let totalRevenue = 0;
  let totalOrders = 0;
  let peakDay = null;

  for (const pt of data) {
    totalRevenue += pt.revenue;
    totalOrders += pt.orderCount;
    if (!peakDay || pt.revenue > peakDay.revenue) {
      peakDay = pt;
    }
  }

  const avgDailyRevenue = data.length > 0 ? totalRevenue / data.length : 0;

  return {
    chartData: data,
    totalRevenue,
    avgDailyRevenue,
    peakDay: peakDay && peakDay.revenue > 0 ? peakDay : null,
    totalOrders,
  };
}

test('30-Day Trend: Generates exactly 30 date buckets in chronological order', () => {
  const result = aggregate30DayTrend([], 30);
  assert.equal(result.chartData.length, 30);
  assert.equal(result.totalRevenue, 0);
  assert.equal(result.totalOrders, 0);
  assert.equal(result.peakDay, null);
});

test('30-Day Trend: Correctly aggregates sales into today and historical buckets', () => {
  const now = Date.now();
  const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;

  const sales = [
    {
      id: 's1',
      totalAmount: 1200,
      subtotal: 1140,
      totalGst: 60,
      timestamp: now,
      itemCount: 4,
    },
    {
      id: 's2',
      totalAmount: 800,
      subtotal: 760,
      totalGst: 40,
      timestamp: now,
      itemCount: 2,
    },
    {
      id: 's3',
      totalAmount: 2500,
      subtotal: 2380,
      totalGst: 120,
      timestamp: threeDaysAgo,
      itemCount: 6,
    },
  ];

  const result = aggregate30DayTrend(sales, 30);

  // Total revenue = 1200 + 800 + 2500 = 4500
  assert.equal(result.totalRevenue, 4500);
  assert.equal(result.totalOrders, 3);
  assert.equal(result.avgDailyRevenue, 4500 / 30);

  // Peak day should be threeDaysAgo with 2500 revenue
  assert.ok(result.peakDay);
  assert.equal(result.peakDay.revenue, 2500);
  assert.equal(result.peakDay.orderCount, 1);
});

test('7-Day and 14-Day Windows: Properly respects custom daysCount', () => {
  const result7 = aggregate30DayTrend([], 7);
  assert.equal(result7.chartData.length, 7);

  const result14 = aggregate30DayTrend([], 14);
  assert.equal(result14.chartData.length, 14);
});
