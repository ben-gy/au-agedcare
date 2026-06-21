import type { Service, Filters } from './types.ts';

export const STATE_ORDER = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

export const RATING_COLOURS: Record<string, string> = {
  '5': '#3a7d44',
  '4': '#7bb377',
  '3': '#d8b65b',
  '2': '#c97a1a',
  '1': '#a3372b',
  '0': '#b5bdbf',
};

export function ratingColor(r: number | null | undefined): string {
  if (r === null || r === undefined || !Number.isFinite(r)) return RATING_COLOURS['0'];
  const rounded = Math.max(1, Math.min(5, Math.round(r)));
  return RATING_COLOURS[String(rounded)] ?? RATING_COLOURS['0'];
}

export function formatNumber(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '–';
  return n.toLocaleString('en-AU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatRating(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '–';
  return n.toFixed(2);
}

export function formatStars(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  const r = Math.max(0, Math.min(5, Math.round(n)));
  return '★'.repeat(r) + '☆'.repeat(5 - r);
}

export function formatPercent(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '–';
  return n.toFixed(digits) + '%';
}

export function titleCase(s: string): string {
  if (!s) return s;
  return s
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((part) => (/^\s+$|^-$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');
}

export function applyFilters(services: Service[], f: Filters): Service[] {
  const q = f.search.trim().toLowerCase();
  return services.filter((s) => {
    if (f.state !== 'ALL' && s.state !== f.state) return false;
    if (f.size !== 'ALL' && s.size !== f.size) return false;
    if (f.purpose !== 'ALL' && s.purpose !== f.purpose) return false;
    if (f.mmm !== 'ALL' && s.mmm_code !== f.mmm) return false;
    if (f.minRating > 0 && (s.overall === null || s.overall < f.minRating)) return false;
    if (f.failingMinutesOnly) {
      const a = s.s.total_actual;
      const t = s.s.total_target;
      if (a === null || t === null || a >= t) return false;
    }
    if (q) {
      const hay = `${s.name} ${s.provider} ${s.suburb} ${s.state} ${s.planning_region}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function sortBy<T>(arr: T[], key: (t: T) => number | null | undefined, dir: 'asc' | 'desc' = 'desc'): T[] {
  const factor = dir === 'asc' ? 1 : -1;
  return [...arr].sort((a, b) => {
    const av = key(a);
    const bv = key(b);
    if (av === null || av === undefined || !Number.isFinite(av as number)) return 1;
    if (bv === null || bv === undefined || !Number.isFinite(bv as number)) return -1;
    return ((av as number) - (bv as number)) * factor;
  });
}

export function debounce<T extends (...a: never[]) => unknown>(fn: T, wait: number): T {
  let t: ReturnType<typeof setTimeout> | null = null;
  return ((...args: never[]) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  }) as T;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function uniqueValues<T, K>(arr: T[], key: (t: T) => K): K[] {
  return Array.from(new Set(arr.map(key))).filter((v) => v !== null && v !== undefined && v !== '') as K[];
}

export function pct(n: number | null | undefined, total: number): number {
  if (n === null || n === undefined || !total) return 0;
  return (n / total) * 100;
}
