import { describe, expect, it } from 'vitest';
import {
  applyFilters,
  escapeHtml,
  formatNumber,
  formatPercent,
  formatRating,
  formatStars,
  ratingColor,
  sortBy,
  titleCase,
  uniqueValues,
} from '../src/utils.ts';
import { DEFAULT_FILTERS } from '../src/state.ts';
import type { Service } from '../src/types.ts';

function makeService(overrides: Partial<Service> = {}): Service {
  return {
    slug: 'home-suburb-nsw',
    name: 'Test Home',
    provider: 'Test Provider',
    suburb: 'TESTVILLE',
    state: 'NSW',
    reporting_period: 'May 2026',
    purpose: 'Not for Profit',
    planning_region: 'Test Region',
    mmm_region: 'Metropolitan',
    mmm_code: 'MM1',
    size: 'Medium',
    overall: 4,
    residents_exp: 4,
    compliance: 5,
    staffing: 3,
    quality_measures: 4,
    lat: -33.86,
    lng: 151.21,
    re: {
      interview_year: 2025,
      food: { always: 50, most: 30, some: 15, never: 5 },
      safety: null,
      operation: null,
      care_need: null,
      competent: null,
      independent: null,
      explain: null,
      respect: null,
      follow_up: null,
      caring: null,
      voice: null,
      home: null,
    },
    c: {
      decision_type: 'Accreditation',
      decision_applied: '2025-01-01',
      decision_ends: '2028-01-01',
      reason: '',
      audit_closed: '',
      standards: { s1: 'Compliant', s2: 'Compliant', s3: 'Compliant', s4: 'Compliant', s5: 'Compliant', s6: 'Compliant', s7: 'Compliant' },
    },
    s: { rn_target: 44, rn_actual: 50, total_target: 215, total_actual: 220 },
    qm: {
      pressure_injuries: 5,
      restrictive_practices: 2,
      weight_loss: 8,
      falls: 25,
      falls_major: 1,
      polypharmacy: 35,
      antipsychotic: 8,
    },
    ...overrides,
  };
}

describe('formatNumber', () => {
  it('formats thousands with commas (en-AU)', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });
  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
  it('handles negative', () => {
    expect(formatNumber(-1234)).toBe('-1,234');
  });
  it('returns dash for null/undefined/NaN', () => {
    expect(formatNumber(null)).toBe('–');
    expect(formatNumber(undefined)).toBe('–');
    expect(formatNumber(NaN)).toBe('–');
  });
  it('formats with decimals', () => {
    expect(formatNumber(1234.56, 2)).toBe('1,234.56');
  });
});

describe('formatRating', () => {
  it('renders 2 decimal places', () => {
    expect(formatRating(3.4567)).toBe('3.46');
  });
  it('returns dash for null/NaN', () => {
    expect(formatRating(null)).toBe('–');
    expect(formatRating(NaN)).toBe('–');
  });
});

describe('formatStars', () => {
  it('shows N filled out of 5', () => {
    expect(formatStars(3)).toBe('★★★☆☆');
  });
  it('rounds to nearest', () => {
    expect(formatStars(4.4)).toBe('★★★★☆');
    expect(formatStars(4.6)).toBe('★★★★★');
  });
  it('clamps out-of-range', () => {
    expect(formatStars(-1)).toBe('☆☆☆☆☆');
    expect(formatStars(10)).toBe('★★★★★');
  });
  it('returns em-dash for null', () => {
    expect(formatStars(null)).toBe('—');
  });
});

describe('formatPercent', () => {
  it('renders one decimal by default', () => {
    expect(formatPercent(12.345)).toBe('12.3%');
  });
  it('returns dash for null', () => {
    expect(formatPercent(null)).toBe('–');
  });
  it('handles zero', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });
});

describe('ratingColor', () => {
  it('returns the 5-star colour for 5', () => {
    expect(ratingColor(5)).toBe('#3a7d44');
  });
  it('returns the 1-star colour for 1', () => {
    expect(ratingColor(1)).toBe('#a3372b');
  });
  it('returns the null colour for null', () => {
    expect(ratingColor(null)).toBe('#b5bdbf');
  });
  it('rounds floats', () => {
    expect(ratingColor(4.4)).toBe('#7bb377');
    expect(ratingColor(4.5)).toBe('#3a7d44');
  });
});

describe('applyFilters', () => {
  const A = makeService({ slug: 'a', name: 'Acacia Home', state: 'NSW', overall: 4, size: 'Large', purpose: 'For Profit' });
  const B = makeService({ slug: 'b', name: 'Banksia House', state: 'VIC', overall: 2, size: 'Small', purpose: 'Not for Profit' });
  const C = makeService({
    slug: 'c',
    name: 'Coolabah',
    state: 'NSW',
    overall: 5,
    size: 'Medium',
    purpose: 'Government',
    s: { rn_target: 50, rn_actual: 60, total_target: 220, total_actual: 200 },
  });

  it('filters by state', () => {
    const r = applyFilters([A, B, C], { ...DEFAULT_FILTERS, state: 'NSW' });
    expect(r.map((s) => s.slug)).toEqual(['a', 'c']);
  });
  it('filters by min rating', () => {
    const r = applyFilters([A, B, C], { ...DEFAULT_FILTERS, minRating: 4 });
    expect(r.map((s) => s.slug)).toEqual(['a', 'c']);
  });
  it('matches search across name/provider/suburb', () => {
    const r = applyFilters([A, B, C], { ...DEFAULT_FILTERS, search: 'banks' });
    expect(r.map((s) => s.slug)).toEqual(['b']);
  });
  it('filters by failing minutes only', () => {
    const r = applyFilters([A, B, C], { ...DEFAULT_FILTERS, failingMinutesOnly: true });
    expect(r.map((s) => s.slug)).toEqual(['c']);
  });
  it('combines multiple filters', () => {
    const r = applyFilters([A, B, C], { ...DEFAULT_FILTERS, state: 'NSW', minRating: 5 });
    expect(r.map((s) => s.slug)).toEqual(['c']);
  });
});

describe('sortBy', () => {
  it('sorts descending by default', () => {
    const r = sortBy([{ v: 1 }, { v: 3 }, { v: 2 }], (x) => x.v);
    expect(r.map((x) => x.v)).toEqual([3, 2, 1]);
  });
  it('sorts ascending when requested', () => {
    const r = sortBy([{ v: 1 }, { v: 3 }, { v: 2 }], (x) => x.v, 'asc');
    expect(r.map((x) => x.v)).toEqual([1, 2, 3]);
  });
  it('puts nulls at the end', () => {
    const r = sortBy([{ v: 1 }, { v: null }, { v: 3 }], (x) => x.v);
    expect(r.map((x) => x.v)).toEqual([3, 1, null]);
  });
});

describe('escapeHtml', () => {
  it('escapes < and >', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });
  it('escapes quotes and ampersand', () => {
    expect(escapeHtml(`Tom & Jerry's "show"`)).toBe('Tom &amp; Jerry&#39;s &quot;show&quot;');
  });
});

describe('titleCase', () => {
  it('capitalises each word', () => {
    expect(titleCase('hello world')).toBe('Hello World');
  });
  it('preserves hyphens', () => {
    expect(titleCase('south-west')).toBe('South-West');
  });
  it('returns empty for empty', () => {
    expect(titleCase('')).toBe('');
  });
});

describe('uniqueValues', () => {
  it('returns unique non-empty values', () => {
    expect(uniqueValues([{ k: 'a' }, { k: 'b' }, { k: 'a' }, { k: '' }], (x) => x.k)).toEqual(['a', 'b']);
  });
});
