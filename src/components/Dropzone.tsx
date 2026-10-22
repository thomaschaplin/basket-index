import { AnimatePresence, motion } from 'framer-motion';
import { FileUp, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { LoadProgress } from '../hooks/useReceipts';

export function Dropzone({ onFiles, progress, compact = false }: { onFiles: (f: File[]) => void; progress: LoadProgress | null; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const busy = !!progress;

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      // The drop itself bubbles to <DropOverlay>'s window listener, which reads the files.
      onDrop={() => setOver(false)}
      className={`ring-glow rounded-3xl glass transition-transform ${over ? 'scale-[1.01]' : ''}`}
    >
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className={`group flex w-full items-center gap-4 rounded-3xl text-left ${compact ? 'p-4' : 'flex-col justify-center p-8 text-center sm:p-12'} ${over ? 'bg-brand/10' : ''}`}
      >
        <span className={`grid shrink-0 place-items-center rounded-2xl bg-gradient-brand text-white shadow-lg shadow-brand/30 transition-transform group-hover:-translate-y-0.5 group-hover:rotate-[-4deg] ${compact ? 'size-11' : 'size-16'}`}>
          {busy ? <Loader2 className="size-7 animate-spin" aria-hidden /> : <FileUp className={compact ? 'size-5' : 'size-7'} aria-hidden />}
        </span>
        <span className="grid gap-1 min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            {busy ? (
              <motion.span key="busy" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid gap-2">
                <strong className={`font-display ${compact ? 'text-base' : 'text-2xl'}`}>
                  Reading receipt {Math.min(progress.done + 1, progress.total)} of {progress.total}…
                </strong>
                <span className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-line">
                  <motion.span className="block h-full bg-gradient-brand" animate={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
                </span>
              </motion.span>
            ) : (
              <motion.span key="idle" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid gap-1">
                <strong className={`font-display ${compact ? 'text-base' : 'text-2xl sm:text-3xl'}`}>{compact ? 'Add more receipts' : 'Drop your Tesco or Sainsbury\'s receipt PDFs or zip here'}</strong>
                <span className="text-sm text-muted">
                  {compact ? 'Drop PDFs, saved orders or a zip anywhere on the page, or tap to choose.' : 'Or tap to choose files. Select as many as you like: they are read on your device and never uploaded.'}
                </span>
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf,application/zip,.zip,application/json,.json"
        multiple
        className="sr-only"
        onChange={(e) => { onFiles([...(e.target.files ?? [])]); e.target.value = ''; }}
      />
    </div>
  );
}

/** Full-page overlay while files are dragged anywhere over the window. */
export function DropOverlay({ onFiles }: { onFiles: (f: File[]) => void }) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files');
    const enter = (e: DragEvent) => { if (hasFiles(e)) { depth++; setActive(true); } };
    const leave = () => { depth = Math.max(0, depth - 1); if (!depth) setActive(false); };
    const over = (e: DragEvent) => e.preventDefault();
    const drop = (e: DragEvent) => {
      e.preventDefault();
      depth = 0;
      setActive(false);
      if (e.dataTransfer?.files.length) onFiles([...e.dataTransfer.files]);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    };
  }, [onFiles]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-bg/80 backdrop-blur-md p-6"
        >
          <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} className="ring-glow grid place-items-center gap-4 rounded-[2rem] bg-surface px-12 py-14 text-center">
            <span className="grid size-20 place-items-center rounded-3xl bg-gradient-brand text-white shadow-xl shadow-brand/40">
              <FileUp className="size-9" aria-hidden />
            </span>
            <strong className="font-display text-3xl">Let go to read your receipts</strong>
            <span className="text-muted">Nothing leaves this device.</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
