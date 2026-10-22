import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { loadSample } from './sample';
import { load, remove, save } from './storage';

describe('storage', () => {
  it('returns undefined for a missing key', async () => {
    expect(await load('nothing')).toBeUndefined();
  });

  it('round-trips receipts as structured clones', async () => {
    const receipts = loadSample();
    await save('receipts', receipts);
    expect(await load('receipts')).toEqual(receipts);
  });

  it('overwrites and removes', async () => {
    await save('k', { a: 1 });
    await save('k', { a: 2 });
    expect(await load('k')).toEqual({ a: 2 });
    await remove('k');
    expect(await load('k')).toBeUndefined();
  });
});
