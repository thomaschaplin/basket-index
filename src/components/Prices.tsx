import { AnimatePresence, motion } from 'framer-motion';
import { Award, Scale } from 'lucide-react';
import { useState } from 'react';
import type { Analysis, PriceChange, PricePoint } from '../lib/analysis';
import { day, gbp, plural } from '../lib/format';
import { Delta, Empty, Pill, Reveal, Section, Segmented } from './ui';

export function Sparkline({ points, height = 36, className = '' }: { points: PricePoint[]; height?: number; className?: string }) {
  const w = 200;
  const pad = 5;
  const vals = points.map((p) => p.shelf);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const x = (i: number) => pad + (i / Math.max(1, vals.length - 1)) * (w - pad * 2);
  const y = (v: number) => (max === min ? height / 2 : height - pad - ((v - min) / (max - min)) * (height - pad * 2));
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={`block w-full ${className}`} style={{ height }} role="img" aria-label={`Shelf price ${points.map((p) => gbp(p.shelf)).join(', ')}`}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" className="text-faint" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.shelf)} r={i === points.length - 1 ? 4 : 3} className={p.onOffer ? 'fill-offer' : 'fill-ink'} stroke="var(--surface)" strokeWidth={1.5} vectorEffect="non-scaling-stroke">
          <title>{`${day(p.date)}: ${gbp(p.shelf)}${p.onOffer ? ` (on offer, paid ${gbp(p.paid)})` : ''}`}</title>
        </circle>
      ))}
    </svg>
  );
}

function MoverCard({ c, onOpen }: { c: PriceChange; onOpen: () => void }) {
  const up = c.change > 0;
  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      onClick={onOpen}
      className={`card group relative grid gap-3 overflow-hidden p-4 text-left transition-[transform,border-color] hover:-translate-y-1 ${up ? 'hover:border-up/50' : 'hover:border-down/50'}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${up ? 'bg-up' : 'bg-down'}`} aria-hidden />
      <span className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug">{c.name}</span>
      <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="font-display text-3xl font-bold">{gbp(c.to)}</span>
        <span className="font-mono text-sm text-faint line-through">{gbp(c.from)}</span>
        <span className="ml-auto"><Delta pct={c.pct} /></span>
      </span>
      <Sparkline points={c.points} />
      <span className="flex justify-between gap-2 border-t border-dashed border-line pt-2 text-xs text-muted">
        <span>{day(c.fromDate)} → {day(c.toDate)}</span>
        <span>{c.weighed ? 'per kg' : `bought ${c.times}×`}</span>
      </span>
    </motion.button>
  );
}

type MoverFilter = 'all' | 'up' | 'down';

export function PriceMovers({ a, onOpen }: { a: Analysis; onOpen: (key: string) => void }) {
  const [filter, setFilter] = useState<MoverFilter>('all');
  const [showAll, setShowAll] = useState(false);
  const moved = a.priceChanges.filter((c) => c.change !== 0);
  const ups = moved.filter((c) => c.change > 0);
  const downs = moved.filter((c) => c.change < 0);
  const list = filter === 'up' ? ups : filter === 'down' ? downs : moved;
  const shown = showAll ? list : list.slice(0, 8);

  return (
    <Section
      id="prices"
      eyebrow="Price movers"
      title="The prices that moved"
      subtitle={<>Shelf price before offers, first purchase vs latest. <span className="inline-flex items-center gap-1"><span className="inline-block size-2.5 rounded-full bg-offer" /> marks a purchase on offer.</span></>}
      actions={<Segmented label="Price direction" value={filter} onChange={setFilter} options={[{ value: 'all', label: `All ${moved.length}` }, { value: 'up', label: `▲ ${ups.length}` }, { value: 'down', label: `▼ ${downs.length}` }]} />}
    >
      {list.length ? (
        <>
          <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {shown.map((c) => <MoverCard key={c.key} c={c} onOpen={() => onOpen(c.key)} />)}
            </AnimatePresence>
          </motion.div>
          {list.length > 8 && (
            <button onClick={() => setShowAll((s) => !s)} className="mx-auto rounded-full border border-line bg-surface px-5 py-2 text-sm font-semibold hover:border-brand/50">
              {showAll ? 'Show fewer' : `Show all ${list.length}`}
            </button>
          )}
        </>
      ) : (
        <Empty>No shelf-price changes yet. They show up once you add receipts that repeat products over a few weeks.</Empty>
      )}
    </Section>
  );
}

export function PackSizes({ a }: { a: Analysis }) {
  return (
    <Section id="packs" eyebrow="Shrinkflation watch" title="Smaller packs, bigger prices?" subtitle="Products you've bought in more than one size, compared on price per 100g, 100ml or item.">
      {a.shrinkflation.length ? (
        <div className="grid gap-3">
          {a.shrinkflation.map((s) => (
            <Reveal key={s.after.name} className="card flex flex-wrap items-center gap-4 border-warn/40 bg-warn-soft p-5">
              <span className="text-3xl" aria-hidden>🫣</span>
              <div className="grid min-w-0 flex-1 gap-1">
                <strong className="font-display text-lg">{s.after.name}</strong>
                <span className="text-sm text-muted">
                  Was {s.before.size.label} at {gbp(s.before.price)} until {day(s.before.last)}. From {day(s.after.first)} it's {s.after.size.label} at {gbp(s.after.price)}:{' '}
                  <b className="text-ink">{Math.abs(s.sizeChangePct).toFixed(0)}% less product, {s.unitChangePct.toFixed(0)}% more {s.after.perUnit.label}</b>.
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      ) : (
        <Reveal className="card flex items-start gap-4 p-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-down-soft text-down"><Award className="size-5" aria-hidden /></span>
          <p className="text-sm text-muted text-pretty">
            <b className="text-ink">No shrinkflation spotted.</b> A product is flagged when its pack shrinks by up to a quarter while the shelf price stays within 10%. Switching between pack sizes yourself shows in the table below instead.
          </p>
        </Reveal>
      )}

      {a.packChoices.length > 0 && (
        <Reveal className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <span className="flex items-center gap-2 font-display text-lg font-bold"><Scale className="size-5 text-brand-ink" aria-hidden /> Pack-size value</span>
            <Pill tone={a.packExtra > 0 ? 'warn' : 'good'}>{gbp(a.packExtra)} extra paid by not buying the best-value size</Pill>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="bg-surface-2 text-left text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Product and sizes</th>
                  <th className="px-3 py-3 text-right font-semibold">Shelf price</th>
                  <th className="px-3 py-3 text-right font-semibold">Unit price</th>
                  <th className="px-5 py-3 text-right font-semibold">Bought</th>
                </tr>
              </thead>
              <tbody>
                {a.packChoices.map((p) =>
                  p.sizes.map((s, i) => (
                    <tr key={s.name} className={i === 0 ? 'border-t border-line' : ''}>
                      <td className="px-5 py-2.5">
                        <span className={i ? 'pl-4 text-muted' : 'font-medium'}>{i ? '↳ ' : ''}{s.name}</span>
                        {s === p.best && <Pill tone="good" className="ml-2">Best value</Pill>}
                      </td>
                      <td className="num px-3 py-2.5 text-right">{gbp(s.price)}</td>
                      <td className="num px-3 py-2.5 text-right">{s.perUnit.value.toFixed(1)}p <span className="text-xs text-muted">{s.perUnit.label.replace('per ', '/')}</span></td>
                      <td className="num px-5 py-2.5 text-right">{plural(s.units, 'unit')}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </Reveal>
      )}
    </Section>
  );
}
