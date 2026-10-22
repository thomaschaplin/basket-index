import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { expandZips } from './zip';

const pdf = (s: string) => strToU8(`%PDF-1.4 ${s}`);

describe('expandZips', () => {
  it('replaces a zip with the PDFs inside it, stored or deflated, skipping other entries', async () => {
    const stored = zipSync({ 'a.pdf': pdf('a'), 'notes.txt': strToU8('x') }, { level: 0 });
    const deflated = zipSync({ 'Receipts/b.pdf': pdf('b'), '__MACOSX/Receipts/._b.pdf': pdf('junk') }, { level: 6 });
    const loose = new File([pdf('c')], 'c.pdf', { type: 'application/pdf' });

    const out = await expandZips([
      new File([stored], 'one.zip', { type: 'application/zip' }),
      new File([deflated], 'two.zip'),
      loose,
    ]);

    expect(out.map((f) => f.name)).toEqual(['a.pdf', 'b.pdf', 'c.pdf']);
    expect(out[1].type).toBe('application/pdf');
    expect(await out[1].text()).toBe('%PDF-1.4 b');
  });

  it("keeps Sainsbury's saved orders (.json) from the downloader", async () => {
    const z = zipSync({ 'Sainsburys_Order_2026-01-03_1200000001.json': strToU8('{"order_uid":"1"}'), 'notes.txt': strToU8('x') });
    const out = await expandZips([new File([z], 'Sainsburys_Receipts.zip')]);
    expect(out.map((f) => [f.name, f.type])).toEqual([['Sainsburys_Order_2026-01-03_1200000001.json', 'application/json']]);
  });

  it('passes an unreadable zip through so it is reported as failed', async () => {
    const bad = new File([strToU8('not a zip')], 'bad.zip');
    expect(await expandZips([bad])).toEqual([bad]);
  });
});
