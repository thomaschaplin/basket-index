import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyse } from './analysis';
import { categorise, weighedUnit } from './categories';
import { parseReceiptText } from './parser';

const dir = path.join(__dirname, '__fixtures__');
const receipts = fs.readdirSync(dir).map((f) => parseReceiptText(fs.readFileSync(path.join(dir, f), 'utf8')));
const a = analyse(receipts);

describe('analyse', () => {
  it('summarises all orders', () => {
    expect(a.overview.receipts).toBe(88);
    expect(a.overview.from).toBe('2025-10-25');
    expect(a.overview.to).toBe('2026-10-14');
    expect(a.overview.spend).toBe(receipts.reduce((s, r) => s + r.total, 0));
    expect(a.orders.map((o) => o.date)).toEqual([...a.orders.map((o) => o.date)].sort());
  });

  it('puts a product in the category you picked, everywhere it shows up', () => {
    const milk = a.products.find((p) => p.name === 'Tesco Semi Skimmed Milk 2.272L, 4 Pints')!;
    expect(milk.category).toBe('Dairy & eggs');
    const b = analyse(receipts, { [milk.key]: 'Drinks' });
    expect(b.products.find((p) => p.key === milk.key)!.category).toBe('Drinks');
    expect(b.purchases.filter((p) => p.key === milk.key).every((p) => p.category === 'Drinks')).toBe(true);
    const drinks = (x: typeof a) => x.categories.find((c) => c.name === 'Drinks')?.value ?? 0;
    expect(drinks(b) - drinks(a)).toBe(milk.spend);
    // Other products are untouched.
    expect(b.products.filter((p) => p.key !== milk.key).map((p) => p.category)).toEqual(a.products.filter((p) => p.key !== milk.key).map((p) => p.category));
  });

  it('de-duplicates the same order loaded twice', () => {
    expect(analyse([...receipts, ...receipts]).overview.receipts).toBe(88);
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

  it('covers a year of online shops, in-store top-ups and fuel', () => {
    const channels = receipts.reduce<Record<string, number>>((m, r) => {
      m[r.channel!] = (m[r.channel!] ?? 0) + 1;
      return m;
    }, {});
    expect(channels).toEqual({ Online: 31, 'In-store': 57 });
    expect(a.stapleMonths).toBe(13);
    expect(a.staples[0].name).toBe('Tesco Semi Skimmed Milk 2.272L, 4 Pints');
    expect(a.categories.map((c) => c.name)).toEqual(expect.arrayContaining(['Fuel', 'Health', 'Clothing & home', 'Baby & kids', 'Other']));
    // Fuel is there but shouldn't dominate a grocery example.
    expect(a.categories[0].name).not.toBe('Fuel');
  });

  it('spots shrinkflation but not an ordinary pack choice', () => {
    expect(a.shrinkflation.map((s) => s.after.name).sort()).toEqual(['Tesco Finest Belgian Milk Chocolate Bar 180G', 'Tesco Fruit & Nut Crunchy Granola 850G']);
    const cheddar = a.packChoices.find((p) => p.best.name === 'Tesco Extra Mature Cheddar 700G');
    expect(cheddar?.sizes).toHaveLength(2);
    expect(a.shrinkflation.some((s) => /cheddar/i.test(s.after.name))).toBe(false);
  });

  it('finds staples by months bought in, so many small top-up shops still count', () => {
    // A product in every month but only a third of the shops: frequent small shops shouldn't hide it.
    const shop = (id: string, date: string, extra = '') =>
      parseReceiptText(`Order ID: ${id} Purchase date: ${date} Total cost ${extra} 1 Tesco Wholemeal Bread 800g £0.75 - £0.75 Payment summary Total: £0.75`);
    const rs = ['01', '02', '03'].flatMap((m) =>
      [shop(`B${m}`, `5/${m}/2026`), shop(`T${m}a`, `12/${m}/2026`, '1 DIESEL £1.44 - £20.00'), shop(`T${m}b`, `20/${m}/2026`, '1 DIESEL £1.44 - £20.00')].map(
        (r, i) => (i ? { ...r, items: r.items.filter((x) => x.name === 'DIESEL') } : r),
      ),
    );
    const s = analyse(rs);
    expect(s.stapleMonths).toBe(3);
    expect(s.staples.map((x) => [x.name, x.months])).toEqual([
      ['DIESEL', 3],
      ['Tesco Wholemeal Bread 800g', 3],
    ]);
  });

  it("keeps Tesco and Sainsbury's prices apart and counts Sainsbury's order-level savings and Nectar points", () => {
    const tesco = (id: string, date: string, price: string) =>
      parseReceiptText(
        `Order ID: ${id} Purchase date: ${date} Total cost 1 Comfort Fabric Conditioner 1.16L ${price} - ${price} Payment summary Total: ${price} Clubcard points earned: 100`,
      );
    const sains = (id: string, date: string, price: string) =>
      parseReceiptText(
        `Your receipt for order: ${id} Slot time: ${date}, 8:00am - 9:00am Groceries (1 item) 1 Comfort Fabric Conditioner 1.16L ${price} Order summary Delivery cost £0.00 You've saved* -£0.50 Total paid ${price} Points earned 100`,
      );
    const m = analyse([
      tesco('T-1', '5/1/2026', '£3.00'),
      sains('900001', 'Monday 12th January 2026', '£3.50'),
      tesco('T-2', '2/2/2026', '£3.00'),
      sains('900002', 'Monday 9th February 2026', '£3.50'),
    ]);
    expect(m.priceChanges.map((c) => c.change)).toEqual([0, 0]);
    expect(m.inflation.pct).toBe(0); // switching shops isn't inflation
    expect(new Set(m.products.map((p) => p.retailer))).toEqual(new Set(['tesco', 'sainsburys']));
    expect(m.overview.retailers.sort()).toEqual(['sainsburys', 'tesco']);
    expect(m.overview.savings).toBe(100);
    expect(m.overview.pointsValue).toBe(300); // 200 Clubcard at 1p + 200 Nectar at 0.5p
    expect(m.orders.filter((o) => o.retailer === 'sainsburys').map((o) => o.saved)).toEqual([50, 50]);
    expect(m.reportedSavings).toBe(0);
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
    ['DIESEL', 'Fuel'],
    ['Unleaded Petrol', 'Fuel'],
    ["Kellogg's Crunchy Nut Honey & Nut Clusters Breakfast Cereal 400g", 'Cupboard'],
    ['Jordans Simply Granola 750G', 'Cupboard'],
    ['Tesco Seedless Raisins 12 Pack 168G', 'Cupboard'],
    ['Tesco Prime Cuts Honey Roast Ham 6 Slices 120g', 'Meat & fish'],
    ['TOBLERONE MILK CHOCOLATE WITH HONEY & ALMOND NOUGAT 340g', 'Snacks & treats'],
    ['Belvita Breakfast Strawberry & Yogurt Crunch Cereal Biscuit Snack Bars Pack 5 x 50.6g', 'Snacks & treats'],
    ['Unnamed item', 'Other'],
    ['F&F High Rise Relaxed Jeans in Blue', 'Clothing & home'],
    ['F&F Girls Sequin Tulle Dress in Burgundy', 'Clothing & home'],
    ['LEGO 77261 Ferrari 499P', 'Clothing & home'],
    ['Yankee Candle Midnight Jasmine Plug Refill 2 X 18.5', 'Clothing & home'],
    ['DISNEY - Winnie the Pooh Nature Walk Bedding Set Cotton Rich Toddler', 'Clothing & home'],
    ['Tesco Rainbow Tulips Bunch', 'Clothing & home'],
    ["Carlton Father's Day Card Someone Special 129397-0-1", 'Clothing & home'],
    ['Tesco Everyday Bday Brother Kraft Stars 113340-0-1', 'Clothing & home'],
    ['Tesco Light Caesar Salad Dressing 250ml', 'Cupboard'],
    ['Sure Women Bright Bouquet 48h Antiperspirant Deodorant 200ml', 'Toiletries'],
    ['Tesco Rose Bouquet Cake', 'Snacks & treats'],
    ['Calpol Vapour Plug Refill Pads Lavender & Chamomile - 3+ Months 10s', 'Health'],
    ['Tesco Health Pain Relief Tablets - Paracetamol 500mg 16s', 'Health'],
    ['Tesco Health High Strength Vitamin D 25mcg Tablets 120s', 'Health'],
    ['Broncho Junior Cough Syrup From 3 Years Old 120ml', 'Health'],
    ['Snufflebabe Vapour Rub 35G', 'Health'],
    ['Applied Nutrition Hydration Electrolyte Tablets Vimto 20 x 4g', 'Health'],
    ['Tesco Maternity Towel 20 Pack', 'Health'],
    ['Robinsons Fruit & Barley with Vitamins Summer Fruits Squash 1L', 'Drinks'],
    ['Mam Easy Start Anti-Colic Bottle 0+ Months 2 x 160ml', 'Baby & kids'],
    ['Tommee Tippee Anytime Soothers, 18-36m, Pack of 2', 'Baby & kids'],
    ['Tiny to Tots Step Stool', 'Baby & kids'],
    ['Tesco Unsmoked Gammon Steaks 2 Pack 450G', 'Meat & fish'],
    ['Tesco Finest Quarter Pounders 454g', 'Meat & fish'],
    ['Cadbury Creme Egg 5 Pack 200G', 'Snacks & treats'],
    ['Tesco Millionaire Bites 22 Pack', 'Snacks & treats'],
    ['Tesco Salted Roasted Peanuts 200g', 'Snacks & treats'],
    ['Tesco Microwave Basmati Rice 250G', 'Cupboard'],
    ['Napolina Passata 690G', 'Cupboard'],
    ['Heinz Baked Beanz 4 x 415G', 'Cupboard'],
    ['Tesco Paprika 50g', 'Cupboard'],
    ['Tesco Hot Cross Buns 6 pack', 'Bakery'],
    ['H.W. Nevills Pain Au Chocolat 8 Pack', 'Bakery'],
    ['Tesco British Creme Fraiche 300Ml', 'Dairy & eggs'],
    ['Brewdog Black Heart Stout 4 X 440 Ml', 'Drinks'],
    ['Tesco Omega 3 Fish Fingers 30 Pack 900g', 'Frozen'],
    ['Tesco Ready Rolled Puff Pastry 320G', 'Chilled & ready'],
    ['Tesco 2 Steak Slice 300g', 'Chilled & ready'],
    ['Tesco 4 Tex Mex Dips 400g', 'Chilled & ready'],
    ['Dishmatic General Purpose Refills 6 Pack', 'Household'],
    ['Tesco Spring Fresh Tumble Dryer Sheets 40S', 'Household'],
    ['Simple Purify+ Gel Cleanser 240ml', 'Toiletries'],
    ['Maybelline Foundation Fit Me Warm Ivory 30Ml', 'Toiletries'],
    ['Imperial Leather Moisting Flower & Vanilla Wash 500Ml', 'Toiletries'],
    ['Tesco Finest Nectarines 3 Pack', 'Fruit & veg'],
    // Guards: words the new keywords must not steal
    ['Tesco Green Beans 220G', 'Fruit & veg'],
    ['Kallo Rice Cakes Sea Salt 130G', 'Snacks & treats'],
    ['Tesco Vanilla Yogurt 500G', 'Dairy & eggs'],
    ["Ella's Kitchen Apple Puree 120G", 'Baby & kids'],
    ['Walkers Sensations Paprika Crisps 150G', 'Snacks & treats'],
    ['Little Duck Supreme Quilted Toilet Tissue 16 Mega Rolls', 'Household'],
    ['Tesco Breaded Chicken Steaks 4 Pack 380g', 'Meat & fish'],
    ['Tesco Brioche Burger Buns 4 Pack', 'Bakery'],
    ['Anthisan Insect Bites and Stings Relief Cream 25g', 'Health'],
    ['Cadbury Mini Eggs Shell Egg 95g', 'Snacks & treats'],
    ['Tesco Kitchen Towel 2 Roll', 'Household'],
  ])('%s → %s', (name, cat) => expect(categorise(name)).toBe(cat));
});

describe('weighedUnit', () => {
  it('prices fuel per litre and everything else per kg', () => {
    expect(weighedUnit(categorise('DIESEL'))).toBe('litre');
    expect(weighedUnit(categorise('Tesco Bananas Loose'))).toBe('kg');
  });
});
