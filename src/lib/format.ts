export const gbp = (p: number) => `£${(p / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const gbp0 = (p: number) => `£${Math.round(p / 100).toLocaleString('en-GB')}`;
export const signPct = (n: number, d = 1) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(n).toFixed(d)}%`;
export const day = (iso: string) => new Date(`${iso}T12:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
export const dayLong = (iso: string) =>
  new Date(`${iso}T12:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
export const monthName = (ym: string) => new Date(`${ym}-01T12:00`).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
