// Generates the demo receipts: a fictional household's shop, written in the same text layout
// pdf.js extracts from a Tesco digital receipt. No real receipt data is involved.
// Usage: npm run sample  (deterministic: same output every run)
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'src/lib/__fixtures__';

// Small seeded PRNG so the sample is stable between runs.
let seed = 20260502;
const rand = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

interface Product {
  name: string;
  /** Shelf price in pence, changing on the given dates. */
  prices: [string, number][];
  /** Chance of appearing in any one shop. */
  p: number;
  qty?: number[];
  /** Chance a purchase is on Clubcard offer, and the offer price. */
  offer?: [number, number];
  /** Loose produce: price is per kg, weight range in kg. */
  kg?: [number, number];
  from?: string;
  until?: string;
}

const P = (name: string, price: number | [string, number][], p: number, extra: Partial<Product> = {}): Product => ({
  name,
  prices: typeof price === 'number' ? [['2000-01-01', price]] : price,
  p,
  ...extra,
});

const CATALOGUE: Product[] = [
  // Staples
  P('Tesco Semi Skimmed Milk 2.272L, 4 Pints', [['2000-01-01', 145], ['2026-07-20', 155]], 0.95),
  P('Tesco Large Free Range Eggs 6 Pack', [['2000-01-01', 330], ['2026-08-10', 350]], 0.7),
  P('Tesco Wholemeal Bread 800g', 75, 0.9, { qty: [1, 1, 2] }),
  P('Tesco Kiwi Fruit Loose', 94, 0.85, { kg: [0.6, 1.3] }),
  P('Tesco Salted Butter 250g', [['2000-01-01', 199], ['2026-06-15', 215], ['2026-09-07', 225]], 0.6),
  P('Tesco Greek Style Natural Yogurt 500G', 115, 0.55, { offer: [0.3, 95] }),
  P('Tesco Extra Mature Cheddar 350G', [['2000-01-01', 330], ['2026-08-24', 350]], 0.5),
  P('Tesco Extra Mature Cheddar 700G', 575, 0.25),
  P('Tesco Baby Spinach 240G', 150, 0.5),
  P('Tesco Cherry Tomatoes 330G', [['2000-01-01', 99], ['2026-07-06', 109]], 0.65),
  P('Tesco Ripe & Ready Mango Each', [['2000-01-01', 75], ['2026-06-29', 69]], 0.7),
  P('Tesco Courgettes Loose', 60, 0.5, { kg: [0.4, 0.9] }),
  P('Tesco Brown Onions Loose', 80, 0.45, { kg: [0.3, 0.8] }),
  P('Tesco Baby Potatoes 1Kg', [['2000-01-01', 165], ['2026-09-14', 179]], 0.5),
  P('Tesco Gala Apples 6 Pack', 160, 0.6, { offer: [0.25, 135] }),
  P('Tesco Easy Peelers 600G', 175, 0.45, { offer: [0.4, 140] }),
  P('Tesco Blackberries 150G', [['2000-01-01', 200], ['2026-08-03', 175]], 0.45, { offer: [0.35, 150] }),
  P('Tesco Mini Watermelon Each', 250, 0.3, { offer: [0.5, 200], from: '2026-05-15', until: '2026-08-31' }),
  P('Tesco Tenderstem Broccoli 200G', 79, 0.45),
  P('Tesco British Chicken Thigh Fillets 500G', [['2000-01-01', 450], ['2026-07-27', 475]], 0.65, { offer: [0.3, 400] }),
  P('Tesco British Turkey Breast Mince 500G', [['2000-01-01', 450], ['2026-08-17', 475]], 0.45, { offer: [0.3, 399] }),
  P('Tesco Unsmoked Back Bacon 300G', 250, 0.35, { offer: [0.3, 200] }),
  P('Tesco Finest 6 Cumberland Sausages 400G', 300, 0.25, { offer: [0.4, 250] }),
  P('Tesco Salmon Fillets 2 Pack 240G', [['2000-01-01', 450], ['2026-09-21', 499]], 0.3),
  P('Tesco Penne Pasta 500G', [['2000-01-01', 70], ['2026-06-08', 75]], 0.5),
  P('Tesco Basmati Rice 1Kg', 230, 0.2),
  P('Tesco Chopped Tomatoes 400G', 45, 0.5, { qty: [2, 3, 4] }),
  P('Heinz Baked Beanz 4 x 415G', 155, 0.3),
  P('Heinz Tomato Ketchup 910G', 375, 0.12, { offer: [0.5, 300] }),
  P('Tesco Crunchy Peanut Butter 340G', 135, 0.25),
  P('Tesco Porridge Oats 1Kg', 115, 0.3),
  P('Tesco Honey Nut Cornflakes 500G', 165, 0.35),
  P('Tesco Orange Juice Smooth 1 Litre', [['2000-01-01', 155], ['2026-07-13', 170]], 0.5),
  P('Robinsons Double Strength Orange Squash 1.75L', 375, 0.2, { offer: [0.6, 300] }),
  P('Tesco Sparkling Water 4X1.5L', 140, 0.25),
  P('Tesco Original Instant Coffee 200G', [['2000-01-01', 425], ['2026-08-10', 470]], 0.18),
  P('Yorkshire Tea Teabags 160 Pack', 600, 0.15, { offer: [0.5, 450] }),
  P('Walkers Ready Salted Multipack Crisps 6x25g', 225, 0.4, { offer: [0.6, 175] }),
  P('McVitie\'s Milk Chocolate Digestive Biscuits 266G', 225, 0.3, { offer: [0.5, 175] }),
  P('Tesco Reduced Fat Houmous 300G', 115, 0.35),
  P('Tesco Peshwari Naan 2 Pack', 105, 0.2),
  P('Tesco Plain Tortilla Wraps 8 Pack', 125, 0.3),
  P('Tesco Frozen Garden Peas 1Kg', 160, 0.25),
  P('Tesco Chocolate Ice Cream 900Ml', 175, 0.2, { from: '2026-06-01', until: '2026-09-15' }),
  P('Tesco Margherita Pizza 345G', 190, 0.25, { offer: [0.3, 150] }),
  // Shrinkflation: the bar shrinks from 200g to 180g in August while the price holds.
  P('Tesco Finest Belgian Milk Chocolate Bar 200G', 200, 0.4, { until: '2026-08-02' }),
  P('Tesco Finest Belgian Milk Chocolate Bar 180G', 200, 0.4, { from: '2026-08-03' }),
  // And granola goes from 1kg to 850g with only a small price cut.
  P('Tesco Fruit & Nut Crunchy Granola 1Kg', 300, 0.35, { until: '2026-07-19' }),
  P('Tesco Fruit & Nut Crunchy Granola 850G', 285, 0.35, { from: '2026-07-20' }),
  // Household and toiletries
  P('Tesco Non Bio Washing Powder 40 Washes 2Kg', 500, 0.15, { offer: [0.4, 400] }),
  P('Tesco Dishwasher Tablets Lemon 30 Pack', 400, 0.15),
  P('Tesco Washing Up Liquid Original 450Ml', 65, 0.2),
  P('Tesco Luxury Soft Toilet Tissue 9 Roll', [['2000-01-01', 450], ['2026-07-27', 500]], 0.18),
  P('Plenty Kitchen Roll 3 Roll', 175, 0.18),
  P('Tesco Bin Liners 50L 30 Pack', 150, 0.1),
  P('Colgate Total Original Care Toothpaste 75Ml', 300, 0.15, { offer: [0.6, 200] }),
  P('Tesco Everyday Moisturising Shower Gel With Coconut Scent 500Ml', 110, 0.18),
  P('Tesco Kids Strawberry Fromage Frais 6 x 45G', 95, 0.3),
  P('Tesco Kids Apple & Pear Fruit Pouches 4 x 90g', 160, 0.25, { offer: [0.4, 125] }),
];

const SHOP_DATES = [
  '2026-05-02', '2026-05-11', '2026-05-19', '2026-05-30', '2026-06-08', '2026-06-17', '2026-06-27', '2026-07-06',
  '2026-07-15', '2026-07-25', '2026-08-03', '2026-08-13', '2026-08-22', '2026-09-01', '2026-09-12', '2026-09-22', '2026-10-03',
];
const BASKET_COUPON = '2026-06-27'; // 10% off the whole shop
const UNEVEN = '2026-08-22'; // charged 40p more than the lines add up to

const priceOn = (p: Product, date: string) => p.prices.filter(([d]) => d <= date).at(-1)![1];
const money = (p: number) => `£${(p / 100).toFixed(2)}`;

interface Line { qty: number; name: string; unit: number; saving: number; total: number }

function shop(date: string): Line[] {
  const lines: Line[] = [];
  for (const p of CATALOGUE) {
    if ((p.from && date < p.from) || (p.until && date > p.until)) continue;
    if (rand() > p.p) continue;
    const unit = priceOn(p, date);
    if (p.kg) {
      const kg = p.kg[0] + rand() * (p.kg[1] - p.kg[0]);
      lines.push({ qty: 1, name: p.name, unit, saving: 0, total: Math.round(unit * kg) });
      continue;
    }
    const qty = p.qty ? pick(p.qty) : rand() < 0.12 ? 2 : 1;
    const onOffer = p.offer && rand() < p.offer[0] && p.offer[1] < unit;
    const saving = onOffer ? (unit - p.offer![1]) * qty : 0;
    lines.push({ qty, name: p.name, unit, saving, total: unit * qty - saving });
  }
  return lines.sort(() => rand() - 0.5);
}

// pdf.js puts a wrapped product name on its own lines, with the prices after it.
function lineText(l: Line): string {
  const prices = `${money(l.unit)}   ${l.saving ? money(l.saving) : '-'}   ${money(l.total)}`;
  if (l.name.length <= 46) return `${l.qty}   ${l.name}   ${prices} `;
  const cut = l.name.lastIndexOf(' ', 46);
  return `${l.qty}   ${l.name.slice(0, cut)} \n${l.name.slice(cut + 1)} \n${prices} `;
}

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.txt')) fs.unlinkSync(path.join(OUT, f));

SHOP_DATES.forEach((date, i) => {
  const lines = shop(date);
  let subtotal = lines.reduce((a, l) => a + l.total, 0);
  if (date === BASKET_COUPON) {
    // A % coupon is spread across every line, so each line shows a bigger saving.
    lines.forEach((l) => {
      const cut = Math.round(l.total * 0.1);
      l.saving += cut;
      l.total -= cut;
    });
  }
  const itemsTotal = lines.reduce((a, l) => a + l.total, 0);
  const total = itemsTotal + (date === UNEVEN ? 40 : 0);
  if (date !== BASKET_COUPON) subtotal = total;
  const savings = lines.reduce((a, l) => a + l.saving, 0);
  const [y, m, d] = date.split('-');
  const text = [
    'Receipt ',
    'Customer details [example household] Seller details Tesco Order information ',
    `Order ID:   2000-0000-${String(i + 1).padStart(3, '0')} `,
    `Purchase date:   ${d}/${m}/${y} `,
    'Channel:   Online ',
    '',
    'Your items ',
    'Qty   Product description   Unit price   Savings   Total cost ',
    ...lines.map(lineText),
    'Payment summary ',
    `Subtotal:   ${money(subtotal)} `,
    // Tesco's own savings figure tends to under-report, so the sample does too.
    `Including savings of:   ${money(Math.round(savings * 0.4))} `,
    'Delivery:   + £0.00 ',
    `Total:   ${money(total)} `,
    'Other details ',
    `Clubcard points earned: ${Math.floor(total / 100)} points `,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(OUT, `sample-${date}.txt`), text);
  console.log(date, `${lines.length} lines`, money(total));
});
