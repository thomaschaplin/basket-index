// Intl formatters are expensive to build, so create each once and reuse it.
const money = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat('en-GB');
const dayFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const dayYearFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const dayLongFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'short', year: '2-digit' });

export const gbp = (p: number) => `£${money.format(p / 100)}`;
export const gbp0 = (p: number) => `£${whole.format(Math.round(p / 100))}`;
export const signPct = (n: number, d = 1) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(n).toFixed(d)}%`;
export const day = (iso: string) => dayFmt.format(new Date(`${iso}T12:00`));
/** "23 Oct 2025": for tooltips and sentences, where a year of data makes "23 Oct" ambiguous. */
export const dayYear = (iso: string) => dayYearFmt.format(new Date(`${iso}T12:00`));
/** "2 May → 3 Oct", with years added when the range crosses into another year. */
export const dayRange = (from: string, to: string, sep = ' → ') => {
  const f = from.slice(0, 4) === to.slice(0, 4) ? day : dayYear;
  return `${f(from)}${sep}${f(to)}`;
};
export const dayLong = (iso: string) => dayLongFmt.format(new Date(`${iso}T12:00`));
export const monthName = (ym: string) => monthFmt.format(new Date(`${ym}-01T12:00`));
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
