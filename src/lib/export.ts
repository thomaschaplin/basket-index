import type { Analysis } from './analysis';

const cell = (v: string | number | boolean) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Every line item as a CSV a spreadsheet can open. Money in pounds. */
export function downloadCsv(a: Analysis) {
  const head = ['date', 'order_id', 'product', 'category', 'qty', 'unit_price', 'saving', 'line_total', 'weighed', 'on_offer'];
  const rows = a.purchases.map((p) =>
    [
      p.date,
      p.orderId,
      p.name,
      p.category,
      p.qty,
      (p.unitPrice / 100).toFixed(2),
      (p.saving / 100).toFixed(2),
      (p.lineTotal / 100).toFixed(2),
      p.weighed,
      p.saving > 0 && !p.basketDeal,
    ]
      .map(cell)
      .join(','),
  );
  const blob = new Blob([[head.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
  const a2 = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `basket-index-${a.overview.to ?? 'export'}.csv` });
  document.body.appendChild(a2);
  a2.click();
  a2.remove();
  setTimeout(() => URL.revokeObjectURL(a2.href), 5000);
}
