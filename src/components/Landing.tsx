import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, LineChart, PackageSearch, ShieldCheck, Sparkles, Tag } from 'lucide-react';
import type { LoadProgress } from '../hooks/useReceipts';
import { Dropzone } from './Dropzone';
import { GetReceipts } from './GetReceipts';
import { GitHubIcon, REPO_URL, Reveal } from './ui';

const FEATURES = [
  {
    icon: LineChart,
    title: 'Your own inflation rate',
    body: 'A fixed basket of the things you actually buy again, priced first time vs latest. Not the national average: yours.',
  },
  {
    icon: PackageSearch,
    title: 'Shrinkflation watch',
    body: 'Spots packs that got smaller but not cheaper, and works out which pack size is really the best value.',
  },
  { icon: Tag, title: 'Offer dependence', body: 'How much of your shop hangs on Clubcard and Nectar prices, and which staples you never catch on offer.' },
];

// Decorative mini receipt with price tags that float around the hero. Prices come from the fictional sample data.
const TAGS = [
  { name: 'Salted Butter 250g', was: '£1.99', now: '£2.25', up: true, x: '-10%', y: '36%', r: -7, d: 0 },
  { name: 'Blackberries 150g', was: '£2.00', now: '£1.75', up: false, x: '58%', y: '-6%', r: 6, d: 0.8 },
  { name: 'Belgian Choc Bar · £2.00', was: '200g', now: '180g', up: true, x: '62%', y: '72%', r: -4, d: 1.6 },
];

function HeroArt() {
  const reduce = useReducedMotion();
  return (
    <div className="relative mx-auto aspect-[4/5] w-full max-w-sm select-none" aria-hidden>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 40, rotate: 4 }}
        animate={{ opacity: 1, y: 0, rotate: 2 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-x-[12%] inset-y-[6%] rounded-2xl border border-line bg-surface p-5 shadow-2xl shadow-brand/20"
        style={{ maskImage: 'linear-gradient(to bottom, black 80%, transparent)' }}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="font-display text-lg font-bold">Receipt</span>
          <span className="font-mono text-[10px] text-faint">03/10/2026</span>
        </div>
        <div className="grid gap-2 font-mono text-[11px]">
          {[
            ['Semi Skimmed Milk 4pt', '£1.55'],
            ['Wholemeal Bread 800g', '£0.75'],
            ['Chicken Thighs 500g', '£4.75'],
            ['Salted Butter 250g', '£2.25'],
            ['Kiwi Fruit Loose', '£0.91'],
            ['Cherry Tomatoes 330g', '£1.09'],
            ['Extra Mature Cheddar', '£3.50'],
            ['Penne Pasta 500g', '£0.75'],
            ['Gala Apples 6pk', '£1.60'],
            ['Orange Juice 1L', '£1.70'],
            ['Granola 850g', '£2.85'],
          ].map(([n, p], i) => (
            <motion.div
              key={n}
              initial={reduce ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.06 }}
              className="flex justify-between gap-3 border-b border-dashed border-line pb-1.5 text-muted"
            >
              <span className="truncate">{n}</span>
              <span className="text-ink">{p}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
      {TAGS.map((t) => (
        <motion.div
          key={t.name}
          initial={reduce ? false : { opacity: 0, scale: 0.6 }}
          animate={reduce ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1, y: [0, -10, 0] }}
          transition={{
            opacity: { delay: 0.8 + t.d * 0.3 },
            scale: { delay: 0.8 + t.d * 0.3, type: 'spring' },
            y: { duration: 5, repeat: Infinity, ease: 'easeInOut', delay: t.d },
          }}
          style={{ left: t.x, top: t.y, rotate: t.r }}
          className="absolute w-44 rounded-2xl border border-line bg-surface-2 p-3 shadow-2xl shadow-black/30"
        >
          <div className="truncate text-xs font-semibold">{t.name}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold">{t.now}</span>
            <span className="font-mono text-xs text-faint line-through">{t.was}</span>
          </div>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${t.up ? 'bg-up-soft text-up' : 'bg-down-soft text-down'}`}
          >
            {t.name.includes('Choc') ? '▲ shrinkflation' : t.up ? '▲ price rise' : '▼ cheaper'}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

export function Landing({ onFiles, onSample, progress }: { onFiles: (f: File[]) => void; onSample: () => void; progress: LoadProgress | null }) {
  const reduce = useReducedMotion();
  return (
    <div className="grid gap-24 sm:gap-32">
      <section className="grid items-center gap-12 pt-6 lg:grid-cols-[1.15fr_0.85fr] lg:pt-12">
        <div className="grid gap-7">
          <motion.span
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1.5 text-sm font-medium text-brand-ink"
          >
            <Sparkles className="size-4" aria-hidden /> Your Tesco and Sainsbury's receipts, read like a price index
          </motion.span>
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-5xl font-extrabold leading-[0.95] tracking-tight text-balance sm:text-6xl lg:text-7xl"
          >
            What's <span className="text-gradient">really</span> happening to your shopping bill?
          </motion.h1>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.7 }}
            className="max-w-xl text-lg text-muted text-pretty"
          >
            Drop in your receipts and get your personal inflation rate, the prices that crept up, the packs that quietly shrank, and exactly where the money
            goes.
          </motion.p>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, duration: 0.7 }}
            className="grid gap-4"
          >
            <Dropzone onFiles={onFiles} progress={progress} />
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <button
                type="button"
                onClick={onSample}
                className="group inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 font-semibold shadow-card transition hover:-translate-y-0.5 hover:border-brand/50"
              >
                Try it with an example household
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </button>
              <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                <ShieldCheck className="size-4 text-down" aria-hidden /> 100% in your browser. No uploads, no account.
              </span>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
                <GitHubIcon className="size-4" /> Open source: read the code
              </a>
            </div>
          </motion.div>
        </div>
        <HeroArt />
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={i * 0.08} className="card group grid gap-3 p-6 transition-transform hover:-translate-y-1">
            <span className="grid size-11 place-items-center rounded-2xl bg-brand/10 text-brand-ink transition-colors group-hover:bg-gradient-brand group-hover:text-white">
              <f.icon className="size-5" aria-hidden />
            </span>
            <h3 className="font-display text-xl font-bold">{f.title}</h3>
            <p className="text-sm text-muted text-pretty">{f.body}</p>
          </Reveal>
        ))}
      </section>

      <GetReceipts />
    </div>
  );
}
