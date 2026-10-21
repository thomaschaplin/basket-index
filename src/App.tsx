import { AnimatePresence, motion } from 'framer-motion';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Dropzone, DropOverlay } from './components/Dropzone';
import { GetReceipts } from './components/GetReceipts';
import { Headline } from './components/Headline';
import { Landing } from './components/Landing';
import { Nav } from './components/Nav';
import { PackSizes, PriceMovers } from './components/Prices';
import { ProductExplorer, ProductModal, Staples, TopLists } from './components/Products';
import { ReceiptChecks, Receipts } from './components/Receipts';
import { Categories, Insights, SpendChart } from './components/Spending';
import { Toast, type ToastMsg } from './components/Toast';
import { useReceipts } from './hooks/useReceipts';
import { chartColours, useTheme, type ChartColours } from './hooks/useTheme';
import { analyse, type Analysis } from './lib/analysis';
import { downloadCsv } from './lib/export';
import { dayRange, plural } from './lib/format';

export default function App() {
  const { theme, toggle } = useTheme();
  const { source, receipts, progress, addFiles, showSample, clear } = useReceipts();
  const a = useMemo(() => analyse(receipts), [receipts]);
  const c = useMemo(() => chartColours(theme), [theme]);
  const [productKey, setProductKey] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const notify = useCallback((tone: ToastMsg['tone'], text: string) => {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), tone, text });
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  }, []);

  const onFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      const r = await addFiles(files);
      const parts = [];
      if (r.added) parts.push(`Added ${plural(r.added, 'receipt')}.`);
      if (r.duplicates) parts.push(`${plural(r.duplicates, 'duplicate')} skipped.`);
      if (r.failed.length) parts.push(`Couldn't read ${r.failed.length}: ${r.failed.slice(0, 3).join(', ')}${r.failed.length > 3 ? '…' : ''}. They may not be Tesco digital receipts.`);
      notify(r.failed.length || !r.added ? 'warn' : 'ok', parts.join(' ') || 'No new receipts found.');
      if (r.added) window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [addFiles, notify],
  );

  const product = productKey ? a.products.find((p) => p.key === productKey) ?? null : null;
  const hasData = source !== 'none' && a.overview.receipts > 0;

  return (
    <>
      <div className="ambient" aria-hidden />
      <DropOverlay onFiles={onFiles} />
      <Nav theme={theme} onTheme={toggle} hasData={hasData} onExport={() => downloadCsv(a)} onReset={() => { clear(); window.scrollTo({ top: 0 }); }} />
      <main id="top" className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        <AnimatePresence mode="wait">
          {hasData ? (
            <motion.div key="dash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid gap-20 sm:gap-24">
              <div className="grid gap-8">
                <div className="flex flex-wrap items-end justify-between gap-6">
                  <div className="grid gap-3">
                    {source === 'sample' && (
                      <span className="inline-flex w-fit items-center gap-2 rounded-full bg-offer px-3 py-1 text-sm font-semibold text-offer-ink">
                        <Sparkles className="size-4" aria-hidden /> Example data · drop your own receipts to replace it
                      </span>
                    )}
                    <h1 className="font-display text-4xl font-extrabold tracking-tight text-balance sm:text-6xl">
                      {source === 'sample' ? 'An example household, ' : 'Your shop, '}
                      <span className="text-gradient">decoded</span>
                    </h1>
                    <p className="text-muted">
                      {plural(a.overview.receipts, 'receipt')} · {a.overview.from && a.overview.to && dayRange(a.overview.from, a.overview.to, ' to ')} · {a.overview.lines} lines read
                    </p>
                  </div>
                  <div className="w-full sm:w-96"><Dropzone onFiles={onFiles} progress={progress} compact /></div>
                </div>
                <Headline a={a} c={c} />
              </div>
              <Dashboard a={a} c={c} onOpen={setProductKey} />
            </motion.div>
          ) : (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }}>
              <Landing onFiles={onFiles} onSample={showSample} progress={progress} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted sm:px-6">
          <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-down" aria-hidden /> Receipts are read in your browser and saved only on this device. Names, addresses and card details are ignored.</span>
          <span>Not affiliated with Tesco.</span>
        </div>
      </footer>
      <ProductModal product={product} a={a} c={c} onClose={() => setProductKey(null)} />
      <Toast msg={toast} onClose={() => setToast(null)} />
    </>
  );
}

/** Everything below the headline. Memoised so opening a product or showing a toast doesn't re-render every section. */
const Dashboard = memo(function Dashboard({ a, c, onOpen }: { a: Analysis; c: ChartColours; onOpen: (key: string) => void }) {
  return (
    <>
      <Insights a={a} />
      <section id="spend" className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <SpendChart a={a} c={c} />
        <Categories a={a} />
      </section>
      <PriceMovers a={a} onOpen={onOpen} />
      <PackSizes a={a} />
      <Staples a={a} onOpen={onOpen} />
      <TopLists a={a} onOpen={onOpen} />
      <ProductExplorer a={a} onOpen={onOpen} />
      <Receipts a={a} />
      <ReceiptChecks a={a} />
      <GetReceipts />
    </>
  );
});
