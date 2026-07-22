// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { AppState } from '../state.ts';
import type { InsightItem } from '../types.ts';
import { escapeHtml, formatNumber } from '../utils.ts';

export function renderInsights(
  root: HTMLElement,
  state: AppState,
  onOpenService: (slug: string) => void,
  onOpenProvider: (provider: string) => void,
): void {
  root.innerHTML = `
    <h1 class="view-title">Insights</h1>
    <p class="view-subtitle">
      Auto-detected patterns in the ${state.reportingPeriod} extract — services with serious ratings, providers with widespread under-performance, and quality-measure outliers.
    </p>
    <div class="insights-grid">
      ${state.agg.insights
        .map(
          (ins) => `
        <div class="insight-card" data-severity="${escapeHtml(ins.severity)}">
          <h3>${escapeHtml(ins.title)}</h3>
          <p class="insight-detail">${escapeHtml(ins.detail)}</p>
          <div class="insight-items">
            ${ins.items.map(itemHtml).join('')}
          </div>
        </div>
      `,
        )
        .join('')}
    </div>
  `;

  root.querySelectorAll<HTMLElement>('.insight-chip[data-slug]').forEach((c) => {
    c.addEventListener('click', () => onOpenService(c.dataset.slug || ''));
  });
  root.querySelectorAll<HTMLElement>('.insight-chip[data-provider]').forEach((c) => {
    c.addEventListener('click', () => onOpenProvider(c.dataset.provider || ''));
  });
}

function itemHtml(it: InsightItem): string {
  if (it.slug) {
    const meta = it.gap !== undefined ? `Short by ${formatNumber(it.gap)} min/day` : it.flags ? it.flags.join(', ') : `${escapeHtml(it.suburb || '')}, ${escapeHtml(it.state || '')}`;
    return `
      <div class="insight-chip" data-slug="${escapeHtml(it.slug)}">
        <div class="insight-chip-name">${escapeHtml(it.name || it.slug)}</div>
        <div class="insight-chip-sub">${meta}</div>
      </div>`;
  }
  if (it.name && it.low_count !== undefined) {
    return `
      <div class="insight-chip" data-provider="${escapeHtml(it.name)}">
        <div class="insight-chip-name">${escapeHtml(it.name)}</div>
        <div class="insight-chip-sub">${it.low_count} of ${it.total} services rated ≤2★</div>
      </div>`;
  }
  return '';
}
