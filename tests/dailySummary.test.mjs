import { test } from 'node:test';
import assert from 'node:assert/strict';

// Test the daily summary aggregation logic matching DailySummaryReport.tsx
function aggregateDailySummary(sales) {
  let totalGrossRevenue = 0;
  let totalSubtotal = 0;
  let totalTax = 0;
  let totalUnitsSold = 0;

  const paymentMap = {
    CASH: { count: 0, amount: 0 },
    UPI: { count: 0, amount: 0 },
    CARD: { count: 0, amount: 0 },
  };

  const productVolumeMap = {};
  const categoryVolumeMap = {};

  for (const sale of sales) {
    totalGrossRevenue += sale.totalAmount;
    totalSubtotal += sale.subtotal;
    totalTax += sale.totalGst;

    const method = sale.paymentMethod || 'CASH';
    if (!paymentMap[method]) {
      paymentMap[method] = { count: 0, amount: 0 };
    }
    paymentMap[method].count += 1;
    paymentMap[method].amount += sale.totalAmount;

    if (sale.items && sale.items.length > 0) {
      for (const item of sale.items) {
        const qty = Number(item.quantity) || 1;
        const lineRevenue = (Number(item.price) || 0) * qty;
        totalUnitsSold += qty;

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

  const orderCount = sales.length;
  const averageOrderValue = orderCount > 0 ? totalGrossRevenue / orderCount : 0;
  const averageItemsPerOrder = orderCount > 0 ? totalUnitsSold / orderCount : 0;

  const topProducts = Object.values(productVolumeMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

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
}

test('Daily Summary: Aggregates total sales, subtotal, and tax correctly', () => {
  const sampleSales = [
    {
      id: 's1',
      totalAmount: 462,
      subtotal: 440,
      totalGst: 22,
      paymentMethod: 'CASH',
      items: [
        { name: 'Cappuccino', category: 'Coffee', quantity: 2, price: 220 },
      ],
    },
    {
      id: 's2',
      totalAmount: 315,
      subtotal: 300,
      totalGst: 15,
      paymentMethod: 'UPI',
      items: [
        { name: 'Butter Croissant', category: 'Bakery', quantity: 1, price: 150 },
        { name: 'Iced Latte', category: 'Coffee', quantity: 1, price: 150 },
      ],
    },
  ];

  const report = aggregateDailySummary(sampleSales);

  assert.equal(report.totalGrossRevenue, 777);
  assert.equal(report.totalSubtotal, 740);
  assert.equal(report.totalTax, 37);
  assert.equal(report.orderCount, 2);
  assert.equal(report.averageOrderValue, 388.5);
});

test('Payment Method Breakdown: Categorizes Cash, UPI, Card amounts and counts', () => {
  const sampleSales = [
    { totalAmount: 500, subtotal: 476, totalGst: 24, paymentMethod: 'CASH' },
    { totalAmount: 200, subtotal: 190, totalGst: 10, paymentMethod: 'CASH' },
    { totalAmount: 300, subtotal: 285, totalGst: 15, paymentMethod: 'UPI' },
    { totalAmount: 1000, subtotal: 950, totalGst: 50, paymentMethod: 'CARD' },
  ];

  const report = aggregateDailySummary(sampleSales);

  assert.equal(report.paymentMap.CASH.count, 2);
  assert.equal(report.paymentMap.CASH.amount, 700);

  assert.equal(report.paymentMap.UPI.count, 1);
  assert.equal(report.paymentMap.UPI.amount, 300);

  assert.equal(report.paymentMap.CARD.count, 1);
  assert.equal(report.paymentMap.CARD.amount, 1000);
});

test('Item Volume Breakdown: Accurately counts item volume and ranks top sellers', () => {
  const sampleSales = [
    {
      totalAmount: 600,
      subtotal: 570,
      totalGst: 30,
      paymentMethod: 'UPI',
      items: [
        { name: 'Espresso', category: 'Coffee', quantity: 3, price: 100 },
        { name: 'Croissant', category: 'Bakery', quantity: 2, price: 150 },
      ],
    },
    {
      totalAmount: 300,
      subtotal: 285,
      totalGst: 15,
      paymentMethod: 'CASH',
      items: [
        { name: 'Espresso', category: 'Coffee', quantity: 2, price: 100 },
        { name: 'Cold Brew', category: 'Coffee', quantity: 1, price: 100 },
      ],
    },
  ];

  const report = aggregateDailySummary(sampleSales);

  // Total items = (3+2) + (2+1) = 8
  assert.equal(report.totalUnitsSold, 8);
  assert.equal(report.averageItemsPerOrder, 4);

  // Top seller should be Espresso (5 units)
  assert.equal(report.topProducts[0].name, 'Espresso');
  assert.equal(report.topProducts[0].quantity, 5);
  assert.equal(report.topProducts[0].revenue, 500);

  // Second seller should be Croissant (2 units)
  assert.equal(report.topProducts[1].name, 'Croissant');
  assert.equal(report.topProducts[1].quantity, 2);

  // Category volume: Coffee (6 units: 5 espresso + 1 cold brew), Bakery (2 units)
  assert.equal(report.categoryVolume[0].category, 'Coffee');
  assert.equal(report.categoryVolume[0].quantity, 6);
  assert.equal(report.categoryVolume[1].category, 'Bakery');
  assert.equal(report.categoryVolume[1].quantity, 2);
});

test('Empty Sales: Gracefully handles zero sales without NaN', () => {
  const report = aggregateDailySummary([]);

  assert.equal(report.totalGrossRevenue, 0);
  assert.equal(report.orderCount, 0);
  assert.equal(report.totalUnitsSold, 0);
  assert.equal(report.averageOrderValue, 0);
  assert.equal(report.averageItemsPerOrder, 0);
  assert.equal(report.topProducts.length, 0);
  assert.equal(report.categoryVolume.length, 0);
});
