import { animate, motion, useInView, useReducedMotion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { signPct } from '../lib/format';

export function Section({
  id,
  eyebrow,
  title,
  subtitle,
  actions,
  children,
  className = '',
}: {
  id?: string;
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
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
export function Reveal({
  as = 'div',
  children,
  className,
  id,
  delay = 0,
}: {
  as?: 'div' | 'section';
  children: ReactNode;
  className?: string;
  id?: string;
  delay?: number;
}) {
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
    <span
      className={`inline-flex items-center gap-1 rounded-full font-mono font-semibold whitespace-nowrap ${tone} ${size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2 py-1 text-xs'}`}
    >
      <Icon aria-hidden className={size === 'lg' ? 'size-4' : 'size-3.5'} />
      {signPct(pct)}
    </span>
  );
}

export function Pill({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'brand' | 'offer' | 'good' | 'warn';
  className?: string;
}) {
  const tones = {
    neutral: 'bg-surface-2 text-muted border-line',
    brand: 'bg-brand/10 text-brand-ink border-brand/25',
    offer: 'bg-offer text-offer-ink border-transparent',
    good: 'bg-down-soft text-down border-transparent',
    warn: 'bg-warn-soft text-warn border-transparent',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line px-5 py-6 text-sm text-muted">{children}</p>;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-full border border-line bg-surface p-1 text-sm">
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`relative rounded-full px-3.5 py-1.5 font-medium transition-colors ${value === o.value ? 'text-white' : 'text-muted hover:text-ink'}`}
        >
          {value === o.value && (
            <motion.span
              layoutId={`seg-${label}`}
              className="absolute inset-0 rounded-full bg-gradient-brand"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
            />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export const REPO_URL = 'https://github.com/thomaschaplin/basket-index';

/** The GitHub mark. lucide-react no longer ships brand icons, so it's inlined here. */
export function GitHubIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
    </svg>
  );
}
