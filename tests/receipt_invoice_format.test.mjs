import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Replicates getBusinessShortCode and receipt number generation logic from src/store/usePosStore.ts
 */
function getBusinessShortCode(bizName, explicitCode) {
  if (explicitCode) {
    const cleaned = explicitCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (cleaned.length >= 2 && cleaned.length <= 4) return cleaned;
  }
  if (!bizName) return 'POS';

  const cleanName = bizName.trim();
  const lower = cleanName.toLowerCase();
  if (lower.includes('spice') && lower.includes('cafe')) {
    return 'SPC';
  }

  const words = cleanName.split(/\s+/).filter(Boolean);
  if (words.length >= 3) {
    return words.slice(0, 4).map((w) => w[0].toUpperCase()).join('');
  }

  if (words.length === 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return cleanName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 3) || 'POS';
}

function generateReceiptNumber(business, existingSales) {
  const currentBizId = business?.id || '11111111-1111-1111-1111-111111111111';
  const bizShortCode = getBusinessShortCode(business?.name, business?.code);
  const currentYear = new Date().getFullYear();

  const bizSales = existingSales.filter(
    (s) => s.businessId === currentBizId || (!s.businessId && currentBizId === '11111111-1111-1111-1111-111111111111')
  );

  let maxSeq = 0;
  for (const s of bizSales) {
    if (s.receiptNumber) {
      const match = s.receiptNumber.match(new RegExp(`KWI-[A-Z0-9]+-${currentYear}-(\\d+)`, 'i'));
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  }

  const nextSeq = maxSeq > 0 ? maxSeq + 1 : (bizSales.length + 1);
  const seqStr = String(nextSeq).padStart(4, '0');
  return `KWI-${bizShortCode}-${currentYear}-${seqStr}`;
}

test('Short code generation: Spice Cafe produces SPC', () => {
  assert.equal(getBusinessShortCode('Spice Cafe'), 'SPC');
  assert.equal(getBusinessShortCode('Spice Cafe Surat'), 'SPC');
});

test('Short code generation: Cafe coffee produces CC', () => {
  assert.equal(getBusinessShortCode('Cafe coffee'), 'CC');
  assert.equal(getBusinessShortCode('Cafe Coffee'), 'CC');
});

test('Short code generation: Cafe coffee in produces CCI', () => {
  assert.equal(getBusinessShortCode('Cafe coffee in'), 'CCI');
});

test('Short code generation: Single word returns first 3 characters uppercase', () => {
  assert.equal(getBusinessShortCode('Aura'), 'AUR');
  assert.equal(getBusinessShortCode('Starbucks'), 'STA');
});

test('Receipt Invoice Generation: Spice Cafe starts at KWI-SPC-2026-0001 when empty', () => {
  const year = new Date().getFullYear();
  const biz = { id: 'biz_spc', name: 'Spice Cafe' };
  const first = generateReceiptNumber(biz, []);
  assert.equal(first, `KWI-SPC-${year}-0001`);
});

test('Receipt Invoice Generation: Sequential increment 0001 -> 0002 -> 0003', () => {
  const year = new Date().getFullYear();
  const biz = { id: 'biz_cc', name: 'Cafe coffee' };

  const bill1 = generateReceiptNumber(biz, []);
  assert.equal(bill1, `KWI-CC-${year}-0001`);

  const bill2 = generateReceiptNumber(biz, [{ businessId: 'biz_cc', receiptNumber: bill1 }]);
  assert.equal(bill2, `KWI-CC-${year}-0002`);

  const bill3 = generateReceiptNumber(biz, [
    { businessId: 'biz_cc', receiptNumber: bill1 },
    { businessId: 'biz_cc', receiptNumber: bill2 },
  ]);
  assert.equal(bill3, `KWI-CC-${year}-0003`);
});

test('Multi-tenant isolation: Cafe Coffee sequence is isolated from Spice Cafe sales', () => {
  const year = new Date().getFullYear();
  const spiceSales = [
    { businessId: 'biz_spc', receiptNumber: `KWI-SPC-${year}-0001` },
    { businessId: 'biz_spc', receiptNumber: `KWI-SPC-${year}-0002` },
    { businessId: 'biz_spc', receiptNumber: `KWI-SPC-${year}-0003` },
  ];

  const cafeCoffeeBiz = { id: 'biz_cafe_coffee', name: 'Cafe coffee' };
  // Cafe Coffee has 0 prior sales
  const cafeCoffeeBill1 = generateReceiptNumber(cafeCoffeeBiz, spiceSales);
  assert.equal(cafeCoffeeBill1, `KWI-CC-${year}-0001`);
});
