// Tesco digital receipt parser. Works on text extracted by pdf.js (browser or Node).
// Deliberately ignores customer name/address and card digits: only order and item data is kept.
import type { PackSize, Receipt, ReceiptItem } from './types';

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

export function parseReceiptText(raw: string): Receipt {
  const text = raw.replace(/\s+/g, ' ');
  const receipt: Receipt = {
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
  const sum = receipt.items.reduce((a, i) => a + i.lineTotal, 0);
  receipt.itemsTotal = sum;
  const gap = receipt.total - receipt.delivery - sum;
  if (receipt.items.length && gap) {
    receipt.warnings.push(
      `Tesco charged ${gbp(receipt.total)}, but the items add up to ${gbp(sum)} (${gbp(Math.abs(gap))} ${
        gap > 0 ? 'more than listed, for example a bag charge or an item missing from the receipt' : 'less than listed'
      })`,
    );
  }
  // Whole-basket discount (e.g. a % off coupon): nearly every line discounted and Total sits below Subtotal.
  const discounted = receipt.items.filter((i) => i.saving > 0).length;
  if (receipt.items.length && discounted / receipt.items.length >= 0.8 && receipt.subtotal > receipt.total) {
    const amount = receipt.subtotal - receipt.total;
    receipt.basketDiscount = { amount, pct: Math.round((amount / receipt.subtotal) * 100) };
  }
  receipt.computedSavings = receipt.items.reduce((a, i) => a + i.saving, 0);
  return receipt;
}
