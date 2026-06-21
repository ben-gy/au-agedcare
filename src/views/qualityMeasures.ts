import type { AppState } from '../state.ts';
import type { Service } from '../types.ts';
import { applyFilters, escapeHtml, formatPercent, sortBy } from '../utils.ts';
import { glossaryLink } from '../glossaryTooltip.ts';

const MEASURES: { key: keyof Service['qm']; label: string; gloss: string }[] = [
  { key: 'pressure_injuries', label: 'Pressure injuries', gloss: 'pressure-injuries' },
  { key: 'restrictive_practices', label: 'Restrictive practices', gloss: 'restrictive-practices' },
  { key: 'weight_loss', label: 'Weight loss', gloss: 'weight-loss' },
  { key: 'falls', label: 'Falls', gloss: 'falls' },
  { key: 'falls_major', label: 'Major fall injury', gloss: 'falls-major' },
  { key: 'polypharmacy', label: 'Polypharmacy', gloss: 'polypharmacy' },
  { key: 'antipsychotic', label: 'Antipsychotic use', gloss: 'antipsychotic' },
];

function intensity(v: number | null, median: number | null, stddev: number | null): string {
  if (v === null || median === null || stddev === null || stddev === 0) return 'rgba(0,0,0,0)';
  const z = (v - median) / stddev;
  if (z > 1.5) return 'rgba(163, 55, 43, 0.55)';
  if (z > 0.5) return 'rgba(201, 122, 26, 0.4)';
  if (z > -0.5) return 'rgba(216, 182, 91, 0.3)';
  if (z > -1.5) return 'rgba(123, 179, 119, 0.4)';
  return 'rgba(58, 125, 68, 0.55)';
}

export function renderQualityMeasures(
  root: HTMLElement,
  state: AppState,
  onOpenService: (slug: string) => void,
): void {
  const services = applyFilters(state.services, state.filters).filter((s) =>
    MEASURES.some((m) => s.qm[m.key] !== null),
  );
  const median = state.agg.national.median_qm;
  const stddev = state.agg.national.stddev_qm;

  // Sort by quality measures rating (worst first - more interesting view)
  const sorted = sortBy(services, (s) => s.quality_measures, 'asc');
  const cap = Math.min(sorted.length, 200);
  const rows = sorted.slice(0, cap);

  root.innerHTML = `
    <h1 class="view-title">Quality measures heatmap</h1>
    <p class="view-subtitle">
      For each service, the rate of pressure injuries, restrictive practices, weight loss, falls, major fall injuries, polypharmacy, and antipsychotic use, colour-coded against the national median.
      Red = significantly above median (more events than typical); green = significantly below median.
    </p>
    <div class="map-legend" style="margin-bottom: 12px;">
      <strong>Vs national median:</strong>
      <span class="legend-swatch"><span class="swatch" style="background:rgba(58, 125, 68, 0.55)"></span> Much better</span>
      <span class="legend-swatch"><span class="swatch" style="background:rgba(123, 179, 119, 0.4)"></span> Better</span>
      <span class="legend-swatch"><span class="swatch" style="background:rgba(216, 182, 91, 0.3)"></span> About average</span>
      <span class="legend-swatch"><span class="swatch" style="background:rgba(201, 122, 26, 0.4)"></span> Worse</span>
      <span class="legend-swatch"><span class="swatch" style="background:rgba(163, 55, 43, 0.55)"></span> Much worse</span>
    </div>
    <div class="qm-table">
      <div class="qm-scroll">
        <div class="qm-grid">
          <div class="qm-head">Service</div>
          ${MEASURES.map((m) => `<div class="qm-head"><span class="glossary-link" data-term="${m.gloss}">${escapeHtml(m.label)}</span></div>`).join('')}
          ${rows
            .map(
              (s) => `
            <div class="qm-cell qm-name" data-slug="${escapeHtml(s.slug)}">
              ${escapeHtml(s.name)}
              <div class="muted" style="font-size: var(--font-size-xs); font-weight: 400;">${escapeHtml(s.suburb)}, ${escapeHtml(s.state)}</div>
            </div>
            ${MEASURES.map((m) => {
              const v = s.qm[m.key];
              const bg = intensity(v, median[m.key] ?? null, stddev[m.key] ?? null);
              return `<div class="qm-cell qm-value" style="background:${bg}">${formatPercent(v, 1)}</div>`;
            }).join('')}
          `,
            )
            .join('')}
        </div>
      </div>
    </div>
    <p class="muted" style="margin-top: 12px; font-size: var(--font-size-xs);">
      Showing ${rows.length} of ${services.length} services with quality measures data, sorted by ${glossaryLink('quality-measures', 'Quality Measures rating')} (worst first).
      ${services.length > cap ? ` Capped to ${cap} for performance.` : ''}
    </p>
  `;

  root.querySelectorAll<HTMLElement>('.qm-name').forEach((c) => {
    c.addEventListener('click', () => onOpenService(c.dataset.slug || ''));
  });
}
