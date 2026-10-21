import { AnimatePresence, motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ChartColours } from '../hooks/useTheme';
import type { Analysis, ProductHistory } from '../lib/analysis';
import { CATEGORY_EMOJI, weighedUnit } from '../lib/categories';
import { day, dayLong, dayYear, gbp, plural } from '../lib/format';
import { Sparkline } from './Prices';
import { Delta, Empty, Pill, Reveal, Section } from './ui';

export function Staples({ a, onOpen }: { a: Analysis; onOpen: (key: string) => void }) {
  const n = a.stapleMonths;
  return (
    <Section id="staples" eyebrow="Your staples" title="The things you always buy" subtitle="Bought in at least half the months you shopped, with how often you caught them on offer.">
      {a.staples.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {a.staples.slice(0, 12).map((s, i) => (
            <Reveal key={s.key} delay={(i % 3) * 0.05}>
              <button onClick={() => onOpen(s.key)} className="card grid w-full gap-3 p-4 text-left transition-transform hover:-translate-y-1">
                <span className="flex items-start gap-3">
                  <span className="text-2xl leading-none" aria-hidden>{CATEGORY_EMOJI[s.category]}</span>
                  <span className="line-clamp-2 flex-1 text-sm font-semibold leading-snug">{s.name}</span>
                </span>
                <span className="flex items-center gap-1" aria-label={`Bought in ${s.months} of ${n} months`}>
                  {Array.from({ length: n }, (_, j) => (
                    <span key={j} className={`h-2 flex-1 rounded-full ${j < s.months ? 'bg-gradient-brand' : 'bg-surface-2'}`} />
                  ))}
                </span>
                <span className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                  <span><b className="num text-ink">{s.months}/{n}</b> months · {plural(s.orders, 'shop')} · <b className="num text-ink">{gbp(s.spend)}</b></span>
                  {s.offers ? <Pill tone="offer">On offer {s.offers}/{s.points.length}</Pill> : <Pill>Never on offer</Pill>}
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      ) : (
        <Empty>Staples appear once you add a few receipts.</Empty>
      )}
    </Section>
  );
}

function RankList({ title, rows, onOpen }: { title: string; rows: { key: string; name: string; value: number; sub: string }[]; onOpen: (key: string) => void }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Reveal className="card grid content-start gap-3 p-5 sm:p-6">
      <h3 className="font-display text-xl font-bold">{title}</h3>
      <ol className="grid gap-1">
        {rows.map((r, i) => (
          <li key={r.key}>
            <button onClick={() => onOpen(r.key)} className="relative grid w-full grid-cols-[1.5rem_1fr_auto] items-center gap-3 overflow-hidden rounded-xl px-2 py-2 text-left text-sm hover:bg-surface-2">
              <span className="absolute inset-y-1 left-0 rounded-xl bg-brand/8" style={{ width: `${(r.value / max) * 100}%` }} aria-hidden />
              <span className="relative num text-xs text-faint">{i + 1}</span>
              <span className="relative min-w-0">
                <span className="block truncate font-medium">{r.name}</span>
                <span className="block text-xs text-muted">{r.sub}</span>
              </span>
              <span className="relative num font-semibold">{gbp(r.value)}</span>
            </button>
          </li>
        ))}
      </ol>
    </Reveal>
  );
}

export function TopLists({ a, onOpen }: { a: Analysis; onOpen: (key: string) => void }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <RankList title="Biggest spends" onOpen={onOpen} rows={a.topSpend.slice(0, 8).map((t) => ({ key: t.key, name: t.name, value: t.spend, sub: `${plural(t.units, 'unit')} · ${plural(t.orders, 'shop')}` }))} />
      <RankList title="Offers that paid off" onOpen={onOpen} rows={a.topSavers.slice(0, 8).map((t) => ({ key: t.key, name: t.name, value: t.saved, sub: `saved on ${plural(t.units, 'unit')}` }))} />
    </div>
  );
}

export function ProductExplorer({ a, onOpen }: { a: Analysis; onOpen: (key: string) => void }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('All');
  const cats = ['All', ...a.categories.map((c) => c.name)];
  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return a.products.filter((p) => (cat === 'All' || p.category === cat) && words.every((w) => p.key.includes(w)));
  }, [a.products, q, cat]);

  return (
    <Section id="products" eyebrow="Everything you bought" title="Product explorer" subtitle={`${a.products.length} different products. Search, filter, and tap any one for its full price history.`}>
      <div className="grid gap-3">
        <label className="card flex items-center gap-3 px-4 py-3 focus-within:border-brand/60">
          <Search className="size-5 text-muted" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products, e.g. cheddar, nappies, coffee" className="w-full bg-transparent text-base outline-none placeholder:text-faint" aria-label="Search products" />
          {q && <button onClick={() => setQ('')} aria-label="Clear search" className="rounded-full p-1 text-muted hover:bg-surface-2"><X className="size-4" /></button>}
        </label>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${cat === c ? 'border-transparent bg-gradient-brand text-white' : 'border-line bg-surface text-muted hover:text-ink'}`}>
              {c !== 'All' && <span aria-hidden>{CATEGORY_EMOJI[c as keyof typeof CATEGORY_EMOJI]} </span>}{c}
            </button>
          ))}
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="max-h-[28rem] overflow-y-auto">
          {results.length ? (
            <ul className="divide-y divide-line">
              {results.slice(0, 200).map((p) => (
                <li key={p.key}>
                  <button onClick={() => onOpen(p.key)} className="grid w-full grid-cols-[2rem_1fr_auto] items-center gap-3 px-4 py-3 text-left hover:bg-surface-2 sm:grid-cols-[2rem_1fr_7rem_auto]">
                    <span className="text-xl leading-none" aria-hidden>{CATEGORY_EMOJI[p.category]}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      <span className="block text-xs text-muted">{plural(p.units, 'unit')} · {plural(p.orders, 'shop')}{p.saved ? ` · saved ${gbp(p.saved)}` : ''}</span>
                    </span>
                    <span className="hidden sm:block">{p.points.length > 1 && <Sparkline points={p.points} height={24} />}</span>
                    <span className="num text-sm font-semibold">{gbp(p.spend)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-sm text-muted">Nothing matches “{q}”.</p>
          )}
        </div>
      </div>
    </Section>
  );
}

function HistoryTip({ active, payload }: { active?: boolean; payload?: { payload: { date: string; shelf: number; paid: number; onOffer: boolean; qty: number } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="glass grid gap-0.5 rounded-xl border border-line px-3 py-2 text-sm shadow-xl">
      <div className="text-xs text-muted">{dayYear(p.date)} · ×{p.qty}</div>
      <div>Shelf <b className="num">{gbp(p.shelf)}</b></div>
      {p.onOffer && <div className="text-xs font-semibold">On offer: paid {gbp(p.paid)} each</div>}
    </div>
  );
}

export function ProductModal({ product, a, c, onClose }: { product: ProductHistory | null; a: Analysis; c: ChartColours; onClose: () => void }) {
  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [product, onClose]);

  const change = product && a.priceChanges.find((x) => x.key === product.key);
  const buys = product ? a.purchases.filter((p) => p.key === product.key) : [];

  return (
    <AnimatePresence>
      {product && (
        <motion.div className="fixed inset-0 z-40 grid items-end justify-items-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-title"
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
            className="grid max-h-[90dvh] w-full max-w-2xl gap-5 overflow-y-auto rounded-t-3xl border border-line bg-surface p-6 shadow-2xl sm:rounded-3xl"
          >
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-2xl" aria-hidden>{CATEGORY_EMOJI[product.category]}</span>
              <div className="grid min-w-0 flex-1 gap-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">{product.category}</span>
                <h3 id="product-title" className="font-display text-2xl font-bold leading-tight text-balance">{product.name}</h3>
              </div>
              <button onClick={onClose} autoFocus aria-label="Close" className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-ink"><X className="size-5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Latest shelf price', gbp(product.points.at(-1)!.shelf) + (product.weighed ? `/${weighedUnit(product.category)}` : '')],
                ['Total spent', gbp(product.spend)],
                ['Bought', `${product.units}× in ${plural(product.orders, 'shop')}`],
                ['Saved on offers', gbp(product.saved)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-surface-2 p-3">
                  <div className="text-xs text-muted">{k}</div>
                  <div className="num mt-1 font-semibold">{v}</div>
                </div>
              ))}
            </div>

            {product.points.length > 1 ? (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Shelf price history</span>
                  {change && <Delta pct={change.pct} />}
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={product.points} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke={c.grid} />
                      <XAxis dataKey="date" tickFormatter={day} tick={{ fill: c.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(v: number) => gbp(v)} tick={{ fill: c.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={56} domain={['auto', 'auto']} />
                      <Tooltip content={<HistoryTip />} cursor={{ stroke: c.faint }} />
                      <Line
                        type="stepAfter"
                        dataKey="shelf"
                        stroke={c.brand}
                        strokeWidth={2.5}
                        dot={(props: { cx?: number; cy?: number; index?: number; payload?: { onOffer: boolean } }) => (
                          <circle key={props.index} cx={props.cx} cy={props.cy} r={5} fill={props.payload?.onOffer ? c.offer : c.brand} stroke={c.surface} strokeWidth={2} />
                        )}
                        activeDot={{ r: 7, stroke: c.surface, strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted"><span className="inline-block size-2.5 rounded-full bg-offer" /> bought on offer</p>
              </div>
            ) : (
              <Empty>Bought once so far, so there's no price history yet.</Empty>
            )}

            <div className="grid gap-2">
              <span className="text-sm font-semibold">Every purchase</span>
              <ul className="divide-y divide-line rounded-2xl border border-line text-sm">
                {buys.map((b, i) => (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                    <span>{dayLong(b.date)}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-muted">×{b.qty}{b.weighed ? ` @ ${gbp(b.unitPrice)}/${weighedUnit(b.category)}` : ` @ ${gbp(b.unitPrice)}`}</span>
                      {b.saving > 0 && <Pill tone="offer">−{gbp(b.saving)}</Pill>}
                      <b className="num">{gbp(b.lineTotal)}</b>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
