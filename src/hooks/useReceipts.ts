import { useCallback, useEffect, useRef, useState } from 'react';
import { dedupe } from '../lib/analysis';
import { parseReceiptText } from '../lib/parser';
import { fileToText } from '../lib/pdf-browser';
import { loadSample } from '../lib/sample';
import type { Receipt } from '../lib/types';
import { expandZips } from '../lib/zip';

export type Source = 'none' | 'sample' | 'mine';
const KEY = 'bi-receipts-v2';

interface Saved {
  source: Source;
  receipts: Receipt[];
}

function restore(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Saved;
      if (saved.source === 'mine' && Array.isArray(saved.receipts) && saved.receipts.length) return saved;
      if (saved.source === 'sample') return { source: 'sample', receipts: loadSample() };
    }
  } catch {
    /* corrupt or unavailable storage: start fresh */
  }
  return { source: 'none', receipts: [] };
}

export interface LoadProgress {
  done: number;
  total: number;
  current?: string;
}

export interface LoadResult {
  added: number;
  duplicates: number;
  failed: string[];
}

export function useReceipts() {
  const [state, setState] = useState<Saved>(restore);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const current = useRef(state);
  current.current = state;

  // Only your own receipts are worth saving; the sample is re-parsed from source.
  useEffect(() => {
    try {
      if (state.source === 'none') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, JSON.stringify(state.source === 'sample' ? { source: 'sample', receipts: [] } : state));
    } catch {
      /* quota or private mode: data stays for this session only */
    }
  }, [state]);

  const showSample = useCallback(() => setState({ source: 'sample', receipts: loadSample() }), []);
  const clear = useCallback(() => setState({ source: 'none', receipts: [] }), []);

  const addFiles = useCallback(
    async (dropped: File[]): Promise<LoadResult> => {
      const files = await expandZips(dropped);
      const pdfs = files.filter((f) => /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name));
      const failed = files.filter((f) => !pdfs.includes(f)).map((f) => f.name);
      const parsed: Receipt[] = [];
      setProgress({ done: 0, total: pdfs.length });
      for (const [i, f] of pdfs.entries()) {
        setProgress({ done: i, total: pdfs.length, current: f.name });
        try {
          const r = parseReceiptText(await fileToText(f));
          if (!r.items.length || !r.date) throw new Error('Not a Tesco receipt');
          parsed.push(r);
        } catch {
          failed.push(f.name);
        }
      }
      setProgress(null);
      const s = current.current;
      const base = s.source === 'mine' ? s.receipts : []; // your files replace the sample
      const merged = dedupe([...base, ...parsed]);
      const added = merged.length - base.length;
      if (merged.length) setState({ source: 'mine', receipts: merged });
      const duplicates = parsed.length - added;
      return { added, duplicates, failed };
    },
    [],
  );

  return { ...state, progress, addFiles, showSample, clear };
}
