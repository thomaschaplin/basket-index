import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ChevronDown, Receipt as ReceiptIcon } from 'lucide-react';
import { useState } from 'react';
import type { Analysis } from '../lib/analysis';
import { CATEGORY_EMOJI } from '../lib/categories';
import { dayLong, gbp, plural } from '../lib/format';
import { Pill, Reveal, Section } from './ui';

export function Receipts({ a }: { a: Analysis }) {
  const [open, setOpen] = useState<string | null>(null);
  const orders = [...a.orders].reverse();
  const max = Math.max(1, ...orders.map((o) => o.total));

  return (
    <Section id="receipts" eyebrow="Your receipts" title="Every shop, line by line" subtitle="Newest first. Open one to see what was in the basket.">
      <div className="grid gap-3">
        {orders.map((o, i) => {
          const isOpen = open === o.orderId;
          const items = a.purchases.filter((p) => p.orderId === o.orderId);
          return (
            <Reveal key={o.orderId} delay={Math.min(i, 6) * 0.04} className="card overflow-hidden">
              <button onClick={() => setOpen(isOpen ? null : o.orderId)} aria-expanded={isOpen} className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 p-4 text-left hover:bg-surface-2/60 sm:p-5">
                <span className="grid size-11 place-items-center rounded-2xl bg-brand/10 text-brand-ink"><ReceiptIcon className="size-5" aria-hidden /></span>
                <span className="grid min-w-0 gap-1.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <b className="font-display text-lg">{dayLong(o.date)}</b>
                    {o.warnings.length > 0 && <Pill tone="warn"><AlertTriangle className="size-3" aria-hidden /> Check</Pill>}
                  </span>
                  <span className="text-xs text-muted">{plural(o.units, 'item')} · saved {gbp(o.saved)} · {o.points} points</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                    <span className="block h-full rounded-full bg-gradient-brand" style={{ width: `${(o.total / max) * 100}%` }} />
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="num text-lg font-bold">{gbp(o.total)}</span>
                  <ChevronDown className={`size-5 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden />
                </span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                    <div className="border-t border-dashed border-line px-4 pb-4 sm:px-5">
                      {o.warnings.map((w) => (
                        <p key={w} className="mt-3 flex gap-2 rounded-xl bg-warn-soft px-3 py-2 text-sm"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />{w}</p>
                      ))}
                      <ul className="mt-2 divide-y divide-line font-mono text-[13px]">
                        {items.map((p, j) => (
                          <li key={j} className="flex items-center gap-3 py-2">
                            <span className="w-6 text-faint">{p.qty}×</span>
                            <span aria-hidden className="font-sans">{CATEGORY_EMOJI[p.category]}</span>
                            <span className="min-w-0 flex-1 truncate font-sans">{p.name}</span>
                            {p.saving > 0 && <span className="hidden text-xs text-faint line-through sm:inline">{gbp(p.lineTotal + p.saving)}</span>}
                            <span className={p.saving > 0 ? 'font-semibold text-down' : ''}>{gbp(p.lineTotal)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

export function ReceiptChecks({ a }: { a: Analysis }) {
  const notes = a.warnings.map((w) => ({ date: w.date, text: w.text }));
  a.basketDeals.forEach((d) =>
    notes.push({ date: d.date, text: `A whole-basket discount took ${gbp(d.amount)} (${d.pct}%) off. It's spread across every line, so those lines don't count as "on offer".` }),
  );
  if (Math.abs(a.reportedSavings - a.overview.savings) > 100) {
    notes.push({ date: '', text: `Tesco's receipts claim ${gbp(a.reportedSavings)} in savings, but the item lines add up to ${gbp(a.overview.savings)}. Basket Index uses the item lines.` });
  }
  if (!notes.length) return null;
  return (
    <Section id="checks" eyebrow="Receipt checks" title="Things that don't add up" subtitle="Discrepancies between what you were charged and what the receipt lists, plus one-off discounts.">
      <div className="grid gap-3 md:grid-cols-2">
        {notes.map((n, i) => (
          <Reveal key={i} delay={(i % 2) * 0.05} className="card flex gap-3 p-4">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warn" aria-hidden />
            <div className="grid gap-0.5 text-sm">
              {n.date && <b>{dayLong(n.date)}</b>}
              <span className="text-muted text-pretty">{n.text}</span>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
