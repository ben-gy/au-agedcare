import type { AppState } from '../state.ts';
import { escapeHtml, formatNumber, formatRating, STATE_ORDER } from '../utils.ts';
import { glossaryLink } from '../glossaryTooltip.ts';

export function renderStates(root: HTMLElement, state: AppState): void {
  root.innerHTML = `
    <h1 class="view-title">By state &amp; territory</h1>
    <p class="view-subtitle">
      Star-rating distributions side by side. Each card shows that jurisdiction's overall ${glossaryLink('star-ratings', 'Star Rating')} histogram, average ratings on each dimension, and how many services miss the regulated ${glossaryLink('care-minutes', 'care-minute')} targets.
    </p>
    <div class="states-grid">
      ${STATE_ORDER.map((st) => {
        const a = state.agg.byState[st];
        if (!a) return '';
        const max = Math.max(...[1, 2, 3, 4, 5].map((r) => a.dist_overall[r] ?? 0)) || 1;
        return `
          <div class="state-card">
            <h3>${escapeHtml(st)}</h3>
            <div class="muted">${formatNumber(a.count)} services</div>
            <div class="histogram">
              ${[1, 2, 3, 4, 5]
                .map((r) => {
                  const v = a.dist_overall[r] ?? 0;
                  const h = v === 0 ? 0 : Math.max(2, (v / max) * 100);
                  return `<div class="histogram-bar" data-r="${r}" style="height:${h}%" title="${r}★: ${v} services"></div>`;
                })
                .join('')}
            </div>
            <div class="histogram-label">
              <span>1★</span>
              <span>2★</span>
              <span>3★</span>
              <span>4★</span>
              <span>5★</span>
            </div>
            <div class="state-stats">
              <div><span class="muted">Avg Overall</span><strong>${formatRating(a.avg_overall)}</strong></div>
              <div><span class="muted">Avg Staffing</span><strong>${formatRating(a.avg_staffing)}</strong></div>
              <div><span class="muted">Avg Compliance</span><strong>${formatRating(a.avg_compliance)}</strong></div>
              <div><span class="muted">Avg Quality M.</span><strong>${formatRating(a.avg_quality)}</strong></div>
              <div style="grid-column: 1 / -1;">
                <span class="muted">Failing total ${glossaryLink('care-minutes', 'care-minute')} target</span>
                <strong>${formatNumber(a.failing_total_minutes)} <span class="muted" style="font-size: var(--font-size-sm); font-weight: 400;">of ${formatNumber(a.count)}</span></strong>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
