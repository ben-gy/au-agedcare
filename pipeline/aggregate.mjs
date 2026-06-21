#!/usr/bin/env node
// Compute aggregates and insights from public/data/services.json.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'public', 'data');

const raw = JSON.parse(readFileSync(join(DATA_DIR, 'services.json'), 'utf8'));
const services = raw.services;

function mean(xs) {
  const f = xs.filter((x) => x !== null && x !== undefined && Number.isFinite(x));
  if (!f.length) return null;
  return f.reduce((a, b) => a + b, 0) / f.length;
}

function median(xs) {
  const f = xs.filter((x) => x !== null && x !== undefined && Number.isFinite(x)).sort((a, b) => a - b);
  if (!f.length) return null;
  const mid = Math.floor(f.length / 2);
  return f.length % 2 ? f[mid] : (f[mid - 1] + f[mid]) / 2;
}

function stddev(xs) {
  const f = xs.filter((x) => x !== null && x !== undefined && Number.isFinite(x));
  if (f.length < 2) return null;
  const m = mean(f);
  const v = f.reduce((s, x) => s + (x - m) ** 2, 0) / (f.length - 1);
  return Math.sqrt(v);
}

function counts(xs) {
  const c = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, null: 0 };
  for (const x of xs) {
    if (x === null || x === undefined) c.null++;
    else if (x >= 1 && x <= 5) c[x]++;
  }
  return c;
}

const states = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

// === State aggregates ===
const byState = {};
for (const st of states) {
  const inState = services.filter((s) => s.state === st);
  byState[st] = {
    count: inState.length,
    avg_overall: mean(inState.map((s) => s.overall)),
    avg_residents_exp: mean(inState.map((s) => s.residents_exp)),
    avg_compliance: mean(inState.map((s) => s.compliance)),
    avg_staffing: mean(inState.map((s) => s.staffing)),
    avg_quality: mean(inState.map((s) => s.quality_measures)),
    dist_overall: counts(inState.map((s) => s.overall)),
    failing_rn_minutes: inState.filter((s) => s.s.rn_actual !== null && s.s.rn_target !== null && s.s.rn_actual < s.s.rn_target).length,
    failing_total_minutes: inState.filter((s) => s.s.total_actual !== null && s.s.total_target !== null && s.s.total_actual < s.s.total_target).length,
  };
}

// === Provider aggregates ===
const providerMap = {};
for (const s of services) {
  const p = s.provider || 'Unknown provider';
  if (!providerMap[p]) providerMap[p] = [];
  providerMap[p].push(s);
}
const providers = Object.entries(providerMap)
  .map(([name, ss]) => ({
    name,
    count: ss.length,
    avg_overall: mean(ss.map((s) => s.overall)),
    avg_residents_exp: mean(ss.map((s) => s.residents_exp)),
    avg_compliance: mean(ss.map((s) => s.compliance)),
    avg_staffing: mean(ss.map((s) => s.staffing)),
    avg_quality: mean(ss.map((s) => s.quality_measures)),
    low_count: ss.filter((s) => s.overall !== null && s.overall <= 2).length,
    high_count: ss.filter((s) => s.overall !== null && s.overall >= 4).length,
    states: Array.from(new Set(ss.map((s) => s.state))).filter(Boolean).sort(),
  }))
  .sort((a, b) => b.count - a.count);

// === National stats ===
const national = {
  count: services.length,
  avg_overall: mean(services.map((s) => s.overall)),
  median_overall: median(services.map((s) => s.overall)),
  dist_overall: counts(services.map((s) => s.overall)),
  dist_residents_exp: counts(services.map((s) => s.residents_exp)),
  dist_compliance: counts(services.map((s) => s.compliance)),
  dist_staffing: counts(services.map((s) => s.staffing)),
  dist_quality: counts(services.map((s) => s.quality_measures)),
  median_qm: {
    pressure_injuries: median(services.map((s) => s.qm.pressure_injuries)),
    restrictive_practices: median(services.map((s) => s.qm.restrictive_practices)),
    weight_loss: median(services.map((s) => s.qm.weight_loss)),
    falls: median(services.map((s) => s.qm.falls)),
    falls_major: median(services.map((s) => s.qm.falls_major)),
    polypharmacy: median(services.map((s) => s.qm.polypharmacy)),
    antipsychotic: median(services.map((s) => s.qm.antipsychotic)),
  },
  stddev_qm: {
    pressure_injuries: stddev(services.map((s) => s.qm.pressure_injuries)),
    restrictive_practices: stddev(services.map((s) => s.qm.restrictive_practices)),
    weight_loss: stddev(services.map((s) => s.qm.weight_loss)),
    falls: stddev(services.map((s) => s.qm.falls)),
    falls_major: stddev(services.map((s) => s.qm.falls_major)),
    polypharmacy: stddev(services.map((s) => s.qm.polypharmacy)),
    antipsychotic: stddev(services.map((s) => s.qm.antipsychotic)),
  },
  purpose_dist: services.reduce((acc, s) => {
    const k = s.purpose || 'Unknown';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {}),
  size_dist: services.reduce((acc, s) => {
    const k = s.size || 'Unknown';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {}),
  mmm_dist: services.reduce((acc, s) => {
    const k = s.mmm_region || 'Unknown';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {}),
};

// === Insights / anomalies ===
const insights = [];

// 1. Services with 1-star overall and at least 1 sub-rating also 1
const worst = services
  .filter((s) => s.overall === 1)
  .sort((a, b) => (a.compliance ?? 5) - (b.compliance ?? 5))
  .slice(0, 20);
const worstCount = services.filter((s) => s.overall === 1).length;
insights.push({
  id: 'worst-overall',
  severity: 'alert',
  title: `${worstCount} ${worstCount === 1 ? 'service has' : 'services have'} a 1-star Overall rating`,
  detail: 'These services are flagged as significantly below expectations. Compliance issues, low staffing, poor quality measures, or low resident feedback.',
  items: worst.map((s) => ({ slug: s.slug, name: s.name, state: s.state, suburb: s.suburb })),
});

// 2. Providers with 3+ low-rated services
const bigBadProviders = providers
  .filter((p) => p.low_count >= 3 && p.count >= 3)
  .sort((a, b) => b.low_count - a.low_count)
  .slice(0, 15);
if (bigBadProviders.length) {
  insights.push({
    id: 'providers-multiple-lows',
    severity: 'warn',
    title: `${bigBadProviders.length} providers operate 3 or more homes rated 1 or 2 stars`,
    detail: 'Patterns of low ratings across multiple homes from the same provider may indicate systemic management or staffing issues.',
    items: bigBadProviders.map((p) => ({ name: p.name, low_count: p.low_count, total: p.count })),
  });
}

// 3. Services failing total care minutes target by a large margin
const failingMinutes = services
  .filter((s) => s.s.total_actual !== null && s.s.total_target !== null && s.s.total_actual < s.s.total_target * 0.85)
  .map((s) => ({
    slug: s.slug,
    name: s.name,
    state: s.state,
    suburb: s.suburb,
    actual: s.s.total_actual,
    target: s.s.total_target,
    gap: s.s.total_target - s.s.total_actual,
  }))
  .sort((a, b) => b.gap - a.gap)
  .slice(0, 20);
if (failingMinutes.length) {
  insights.push({
    id: 'failing-care-minutes',
    severity: 'warn',
    title: `${services.filter((s) => s.s.total_actual !== null && s.s.total_target !== null && s.s.total_actual < s.s.total_target * 0.85).length} services delivered under 85% of the regulated total care-minutes target`,
    detail: 'Residential aged care services must meet minimum staffing care-minute targets. Significant gaps may signal understaffing.',
    items: failingMinutes,
  });
}

// 4. Quality measure outliers (>1 standard deviation above national median for *bad* measures)
const qmOutliers = [];
for (const s of services) {
  const flags = [];
  for (const k of ['pressure_injuries', 'weight_loss', 'falls_major', 'antipsychotic', 'restrictive_practices']) {
    const v = s.qm[k];
    const m = national.median_qm[k];
    const sd = national.stddev_qm[k];
    if (v !== null && m !== null && sd !== null && sd > 0 && v > m + sd) flags.push(k);
  }
  if (flags.length >= 2) qmOutliers.push({ slug: s.slug, name: s.name, state: s.state, suburb: s.suburb, flags });
}
if (qmOutliers.length) {
  insights.push({
    id: 'qm-outliers',
    severity: 'warn',
    title: `${qmOutliers.length} services flagged on 2 or more quality measures`,
    detail: 'Services more than 1 standard deviation above the national median on at least two of: pressure injuries, weight loss, major falls injuries, antipsychotic use, restrictive practices.',
    items: qmOutliers.slice(0, 30),
  });
}

// 5. Top-performers
const best = services
  .filter((s) => s.overall === 5 && s.staffing === 5 && s.compliance === 5)
  .slice(0, 25);
insights.push({
  id: 'top-performers',
  severity: 'info',
  title: `${services.filter((s) => s.overall === 5 && s.staffing === 5 && s.compliance === 5).length} services rated 5 stars on Overall, Staffing, and Compliance`,
  detail: 'These services are top of their class on all three core dimensions.',
  items: best.map((s) => ({ slug: s.slug, name: s.name, state: s.state, suburb: s.suburb })),
});

// === Write ===
const agg = {
  generated_at: new Date().toISOString(),
  reporting_period: raw.reporting_period,
  source_url: raw.source_url,
  national,
  byState,
  providers: providers.slice(0, 60),
  total_provider_count: providers.length,
  insights,
};
writeFileSync(join(DATA_DIR, 'aggregates.json'), JSON.stringify(agg));
console.log(`Wrote ${join(DATA_DIR, 'aggregates.json')} (${(JSON.stringify(agg).length / 1024).toFixed(1)} KB)`);
