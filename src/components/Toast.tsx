import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

export interface ToastMsg {
  id: number;
  tone: 'ok' | 'warn';
  text: string;
}

export function Toast({ msg, onClose }: { msg: ToastMsg | null; onClose: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4" aria-live="polite">
      <AnimatePresence>
        {msg && (
          <motion.div
            key={msg.id}
            initial={{ y: 40, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="glass pointer-events-auto flex max-w-lg items-start gap-3 rounded-2xl border border-line px-4 py-3 shadow-2xl"
          >
            {msg.tone === 'ok' ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-down" aria-hidden />
            ) : (
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warn" aria-hidden />
            )}
            <span className="text-sm">{msg.text}</span>
            <button type="button" onClick={onClose} aria-label="Dismiss" className="-mr-1 rounded-full p-1 text-muted hover:text-ink">
              <X className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
