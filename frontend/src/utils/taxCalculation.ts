export interface TaxBreakdown {
  subtotal: number;
  cgst: number;
  sgst: number;
  totalTax: number;
  discount: number;
  roundOff: number;
  totalAmount: number;
}

export interface TaxLineItem {
  price: number;
  quantity: number;
  taxRate?: number; // e.g. 0.05 for 5% or 0.18 for 18%
  discount?: number;
}

/**
 * Calculates deterministic tax breakdown and invoice totals.
 * Uses consistent minor-unit integer arithmetic to prevent floating-point drift.
 */
export function calculateSaleTotals(
  items: TaxLineItem[],
  orderDiscount: number = 0,
  defaultTaxRate: number = 0.05
): TaxBreakdown {
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

    // CGST and SGST split equally
    const lineCgst = Math.round(netItemSubtotal * halfRate);
    const lineSgst = Math.round(netItemSubtotal * halfRate);

    cgstCents += lineCgst;
    sgstCents += lineSgst;
  }

  const orderDiscountCents = Math.round(orderDiscount * 100);
  const totalTaxCents = cgstCents + sgstCents;
  const rawTotalCents = Math.max(0, subtotalCents + totalTaxCents - orderDiscountCents);

  // Cash / POS standard Indian round off to nearest whole Rupee
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

/**
 * Validates that an incoming sale's line totals match the header within 5 paise tolerance.
 */
export function validateSaleIntegrity(
  subtotal: number,
  totalTax: number,
  discount: number,
  roundOff: number,
  totalAmount: number
): boolean {
  const calculated = Math.round((subtotal + totalTax - discount + roundOff) * 100);
  const reported = Math.round(totalAmount * 100);
  return Math.abs(calculated - reported) <= 5;
}
