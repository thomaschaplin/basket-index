// Basket Index — Tesco receipt downloader
// Run in your browser's DevTools console while signed in at
// https://www.tesco.com/account/receipts/en-GB?tab=online&page=1
// It walks every page of receipts and saves each PDF to your Downloads folder.
// Nothing is sent anywhere except tesco.com, using your own signed-in session.
(async () => {
  const TABS = ['online']; // add 'instore' once Tesco ships in-store receipts
  const MAX_PAGES = 60;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const log = (...a) => console.log('%c[basket-index]', 'color:#00539f;font-weight:bold', ...a);

  // A receipt link is anything pointing at a receipt PDF or download endpoint.
  const isReceiptLink = (href) => /receipt/i.test(href) && /(\.pdf|download|pdf=|format=pdf)/i.test(href);
  const linksIn = (root, base) =>
    [...root.querySelectorAll('a[href]')]
      .map((a) => new URL(a.getAttribute('href'), base).href)
      .filter(isReceiptLink);

  const found = new Set();
  for (const tab of TABS) {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = `${location.origin}/account/receipts/en-GB?tab=${tab}&page=${page}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) break;
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      const before = found.size;
      linksIn(doc, url).forEach((h) => found.add(h));
      log(`${tab} page ${page}: ${found.size - before} new receipt links`);
      if (found.size === before) break; // ran out of pages
      await sleep(500);
    }
  }

  // If the list is rendered in the browser rather than in the HTML, fall back to what's on screen now.
  if (!found.size) {
    linksIn(document, location.href).forEach((h) => found.add(h));
    log(`Fell back to links visible on this page: ${found.size}`);
  }
  if (!found.size) {
    log('No receipt links found. Tesco may have changed the page. Right-click a receipt download button, choose Inspect, and share that HTML so the selector can be updated.');
    return;
  }

  let saved = 0;
  for (const href of found) {
    try {
      const res = await fetch(href, { credentials: 'include' });
      const blob = await res.blob();
      if (!/pdf/i.test(blob.type)) { log('Skipped (not a PDF):', href); continue; }
      const cd = res.headers.get('content-disposition') || '';
      const name = (cd.match(/filename="?([^";]+)"?/i) || [])[1] || `Tesco_Receipt_${String(++saved).padStart(3, '0')}.pdf`;
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      log('Saved', name);
      await sleep(700); // be gentle; also lets the browser keep up with downloads
    } catch (e) {
      log('Failed', href, e);
    }
  }
  log(`Done. ${found.size} receipts requested. Drop the PDFs onto Basket Index.`);
})();
