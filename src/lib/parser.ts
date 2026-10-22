// Tesco and Sainsbury's digital receipt parsers. Work on text extracted by pdf.js (browser or Node).
// Deliberately ignore customer name/address, card digits and loyalty card numbers: only order and item data is kept.
import type { PackSize, Receipt, ReceiptItem, Retailer } from './types';

const money = (s: string | null | undefined) => (s == null ? 0 : Math.round(parseFloat(s.replace(/,/g, '')) * 100));

function field(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

// "09/10/2026" -> "2026-10-09"
function isoDate(dmy: string | null): string | null {
  if (!dmy) return null;
  const [d, m, y] = dmy.split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

const UNIT: Record<string, ['g' | 'ml', number]> = {
  g: ['g', 1], kg: ['g', 1000], ml: ['ml', 1], cl: ['ml', 10], l: ['ml', 1000], ltr: ['ml', 1000], litre: ['ml', 1000],
};
const COUNT_WORDS = 'pack|washes|wash|roll|rolls|nappies|wipes|slices|capsules|tablets|pods';

/** Pull pack size out of a product name. Amount is in g, ml, or items. */
export function parseSize(name: string): PackSize | null {
  const n = name.replace(/,/g, ' ');
  // multipack: 6x22g, 4 X 145G, 8 x 330ml
  let m = n.match(/(\d+)\s*[xX]\s*(\d+(?:\.\d+)?)\s*(kg|g|ml|cl|l)\b/i);
  if (m) {
    const [u, f] = UNIT[m[3].toLowerCase()];
    return { label: m[0].replace(/\s+/g, ''), count: +m[1], amount: +m[1] * +m[2] * f, unit: u };
  }
  // single weight/volume: 500G, 2.272L, 1.25Kg, 1 Litre. The last one wins ("80 Washes 2400ml").
  const all = [...n.matchAll(/(\d+(?:\.\d+)?)\s*(kg|g|ml|cl|ltr|litre|l)\b/gi)];
  if (all.length) {
    m = all[all.length - 1];
    const [u, f] = UNIT[m[2].toLowerCase()];
    return { label: m[0].replace(/\s+/g, ''), count: 1, amount: +m[1] * f, unit: u };
  }
  // count-based: 12 Pack, 80 Washes, 4 Roll, 44 Nappies
  m = n.match(new RegExp(`(\\d+)\\s*(${COUNT_WORDS})\\b`, 'i'));
  if (m) return { label: m[0], count: +m[1], amount: +m[1], unit: 'each' };
  return null;
}

/** A stable key for a product with its pack size removed. Same family + different size = a pack-size change. */
export function familyKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\d+\s*x\s*\d+(\.\d+)?\s*(kg|g|ml|cl|l)\b/g, ' ')
    .replace(/\d+(\.\d+)?\s*(kg|g|ml|cl|ltr|litre|l)\b/g, ' ')
    .replace(new RegExp(`\\d+\\s*(${COUNT_WORDS})\\b`, 'g'), ' ')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9& ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort() // word order varies between listings ("Free Range Eggs Medium" vs "Medium Free Range Eggs")
    .join(' ');
}

const gbp = (p: number) => `£${(p / 100).toFixed(2)}`;

export const RETAILER_NAME: Record<Retailer, string> = { tesco: 'Tesco', sainsburys: "Sainsbury's" };

/** Sainsbury's e-receipts open with "Your receipt for order:"; Tesco's with "Order ID:". */
export const isSainsburys = (raw: string) => /Your receipt for order:/i.test(raw) && !/Order ID:/.test(raw);

export function parseReceiptText(raw: string): Receipt {
  return isSainsburys(raw) ? parseSainsburysText(raw) : parseTescoText(raw);
}

/** Flags lines that don't reconcile with what was charged. `expected` is the total the item lines should add up to. */
function reconcile(receipt: Receipt, expected: number) {
  const sum = receipt.items.reduce((a, i) => a + i.lineTotal, 0);
  receipt.itemsTotal = sum;
  const gap = expected - sum;
  if (receipt.items.length && gap) {
    receipt.warnings.push(
      `${RETAILER_NAME[receipt.retailer]} charged ${gbp(receipt.total)}, but the items add up to ${gbp(sum)} (${gbp(Math.abs(gap))} ${
        gap > 0 ? 'more than listed, for example a bag charge or an item missing from the receipt' : 'less than listed'
      })`,
    );
  }
}

export function parseTescoText(raw: string): Receipt {
  const text = raw.replace(/\s+/g, ' ');
  const receipt: Receipt = {
    retailer: 'tesco',
    orderId: field(text, /Order ID:\s*([A-Z0-9]+(?:-[A-Z0-9]+)*)/),
    date: isoDate(field(text, /Purchase date:\s*(\d{1,2}\/\d{1,2}\/\d{4})/)),
    channel: field(text, /Channel:\s*([A-Za-z]+(?:-[A-Za-z]+)?)/),
    subtotal: money(field(text, /Subtotal:\s*£([\d,.]+)/)),
    reportedSavings: money(field(text, /Including savings of:\s*£([\d,.]+)/)),
    delivery: money(field(text, /Delivery:\s*\+\s*£([\d,.]+)/)),
    coupons: money(field(text, /Coupons:\s*-\s*£([\d,.]+)/)),
    total: money(field(text, /(?:^|\s)Total:\s*£([\d,.]+)/)),
    points: +(field(text, /Clubcard points earned:\s*(\d+)/) || 0),
    items: [],
    itemsTotal: 0,
    computedSavings: 0,
    warnings: [],
  };

  const header = text.indexOf('Total cost');
  const start = header >= 0 ? header + 'Total cost'.length : Math.max(0, text.indexOf('Your items'));
  const end = text.indexOf('Payment summary', start);
  const body = text.slice(start, end > 0 ? end : undefined);

  // qty, name, unit price, saving (or "-"), line total. pdf.js keeps wrapped names in reading order.
  // In-store receipts can leave the name blank ("1 £0.25 - £0.25") and give fuel in litres ("13.9 DIESEL £1.44 - £20.00").
  const re = /(?<![\w.,£])(\d{1,3}(?:\.\d{1,3})?)\s+(?:(.*?)\s+)??£([\d,]+\.\d{2})\s+(?:£([\d,]+\.\d{2})|-)\s+£([\d,]+\.\d{2})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const name = (m[2] ?? '').replace(/\s+/g, ' ').trim() || 'Unnamed item';
    if (/^free sample\b/i.test(name)) continue; // £0.00 promotional extras aren't part of the shop
    // Fuel: priced like loose produce, one line with the unit price per litre. Tesco truncates the litres column, so ignore it.
    const byVolume = !Number.isInteger(+m[1]) || /\b(diesel|unleaded|petrol)\b/i.test(name);
    const qty = byVolume ? 1 : +m[1];
    const unitPrice = money(m[3]);
    const saving = money(m[4]);
    const lineTotal = money(m[5]);
    const weighed = byVolume || /\bloose\b/i.test(name) || (qty === 1 && !saving && lineTotal !== unitPrice);
    const item: ReceiptItem = { qty, name, unitPrice, saving, lineTotal, weighed, size: parseSize(name), family: familyKey(name) };
    if (!weighed && qty * unitPrice - saving !== lineTotal) receipt.warnings.push(`Line doesn't add up: ${name}`);
    receipt.items.push(item);
  }

  // Line totals already include coupon deductions, so they reconcile with the charged total, not the subtotal.
  reconcile(receipt, receipt.total - receipt.delivery);
  // Whole-basket discount (e.g. a % off coupon): nearly every line discounted and Total sits below Subtotal.
  const discounted = receipt.items.filter((i) => i.saving > 0).length;
  if (receipt.items.length && discounted / receipt.items.length >= 0.8 && receipt.subtotal > receipt.total) {
    const amount = receipt.subtotal - receipt.total;
    receipt.basketDiscount = { amount, pct: Math.round((amount / receipt.subtotal) * 100) };
  }
  receipt.computedSavings = receipt.items.reduce((a, i) => a + i.saving, 0);
  return receipt;
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

// "Friday 9th October 2026" -> "2026-10-09"
function isoLongDate(text: string): string | null {
  const m = text.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTHS.join('|')})\\s+(\\d{4})\\b`, 'i'));
  if (!m) return null;
  return `${m[3]}-${String(MONTHS.indexOf(m[2].toLowerCase()) + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

/**
 * pdf.js returns the ff/fi/fl ligatures in Sainsbury's receipts as their own text items, so "Diffuser" comes out
 * as "Di ff user". A single joining space means the pieces touched; a real space shows up as two or more.
 */
export const joinLigatures = (raw: string) =>
  raw.replace(/([^\s])?( +)(ffi|ffl|ff|fi|fl)( +)(?=[^\s])/g, (_, before = '', l: string, lig: string, r: string) =>
    before + (before && l === ' ' ? '' : l) + lig + (r === ' ' ? '' : r),
  );

export function parseSainsburysText(raw: string): Receipt {
  const text = joinLigatures(raw).replace(/\s+/g, ' ');
  const receipt: Receipt = {
    retailer: 'sainsburys',
    orderId: field(text, /Your receipt for order:\s*(\d+)/i),
    date: isoLongDate(field(text, /(?:Slot|Delivery|Collection) time:\s*([^,]+)/i) ?? text),
    channel: 'Online',
    subtotal: money(field(text, /Subtotal\s*£([\d,.]+)/)),
    reportedSavings: money(field(text, /You've saved\*?\s*-?£([\d,.]+)/)),
    delivery: money(field(text, /(?:Delivery|Collection) cost\s*£([\d,.]+)/)),
    coupons: money(field(text, /Coupons\s*-£([\d,.]+)/)),
    total: money(field(text, /Total paid\s*£([\d,.]+)/)),
    points: +(field(text, /Points earned\s*(\d+)/) || 0),
    items: [],
    itemsTotal: 0,
    computedSavings: 0,
    warnings: [],
  };

  // Items sit under one or more "Groceries (28 items)" style headings, before the order summary.
  const heading = /[A-Z][A-Za-z&' -]*\((\d+) items?\)/g;
  const start = text.search(heading);
  const end = text.indexOf('Order summary', start);
  const section = start >= 0 ? text.slice(start, end > 0 ? end : undefined) : '';
  const listed = [...section.matchAll(heading)].reduce((a, m) => a + +m[1], 0);
  const body = section.replace(heading, ' ');

  // qty, name, line total. Sainsbury's prints only the price paid per line; offers are one figure for the whole order.
  const re = /(?<![\w.,£])(\d{1,3})\s+(.+?)\s+£([\d,]+\.\d{2})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const qty = +m[1];
    const name = m[2].trim();
    const lineTotal = money(m[3]);
    receipt.items.push({ qty, name, unitPrice: Math.round(lineTotal / qty), saving: 0, lineTotal, weighed: false, size: parseSize(name), family: familyKey(name) });
  }

  const units = receipt.items.reduce((a, i) => a + i.qty, 0);
  if (listed && units !== listed) receipt.warnings.push(`The receipt lists ${listed} items, but Basket Index could read ${units}`);
  // Line totals are after offers but before coupons, which come off the whole order.
  reconcile(receipt, receipt.total - receipt.delivery + receipt.coupons);
  return receipt;
}

/** The parts of a Sainsbury's groceries API order that the downloader keeps (`/groceries-api/gol-services/order/v1/order/{id}`). */
export interface SainsburysOrder {
  order_uid?: string | number;
  order_type?: string;
  slot_start_time?: string;
  total?: number;
  sub_total?: number;
  slot_price?: number;
  carrier_bag_charge?: number;
  vouchers_savings?: number;
  savings?: number;
  order_items?: {
    quantity?: number;
    sub_total?: number;
    product?: { name?: string; adjustment?: { usage?: string; amount?: string | number }[] | null };
  }[];
}

const pounds = (n: unknown) => Math.round(Math.abs(Number(n) || 0) * 100);

// "2026-10-09T18:00:00Z" -> "2026-10-09", on the UK calendar (slots are UK times).
const ukDate = (iso: string | undefined) => {
  const d = new Date(iso ?? '');
  return isNaN(+d) ? null : new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(d);
};

/** Reads an order saved by the Sainsbury's downloader. Unlike the e-receipt PDF, it has per-line offer savings but no Nectar points. */
export function parseSainsburysOrder(order: SainsburysOrder): Receipt {
  const receipt: Receipt = {
    retailer: 'sainsburys',
    orderId: order.order_uid == null ? null : String(order.order_uid),
    date: ukDate(order.slot_start_time),
    channel: /collect/i.test(order.order_type ?? '') ? 'Click & collect' : 'Online',
    subtotal: pounds(order.sub_total) + pounds(order.savings) + pounds(order.slot_price),
    reportedSavings: pounds(order.savings),
    delivery: pounds(order.slot_price),
    coupons: pounds(order.vouchers_savings),
    total: pounds(order.total),
    points: 0,
    items: [],
    itemsTotal: 0,
    computedSavings: 0,
    warnings: [],
  };
  for (const line of order.order_items ?? []) {
    const name = (line.product?.name ?? '').replace(/\s+/g, ' ').trim() || 'Unnamed item';
    const quantity = Number(line.quantity) || 1;
    const lineTotal = pounds(line.sub_total);
    // Nectar Prices and offers on this line. Order-level vouchers are separate (vouchers_savings).
    const saving = (line.product?.adjustment ?? []).filter((a) => /discount/i.test(a.usage ?? '')).reduce((a, x) => a + pounds(x.amount), 0);
    // Catchweight lines come by the kg: priced like loose produce, as one line with the price per kg.
    const weighed = !Number.isInteger(quantity);
    const qty = weighed ? 1 : quantity;
    const unitPrice = Math.round((lineTotal + saving) / (weighed ? quantity : qty));
    receipt.items.push({ qty, name, unitPrice, saving, lineTotal, weighed, size: parseSize(name), family: familyKey(name) });
  }
  receipt.computedSavings = receipt.items.reduce((a, i) => a + i.saving, 0);
  reconcile(receipt, receipt.total - receipt.delivery - pounds(order.carrier_bag_charge) + receipt.coupons);
  return receipt;
}
