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
    expect(a.overview.receipts).toBe(8);
    expect(a.overview.from).toBe('2026-07-29');
    expect(a.overview.to).toBe('2026-10-09');
    expect(a.overview.spend).toBe(receipts.reduce((s, r) => s + r.total, 0));
    expect(a.orders.map((o) => o.date)).toEqual([...a.orders.map((o) => o.date)].sort());
  });

  it('de-duplicates the same order loaded twice', () => {
    expect(analyse([...receipts, ...receipts]).overview.receipts).toBe(8);
  });

  it('builds a fixed-basket inflation figure from repeat buys', () => {
    expect(a.inflation.products).toBeGreaterThan(5);
    expect(a.inflation.up + a.inflation.down + a.inflation.same).toBe(a.inflation.products);
    expect(a.indexSeries[0].index).toBe(100);
    expect(a.indexSeries.at(-1)!.index).toBeCloseTo(100 + a.inflation.pct, 6);
  });

  it('tracks shelf price history for repeat products', () => {
    const bread = a.products.find((p) => p.name === 'Tesco White Toastie Bread Thick Sliced 800g')!;
    expect(bread.orders).toBeGreaterThan(3);
    expect(bread.points.every((p) => p.shelf === 75)).toBe(true);
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
    ['Cadbury Dairy Milk Chocolate Bar 180g', 'Snacks & treats'],
    ['Tesco Watermelon Chunks 300G', 'Fruit & veg'],
    ['Tesco Soft Scoop Vanilla Ice Cream 2L', 'Frozen'],
    ['Tesco Crunchy 100% Peanut Butter 340g', 'Cupboard'],
    ['Walkers Baked Prawn Cocktail Multipack Crisps 6x22g', 'Snacks & treats'],
    ['Tesco British Natural Mineral Water Still 2L', 'Drinks'],
  ])('%s → %s', (name, cat) => expect(categorise(name)).toBe(cat));
});
