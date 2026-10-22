// A small key-value store in IndexedDB. Unlike localStorage it isn't capped at ~5MB, so years of receipts fit,
// and values are stored as structured clones rather than JSON strings. Everything stays on this device.
const DB = 'basket-index';
const STORE = 'kv';

let db: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  db ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  // A failed open (private mode in some browsers) shouldn't stick: let the next call try again.
  db.catch(() => (db = null));
  return db;
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const tx = (await open()).transaction(STORE, mode);
  const req = fn(tx.objectStore(STORE));
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(req.result as T);
    tx.onerror = tx.onabort = () => reject(tx.error ?? req.error);
  });
}

export const load = <T>(key: string) => run<T | undefined>('readonly', (s) => s.get(key));
export const save = (key: string, value: unknown) => run<void>('readwrite', (s) => s.put(value, key));
export const remove = (key: string) => run<void>('readwrite', (s) => s.delete(key));

/** Asks the browser not to clear this site's storage when space runs low. Best-effort; browsers may say no. */
export const persist = () => navigator.storage?.persist?.().catch(() => false);
