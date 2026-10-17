import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyse } from './analysis';
import { categorise } from './categories';
import { parseReceiptText } from './parser';

const dir = path.join(__dirname, '__fixtures__');
const receipts = fs.readdirSync(dir).map((f) => parseReceiptText(fs.readFileSync(path.join(dir, f), 'utf8')));
const a = analyse(receipts);

describe('analyse', () => {
  it('summarises all orders', () => {
    expect(a.overview.receipts).toBe(17);
    expect(a.overview.from).toBe('2026-05-02');
    expect(a.overview.to).toBe('2026-10-03');
    expect(a.overview.spend).toBe(receipts.reduce((s, r) => s + r.total, 0));
    expect(a.orders.map((o) => o.date)).toEqual([...a.orders.map((o) => o.date)].sort());
  });

  it('de-duplicates the same order loaded twice', () => {
    expect(analyse([...receipts, ...receipts]).overview.receipts).toBe(17);
  });

  it('builds a fixed-basket inflation figure from repeat buys', () => {
    expect(a.inflation.products).toBeGreaterThan(5);
    expect(a.inflation.up + a.inflation.down + a.inflation.same).toBe(a.inflation.products);
    expect(a.indexSeries[0].index).toBe(100);
    expect(a.indexSeries.at(-1)!.index).toBeCloseTo(100 + a.inflation.pct, 6);
  });

  it('tracks shelf price history for repeat products', () => {
    const butter = a.products.find((p) => p.name === 'Tesco Salted Butter 250g')!;
    expect([...new Set(butter.points.map((p) => p.shelf))]).toEqual([199, 215, 225]);
    const bread = a.products.find((p) => p.name === 'Tesco Wholemeal Bread 800g')!;
    expect(bread.points.every((p) => p.shelf === 75)).toBe(true);
  });

  it('spots shrinkflation but not an ordinary pack choice', () => {
    expect(a.shrinkflation.map((s) => s.after.name).sort()).toEqual([
      'Tesco Finest Belgian Milk Chocolate Bar 180G',
      'Tesco Fruit & Nut Crunchy Granola 850G',
    ]);
    const cheddar = a.packChoices.find((p) => p.best.name === 'Tesco Extra Mature Cheddar 700G');
    expect(cheddar?.sizes).toHaveLength(2);
    expect(a.shrinkflation.some((s) => /cheddar/i.test(s.after.name))).toBe(false);
  });

  it('category totals add up to the line totals', () => {
    const lines = a.purchases.reduce((s, p) => s + p.lineTotal, 0);
    expect(a.categories.reduce((s, c) => s + c.value, 0)).toBe(lines);
  });

  it('produces insights', () => {
    expect(a.insights.length).toBeGreaterThan(3);
  });

  it('handles no receipts', () => {
    const e = analyse([]);
    expect(e.overview.receipts).toBe(0);
    expect(e.insights).toEqual([]);
  });
});

describe('categorise', () => {
  it.each([
    ['Tesco Finest Belgian Milk Chocolate Bar 180G', 'Snacks & treats'],
    ['Tesco Watermelon Chunks 300G', 'Fruit & veg'],
    ['Tesco Chocolate Ice Cream 900Ml', 'Frozen'],
    ['Tesco Crunchy Peanut Butter 340G', 'Cupboard'],
    ['Walkers Prawn Cocktail Multipack Crisps 6x25g', 'Snacks & treats'],
    ['Tesco Still Mineral Water 2L', 'Drinks'],
    ['Tesco Tuna Chunks In Spring Water 4 X 145G', 'Meat & fish'],
    ['Tesco Baby Spinach 240G', 'Fruit & veg'],
    ['Tesco Non Bio Washing Powder 40 Washes 2Kg', 'Household'],
  ])('%s → %s', (name, cat) => expect(categorise(name)).toBe(cat));
});
