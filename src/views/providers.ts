// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { AppState } from '../state.ts';
import { applyFilters, escapeHtml, formatRating, sortBy } from '../utils.ts';

function mean(xs: (number | null)[]): number | null {
  const f = xs.filter((x): x is number => x !== null && Number.isFinite(x));
  if (!f.length) return null;
  return f.reduce((a, b) => a + b, 0) / f.length;
}

function ratingClass(v: number | null): string {
  if (v === null) return '0';
  if (v >= 4.5) return '5';
  if (v >= 3.5) return '4';
  if (v >= 2.5) return '3';
  if (v >= 1.5) return '2';
  return '1';
}

export function renderProviders(
  root: HTMLElement,
  state: AppState,
  onOpenProvider: (provider: string) => void,
): void {
  const services = applyFilters(state.services, state.filters);
  const providerMap = new Map<string, typeof services>();
  for (const s of services) {
    const k = s.provider || 'Unknown';
    if (!providerMap.has(k)) providerMap.set(k, []);
    providerMap.get(k)!.push(s);
  }
  const providers = Array.from(providerMap.entries())
    .map(([name, ss]) => ({
      name,
      count: ss.length,
      states: Array.from(new Set(ss.map((s) => s.state))).filter(Boolean).sort().join(', '),
      avg_overall: mean(ss.map((s) => s.overall)),
      avg_re: mean(ss.map((s) => s.residents_exp)),
      avg_compliance: mean(ss.map((s) => s.compliance)),
      avg_staffing: mean(ss.map((s) => s.staffing)),
      avg_quality: mean(ss.map((s) => s.quality_measures)),
    }))
    .filter((p) => p.count >= 2);
  const top = sortBy(providers, (p) => p.count, 'desc').slice(0, 40);

  root.innerHTML = `
    <h1 class="view-title">Provider matrix</h1>
    <p class="view-subtitle">
      Top 40 providers (by number of services in the current filter) and their average rating on each dimension.
      Cell colour matches the rounded star rating. Click a provider name to see all its services.
    </p>
    <div class="providers-matrix">
      <div class="matrix-head head-name">Provider</div>
      <div class="matrix-head">Services</div>
      <div class="matrix-head">Overall</div>
      <div class="matrix-head">Residents Exp.</div>
      <div class="matrix-head">Compliance</div>
      <div class="matrix-head">Staffing</div>
      <div class="matrix-head">Quality M.</div>
      ${top
        .map(
          (p) => `
        <div class="matrix-cell name" data-provider="${escapeHtml(p.name)}" data-tip="${escapeHtml(`${p.name} — ${p.count} services (${p.states || '—'}). Click to see all its services.`)}">
          ${escapeHtml(p.name)}
          <div class="matrix-meta">${escapeHtml(p.states || '—')}</div>
        </div>
        <div class="matrix-cell" data-tip="${escapeHtml(`${p.name} — ${p.count} services in the current filter`)}">${p.count}</div>
        ${matrixCell(p.avg_overall, p.name, 'Overall')}
        ${matrixCell(p.avg_re, p.name, "Residents' Experience")}
        ${matrixCell(p.avg_compliance, p.name, 'Compliance')}
        ${matrixCell(p.avg_staffing, p.name, 'Staffing')}
        ${matrixCell(p.avg_quality, p.name, 'Quality Measures')}
      `,
        )
        .join('')}
    </div>
    <p class="muted" style="margin-top: 12px; font-size: var(--font-size-xs);">
      Showing top ${top.length} of ${providers.length} multi-service providers. Single-service providers omitted to keep averages meaningful.
    </p>
  `;

  root.querySelectorAll<HTMLElement>('.matrix-cell.name').forEach((c) => {
    c.addEventListener('click', () => onOpenProvider(c.dataset.provider || ''));
  });
}

function matrixCell(v: number | null, provider: string, dimension: string): string {
  const cls = ratingClass(v);
  if (v === null) {
    const tip = escapeHtml(`${provider} — ${dimension}: no rating published`);
    return `<div class="matrix-cell" data-tip="${tip}"><span class="rating" data-r="0" aria-label="${tip}">–</span></div>`;
  }
  const tip = escapeHtml(`${provider} — avg ${dimension}: ${formatRating(v)}★ across its services`);
  return `<div class="matrix-cell" data-tip="${tip}"><span class="rating" data-r="${cls}" aria-label="${tip}">${formatRating(v)}</span></div>`;
}
