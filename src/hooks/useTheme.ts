import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const read = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(read);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#070b14' : '#f4f6fb');
  }, [theme]);
  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('bi-theme', next);
      } catch {
        /* private mode: theme just won't persist */
      }
      return next;
    });
  }, []);
  return { theme, toggle };
}

/** Concrete colours for SVG chart attributes, which can't read CSS variables everywhere. */
export const chartColours = (theme: Theme) =>
  theme === 'dark'
    ? { ink: '#e8eefc', muted: '#95a2bd', faint: '#6b7792', grid: '#1f2a44', surface: '#0f1729', brand: '#3987e5', aqua: '#199e70', offer: '#facc15', up: '#ff7b7b', down: '#4ade80' }
    : { ink: '#0b1220', muted: '#5b6478', faint: '#8a93a6', grid: '#e2e7f0', surface: '#ffffff', brand: '#2a78d6', aqua: '#1baf7a', offer: '#e0a800', up: '#c62828', down: '#127a12' };
export type ChartColours = ReturnType<typeof chartColours>;
