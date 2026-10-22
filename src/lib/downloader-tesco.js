(async () => {
  // Basket Index: download every Tesco digital receipt as a PDF.
  // Run in the browser console on tesco.com/account/receipts while signed in.
  const SINCE = ''; // optional, e.g. '2026-01-01' to skip older receipts
  const MAX_PAGES = 50;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const log = (...a) => console.log('%c[basket-index]', 'color:#00539f;font-weight:bold', ...a);

  if (!/(^|\.)tesco\.com$/.test(location.hostname) || !location.pathname.startsWith('/account/receipts')) {
    log('Open https://www.tesco.com/account/receipts/ (signed in) and run this again.');
    return;
  }
  const locale = (location.pathname.match(/^\/account\/receipts\/([a-z]{2}-[A-Z]{2})/) || [])[1] || 'en-GB';
  const base = `${location.origin}/account/receipts/${locale}`;

  // The page embeds its order data as JSON. Online orders date from the delivery slot, in-store ones from createdDateTime:
  // {"orderNo":"8831-8142-512",...,"createdDateTime":"2026-10-19T19:03:39Z",...,"slot":{"start":"2026-10-21T09:00:00Z"}}
  const localDate = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(+d) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const datesIn = (html) =>
    new Map(
      html
        .split('"orderNo":"')
        .slice(1)
        .map((chunk) => {
          const at = (key) => (chunk.match(new RegExp(`"${key}":"([^"]+)"`)) || [])[1];
          const slot = (chunk.match(/"slot":\{"start":"([^"]+)"/) || [])[1];
          return [chunk.slice(0, chunk.indexOf('"')), localDate(slot || at('createdDateTime'))];
        }),
    );

  // 1. Collect order IDs from every page of both receipt tabs.
  const orders = new Map(); // orderId -> { channel, date }
  for (const tab of ['online', 'in-store']) {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await fetch(`${base}/?tab=${tab}&page=${page}`, { credentials: 'include' });
      if (!res.ok) {
        log(`${tab} page ${page} returned ${res.status}, stopping.`);
        break;
      }
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const dates = datesIn(html);
      const before = orders.size;
      for (const a of doc.querySelectorAll('a[href*="/digital?"]')) {
        const url = new URL(a.getAttribute('href'), base);
        const id = url.searchParams.get('orderId');
        if (!id || orders.has(id)) continue;
        orders.set(id, { channel: url.searchParams.get('channel') || 'ONLINE', date: dates.get(id) || '' });
      }
      const info = html.match(/"paginationInfo":\{"total":(\d+),"page":\d+,"count":\d+,"pageSize":(\d+)/);
      log(`${tab} page ${page}${info ? ` of ${Math.ceil(+info[1] / +info[2])}` : ''}: ${orders.size - before} receipts`);
      if (orders.size === before) break;
      if (info && page * +info[2] >= +info[1]) break;
      await sleep(400);
    }
  }

  const todo = [...orders].filter(([, o]) => !SINCE || !o.date || o.date >= SINCE);
  if (!todo.length) {
    log(
      orders.size
        ? `No receipts on or after ${SINCE}.`
        : 'No receipts found. Check you are signed in and that the list shows orders. If it does, Tesco may have changed the page: please open an issue.',
    );
    return;
  }
  log(`Fetching ${todo.length} receipt PDFs…`);

  // 2. Fetch each PDF, retrying politely if Tesco rate-limits.
  const files = [];
  const failed = [];
  for (const [id, { channel, date }] of todo) {
    const url = `${base}/download/digital?orderId=${encodeURIComponent(id)}&channel=${encodeURIComponent(channel)}`;
    let bytes = null;
    for (let attempt = 1; attempt <= 3 && !bytes; attempt++) {
      try {
        const res = await fetch(url, { credentials: 'include' });
        const b = await res.blob();
        if (res.ok && /pdf/i.test(b.type)) bytes = new Uint8Array(await b.arrayBuffer());
        else await sleep(1500 * attempt);
      } catch {
        await sleep(1500 * attempt);
      }
    }
    if (!bytes) {
      failed.push(id);
      log('Failed', id);
      continue;
    }
    files.push({ name: `Tesco_Receipt_${date ? `${date}_` : ''}${id}.pdf`, bytes });
    log(`Fetched ${files.length}/${todo.length}`);
    await sleep(500);
  }
  if (!files.length) {
    log('Could not fetch any receipts. Try again in a few minutes.');
    return;
  }

  // 3. Pack them into one zip (stored, no compression: PDFs are already compressed).
  // A single file avoids Chrome blocking "multiple downloads" after the first.
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc32 = (buf) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const header = (size, write) => {
    const v = new DataView(new ArrayBuffer(size));
    write(v);
    return new Uint8Array(v.buffer);
  };
  const parts = [];
  const central = [];
  let offset = 0;
  for (const { name, bytes } of files) {
    const n = new TextEncoder().encode(name);
    const crc = crc32(bytes);
    const common = (v, at) => {
      v.setUint16(at, 20, true);
      v.setUint16(at + 2, 0x0800, true);
      v.setUint16(at + 4, 0, true);
      v.setUint16(at + 6, dosTime, true);
      v.setUint16(at + 8, dosDate, true);
      v.setUint32(at + 10, crc, true);
      v.setUint32(at + 14, bytes.length, true);
      v.setUint32(at + 18, bytes.length, true);
      v.setUint16(at + 22, n.length, true);
    };
    parts.push(
      header(30, (v) => {
        v.setUint32(0, 0x04034b50, true);
        common(v, 4);
      }),
      n,
      bytes,
    );
    central.push(
      header(46, (v) => {
        v.setUint32(0, 0x02014b50, true);
        v.setUint16(4, 20, true);
        common(v, 6);
        v.setUint32(42, offset, true);
      }),
      n,
    );
    offset += 30 + n.length + bytes.length;
  }
  const centralSize = central.reduce((t, p) => t + p.length, 0);
  const end = header(22, (v) => {
    v.setUint32(0, 0x06054b50, true);
    v.setUint16(8, files.length, true);
    v.setUint16(10, files.length, true);
    v.setUint32(12, centralSize, true);
    v.setUint32(16, offset, true);
  });
  const zip = new Blob([...parts, ...central, end], { type: 'application/zip' });

  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(zip),
    download: `Tesco_Receipts_${now.toISOString().slice(0, 10)}.zip`,
  });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);

  log(
    `Done: ${a.download} with ${files.length} receipts${failed.length ? `. ${failed.length} failed (${failed.join(', ')}): run again or download those by hand` : ''}. Drop the zip onto Basket Index.`,
  );
})();
