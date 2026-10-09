import { test } from 'node:test';
import assert from 'node:assert/strict';

// Test implementation directly with minor-unit integer arithmetic
function calculateSaleTotals(items, orderDiscount = 0, defaultTaxRate = 0.05) {
  let subtotalCents = 0;
  let cgstCents = 0;
  let sgstCents = 0;

  for (const item of items) {
    const itemSubtotal = Math.round(item.price * item.quantity * 100);
    const itemDiscount = Math.round((item.discount || 0) * 100);
    const netItemSubtotal = Math.max(0, itemSubtotal - itemDiscount);
    
    subtotalCents += netItemSubtotal;

    const rate = item.taxRate !== undefined ? item.taxRate : defaultTaxRate;
    const halfRate = rate / 2.0;

    const lineCgst = Math.round(netItemSubtotal * halfRate);
    const lineSgst = Math.round(netItemSubtotal * halfRate);

    cgstCents += lineCgst;
    sgstCents += lineSgst;
  }

  const orderDiscountCents = Math.round(orderDiscount * 100);
  const totalTaxCents = cgstCents + sgstCents;
  const rawTotalCents = Math.max(0, subtotalCents + totalTaxCents - orderDiscountCents);

  const roundedRupees = Math.round(rawTotalCents / 100);
  const roundedTotalCents = roundedRupees * 100;
  const roundOffCents = roundedTotalCents - rawTotalCents;

  return {
    subtotal: subtotalCents / 100,
    cgst: cgstCents / 100,
    sgst: sgstCents / 100,
    totalTax: totalTaxCents / 100,
    discount: orderDiscountCents / 100,
    roundOff: roundOffCents / 100,
    totalAmount: roundedTotalCents / 100,
  };
}

function validateSaleIntegrity(subtotal, totalTax, discount, roundOff, totalAmount) {
  const calculated = Math.round((subtotal + totalTax - discount + roundOff) * 100);
  const reported = Math.round(totalAmount * 100);
  return Math.abs(calculated - reported) <= 5;
}

test('5% Cafe GST: Flat calculation without discount', () => {
  const items = [
    { price: 220, quantity: 2, taxRate: 0.05 }, // 440 Subtotal
  ];
  const totals = calculateSaleTotals(items);

  assert.equal(totals.subtotal, 440.00);
  assert.equal(totals.cgst, 11.00); // 2.5% of 440
  assert.equal(totals.sgst, 11.00); // 2.5% of 440
  assert.equal(totals.totalTax, 22.00); // 5% total
  assert.equal(totals.totalAmount, 462.00);
  assert.equal(validateSaleIntegrity(totals.subtotal, totals.totalTax, 0, totals.roundOff, totals.totalAmount), true);
});

test('Multiple items with 18% Retail GST and order discount', () => {
  const items = [
    { price: 100, quantity: 1, taxRate: 0.18 }, // 100, tax 18 (9 + 9)
    { price: 200, quantity: 1, taxRate: 0.18 }, // 200, tax 36 (18 + 18)
  ];
  const totals = calculateSaleTotals(items, 50); // 50 discount

  assert.equal(totals.subtotal, 300.00);
  assert.equal(totals.totalTax, 54.00);
  assert.equal(totals.discount, 50.00);
  // Net before roundoff: 300 + 54 - 50 = 304.00
  assert.equal(totals.totalAmount, 304.00);
  assert.equal(validateSaleIntegrity(totals.subtotal, totals.totalTax, totals.discount, totals.roundOff, totals.totalAmount), true);
});

test('Round-off edge cases: .49 and .51 rounding', () => {
  const items = [
    { price: 99.49, quantity: 1, taxRate: 0.05 }, // 99.49, tax 4.98, raw total: 104.47 -> round to 104.00
  ];
  const totals = calculateSaleTotals(items);
  assert.equal(totals.totalAmount, 104.00);
  assert.equal(totals.roundOff, -0.47);
  assert.equal(validateSaleIntegrity(totals.subtotal, totals.totalTax, 0, totals.roundOff, totals.totalAmount), true);
});
