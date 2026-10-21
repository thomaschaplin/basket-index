// Turns parsed receipts into cost-of-living insights. All money in pence.
import { categorise, type Category } from './categories';
import type { PackSize, Receipt, ReceiptItem } from './types';

export interface Purchase extends ReceiptItem {
  date: string;
  orderId: string;
  key: string;
  category: Category;
  /** Discounted only by a whole-basket coupon, so not "on offer" in the product sense. */
  basketDeal: boolean;
}

export interface PricePoint {
  date: string;
  shelf: number;
  paid: number;
  qty: number;
  onOffer: boolean;
}

export interface ProductHistory {
  key: string;
  name: string;
  category: Category;
  weighed: boolean;
  size: PackSize | null;
  points: PricePoint[];
  spend: number;
  units: number;
  saved: number;
  orders: number;
}

export interface PriceChange {
  key: string;
  name: string;
  category: Category;
  weighed: boolean;
  times: number;
  from: number;
  to: number;
  change: number;
  pct: number;
  fromDate: string;
  toDate: string;
  min: number;
  max: number;
  points: PricePoint[];
}

export interface PackSizeStat {
  name: string;
  size: PackSize;
  first: string;
  last: string;
  units: number;
  price: number;
  perUnit: { value: number; label: string };
}

export interface Shrinkflation {
  before: PackSizeStat;
  after: PackSizeStat;
  sizeChangePct: number;
  unitChangePct: number;
}

export interface PackChoice {
  sizes: PackSizeStat[];
  best: PackSizeStat;
  extra: number;
}

export interface OrderSummary {
  orderId: string;
  date: string;
  total: number;
  gross: number;
  saved: number;
  items: number;
  units: number;
  points: number;
  warnings: string[];
  categories: Partial<Record<Category, number>>;
}

export interface Insight {
  tone: 'good' | 'bad' | 'neutral';
  icon: string;
  title: string;
  body: string;
}

export type Analysis = ReturnType<typeof analyse>;

const key = (name: string) => name.toLowerCase().replace(/cof+ee/g, 'coffee').replace(/\s+/g, ' ').trim();
const month = (iso: string) => iso.slice(0, 7);
export const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);
const gbp = (p: number) => `£${(p / 100).toFixed(2)}`;

function perUnit(size: PackSize, price: number) {
  const per = size.unit === 'each' ? 1 : 100; // per item, or per 100g / 100ml
  return { value: (price / size.amount) * per, label: size.unit === 'each' ? 'each' : `per 100${size.unit}` };
}

/** De-duplicate by order ID (people re-run the downloader) and sort oldest first. */
export function dedupe(receipts: Receipt[]): Receipt[] {
  const byId = new Map<string, Receipt>();
  receipts.forEach((r) => byId.set(r.orderId || `${r.date}-${r.total}`, r));
  return [...byId.values()].filter((r) => r.date).sort((a, b) => a.date!.localeCompare(b.date!));
}

export function analyse(input: Receipt[]) {
  const rs = dedupe(input);

  const purchases: Purchase[] = [];
  rs.forEach((r) =>
    r.items.forEach((i) =>
      purchases.push({
        ...i,
        date: r.date!,
        orderId: r.orderId || `${r.date}-${r.total}`,
        key: key(i.name),
        category: categorise(i.name),
        basketDeal: !!r.basketDiscount,
      }),
    ),
  );
  const shelfCost = (p: Purchase) => (p.weighed ? p.lineTotal + p.saving : p.qty * p.unitPrice);

  // ---- Overview
  const spend = rs.reduce((a, r) => a + r.total, 0);
  const gross = purchases.reduce((a, p) => a + shelfCost(p), 0);
  const savings = purchases.reduce((a, p) => a + p.saving, 0);
  const from = rs[0]?.date ?? null;
  const to = rs[rs.length - 1]?.date ?? null;
  const days = from && to && rs.length > 1 ? (Date.parse(to) - Date.parse(from)) / 864e5 : 0;
  // Spend over the span between first and last order, excluding the last order's own basket
  // (it covers the time after it), gives a fair weekly rate.
  const perWeek = days >= 7 ? ((spend - rs[rs.length - 1].total) / days) * 7 : null;
  const overview = {
    receipts: rs.length,
    from,
    to,
    days,
    spend,
    gross,
    avgBasket: rs.length ? spend / rs.length : 0,
    units: purchases.reduce((a, p) => a + p.qty, 0),
    lines: purchases.length,
    distinctProducts: new Set(purchases.map((p) => p.key)).size,
    savings,
    savingsRate: gross ? (savings / gross) * 100 : 0,
    coupons: rs.reduce((a, r) => a + r.coupons, 0),
    points: rs.reduce((a, r) => a + r.points, 0),
    onOfferShare: purchases.length ? (purchases.filter((p) => p.saving > 0 && !p.basketDeal).length / purchases.length) * 100 : 0,
    perWeek,
    perYear: perWeek ? perWeek * 52 : null,
    daysBetweenShops: rs.length > 1 ? days / (rs.length - 1) : null,
  };

  // ---- Orders timeline
  const orders: OrderSummary[] = rs.map((r) => {
    const categories: Partial<Record<Category, number>> = {};
    const ps = purchases.filter((p) => p.orderId === (r.orderId || `${r.date}-${r.total}`));
    ps.forEach((p) => (categories[p.category] = (categories[p.category] ?? 0) + p.lineTotal));
    return {
      orderId: r.orderId || `${r.date}-${r.total}`,
      date: r.date!,
      total: r.total,
      gross: ps.reduce((a, p) => a + shelfCost(p), 0),
      saved: ps.reduce((a, p) => a + p.saving, 0),
      items: ps.length,
      units: ps.reduce((a, p) => a + p.qty, 0),
      points: r.points,
      warnings: r.warnings,
      categories,
    };
  });

  // ---- Spend by month and category
  const months: Record<string, number> = {};
  rs.forEach((r) => (months[month(r.date!)] = (months[month(r.date!)] ?? 0) + r.total));
  const categories: Partial<Record<Category, number>> = {};
  purchases.forEach((p) => (categories[p.category] = (categories[p.category] ?? 0) + p.lineTotal));
  const categoryList = (Object.entries(categories) as [Category, number][])
    .map(([name, value]) => ({ name, value, share: (value / Math.max(1, purchases.reduce((a, p) => a + p.lineTotal, 0))) * 100 }))
    .sort((a, b) => b.value - a.value);

  // ---- Per-product history (shelf price, before offers)
  const history = new Map<string, ProductHistory>();
  const orderSets = new Map<string, Set<string>>();
  purchases.forEach((p) => {
    let h = history.get(p.key);
    if (!h) {
      h = { key: p.key, name: p.name, category: p.category, weighed: p.weighed, size: p.size, points: [], spend: 0, units: 0, saved: 0, orders: 0 };
      history.set(p.key, h);
      orderSets.set(p.key, new Set());
    }
    h.spend += p.lineTotal;
    h.units += p.qty;
    h.saved += p.saving;
    orderSets.get(p.key)!.add(p.orderId);
    const last = h.points[h.points.length - 1];
    if (last && last.date === p.date) return; // same product twice in one order
    const paid = p.weighed ? p.unitPrice : Math.round(p.lineTotal / p.qty);
    h.points.push({ date: p.date, shelf: p.unitPrice, paid, qty: p.qty, onOffer: p.saving > 0 && !p.basketDeal });
  });
  history.forEach((h) => (h.orders = orderSets.get(h.key)!.size));
  const products = [...history.values()].sort((a, b) => b.spend - a.spend);

  const priceChanges: PriceChange[] = [];
  history.forEach((h) => {
    if (h.points.length < 2) return;
    const first = h.points[0];
    const last = h.points[h.points.length - 1];
    const shelves = h.points.map((x) => x.shelf);
    priceChanges.push({
      key: h.key, name: h.name, category: h.category, weighed: h.weighed, times: h.points.length,
      from: first.shelf, to: last.shelf, change: last.shelf - first.shelf, pct: pct(last.shelf, first.shelf),
      fromDate: first.date, toDate: last.date, min: Math.min(...shelves), max: Math.max(...shelves), points: h.points,
    });
  });
  priceChanges.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));

  // ---- Personal inflation: fixed basket of repeat buys, first price vs latest, weighted by first-purchase quantity.
  const basket = priceChanges.filter((c) => !c.weighed);
  const base = basket.reduce((a, c) => a + c.from * c.points[0].qty, 0);
  const now = basket.reduce((a, c) => a + c.to * c.points[0].qty, 0);
  const inflationDays = basket.length
    ? (Date.parse(basket.reduce((m, c) => (c.toDate > m ? c.toDate : m), '')) - Date.parse(basket.reduce((m, c) => (c.fromDate < m ? c.fromDate : m), '9999'))) / 864e5
    : 0;
  const inflation = {
    products: basket.length,
    pct: pct(now, base),
    base,
    now,
    up: basket.filter((c) => c.change > 0).length,
    down: basket.filter((c) => c.change < 0).length,
    same: basket.filter((c) => c.change === 0).length,
    // Annualised only when the window is long enough to mean something.
    annualised: inflationDays >= 28 ? (Math.pow(now / base, 365 / inflationDays) - 1) * 100 : null,
  };
  // Basket index over time: each order's shelf prices for the fixed basket, carrying forward the last seen price.
  const indexSeries = rs.map((r) => {
    let total = 0;
    basket.forEach((c) => {
      const seen = c.points.filter((p) => p.date <= r.date!);
      const price = seen.length ? seen[seen.length - 1].shelf : c.from;
      total += price * c.points[0].qty;
    });
    return { date: r.date!, index: base ? (total / base) * 100 : 100 };
  });

  // ---- Pack sizes: same product family bought in more than one size.
  const families = new Map<string, Map<string, PackSizeStat>>();
  purchases.forEach((p) => {
    if (!p.size || p.weighed || !p.size.amount) return;
    if (!families.has(p.family)) families.set(p.family, new Map());
    const sizes = families.get(p.family)!;
    const sk = `${p.size.amount}${p.size.unit}`;
    const s = sizes.get(sk) ?? { name: p.name, size: p.size, first: p.date, last: p.date, units: 0, price: p.unitPrice, perUnit: perUnit(p.size, p.unitPrice) };
    if (p.date > s.last) s.last = p.date;
    if (p.date < s.first) s.first = p.date;
    s.units += p.qty;
    s.price = p.unitPrice; // latest shelf price (purchases are chronological)
    s.perUnit = perUnit(p.size, p.unitPrice);
    sizes.set(sk, s);
  });
  const shrinkflation: Shrinkflation[] = [];
  const packChoices: PackChoice[] = [];
  families.forEach((sizes) => {
    if (sizes.size < 2) return;
    const vs = [...sizes.values()].sort((a, b) => b.size.amount - a.size.amount);
    if (new Set(vs.map((v) => v.size.unit)).size > 1) return; // g vs each can't be compared
    const best = vs.reduce((a, b) => (b.perUnit.value < a.perUnit.value ? b : a));
    for (let i = 0; i < vs.length - 1; i++) {
      const big = vs[i];
      const small = vs[i + 1];
      // Classic shrinkflation: the pack shrinks a little (<= 25%) while the shelf price barely moves (drops <= 10%).
      // Bigger jumps (a 9-pack to a 6-pack) are a pack choice and live in the pack-value table instead.
      const sizeDrop = 1 - small.size.amount / big.size.amount;
      const priceDrop = 1 - small.price / big.price;
      if (big.last < small.first && sizeDrop <= 0.25 && priceDrop <= 0.1 && small.perUnit.value > big.perUnit.value * 1.03) {
        shrinkflation.push({ before: big, after: small, sizeChangePct: pct(small.size.amount, big.size.amount), unitChangePct: pct(small.perUnit.value, big.perUnit.value) });
      }
    }
    // What buying the non-best sizes cost vs the same quantity at the best size's unit price.
    const per = best.size.unit === 'each' ? 1 : 100;
    const extra = vs.reduce((a, v) => (v === best ? a : a + (v.perUnit.value - best.perUnit.value) * (v.size.amount / per) * v.units), 0);
    packChoices.push({ sizes: vs, best, extra: Math.max(0, Math.round(extra)) });
  });
  shrinkflation.sort((a, b) => b.unitChangePct - a.unitChangePct);
  packChoices.sort((a, b) => b.extra - a.extra);

  // ---- Top lists
  const topSpend = products.slice(0, 10);
  // Staples: bought in at least half the months you shopped. Counting shops instead would let lots of small
  // top-up shops (or fuel stops) push everyday items below the bar.
  const stapleMonths = new Set(rs.map((r) => month(r.date!))).size;
  const staples = products
    .map((s) => ({ ...s, months: new Set(s.points.map((x) => month(x.date))).size, offers: s.points.filter((x) => x.onOffer).length }))
    .filter((s) => s.months >= Math.max(2, Math.ceil(stapleMonths / 2)))
    .sort((a, b) => b.orders - a.orders || b.spend - a.spend);
  const topSavers = products.filter((t) => t.saved > 0).sort((a, b) => b.saved - a.saved).slice(0, 10);

  // ---- Receipt checks
  const warnings = rs.flatMap((r) => r.warnings.map((w) => ({ date: r.date!, text: w })));
  const basketDeals = rs.filter((r) => r.basketDiscount).map((r) => ({ date: r.date!, ...r.basketDiscount! }));
  const reportedSavings = rs.reduce((a, r) => a + r.reportedSavings, 0);

  // ---- Headline insights, most interesting first.
  const insights: Insight[] = [];
  const ups = priceChanges.filter((c) => c.change > 0 && !c.weighed).sort((a, b) => b.pct - a.pct);
  const downs = priceChanges.filter((c) => c.change < 0 && !c.weighed).sort((a, b) => a.pct - b.pct);
  if (ups[0]) insights.push({ tone: 'bad', icon: '📈', title: `${ups[0].name} is up ${ups[0].pct.toFixed(0)}%`, body: `Shelf price went from ${gbp(ups[0].from)} to ${gbp(ups[0].to)} between your first and latest purchase.` });
  if (downs[0]) insights.push({ tone: 'good', icon: '📉', title: `${downs[0].name} got cheaper`, body: `Down ${Math.abs(downs[0].pct).toFixed(0)}% from ${gbp(downs[0].from)} to ${gbp(downs[0].to)}.` });
  if (shrinkflation[0]) {
    const s = shrinkflation[0];
    insights.push({ tone: 'bad', icon: '🫣', title: `Shrinkflation spotted: ${s.after.name}`, body: `${Math.abs(s.sizeChangePct).toFixed(0)}% less in the pack, ${s.unitChangePct.toFixed(0)}% more ${s.after.perUnit.label}.` });
  }
  if (categoryList[0]) insights.push({ tone: 'neutral', icon: '🛒', title: `${categoryList[0].name} is your biggest category`, body: `${categoryList[0].share.toFixed(0)}% of everything you bought, ${gbp(categoryList[0].value)} in total.` });
  if (savings > 0) insights.push({ tone: 'good', icon: '🏷️', title: `Clubcard offers saved you ${gbp(savings)}`, body: `That's ${overview.savingsRate.toFixed(0)}p in every £1 of shelf price${topSavers[0] ? `, led by ${topSavers[0].name} (${gbp(topSavers[0].saved)})` : ''}.` });
  const totalExtra = packChoices.reduce((a, p) => a + p.extra, 0);
  if (totalExtra >= 50) insights.push({ tone: 'neutral', icon: '📦', title: `${gbp(totalExtra)} lost to pack sizes`, body: `Buying the best-value size of products you already buy in several sizes would have saved this.` });
  if (staples[0]) insights.push({ tone: 'neutral', icon: '⭐', title: `${staples[0].name} is in ${staples[0].orders} of ${rs.length} shops`, body: `Your most loyal buy. ${staples[0].offers ? `On offer ${staples[0].offers} of ${staples[0].points.length} times.` : 'Never bought on offer.'}` });
  const biggest = [...orders].sort((a, b) => b.total - a.total)[0];
  if (biggest && rs.length > 2) insights.push({ tone: 'neutral', icon: '🧾', title: `Biggest shop: ${gbp(biggest.total)}`, body: `${biggest.units} items on ${new Date(biggest.date + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}.` });

  return {
    receipts: rs,
    purchases,
    overview,
    orders,
    months,
    categories: categoryList,
    products,
    priceChanges,
    inflation,
    indexSeries,
    shrinkflation,
    packChoices,
    packExtra: totalExtra,
    topSpend,
    staples,
    stapleMonths,
    topSavers,
    warnings,
    basketDeals,
    reportedSavings,
    insights,
  };
}
