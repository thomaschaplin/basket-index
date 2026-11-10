# Contributing

Thanks for helping. Issues and pull requests are welcome.

## Getting started

```sh
npm install
npm run dev
```

Before opening a pull request, run the same checks CI runs:

```sh
npm run lint        # npm run format fixes most issues
npm run typecheck
npm test
npm run build
```

## Never commit real receipts

Receipts carry names, addresses, order numbers and card digits. Don't add real receipts, order JSON, screenshots of them, or IDs copied from them, to the repo, to issues or to pull requests.

If the parser gets a receipt wrong, describe the layout or paste a few lines with the personal details replaced. For a test, add a case to `scripts/generate-sample.ts` (then `npm run sample`) or write a short made-up string in the test, as `src/lib/parser.test.ts` does.

## Keep it private by design

- Receipt data never leaves the browser. The only analytics are Vercel Web Analytics and Speed Insights (cookieless, same-origin, page views and Web Vitals only); don't send receipt data to them, including in custom events. No third-party scripts, fonts or requests. The CSP in `vercel.json` enforces this, so a change that needs to loosen it needs a very good reason.
- The downloader scripts only talk to the shop's own site and only keep the fields the README lists.

## Style

Biome handles formatting and linting. Keep money in integer pence. Keep pull requests focused on one change and describe what you tested.
