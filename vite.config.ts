import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vitest/config';

// Absolute origin for canonical, Open Graph and sitemap URLs. Override with SITE_URL to build for another host.
const siteUrl = (process.env.SITE_URL || 'https://basketindex.thomaschaplin.me').replace(/\/+$/, '');

// Fills %SITE_URL% in index.html and emits robots.txt + sitemap.xml. Vercel previews are kept out of search.
function seo(): Plugin {
  const indexable = process.env.VERCEL_ENV !== 'preview';
  return {
    name: 'basket-index-seo',
    transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', siteUrl),
    generateBundle() {
      const robots = indexable ? `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n';
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots });
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${siteUrl}/</loc></url>\n</urlset>\n`,
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), seo()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: { charts: ['recharts'], pdf: ['pdfjs-dist'], motion: ['framer-motion'] },
      },
    },
  },
  test: { environment: 'node' },
});
