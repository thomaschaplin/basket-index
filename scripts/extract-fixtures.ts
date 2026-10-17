// Turns ./samples/*.pdf into redacted text fixtures used by the tests and the in-app sample data.
// Usage: npx vite-node scripts/extract-fixtures.ts
import fs from 'node:fs';
import path from 'node:path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { pdfToText } from '../src/lib/pdf-text';
import { parseReceiptText } from '../src/lib/parser';

const OUT = 'src/lib/__fixtures__';
const files = fs.readdirSync('samples').filter((f) => f.endsWith('.pdf'));
const texts: { date: string; text: string }[] = [];
for (const f of files) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(path.join('samples', f))) }).promise;
  const text = await pdfToText(doc);
  const date = parseReceiptText(text).date;
  if (!date) throw new Error(`No date in ${f}`);
  texts.push({ date, text });
}
texts.sort((a, b) => a.date.localeCompare(b.date));
texts.forEach(({ date, text }, i) => {
  const orderId = parseReceiptText(text).orderId!;
  const fake = `1000-0000-${String(i + 1).padStart(3, '0')}`;
  const redacted = text
    // Customer block: everything between "Customer details" and the seller's address.
    .replace(/Customer details[\s\S]*?(?=Seller details)/, 'Customer details [redacted] ')
    .replace(/Seller details[\s\S]*?Order information/, 'Seller details Tesco [redacted] Order information')
    .replace(/Payment method:[^\n]*?(?=Clubcard points earned|\n)/, 'Payment method: [redacted] ')
    .replace(/Clubcard points balance:\s*\d+\s*points/g, 'Clubcard points balance: [redacted]')
    .replace(/Store ID:\s*\d+/g, 'Store ID: [redacted]')
    .replace(/VAT number:[^\n]*?(?=Purchase date|\n)/, '')
    .split(orderId).join(fake)
    // Barcode caption under the footer repeats the order ID, sometimes with spaced-out digits.
    .replace(/^.*\d(?: \d){3,}.*$/gm, '');
  fs.writeFileSync(path.join(OUT, `receipt-${date}.txt`), redacted);
  console.log(date, fake);
});
