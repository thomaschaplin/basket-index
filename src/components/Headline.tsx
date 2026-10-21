import { CalendarClock, Coins, PiggyBank, ShoppingBasket, Star, TrendingUp } from 'lucide-react';
import { memo } from 'react';
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ChartColours } from '../hooks/useTheme';
import type { Analysis } from '../lib/analysis';
import { day, gbp, gbp0, signPct } from '../lib/format';
import { CountUp, Reveal } from './ui';

function ChartTip({ active, payload }: { active?: boolean; payload?: { payload: { date: string; index: number } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="glass rounded-xl border border-line px-3 py-2 text-sm shadow-xl">
      <div className="text-xs text-muted">{day(p.date)}</div>
      <div className="num font-semibold">{p.index.toFixed(1)} <span className="text-muted">({signPct(p.index - 100)})</span></div>
    </div>
  );
}

export const Headline = memo(function Headline({ a, c }: { a: Analysis; c: ChartColours }) {
  const inf = a.inflation;
  const o = a.overview;
  const tone = inf.pct > 0.05 ? 'text-up' : inf.pct < -0.05 ? 'text-down' : 'text-ink';
  const series = a.indexSeries;
  const lo = Math.min(99, ...series.map((s) => s.index));
  const hi = Math.max(101, ...series.map((s) => s.index));

  const kpis = [
    { icon: ShoppingBasket, label: 'Weekly spend', value: o.perWeek ?? o.spend, fmt: gbp0, sub: o.perWeek ? `${gbp0(o.spend)} across ${o.receipts} shops` : 'Add receipts spanning a week' },
    { icon: TrendingUp, label: 'Projected per year', value: o.perYear ?? 0, fmt: (n: number) => (o.perYear ? gbp0(n) : '—'), sub: 'At your current weekly rate' },
    { icon: Coins, label: 'Average basket', value: o.avgBasket, fmt: gbp, sub: `${o.units} items · ${o.distinctProducts} products` },
    { icon: PiggyBank, label: 'Saved on offers', value: o.savings, fmt: gbp0, sub: `${o.savingsRate.toFixed(0)}% off shelf price · ${o.onOfferShare.toFixed(0)}% of lines` },
    { icon: CalendarClock, label: 'Shop every', value: o.daysBetweenShops ?? 0, fmt: (n: number) => (o.daysBetweenShops ? `${n.toFixed(1)} days` : '—'), sub: o.from && o.to ? `${day(o.from)} to ${day(o.to)}` : '' },
    { icon: Star, label: 'Clubcard points', value: o.points, fmt: (n: number) => Math.round(n).toLocaleString('en-GB'), sub: `≈ ${gbp(o.points)} in vouchers` },
  ];

  return (
    <div id="overview" className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
      <Reveal className="ring-glow card relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-brand/20 blur-3xl" />
        <div className="relative grid gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-ink">Your basket inflation</span>
            {inf.annualised != null && (
              <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-muted">
                ≈ <span className="num text-ink">{signPct(inf.annualised)}</span> a year
              </span>
            )}
          </div>
          {inf.products ? (
            <>
              <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
                <CountUp value={inf.pct} format={(n) => signPct(n, 1)} className={`font-display text-7xl font-extrabold leading-none tracking-tight sm:text-8xl ${tone}`} />
                <p className="max-w-xs pb-2 text-sm text-muted text-pretty">
                  Shelf prices of the <b className="text-ink">{inf.products} products</b> you've bought more than once, first time vs latest.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-up-soft px-3 py-1 font-semibold text-up">▲ {inf.up} up</span>
                <span className="rounded-full bg-down-soft px-3 py-1 font-semibold text-down">▼ {inf.down} down</span>
                <span className="rounded-full bg-surface-2 px-3 py-1 font-semibold text-muted">= {inf.same} unchanged</span>
              </div>
              <div className="h-40 sm:h-48" role="img" aria-label={`Basket index over time, from 100 to ${series.at(-1)?.index.toFixed(1)}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="idx" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={c.brand} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={c.brand} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tickFormatter={day} tick={{ fill: c.muted, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
                    <YAxis domain={[Math.floor(lo - 0.5), Math.ceil(hi + 0.5)]} hide />
                    <ReferenceLine y={100} stroke={c.faint} strokeDasharray="4 4" label={{ value: '100 = first shop', fill: c.faint, fontSize: 11, position: 'insideTopLeft' }} />
                    <Tooltip content={<ChartTip />} cursor={{ stroke: c.faint, strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="index" stroke={c.brand} strokeWidth={2.5} fill="url(#idx)" dot={{ r: 3, fill: c.brand, stroke: c.surface, strokeWidth: 2 }} activeDot={{ r: 6, stroke: c.surface, strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <p className="font-display text-3xl text-muted">Add receipts with repeat purchases to see this.</p>
          )}
        </div>
      </Reveal>

      <div className="grid grid-cols-2 gap-4">
        {kpis.map((k, i) => (
          <Reveal key={k.label} delay={i * 0.05} className="card group relative grid content-start gap-2 overflow-hidden p-4 sm:p-5">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
              <k.icon className="size-4 text-brand-ink transition-transform group-hover:scale-110" aria-hidden /> {k.label}
            </span>
            <CountUp value={k.value} format={k.fmt} className="font-display text-3xl font-bold tracking-tight sm:text-4xl" />
            <span className="text-xs text-muted text-pretty">{k.sub}</span>
          </Reveal>
        ))}
      </div>
    </div>
  );
});
