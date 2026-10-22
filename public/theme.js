// Sets the theme before first paint so there's no flash. A file rather than an inline script, so the
// Content-Security-Policy can allow scripts from this origin only.
try {
  const t = localStorage.getItem('bi-theme');
  document.documentElement.dataset.theme = t || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
} catch {
  document.documentElement.dataset.theme = 'dark';
}
