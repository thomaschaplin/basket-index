import { Download, Moon, RotateCcw, Sun } from 'lucide-react';
import type { Theme } from '../hooks/useTheme';
import { GitHubIcon, REPO_URL } from './ui';

const LINKS = [
  ['overview', 'Overview'],
  ['prices', 'Prices'],
  ['packs', 'Pack sizes'],
  ['staples', 'Staples'],
  ['products', 'Products'],
  ['receipts', 'Receipts'],
];

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <img src="/favicon.svg" alt="" className="size-8 rounded-xl shadow-md shadow-brand/30" />
      <span className="font-display text-xl font-extrabold tracking-tight">Basket Index</span>
    </span>
  );
}

export function Nav({
  theme,
  onTheme,
  hasData,
  onExport,
  onReset,
}: {
  theme: Theme;
  onTheme: () => void;
  hasData: boolean;
  onExport: () => void;
  onReset: () => void;
}) {
  const icon = 'grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink';
  return (
    <nav className="glass sticky top-0 z-30 border-b border-line/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <a href="#top" aria-label="Basket Index, back to top">
          <Logo />
        </a>
        {hasData && (
          <div className="mx-auto hidden items-center gap-1 lg:flex">
            {LINKS.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
              >
                {label}
              </a>
            ))}
          </div>
        )}
        <div className={`ml-auto flex items-center gap-1 ${hasData ? 'lg:ml-0' : ''}`}>
          {hasData && (
            <>
              <button type="button" onClick={onExport} className={icon} aria-label="Download all items as CSV" title="Download CSV">
                <Download className="size-5" />
              </button>
              <button type="button" onClick={onReset} className={icon} aria-label="Start over" title="Start over">
                <RotateCcw className="size-5" />
              </button>
            </>
          )}
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={icon} aria-label="View the source on GitHub" title="View on GitHub">
            <GitHubIcon className="size-5" />
          </a>
          <button type="button" onClick={onTheme} className={icon} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title="Toggle theme">
            {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
        </div>
      </div>
    </nav>
  );
}
