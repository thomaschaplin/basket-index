import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { familyKey, joinLigatures, parseReceiptText, parseSize } from './parser';

const dir = path.join(__dirname, '__fixtures__');
const fixture = (name: string) => parseReceiptText(fs.readFileSync(path.join(dir, `sample-${name}.txt`), 'utf8'));

describe('parseReceiptText', () => {
  it('reads order details and totals', () => {
    const r = fixture('2025-10-25-online');
    expect(r).toMatchObject({ orderId: '2000-0000-001', date: '2025-10-25', channel: 'Online', subtotal: 5536, total: 5536, points: 55 });
    expect(r.items).toHaveLength(27);
    expect(r.itemsTotal).toBe(5536);
    expect(r.warnings).toEqual([]);
  });

  it('reads in-store order IDs and channel', () => {
    const head = (id: string) => `Receipt Order information Order ID: ${id} Purchase date: 19/10/2026 Channel: In-store VAT number: GB 220 4302 31 Your items Total cost 1 Tesco Bread 800g £0.75 - £0.75 Payment summary Total: £0.75`;
    expect(parseReceiptText(head('57E8-15KT-Q05F-XBNQ'))).toMatchObject({ orderId: '57E8-15KT-Q05F-XBNQ', channel: 'In-store', date: '2026-10-19' });
    expect(parseReceiptText(head('97401041200926145342850800037025')).orderId).toBe('97401041200926145342850800037025');
  });

  it('keeps in-store lines that have no product name', () => {
    const r = parseReceiptText('Purchase date: 21/1/2026 Total cost 1 Tesco Yogurt 4 X 90G £3.40 £0.80 £2.60 1 £0.25 - £0.25 1 Tesco Avocados Twin Pack £1.50 - £1.50 2 £0.70 - £1.40 1 Tesco Baguette 2 Pack £0.85 - £0.85 Payment summary Total: £6.60');
    expect(r.items.map((i) => [i.qty, i.name, i.lineTotal])).toEqual([
      [1, 'Tesco Yogurt 4 X 90G', 260], [1, 'Unnamed item', 25], [1, 'Tesco Avocados Twin Pack', 150], [2, 'Unnamed item', 140], [1, 'Tesco Baguette 2 Pack', 85],
    ]);
    expect(r.warnings).toEqual([]);
  });

  it('reads fuel bought by the litre as a weighed line', () => {
    const r = parseReceiptText('Purchase date: 23/10/2025 Total cost 13.9 DIESEL £1.44 - £20.00 Payment summary Subtotal: £20.00 Total: £20.00');
    expect(r.items).toEqual([expect.objectContaining({ qty: 1, name: 'DIESEL', unitPrice: 144, lineTotal: 2000, weighed: true })]);
    expect(r.warnings).toEqual([]);
    // Tesco truncates the litres column, so a whole-number quantity is unreliable for fuel too (45.3 L printed as "34").
    const t = parseReceiptText('Purchase date: 16/11/2025 Total cost 34 DIESEL £1.44 - £65.24 Payment summary Total: £65.24');
    expect(t.items[0]).toMatchObject({ qty: 1, weighed: true, lineTotal: 6524 });
    expect(t.warnings).toEqual([]);
  });

  it('joins product names that wrap onto two lines', () => {
    expect(fixture('2025-10-25-online').items.find((i) => i.name.startsWith("McVitie's"))).toMatchObject({
      name: "McVitie's Milk Chocolate Digestive Biscuits 266G", qty: 2, unitPrice: 225, saving: 0, lineTotal: 450,
    });
  });

  it('treats loose produce as weighed', () => {
    const kiwi = fixture('2025-11-07-online').items.find((i) => i.name === 'Tesco Kiwi Fruit Loose')!;
    expect(kiwi).toMatchObject({ weighed: true, unitPrice: 94, lineTotal: 69 });
  });

  it('skips free samples', () => {
    const r = parseReceiptText('Purchase date: 1/2/2026 Total cost 1 FREE SAMPLE - Some Sauce 490g £0.01 £0.01 £0.00 1 Tesco Bread 800g £0.75 - £0.75 Payment summary Total: £0.75');
    expect(r.items.map((i) => i.name)).toEqual(['Tesco Bread 800g']);
  });

  it('flags receipts whose lines do not reconcile with the charged total', () => {
    expect(fixture('2026-08-25-online').warnings[0]).toMatch(/charged £93\.50, but the items add up to £93\.10/);
  });

  it('detects a whole-basket discount', () => {
    expect(fixture('2026-06-20-online').basketDiscount).toEqual({ amount: 571, pct: 10 });
  });

  it('reads the in-store and fuel fixtures', () => {
    expect(fixture('2025-10-29-store')).toMatchObject({ orderId: 'LKQY-C4MM-AW34-RL94', channel: 'In-store', delivery: 0 });
    expect(fixture('2025-10-28-fuel')).toMatchObject({ orderId: '97401041228102500713306543417275', total: 4770, warnings: [] });
    expect(fixture('2025-10-28-fuel').items).toEqual([expect.objectContaining({ name: 'DIESEL', qty: 1, unitPrice: 142, lineTotal: 4770, weighed: true })]);
    expect(fixture('2026-03-12-store').items).toContainEqual(expect.objectContaining({ name: 'Unnamed item', lineTotal: 70 }));
  });

  it('every fixture parses with a date, items, and line maths that add up', () => {
    for (const f of fs.readdirSync(dir)) {
      const r = parseReceiptText(fs.readFileSync(path.join(dir, f), 'utf8'));
      expect(r.date, f).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.items.length, f).toBeGreaterThan(f.includes('online') ? 10 : 0); // top-ups and fuel stops are small
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

// A made-up Sainsbury's e-receipt as pdf.js extracts it: ligatures split off as their own text items ("Di ff user"),
// a name wrapped onto a second line, and order-level savings and coupons. No real receipt data.
const sainsburys = (lines: string, summary = 'Delivery cost   £1.50 \nSubtotal   £11.30 \nYou\'ve saved*   -£0.40 \nCoupons   -£5.00 \nTotal paid   £5.90') =>
  `Your receipt for order:   1200000001 \nSlot time:   Saturday 3rd January 2026, 8:00am - 9:00am \n${lines}\nOrder summary \n${summary} \n` +
  `We took payment on a card\nending in   4242 \nNectar   (************9876543) \nPrevious points balance   100 \nPoints earned   14 \nNew points balance   114 \n` +
  `If whilst inspecting the goods you   fi nd goods you do not\nwant, you are free to return them. Sainsbury's o ff ers a 30 day goodwill returns policy.`;
const SAINSBURYS_ITEMS =
  `Groceries (5 items) \n1   Sainsbury's British Semi Skimmed Milk 2.27L   £1.65 \n2   Sainsbury's Wholemeal Bread 800g   £1.50 \n` +
  `1   Home Di ff user 100ml Fresh Linen   £4.50 \n1   Zo fl ora Concentrated Multipurpose Disinfectant Country Garden 3\nin 1 Action 120ml   £1.75 \n`;

describe('parseReceiptText (Sainsbury\'s)', () => {
  it('reads order details, totals and Nectar points, but not card or Nectar numbers', () => {
    const r = parseReceiptText(sainsburys(SAINSBURYS_ITEMS));
    expect(r).toMatchObject({
      retailer: 'sainsburys', orderId: '1200000001', date: '2026-01-03', channel: 'Online',
      subtotal: 1130, reportedSavings: 40, delivery: 150, coupons: 500, total: 590, points: 14, warnings: [],
    });
    expect(JSON.stringify(r)).not.toMatch(/4242|9876543/);
  });

  it('reads item lines, rejoining split ligatures and wrapped names', () => {
    const r = parseReceiptText(sainsburys(SAINSBURYS_ITEMS));
    expect(r.items.map((i) => [i.qty, i.name, i.unitPrice, i.lineTotal])).toEqual([
      [1, "Sainsbury's British Semi Skimmed Milk 2.27L", 165, 165],
      [2, "Sainsbury's Wholemeal Bread 800g", 75, 150],
      [1, 'Home Diffuser 100ml Fresh Linen', 450, 450],
      [1, 'Zoflora Concentrated Multipurpose Disinfectant Country Garden 3 in 1 Action 120ml', 175, 175],
    ]);
    expect(r.items.every((i) => i.saving === 0 && !i.weighed)).toBe(true);
    // Lines are after offers but before coupons: they reconcile with total paid - delivery + coupons.
    expect(r.itemsTotal).toBe(940);
  });

  it('reads items across several section headings and checks the item count', () => {
    const two = `Groceries (2 items) \n2   Sainsbury's Wholemeal Bread 800g   £1.50 \nFrozen & Chilled (1 item) \n1   Sainsbury's Garden Peas 1kg   £1.60 \n`;
    const r = parseReceiptText(sainsburys(two, 'Delivery cost   £0.00 \nSubtotal   £3.10 \nTotal paid   £3.10'));
    expect(r.items.map((i) => i.name)).toEqual(["Sainsbury's Wholemeal Bread 800g", "Sainsbury's Garden Peas 1kg"]);
    expect(r.warnings).toEqual([]);
    const short = parseReceiptText(sainsburys(two.replace('(1 item)', '(3 items)'), 'Delivery cost   £0.00 \nSubtotal   £3.10 \nTotal paid   £3.10'));
    expect(short.warnings).toEqual(['The receipt lists 5 items, but Basket Index could read 3']);
  });

  it("flags Sainsbury's receipts whose lines do not reconcile", () => {
    const r = parseReceiptText(sainsburys(SAINSBURYS_ITEMS, 'Delivery cost   £1.50 \nCoupons   -£5.00 \nTotal paid   £6.20'));
    expect(r.warnings).toEqual([expect.stringMatching(/^Sainsbury's charged £6\.20, but the items add up to £9\.40 \(£0\.30 more/)]);
  });
});

describe('joinLigatures', () => {
  it.each([
    ['Home Di ff user', 'Home Diffuser'],
    ['Zo fl ora Lemon', 'Zoflora Lemon'],
    ['you   fi nd goods', 'you   find goods'],
    ['Co ff ee 12  fl  oz', 'Coffee 12  fl  oz'], // real spaces either side are kept
  ])('%s', (raw, expected) => expect(joinLigatures(raw)).toBe(expected));
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
