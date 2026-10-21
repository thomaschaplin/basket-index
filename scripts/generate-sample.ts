// Generates the demo receipts: a fictional household's year of shopping, written in the same text layout
// pdf.js extracts from a Tesco digital receipt. No real receipt data is involved.
// A big online shop every week or two, smaller in-store top-ups in between, and fuel every few weeks,
// so the example looks like a real year: in-store quirks, fuel by the litre, seasonal buys.
// Usage: npm run sample  (deterministic: same output every run)
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'src/lib/__fixtures__';
const START = '2025-10-25';
const END = '2026-10-17';

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
  /** Chance of appearing in an online shop. */
  p: number;
  /** Chance of appearing in an in-store top-up (default: rarely). */
  s?: number;
  qty?: number[];
  /** Chance a purchase is on Clubcard offer, and the offer price. */
  offer?: [number, number];
  /** Loose produce: price is per kg, weight range in kg. */
  kg?: [number, number];
  /** Only sold between these dates. Seasonal items repeat the window each year when given as MM-DD. */
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
  // Staples: in nearly every big shop, and the usual top-up buys.
  P('Tesco Semi Skimmed Milk 2.272L, 4 Pints', [['2000-01-01', 139], ['2026-02-02', 145], ['2026-07-20', 155]], 0.95, { s: 0.6 }),
  P('Tesco Large Free Range Eggs 6 Pack', [['2000-01-01', 315], ['2026-03-09', 330], ['2026-08-10', 350]], 0.7, { s: 0.15 }),
  P('Tesco Wholemeal Bread 800g', 75, 0.9, { qty: [1, 1, 2], s: 0.55 }),
  P('Tesco Bananas Loose', 85, 0.8, { kg: [0.8, 1.4], s: 0.4 }),
  P('Tesco Kiwi Fruit Loose', 94, 0.6, { kg: [0.6, 1.3], s: 0.1 }),
  P('Tesco Salted Butter 250g', [['2000-01-01', 199], ['2026-06-15', 215], ['2026-09-07', 225]], 0.6, { s: 0.12 }),
  P('Tesco Greek Style Natural Yogurt 500G', 115, 0.55, { offer: [0.3, 95], s: 0.08 }),
  P('Tesco Extra Mature Cheddar 350G', [['2000-01-01', 315], ['2026-01-12', 330], ['2026-08-24', 350]], 0.5, { s: 0.1 }),
  P('Tesco Extra Mature Cheddar 700G', 575, 0.25),
  P('Tesco Baby Spinach 240G', 150, 0.5, { s: 0.05 }),
  P('Tesco Cherry Tomatoes 330G', [['2000-01-01', 99], ['2026-07-06', 109]], 0.65, { s: 0.12 }),
  P('Tesco Ripe & Ready Mango Each', [['2000-01-01', 75], ['2026-06-29', 69]], 0.6),
  P('Tesco Whole Cucumber Each', [['2000-01-01', 75], ['2026-04-20', 85]], 0.6, { s: 0.15 }),
  P('Tesco Courgettes Loose', 60, 0.45, { kg: [0.4, 0.9] }),
  P('Tesco Brown Onions Loose', 80, 0.45, { kg: [0.3, 0.8] }),
  P('Tesco Baby Potatoes 1Kg', [['2000-01-01', 165], ['2026-09-14', 179]], 0.5),
  P('Tesco Gala Apples 6 Pack', 160, 0.6, { offer: [0.25, 135], s: 0.08 }),
  P('Tesco Easy Peelers 600G', 175, 0.45, { offer: [0.4, 140], s: 0.08 }),
  P('Tesco Strawberries 400G', [['2000-01-01', 300], ['2026-05-04', 250]], 0.4, { offer: [0.35, 200], from: '04-15', until: '09-15', s: 0.1 }),
  P('Tesco Blackberries 150G', [['2000-01-01', 200], ['2026-08-03', 175]], 0.4, { offer: [0.35, 150] }),
  P('Tesco Mini Watermelon Each', 250, 0.3, { offer: [0.5, 200], from: '05-15', until: '08-31' }),
  P('Tesco Tenderstem Broccoli 200G', 79, 0.45),
  P('Tesco British Chicken Thigh Fillets 500G', [['2000-01-01', 425], ['2026-01-26', 450], ['2026-07-27', 475]], 0.65, { offer: [0.3, 400] }),
  P('Tesco British Turkey Breast Mince 500G', [['2000-01-01', 450], ['2026-08-17', 475]], 0.45, { offer: [0.3, 399] }),
  P('Tesco Unsmoked Back Bacon 300G', 250, 0.35, { offer: [0.3, 200] }),
  P('Tesco Finest 6 Cumberland Sausages 400G', 300, 0.25, { offer: [0.4, 250] }),
  P('Tesco Salmon Fillets 2 Pack 240G', [['2000-01-01', 450], ['2026-09-21', 499]], 0.3),
  P('Tesco Penne Pasta 500G', [['2000-01-01', 70], ['2026-06-08', 75]], 0.5),
  P('Tesco Basmati Rice 1Kg', 230, 0.2),
  P('Tesco Chopped Tomatoes 400G', 45, 0.5, { qty: [2, 3, 4] }),
  P('Heinz Baked Beanz 4 x 415G', [['2000-01-01', 155], ['2026-03-02', 170]], 0.3),
  P('Heinz Tomato Ketchup 910G', 375, 0.12, { offer: [0.5, 300] }),
  P('Tesco Crunchy Peanut Butter 340G', 135, 0.25),
  P('Tesco Porridge Oats 1Kg', 115, 0.3, { from: '10-01', until: '04-30' }),
  P('Tesco Honey Nut Cornflakes 500G', 165, 0.35),
  P('Tesco Orange Juice Smooth 1 Litre', [['2000-01-01', 155], ['2026-07-13', 170]], 0.5, { s: 0.1 }),
  P('Robinsons Double Strength Orange Squash 1.75L', 375, 0.2, { offer: [0.6, 300] }),
  P('Tesco Sparkling Water 4X1.5L', 140, 0.25),
  P('Tesco Original Instant Coffee 200G', [['2000-01-01', 425], ['2026-08-10', 470]], 0.18),
  P('Yorkshire Tea Teabags 160 Pack', 600, 0.15, { offer: [0.5, 450] }),
  P('Walkers Ready Salted Multipack Crisps 6x25g', 225, 0.4, { offer: [0.6, 175], s: 0.12 }),
  P('McVitie\'s Milk Chocolate Digestive Biscuits 266G', 225, 0.3, { offer: [0.5, 175], s: 0.06 }),
  P('Tesco Reduced Fat Houmous 300G', 115, 0.35, { s: 0.06 }),
  P('Tesco Peshwari Naan 2 Pack', 105, 0.2),
  P('Tesco Plain Tortilla Wraps 8 Pack', 125, 0.3, { s: 0.05 }),
  P('Tesco Frozen Garden Peas 1Kg', 160, 0.25),
  P('Tesco Chocolate Ice Cream 900Ml', 175, 0.2, { from: '06-01', until: '09-15', s: 0.08 }),
  P('Tesco Margherita Pizza 345G', 190, 0.25, { offer: [0.3, 150], s: 0.06 }),
  // More of the everyday family shop.
  P('Tesco British Beef Lean Steak Mince 5% Fat 500G', [['2000-01-01', 450], ['2026-04-13', 475], ['2026-09-28', 499]], 0.45, { offer: [0.25, 400] }),
  P('Tesco Whole Chicken 1.6Kg', [['2000-01-01', 450], ['2026-05-18', 475]], 0.3),
  P('Tesco Cooked Ham Slices 125G', 150, 0.45, { s: 0.08 }),
  P('Tesco Spaghetti 500G', 70, 0.35),
  P('Tesco Garlic Bread Baguette 2 Pack', 100, 0.3, { s: 0.05 }),
  P('Tesco Medium Sliced White Bread 800G', 75, 0.3, { s: 0.2 }),
  P('Tesco Red Seedless Grapes 500G', [['2000-01-01', 200], ['2026-06-22', 225]], 0.55, { offer: [0.3, 175], s: 0.12 }),
  P('Tesco Carrots 1Kg', 69, 0.5, { s: 0.05 }),
  P('Tesco Broccoli 375G', [['2000-01-01', 75], ['2026-03-23', 82]], 0.55, { s: 0.08 }),
  P('Tesco Sweet Potatoes 1Kg', 119, 0.3),
  P('Tesco Mozzarella 125G', 75, 0.35),
  P('Philadelphia Original Soft Cheese 165G', [['2000-01-01', 200], ['2026-05-04', 225]], 0.35, { offer: [0.4, 165], s: 0.06 }),
  P('Tesco Single Cream 300Ml', 105, 0.2),
  P('Muller Corner Strawberry Yogurt 6 x 124g', 400, 0.3, { offer: [0.6, 300] }),
  P('Tesco Fish Fingers 10 Pack 250G', 175, 0.25),
  P('Tesco Oven Chips 1.5Kg', [['2000-01-01', 199], ['2026-02-16', 215]], 0.35),
  P('Tesco Pesto Alla Genovese 190G', 165, 0.2),
  P('Tesco Beef Stock Cubes 10 x 10g', 75, 0.15),
  P('Tesco Free Range Medium Eggs 12 Pack', [['2000-01-01', 390], ['2026-03-09', 420]], 0.2, { s: 0.05 }),
  P('Tesco Apple & Blackcurrant No Added Sugar Squash 1L', 85, 0.35, { s: 0.08 }),
  P('Coca-Cola Zero Sugar 8 x 330ml', [['2000-01-01', 525], ['2026-01-19', 575]], 0.3, { offer: [0.5, 450], s: 0.08 }),
  P('Tesco Sea Salt & Black Pepper Kettle Chips 150G', 150, 0.2, { s: 0.08 }),
  P('Tesco Rich Tea Biscuits 300G', 55, 0.25),
  P('Tesco Cheese & Onion Rolls 4 Pack', 200, 0.1, { s: 0.08 }),
  // Shrinkflation: the bar shrinks from 200g to 180g in August while the price holds.
  P('Tesco Finest Belgian Milk Chocolate Bar 200G', 200, 0.4, { until: '2026-08-02', s: 0.06 }),
  P('Tesco Finest Belgian Milk Chocolate Bar 180G', 200, 0.4, { from: '2026-08-03', s: 0.06 }),
  // And granola goes from 1kg to 850g with only a small price cut.
  P('Tesco Fruit & Nut Crunchy Granola 1Kg', 300, 0.35, { until: '2026-07-19' }),
  P('Tesco Fruit & Nut Crunchy Granola 850G', 285, 0.35, { from: '2026-07-20' }),
  // Seasonal
  P('Tesco Finest 6 Mince Pies', 250, 0.5, { from: '11-20', until: '12-24', s: 0.1 }),
  P('Tesco Finest Christmas Pudding 454G', 500, 0.3, { from: '12-05', until: '12-24' }),
  P('Cadbury Selection Box 145G', 300, 0.35, { from: '11-25', until: '12-24', qty: [1, 2, 2] }),
  P('Tesco Hot Cross Buns 6 Pack', 100, 0.5, { from: '03-01', until: '04-12', s: 0.15 }),
  P('Cadbury Creme Egg 5 Pack 200G', [['2000-01-01', 235], ['2026-02-15', 250]], 0.35, { from: '01-05', until: '04-12', s: 0.08 }),
  P('Cadbury Mini Eggs Shell Egg 95G', 300, 0.3, { from: '03-10', until: '04-05' }),
  P('Tesco Finest Quarter Pounders 454g', 400, 0.3, { from: '05-20', until: '08-31', offer: [0.4, 300] }),
  P('Tesco Coleslaw 300G', 99, 0.3, { from: '05-20', until: '08-31', s: 0.05 }),
  P('Tesco Giant Pumpkin Each', 300, 0, { from: '10-20', until: '10-31', s: 0.4 }),
  // Household and toiletries
  P('Tesco Non Bio Washing Powder 40 Washes 2Kg', 500, 0.15, { offer: [0.4, 400] }),
  P('Tesco Dishwasher Tablets Lemon 30 Pack', 400, 0.15),
  P('Tesco Washing Up Liquid Original 450Ml', 65, 0.2),
  P('Tesco Luxury Soft Toilet Tissue 9 Roll', [['2000-01-01', 450], ['2026-07-27', 500]], 0.18, { s: 0.03 }),
  P('Plenty Kitchen Roll 3 Roll', 175, 0.18),
  P('Tesco Bin Liners 50L 30 Pack', 150, 0.1),
  P('Colgate Total Original Care Toothpaste 75Ml', 300, 0.15, { offer: [0.6, 200] }),
  P('Tesco Everyday Moisturising Shower Gel With Coconut Scent 500Ml', 110, 0.18),
  P('Tesco Kids Strawberry Fromage Frais 6 x 45G', 95, 0.3, { s: 0.05 }),
  P('Tesco Kids Apple & Pear Fruit Pouches 4 x 90g', 160, 0.25, { offer: [0.4, 125] }),
  // Occasional in-store extras: health, clothing, home, cards.
  P('Tesco Health Pain Relief Tablets - Paracetamol 500mg 16s', 45, 0.02, { s: 0.03 }),
  P('Tesco Health Vitamin D 25mcg Tablets 120s', 300, 0.03, { s: 0.02 }),
  P('Tesco Health Light Fabric Assorted Plasters 40s', 140, 0, { s: 0.015 }),
  P('Calpol Infant Suspension Strawberry 100ml', 425, 0, { from: '11-01', until: '03-15', s: 0.03 }),
  P('F&F Pure Cotton Striped T-Shirt in Navy', 800, 0, { s: 0.02 }),
  P('F&F Kids 2-Pack Cotton Pyjamas in Blue', 1000, 0, { s: 0.015 }),
  P('F&F Home Sea Breeze Reed Diffuser 100Ml', 600, 0, { s: 0.02 }),
  P('Tesco Rainbow Tulips Bunch', 350, 0, { from: '02-01', until: '05-15', s: 0.04 }),
  P('Carlton Everyday Bday Balloons and Stars 100001-0-1', 200, 0, { s: 0.03 }),
];

// ---- Schedule: online shop every 9-16 days, 1-2 in-store top-ups between, fuel every 3-5 weeks.
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
type Kind = 'online' | 'store' | 'fuel';
const visits: { date: string; kind: Kind }[] = [];
for (let d = START; d <= END; ) {
  visits.push({ date: d, kind: 'online' });
  const gap = 9 + Math.floor(rand() * 8);
  const tops = rand() < 0.45 ? 2 : 1;
  for (let t = 1; t <= tops; t++) visits.push({ date: addDays(d, Math.round((gap * t) / (tops + 1))), kind: 'store' });
  d = addDays(d, gap);
}
for (let d = addDays(START, 3); d <= END; d = addDays(d, 24 + Math.floor(rand() * 11))) visits.push({ date: d, kind: 'fuel' });
visits.sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));
const onEnd = visits.filter((v) => v.date <= END);

// The few showcase receipts: a 10% whole-basket coupon, and one charged 40p more than its lines add up to.
const onlineDates = onEnd.filter((v) => v.kind === 'online').map((v) => v.date);
const BASKET_COUPON = onlineDates.find((d) => d >= '2026-06-20')!;
const UNEVEN = onlineDates.find((d) => d >= '2026-08-18')!;

// Diesel, pence per litre, drifting up through the year.
const DIESEL: [string, number][] = [['2000-01-01', 142], ['2026-01-05', 145], ['2026-03-02', 152], ['2026-05-04', 158], ['2026-07-06', 164], ['2026-09-07', 171]];

const inWindow = (p: Product, date: string) => {
  const md = date.slice(5);
  const yearly = (x?: string) => x && x.length === 5;
  if (yearly(p.from) || yearly(p.until)) {
    const from = p.from ?? '01-01';
    const until = p.until ?? '12-31';
    return from <= until ? md >= from && md <= until : md >= from || md <= until;
  }
  return !((p.from && date < p.from) || (p.until && date > p.until));
};
const priceOn = (prices: [string, number][], date: string) => prices.filter(([d]) => d <= date).at(-1)![1];
const money = (p: number) => `£${(p / 100).toFixed(2)}`;

interface Line { qty: number | string; name: string; unit: number; saving: number; total: number }

function basket(date: string, kind: 'online' | 'store'): Line[] {
  const lines: Line[] = [];
  for (const p of CATALOGUE) {
    if (!inWindow(p, date)) continue;
    const chance = kind === 'online' ? p.p : (p.s ?? 0.02);
    if (rand() > chance) continue;
    const unit = priceOn(p.prices, date);
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
  // In-store tills sometimes print a line with no product name (a bag, a reduced sticker).
  if (kind === 'store' && rand() < 0.12) lines.push({ qty: 1, name: '', unit: 70, saving: 0, total: 70 });
  if (!lines.length) lines.push({ qty: 1, name: 'Tesco Semi Skimmed Milk 2.272L, 4 Pints', unit: priceOn(CATALOGUE[0].prices, date), saving: 0, total: priceOn(CATALOGUE[0].prices, date) });
  return lines.sort(() => rand() - 0.5);
}

function fuel(date: string): Line[] {
  const unit = priceOn(DIESEL, date);
  const total = rand() < 0.65 ? pick([2000, 2500, 3000, 4000]) : 4500 + Math.round(rand() * 1500);
  return [{ qty: (total / unit).toFixed(1), name: 'DIESEL', unit, saving: 0, total }];
}

// pdf.js puts a wrapped product name on its own lines, with the prices after it.
function lineText(l: Line): string {
  const prices = `${money(l.unit)}   ${l.saving ? money(l.saving) : '-'}   ${money(l.total)}`;
  if (!l.name) return `${l.qty}   ${prices} `;
  if (l.name.length <= 46) return `${l.qty}   ${l.name}   ${prices} `;
  const cut = l.name.lastIndexOf(' ', 46);
  return `${l.qty}   ${l.name.slice(0, cut)} \n${l.name.slice(cut + 1)} \n${prices} `;
}

// In-store order IDs look like "57E8-15KT-Q05F-XBNQ"; fuel receipts use a long number.
const ALNUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
const storeId = () => Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => pick([...ALNUM])).join('')).join('-');
const fuelId = (date: string) => `974010412${date.slice(8, 10)}${date.slice(5, 7)}${date.slice(2, 4)}${String(Math.floor(rand() * 1e15)).padStart(17, "0")}`;

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.txt')) fs.unlinkSync(path.join(OUT, f));

let onlineNo = 0;
const counts = { online: 0, store: 0, fuel: 0 };
for (const { date, kind } of onEnd) {
  const lines = kind === 'fuel' ? fuel(date) : basket(date, kind);
  let subtotal = lines.reduce((a, l) => a + l.total, 0);
  if (date === BASKET_COUPON && kind === 'online') {
    // A % coupon is spread across every line, so each line shows a bigger saving.
    lines.forEach((l) => {
      const cut = Math.round(l.total * 0.1);
      l.saving += cut;
      l.total -= cut;
    });
  }
  const itemsTotal = lines.reduce((a, l) => a + l.total, 0);
  const total = itemsTotal + (date === UNEVEN && kind === 'online' ? 40 : 0);
  if (!(date === BASKET_COUPON && kind === 'online')) subtotal = total;
  const savings = lines.reduce((a, l) => a + l.saving, 0);
  const [y, m, d] = date.split('-');
  const online = kind === 'online';
  const id = online ? `2000-0000-${String(++onlineNo).padStart(3, '0')}` : kind === 'fuel' ? fuelId(date) : storeId();
  const text = [
    'Receipt ',
    'Customer details [example household] Seller details Tesco Order information ',
    `Order ID:   ${id} `,
    `Purchase date:   ${d}/${m}/${y} `,
    `Channel:   ${online ? 'Online' : 'In-store'} `,
    '',
    'Your items ',
    'Qty   Product description   Unit price   Savings   Total cost ',
    ...lines.map(lineText),
    'Payment summary ',
    `Subtotal:   ${money(subtotal)} `,
    // Tesco's own savings figure tends to under-report, so the sample does too.
    ...(savings ? [`Including savings of:   ${money(Math.round(savings * 0.4))} `] : []),
    ...(online ? ['Delivery:   + £0.00 '] : []),
    `Total:   ${money(total)} `,
    'Other details ',
    `Clubcard points earned: ${Math.floor(total / 100)} points `,
    '',
  ].join('\n');
  let file = `sample-${date}-${kind}.txt`;
  for (let n = 2; fs.existsSync(path.join(OUT, file)); n++) file = `sample-${date}-${kind}-${n}.txt`;
  fs.writeFileSync(path.join(OUT, file), text);
  counts[kind]++;
}
console.log(`${onEnd.length} receipts:`, counts, `coupon ${BASKET_COUPON}, uneven ${UNEVEN}`);
