import { useCallback, useEffect, useRef, useState } from 'react';
import { dedupe } from '../lib/analysis';
import type { Category, CategoryOverrides } from '../lib/categories';
import { parseReceiptText, parseSainsburysOrder } from '../lib/parser';
import { fileToText } from '../lib/pdf-browser';
import { loadSample } from '../lib/sample';
import { load, persist, remove, save } from '../lib/storage';
import type { Receipt } from '../lib/types';
import { expandZips } from '../lib/zip';

export type Source = 'none' | 'sample' | 'mine';
/** Where receipts lived before IndexedDB. Read once, moved across, then removed. */
const LEGACY_KEY = 'bi-receipts-v2';

interface Saved {
  source: Source;
  receipts: Receipt[];
}

const EMPTY: Saved = { source: 'none', receipts: [] };

function fromSaved(saved: Saved | undefined): Saved {
  // Receipts saved before Sainsbury's support have no retailer: they're all Tesco.
  if (saved?.source === 'mine' && Array.isArray(saved.receipts) && saved.receipts.length)
    return { ...saved, receipts: saved.receipts.map((r) => ({ ...r, retailer: r.retailer ?? 'tesco' })) };
  if (saved?.source === 'sample') return { source: 'sample', receipts: loadSample() };
  return EMPTY;
}

/** Moves receipts saved in localStorage by older versions into IndexedDB. */
async function migrate(): Promise<Saved | undefined> {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(LEGACY_KEY);
  } catch {
    return undefined;
  }
  if (!raw) return undefined;
  const saved = JSON.parse(raw) as Saved;
  await save('receipts', saved);
  localStorage.removeItem(LEGACY_KEY);
  return saved;
}

async function restore(): Promise<{ saved: Saved; overrides: CategoryOverrides }> {
  try {
    const [saved, overrides] = await Promise.all([load<Saved>('receipts').then((s) => s ?? migrate()), load<CategoryOverrides>('categories')]);
    return { saved: fromSaved(saved), overrides: overrides ?? {} };
  } catch {
    /* corrupt or unavailable storage: start fresh */
    return { saved: EMPTY, overrides: {} };
  }
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
  const [state, setState] = useState<Saved>(EMPTY);
  const [overrides, setOverrides] = useState<CategoryOverrides>({});
  // False until saved receipts have been read back, so nothing is shown or saved over them before then.
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const current = useRef(state);
  current.current = state;

  useEffect(() => {
    let live = true;
    restore().then(({ saved, overrides }) => {
      if (!live) return;
      setState(saved);
      setOverrides(overrides);
      setReady(true);
    });
    return () => {
      live = false;
    };
  }, []);

  // Only your own receipts are worth saving; the sample is re-parsed from source.
  // A failed save (private mode, storage full) keeps the data for this session only.
  useEffect(() => {
    if (!ready) return;
    if (state.source === 'none') remove('receipts').catch(() => {});
    else save('receipts', state.source === 'sample' ? { source: 'sample', receipts: [] } : state).catch(() => {});
    if (state.source === 'mine') persist();
  }, [state, ready]);

  useEffect(() => {
    if (!ready) return;
    (Object.keys(overrides).length ? save('categories', overrides) : remove('categories')).catch(() => {});
  }, [overrides, ready]);

  const showSample = useCallback(() => setState({ source: 'sample', receipts: loadSample() }), []);
  const clear = useCallback(() => {
    setState(EMPTY);
    setOverrides({});
  }, []);

  /** Puts a product in another category, or back in the one its name suggests when `category` is null. */
  const setCategory = useCallback((key: string, category: Category | null) => {
    setOverrides(({ [key]: _, ...rest }) => (category ? { ...rest, [key]: category } : rest));
  }, []);

  const addFiles = useCallback(async (dropped: File[]): Promise<LoadResult> => {
    const files = await expandZips(dropped);
    const isJson = (f: File) => /json$/i.test(f.type) || /\.json$/i.test(f.name);
    const pdfs = files.filter((f) => /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name) || isJson(f));
    const failed = files.filter((f) => !pdfs.includes(f)).map((f) => f.name);
    const parsed: Receipt[] = [];
    setProgress({ done: 0, total: pdfs.length });
    for (const [i, f] of pdfs.entries()) {
      setProgress({ done: i, total: pdfs.length, current: f.name });
      try {
        // Saved Sainsbury's orders come as JSON from the downloader; everything else is a receipt PDF.
        const r = isJson(f) ? parseSainsburysOrder(JSON.parse(await f.text())) : parseReceiptText(await fileToText(f));
        if (!r.items.length || !r.date) throw new Error("Not a Tesco or Sainsbury's receipt");
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
  }, []);

  return { ...state, ready, overrides, progress, addFiles, showSample, clear, setCategory };
}
