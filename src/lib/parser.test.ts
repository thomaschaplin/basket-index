import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { familyKey, parseReceiptText, parseSize } from './parser';

const dir = path.join(__dirname, '__fixtures__');
const fixture = (date: string) => parseReceiptText(fs.readFileSync(path.join(dir, `sample-${date}.txt`), 'utf8'));

describe('parseReceiptText', () => {
  it('reads order details and totals', () => {
    const r = fixture('2026-05-02');
    expect(r).toMatchObject({ orderId: '2000-0000-001', date: '2026-05-02', channel: 'Online', subtotal: 5828, total: 5828, points: 58 });
    expect(r.items).toHaveLength(26);
    expect(r.itemsTotal).toBe(5828);
    expect(r.warnings).toEqual([]);
  });

  it('joins product names that wrap onto two lines', () => {
    expect(fixture('2026-06-27').items.find((i) => i.name.startsWith("McVitie's"))).toMatchObject({
      name: "McVitie's Milk Chocolate Digestive Biscuits 266G", qty: 1, unitPrice: 225, saving: 68, lineTotal: 157,
    });
  });

  it('treats loose produce as weighed', () => {
    const bananas = fixture('2026-06-27').items.find((i) => i.name === 'Tesco Kiwi Fruit Loose')!;
    expect(bananas).toMatchObject({ weighed: true, unitPrice: 94, lineTotal: 103 });
  });

  it('skips free samples', () => {
    const r = parseReceiptText('Purchase date: 1/2/2026 Total cost 1 FREE SAMPLE - Some Sauce 490g £0.01 £0.01 £0.00 1 Tesco Bread 800g £0.75 - £0.75 Payment summary Total: £0.75');
    expect(r.items.map((i) => i.name)).toEqual(['Tesco Bread 800g']);
  });

  it('flags receipts whose lines do not reconcile with the charged total', () => {
    expect(fixture('2026-08-22').warnings[0]).toMatch(/charged £51\.07, but the items add up to £50\.67/);
  });

  it('detects a whole-basket discount', () => {
    expect(fixture('2026-06-27').basketDiscount).toEqual({ amount: 354, pct: 10 });
  });

  it('every fixture parses with a date, items, and line maths that add up', () => {
    for (const f of fs.readdirSync(dir)) {
      const r = parseReceiptText(fs.readFileSync(path.join(dir, f), 'utf8'));
      expect(r.date, f).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.items.length, f).toBeGreaterThan(10);
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
    ['Walkers Ready Salted Multipack Crisps 6x25g', { count: 6, amount: 150, unit: 'g' }],
    ['Tesco Cola Cans 8 x 330ml', { count: 8, amount: 2640, unit: 'ml' }],
    ['Tesco Semi Skimmed Milk 2.272L, 4 Pints', { amount: 2272, unit: 'ml' }],
    ['Tesco Baby Potatoes 1Kg', { amount: 1000, unit: 'g' }],
    ['Fabric Conditioner 80 Washes 2400ml', { amount: 2400, unit: 'ml' }],
    ['Tesco Gala Apples 6 Pack', { amount: 6, unit: 'each' }],
  ])('%s', (name, expected) => expect(parseSize(name)).toMatchObject(expected));

  it('returns null without a size', () => expect(parseSize('Tesco Ripe & Ready Mango Each')).toBeNull());
});

describe('familyKey', () => {
  it('ignores pack size and word order', () => {
    expect(familyKey('Tesco Extra Mature Cheddar 700G')).toBe(familyKey('Tesco Extra Mature Cheddar 350G'));
    expect(familyKey('Free Range Eggs Medium 6 Pack')).toBe(familyKey('Medium Free Range Eggs 12 Pack'));
  });
});
