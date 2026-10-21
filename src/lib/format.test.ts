import { describe, expect, it } from 'vitest';
import { dayRange, dayYear } from './format';

describe('dayRange', () => {
  it('leaves the year off when both dates share one', () => {
    expect(dayRange('2026-05-02', '2026-10-03')).toBe('2 May → 3 Oct');
  });

  it('adds years when the range crosses into another year', () => {
    expect(dayRange('2025-10-25', '2026-10-14')).toBe('25 Oct 2025 → 14 Oct 2026');
  });

  it('takes a custom separator', () => {
    expect(dayRange('2025-10-25', '2026-10-14', ' to ')).toBe('25 Oct 2025 to 14 Oct 2026');
  });
});

describe('dayYear', () => {
  it('always includes the year, for tooltips and sentences about a single date', () => {
    expect(dayYear('2025-10-23')).toBe('23 Oct 2025');
  });
});
