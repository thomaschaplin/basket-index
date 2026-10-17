import { motion } from 'framer-motion';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ChartColours } from '../hooks/useTheme';
import type { Analysis } from '../lib/analysis';
import { CATEGORY_EMOJI } from '../lib/categories';
import { day, gbp, gbp0, monthName } from '../lib/format';
import { Reveal, Section, Segmented } from './ui';

export function Insights({ a }: { a: Analysis }) {
  if (!a.insights.length) return null;
  const tone = { good: 'from-down/20', bad: 'from-up/20', neutral: 'from-brand/20' } as const;
  return (
    <Section id="insights" eyebrow="At a glance" title="What your receipts are telling you">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {a.insights.map((ins, i) => (
          <Reveal key={ins.title} delay={(i % 4) * 0.06} className={`card relative overflow-hidden bg-gradient-to-br ${tone[ins.tone]} to-transparent to-60% p-5 transition-transform hover:-translate-y-1`}>
            <div className="grid gap-2">
              <span className="text-3xl" aria-hidden>{ins.icon}</span>
              <h3 className="font-display text-lg font-bold leading-tight text-balance">{ins.title}</h3>
              <p className="text-sm text-muted text-pretty">{ins.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

type SpendView = 'shops' | 'months';

function SpendTip({ active, payload }: { active?: boolean; payload?: { payload: { label: string; paid: number; saved: number; units?: number } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="glass grid gap-1 rounded-xl border border-line px-3 py-2 text-sm shadow-xl">
      <div className="text-xs text-muted">{p.label}{p.units ? ` · ${p.units} items` : ''}</div>
      <div className="flex items-center gap-2"><span className="size-2.5 rounded-sm bg-brand" />Paid <b className="num ml-auto pl-4">{gbp(p.paid)}</b></div>
      <div className="flex items-center gap-2"><span className="size-2.5 rounded-sm bg-aqua" />Saved <b className="num ml-auto pl-4">{gbp(p.saved)}</b></div>
    </div>
  );
}

export function SpendChart({ a, c }: { a: Analysis; c: ChartColours }) {
  const [view, setView] = useState<SpendView>('shops');
  const shops = a.orders.map((o) => ({ label: day(o.date), paid: o.total, saved: o.saved, units: o.units }));
  const monthMap = new Map<string, { paid: number; saved: number }>();
  a.orders.forEach((o) => {
    const m = monthMap.get(o.date.slice(0, 7)) ?? { paid: 0, saved: 0 };
    m.paid += o.total;
    m.saved += o.saved;
    monthMap.set(o.date.slice(0, 7), m);
  });
  const months = [...monthMap].map(([m, v]) => ({ label: monthName(m), ...v }));
  const data = view === 'shops' ? shops : months;

  return (
    <Reveal className="card grid gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-bold">Spend per {view === 'shops' ? 'shop' : 'month'}</h3>
          <p className="text-sm text-muted">What you paid, with what offers took off on top.</p>
        </div>
        <Segmented label="Spend view" value={view} onChange={setView} options={[{ value: 'shops', label: 'Shops' }, { value: 'months', label: 'Months' }]} />
      </div>
      <div className="flex gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-brand" /> Paid</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-aqua" /> Saved by offers</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke={c.grid} />
            <XAxis dataKey="label" tick={{ fill: c.muted, fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={8} />
            <YAxis tickFormatter={(v: number) => gbp0(v)} tick={{ fill: c.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
            <Tooltip content={<SpendTip />} cursor={{ fill: c.grid, opacity: 0.5 }} />
            <Bar dataKey="paid" stackId="s" fill={c.brand} stroke={c.surface} strokeWidth={2} radius={[0, 0, 4, 4]} maxBarSize={56} animationDuration={900} />
            <Bar dataKey="saved" stackId="s" fill={c.aqua} stroke={c.surface} strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={56} animationDuration={900} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {view === 'months' && <p className="text-xs text-muted">Months with fewer shops look lower; the latest month may be partial.</p>}
    </Reveal>
  );
}

export function Categories({ a }: { a: Analysis }) {
  const max = Math.max(1, ...a.categories.map((x) => x.value));
  return (
    <Reveal className="card grid content-start gap-4 p-5 sm:p-6">
      <div>
        <h3 className="font-display text-xl font-bold">Where the money goes</h3>
        <p className="text-sm text-muted">Line totals by category, after offers.</p>
      </div>
      <ul className="grid gap-2.5">
        {a.categories.map((cat, i) => (
          <li key={cat.name} className="grid grid-cols-[1.75rem_minmax(6.5rem,9rem)_1fr_auto] items-center gap-3 text-sm" title={`${cat.name}: ${gbp(cat.value)} (${cat.share.toFixed(1)}%)`}>
            <span className="text-lg leading-none" aria-hidden>{CATEGORY_EMOJI[cat.name]}</span>
            <span className="truncate font-medium">{cat.name}</span>
            <span className="h-3 overflow-hidden rounded-full bg-surface-2">
              <motion.span
                className="block h-full rounded-full bg-gradient-brand"
                initial={{ width: 0 }}
                whileInView={{ width: `${(cat.value / max) * 100}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
            <span className="num w-24 text-right">
              {gbp0(cat.value)} <span className="text-xs text-muted">{cat.share.toFixed(0)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}
