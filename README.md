# Basket Index

Cost-of-living insights from your own Tesco receipts. Drop in the PDFs and get your personal inflation rate, price movers, shrinkflation checks, pack-size value, staples, and every shop line by line.

**Private by design.** Receipts are parsed in the browser with pdf.js and never uploaded. Names, addresses and card details are ignored. Your parsed receipts are kept in `localStorage` on your device only, so they're there next time; "Start over" clears them.

## What it shows

- **Basket inflation**: shelf price (before offers) of every product bought more than once, first vs latest, weighted by first-purchase quantity. Plotted as an index (100 = first shop) and annualised once the window is at least four weeks.
- **Insights**: auto-generated headlines (biggest riser, biggest faller, top category, offer savings, pack-size losses, most loyal buy).
- **Spend per shop / month**, paid vs saved by offers, and spend by category.
- **Price movers** with sparklines; offer purchases marked.
- **Shrinkflation watch**: a product family whose larger pack stops appearing and only a smaller, dearer-per-unit pack appears afterwards. Plus a pack-size value table with the best-value size and what not buying it cost.
- **Staples**, **biggest spends**, **offers that paid off**.
- **Product explorer**: search and filter every product, with full price history in a detail view.
- **Receipts**: every order, expandable to its line items.
- **Receipt checks**: orders whose lines don't add up to the charged total, whole-basket discounts, and Tesco's own "Including savings" figure vs the real line savings.
- **CSV export** of every line item, light and dark themes, and a one-minute console script to download all your receipts from tesco.com.

## Stack

Vite, React 19, TypeScript, Tailwind CSS v4, Framer Motion, Recharts, pdf.js (lazy-loaded). Fonts are self-hosted, so the page makes no third-party requests.

```
src/lib/parser.ts        Receipt text -> { orderId, date, totals, items[] }
src/lib/analysis.ts      Receipts -> insights. All money in pence.
src/lib/categories.ts    Keyword categoriser
src/lib/__fixtures__/    Eight real receipts as text, personal details and order IDs redacted.
                         Used by the tests and as the in-app sample data.
src/lib/downloader.js    Console script that pulls every receipt PDF from tesco.com/account/receipts
src/components/          UI
scripts/extract-fixtures.ts  Rebuilds the fixtures from ./samples/*.pdf (git-ignored)
```

## Develop

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # parser + analysis tests against the fixtures
npm run build      # type-check and build to dist/
```

To refresh the fixtures from your own PDFs, put them in `samples/` and run `npm run fixtures`. Check the output for anything personal before committing.

## Deploy

Vercel picks up `vercel.json` (Vite preset, output `dist`). Any static host works: serve `dist/`.

## Parser notes

- Line totals already include coupon deductions, so they reconcile with **Total**, not Subtotal.
- Loose produce (`… Loose`) shows price per kg as unit price; the line total is the weighed price.
- Tesco's "Including savings of" is unreliable (e.g. £0.60 on a receipt with £16.04 of line savings), so the app recalculates.
- Two sample receipts genuinely don't reconcile on Tesco's side: 5 Aug 2026 (lines £87.00, charged £87.40) and 17 Aug 2026 (lines £55.66, charged £59.41).
