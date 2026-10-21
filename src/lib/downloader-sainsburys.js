(async () => {
  // Basket Index: download every Sainsbury's groceries e-receipt as a PDF.
  // Run in the browser console on sainsburys.co.uk/gol-ui/my-account/orders while signed in.
  const SINCE = ''; // optional, e.g. '2026-01-01' to skip older receipts
  const PAGE_SIZE = 50;
  const MAX_PAGES = 40;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const log = (...a) => console.log('%c[basket-index]', 'color:#f06c00;font-weight:bold', ...a);

  if (!/(^|\.)sainsburys\.co\.uk$/.test(location.hostname)) {
    log('Open https://www.sainsburys.co.uk/gol-ui/my-account/orders (signed in) and run this again.');
    return;
  }
  const api = `${location.origin}/groceries-api/gol-services/order/v1/order`;
  // The groceries API wants the signed-in session's WCAuthToken header, which is the value of the WC_AUTHENTICATION_<id> cookie.
  const wcAuth = (document.cookie.match(/(?:^|;\s*)WC_AUTHENTICATION_\d+=([^;]+)/) || [])[1];
  const headers = { Accept: 'application/json', ...(wcAuth ? { WCAuthToken: wcAuth } : {}) };
  const getJson = async (url) => {
    const res = await fetch(url, { credentials: 'include', headers });
    if (!res.ok) throw new Error(`${res.status} from ${url}`);
    return res.json();
  };
  const localDate = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

  // 1. Collect every order from the order history API:
  // {"orders":[{"order_uid":"1355072309","status":"…","slot_start_time":"2026-10-09T19:00:00Z","receipt_url":"…"}],"controls":{"total_record_count":42,…}}
  const orders = new Map(); // orderId -> { date, receiptUrl }
  for (let page = 1; page <= MAX_PAGES; page++) {
    let data;
    try {
      data = await getJson(`${api}?page_number=${page}&page_size=${PAGE_SIZE}`);
    } catch (e) {
      log(`Order history page ${page} failed (${e.message}).${page === 1 ? ' Check you are signed in: reload the orders page, then run this again.' : ''}`);
      break;
    }
    const list = Array.isArray(data.orders) ? data.orders : [];
    const before = orders.size;
    for (const o of list) {
      const id = String(o.order_uid || o.order_id || '');
      if (id && !orders.has(id)) orders.set(id, { date: localDate(o.slot_start_time), receiptUrl: o.receipt_url || '' });
    }
    const total = data.controls?.total_record_count;
    log(`Order history page ${page}${total ? ` of ${Math.ceil(total / PAGE_SIZE)}` : ''}: ${orders.size - before} orders`);
    if (orders.size === before || list.length < PAGE_SIZE || (total && orders.size >= total)) break;
    await sleep(400);
  }

  const todo = [...orders].filter(([, o]) => !SINCE || !o.date || o.date >= SINCE);
  if (!todo.length) {
    log(orders.size ? `No orders on or after ${SINCE}.` : "No orders found. Check you are signed in and that My orders lists your shops. If it does, Sainsbury's may have changed the page: please open an issue.");
    return;
  }
  log(`Fetching ${todo.length} e-receipt PDFs…`);

  // 2. Fetch each PDF. The order list doesn't always carry the receipt link, so fall back to the order's own details.
  // Orders that haven't been delivered yet (or were cancelled) have no e-receipt and are skipped.
  const files = [];
  const failed = [];
  let skipped = 0;
  for (const [id, o] of todo) {
    let { receiptUrl, date } = o;
    if (!receiptUrl) {
      try {
        const detail = await getJson(`${api}/${encodeURIComponent(id)}`);
        receiptUrl = detail.receipt_url || '';
        date ||= localDate(detail.slot_start_time);
      } catch {
        /* treated as no receipt below */
      }
      await sleep(300);
    }
    if (!receiptUrl) { skipped++; continue; }
    const url = new URL(receiptUrl, location.origin);
    let bytes = null;
    for (let attempt = 1; attempt <= 3 && !bytes; attempt++) {
      try {
        const res = await fetch(url, url.origin === location.origin ? { credentials: 'include', headers: wcAuth ? { WCAuthToken: wcAuth } : {} } : {});
        const b = await res.blob();
        if (res.ok && /pdf|octet-stream/i.test(b.type)) bytes = new Uint8Array(await b.arrayBuffer());
        else await sleep(1500 * attempt);
      } catch {
        await sleep(1500 * attempt);
      }
    }
    if (!bytes) { failed.push(id); log('Failed', id); continue; }
    files.push({ name: `Sainsburys_Receipt_${date ? date + '_' : ''}${id}.pdf`, bytes });
    log(`Fetched ${files.length}/${todo.length - skipped}`);
    await sleep(500);
  }
  if (skipped) log(`${skipped} orders have no e-receipt yet (not delivered, or cancelled).`);
  if (!files.length) { log("Could not fetch any receipts. Try again in a few minutes, or download them one by one from each order's page."); return; }

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
  const header = (size, write) => { const v = new DataView(new ArrayBuffer(size)); write(v); return new Uint8Array(v.buffer); };
  const parts = [];
  const central = [];
  let offset = 0;
  for (const { name, bytes } of files) {
    const n = new TextEncoder().encode(name);
    const crc = crc32(bytes);
    const common = (v, at) => {
      v.setUint16(at, 20, true); v.setUint16(at + 2, 0x0800, true); v.setUint16(at + 4, 0, true);
      v.setUint16(at + 6, dosTime, true); v.setUint16(at + 8, dosDate, true); v.setUint32(at + 10, crc, true);
      v.setUint32(at + 14, bytes.length, true); v.setUint32(at + 18, bytes.length, true); v.setUint16(at + 22, n.length, true);
    };
    parts.push(header(30, (v) => { v.setUint32(0, 0x04034b50, true); common(v, 4); }), n, bytes);
    central.push(header(46, (v) => { v.setUint32(0, 0x02014b50, true); v.setUint16(4, 20, true); common(v, 6); v.setUint32(42, offset, true); }), n);
    offset += 30 + n.length + bytes.length;
  }
  const centralSize = central.reduce((t, p) => t + p.length, 0);
  const end = header(22, (v) => {
    v.setUint32(0, 0x06054b50, true); v.setUint16(8, files.length, true); v.setUint16(10, files.length, true);
    v.setUint32(12, centralSize, true); v.setUint32(16, offset, true);
  });
  const zip = new Blob([...parts, ...central, end], { type: 'application/zip' });

  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(zip),
    download: `Sainsburys_Receipts_${now.toISOString().slice(0, 10)}.zip`,
  });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);

  log(`Done: ${a.download} with ${files.length} receipts${failed.length ? `. ${failed.length} failed (${failed.join(', ')}): run again or download those from each order's page` : ''}. Drop the zip onto Basket Index.`);
})();
