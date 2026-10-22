import { Check, Copy, ExternalLink, Terminal } from 'lucide-react';
import { useState } from 'react';
import SAINSBURYS from '../lib/downloader-sainsburys.js?raw';
import TESCO from '../lib/downloader-tesco.js?raw';
import type { Retailer } from '../lib/types';
import { Section } from './ui';

const SOURCES: Record<Retailer, { name: string; script: string; file: string; url: string; label: string; note: string }> = {
  tesco: {
    name: 'Tesco',
    script: TESCO,
    file: 'basket-index-tesco.js',
    url: 'https://www.tesco.com/account/receipts/en-GB/',
    label: 'tesco.com/account/receipts',
    note: 'Online orders and in-store Clubcard receipts.',
  },
  sainsburys: {
    name: "Sainsbury's",
    script: SAINSBURYS,
    file: 'basket-index-sainsburys.js',
    url: 'https://www.sainsburys.co.uk/gol-ui/my-account/orders',
    label: 'sainsburys.co.uk/gol-ui/my-account/orders',
    note: 'Delivery and click & collect orders: each order\'s items, prices, offers and totals. No address or card details.',
  },
};

const steps = (s: (typeof SOURCES)[Retailer]) => [
  <>On a computer, sign in at <a className="font-semibold text-brand-ink underline decoration-brand/40 underline-offset-4 hover:decoration-brand" href={s.url} target="_blank" rel="noopener noreferrer">{s.label} <ExternalLink className="inline size-3.5" aria-hidden /></a></>,
  <>Open the browser console: <kbd className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-xs">⌘ ⌥ J</kbd> on Mac, <kbd className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-xs">Ctrl ⇧ J</kbd> on Windows.</>,
  <>Paste the script and press Enter. It saves every receipt in one zip file.</>,
  <>Drop the zip onto this page. Done.</>,
];

export function GetReceipts() {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'manual'>('idle');
  const [open, setOpen] = useState(false);
  const [retailer, setRetailer] = useState<Retailer>('tesco');
  const source = SOURCES[retailer];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(source.script);
      setCopied('ok');
    } catch {
      setOpen(true);
      setCopied('manual');
    }
    setTimeout(() => setCopied('idle'), 2500);
  };

  return (
    <Section id="get-receipts" eyebrow="One-minute setup" title="Grab every receipt at once" subtitle="Tesco and Sainsbury's let you download receipts one by one. This script fetches them all into one zip using your own signed-in session. It only talks to the shop's own website.">
      <div role="radiogroup" aria-label="Shop" className="flex flex-wrap items-center gap-2">
        {(Object.keys(SOURCES) as Retailer[]).map((r) => (
          <button
            key={r}
            role="radio"
            aria-checked={retailer === r}
            onClick={() => setRetailer(r)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${retailer === r ? 'border-transparent bg-ink text-surface' : 'border-line bg-surface text-muted hover:border-brand/50 hover:text-ink'}`}
          >
            {SOURCES[r].name}
          </button>
        ))}
        <span className="text-sm text-muted">{source.note}</span>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <ol className="grid gap-3">
          {steps(source).map((s, i) => (
            <li key={i} className="card flex items-start gap-4 p-4">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-brand font-display font-bold text-white">{i + 1}</span>
              <span className="pt-1 text-pretty">{s}</span>
            </li>
          ))}
        </ol>
        <div className="card flex min-w-0 flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-medium text-muted">
              <Terminal className="size-4" aria-hidden /> {source.file}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setOpen((o) => !o)} className="rounded-full px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink">
                {open ? 'Hide' : 'View'}
              </button>
              <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-brand px-4 py-1.5 text-sm font-semibold text-white shadow-md shadow-brand/30 transition-transform hover:-translate-y-0.5">
                {copied === 'ok' ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                {copied === 'ok' ? 'Copied' : 'Copy script'}
              </button>
            </div>
          </div>
          <span className="sr-only" aria-live="polite">{copied === 'ok' ? 'Script copied' : copied === 'manual' ? 'Copy the script from the box below' : ''}</span>
          <pre className={`overflow-auto bg-surface-2 p-4 font-mono text-xs leading-relaxed text-muted transition-[max-height] ${open ? 'max-h-96' : 'max-h-40'}`}>
            {source.script}
          </pre>
        </div>
      </div>
    </Section>
  );
}
