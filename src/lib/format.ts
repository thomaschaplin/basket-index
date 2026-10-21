// Intl formatters are expensive to build, so create each once and reuse it.
const money = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat('en-GB');
const dayFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const dayLongFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'short', year: '2-digit' });

export const gbp = (p: number) => `£${money.format(p / 100)}`;
export const gbp0 = (p: number) => `£${whole.format(Math.round(p / 100))}`;
export const signPct = (n: number, d = 1) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(n).toFixed(d)}%`;
export const day = (iso: string) => dayFmt.format(new Date(`${iso}T12:00`));
export const dayLong = (iso: string) => dayLongFmt.format(new Date(`${iso}T12:00`));
export const monthName = (ym: string) => monthFmt.format(new Date(`${ym}-01T12:00`));
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
