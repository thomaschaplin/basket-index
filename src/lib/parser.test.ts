import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { familyKey, parseReceiptText, parseSize } from './parser';

const dir = path.join(__dirname, '__fixtures__');
const fixture = (date: string) => parseReceiptText(fs.readFileSync(path.join(dir, `receipt-${date}.txt`), 'utf8'));

describe('parseReceiptText', () => {
  it('reads order details and totals', () => {
    const r = fixture('2026-07-29');
    expect(r).toMatchObject({ orderId: '1000-0000-001', date: '2026-07-29', channel: 'Online', subtotal: 11033, total: 9383, points: 93 });
    expect(r.items).toHaveLength(53);
    expect(r.itemsTotal).toBe(9383);
    expect(r.warnings).toEqual([]);
  });

  it('joins product names that wrap onto two lines', () => {
    const r = fixture('2026-07-29');
    expect(r.items.find((i) => i.name.startsWith('Oral-B'))).toMatchObject({
      name: 'Oral-B Pro Expert Professional Protection Mint Toothpaste 75Ml', qty: 1, unitPrice: 395, saving: 184, lineTotal: 211,
    });
  });

  it('treats loose produce as weighed', () => {
    const carrots = fixture('2026-07-29').items.find((i) => i.name === 'Tesco Carrots Loose')!;
    expect(carrots).toMatchObject({ weighed: true, unitPrice: 69, lineTotal: 40 });
  });

  it('skips free samples', () => {
    expect(fixture('2026-07-29').items.some((i) => /free sample/i.test(i.name))).toBe(false);
  });

  it('flags receipts whose lines do not reconcile with the charged total', () => {
    expect(fixture('2026-08-05').warnings[0]).toMatch(/charged £87\.40, but the items add up to £87\.00/);
    expect(fixture('2026-08-17').warnings[0]).toMatch(/charged £59\.41, but the items add up to £55\.66/);
  });

  it('detects a whole-basket discount', () => {
    expect(fixture('2026-07-29').basketDiscount).toEqual({ amount: 1650, pct: 15 });
  });

  it('every fixture parses with a date, items, and line maths that add up', () => {
    for (const f of fs.readdirSync(dir)) {
      const r = parseReceiptText(fs.readFileSync(path.join(dir, f), 'utf8'));
      expect(r.date, f).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.items.length, f).toBeGreaterThan(20);
      expect(r.warnings.filter((w) => w.startsWith("Line doesn't")), f).toEqual([]);
    }
  });

  it('handles thousands separators in money', () => {
    const r = parseReceiptText('Order ID: 1-2 Purchase date: 1/2/2026 Total cost 1 Big Telly £1,299.00 - £1,299.00 Payment summary Subtotal: £1,299.00 Total: £1,299.00');
    expect(r.items[0]).toMatchObject({ unitPrice: 129900, lineTotal: 129900 });
    expect(r.total).toBe(129900);
    expect(r.warnings).toEqual([]);
  });
});

describe('parseSize', () => {
  it.each([
    ['Walkers Baked Sea Salt Multipack Crisps 6x22g', { count: 6, amount: 132, unit: 'g' }],
    ['Tango Apple Sugar Free Cans 8 x 330ml', { count: 8, amount: 2640, unit: 'ml' }],
    ['Tesco British Whole Milk 2.272L, 4 Pints', { amount: 2272, unit: 'ml' }],
    ['Tesco All Rounder Potatoes 2Kg', { amount: 2000, unit: 'g' }],
    ['Comfort Fabric Conditioner Blue Skies 80 Washes 2400ml', { amount: 2400, unit: 'ml' }],
    ['Tesco Pink Lady Apples 5 Pack', { amount: 5, unit: 'each' }],
  ])('%s', (name, expected) => expect(parseSize(name)).toMatchObject(expected));

  it('returns null without a size', () => expect(parseSize('Tesco Pineapple')).toBeNull());
});

describe('familyKey', () => {
  it('ignores pack size and word order', () => {
    expect(familyKey('Tesco Mature Cheddar 700G')).toBe(familyKey('Tesco Mature Cheddar 400G'));
    expect(familyKey('Free Range Eggs Medium 6 Pack')).toBe(familyKey('Medium Free Range Eggs 12 Pack'));
  });
});
