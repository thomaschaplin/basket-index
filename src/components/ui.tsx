import { animate, motion, useInView, useReducedMotion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { signPct } from '../lib/format';

export function Section({
  id, eyebrow, title, subtitle, actions, children, className = '',
}: { id?: string; eyebrow?: string; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Reveal as="section" id={id} className={`grid gap-5 ${className}`}>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="grid gap-1.5 min-w-0">
          {eyebrow && <span className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-ink">{eyebrow}</span>}
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-balance">{title}</h2>
          {subtitle && <p className="text-muted max-w-2xl text-pretty">{subtitle}</p>}
        </div>
        {actions}
      </header>
      {children}
    </Reveal>
  );
}

/** Fades and lifts content in the first time it scrolls into view. */
export function Reveal({ as = 'div', children, className, id, delay = 0 }: { as?: 'div' | 'section'; children: ReactNode; className?: string; id?: string; delay?: number }) {
  const reduce = useReducedMotion();
  const Comp = as === 'section' ? motion.section : motion.div;
  return (
    <Comp
      id={id}
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </Comp>
  );
}

/** Animates a number up from zero when it first appears. */
export function CountUp({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  useEffect(() => {
    if (!inView) return;
    if (reduce) return setShown(value);
    const c = animate(0, value, { duration: 1.4, ease: [0.16, 1, 0.3, 1], onUpdate: setShown });
    return () => c.stop();
  }, [inView, value, reduce]);
  return (
    <span ref={ref} className={className}>
      {format(shown)}
    </span>
  );
}

/** Price direction chip. Always carries an arrow and a sign, so colour never works alone. */
export function Delta({ pct, size = 'sm', invert = false }: { pct: number; size?: 'sm' | 'lg'; invert?: boolean }) {
  const up = pct > 0.05;
  const down = pct < -0.05;
  const bad = invert ? down : up;
  const good = invert ? up : down;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  const tone = bad ? 'bg-up-soft text-up' : good ? 'bg-down-soft text-down' : 'bg-surface-2 text-muted';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-mono font-semibold whitespace-nowrap ${tone} ${size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2 py-1 text-xs'}`}>
      <Icon aria-hidden className={size === 'lg' ? 'size-4' : 'size-3.5'} />
      {signPct(pct)}
    </span>
  );
}

export function Pill({ children, tone = 'neutral', className = '' }: { children: ReactNode; tone?: 'neutral' | 'brand' | 'offer' | 'good' | 'warn'; className?: string }) {
  const tones = {
    neutral: 'bg-surface-2 text-muted border-line',
    brand: 'bg-brand/10 text-brand-ink border-brand/25',
    offer: 'bg-offer text-offer-ink border-transparent',
    good: 'bg-down-soft text-down border-transparent',
    warn: 'bg-warn-soft text-warn border-transparent',
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${tones[tone]} ${className}`}>{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line px-5 py-6 text-sm text-muted">{children}</p>;
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-full border border-line bg-surface p-1 text-sm">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`relative rounded-full px-3.5 py-1.5 font-medium transition-colors ${value === o.value ? 'text-white' : 'text-muted hover:text-ink'}`}
        >
          {value === o.value && <motion.span layoutId={`seg-${label}`} className="absolute inset-0 rounded-full bg-gradient-brand" transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }} />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
