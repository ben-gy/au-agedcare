import type { AppState } from '../state.ts';
import type { Service } from '../types.ts';
import { applyFilters, escapeHtml, formatNumber, sortBy } from '../utils.ts';
import { glossaryLink } from '../glossaryTooltip.ts';

type SortKey = AppState['sortField'];

const COLUMNS: { key: SortKey; label: string; numeric: boolean; tooltip?: string }[] = [
  { key: 'name', label: 'Service', numeric: false },
  { key: 'state', label: 'State / Suburb', numeric: false },
  { key: 'overall', label: 'Overall', numeric: true, tooltip: 'star-ratings' },
  { key: 'residents_exp', label: 'Residents Exp.', numeric: true, tooltip: 'residents-experience' },
  { key: 'compliance', label: 'Compliance', numeric: true, tooltip: 'compliance-rating' },
  { key: 'staffing', label: 'Staffing', numeric: true, tooltip: 'staffing-rating' },
  { key: 'quality_measures', label: 'Quality M.', numeric: true, tooltip: 'quality-measures' },
];

function getSortField(s: Service, key: SortKey): number | string {
  if (key === 'name') return s.name.toLowerCase();
  if (key === 'state') return `${s.state}|${s.suburb}`;
  const v = s[key];
  return v === null || v === undefined ? -Infinity : v;
}

export function renderDirectory(
  root: HTMLElement,
  state: AppState,
  onOpenService: (slug: string) => void,
  onSort: (field: SortKey) => void,
): void {
  const filtered = applyFilters(state.services, state.filters);
  const sorted =
    state.sortField === 'name' || state.sortField === 'state'
      ? [...filtered].sort((a, b) => {
          const av = String(getSortField(a, state.sortField));
          const bv = String(getSortField(b, state.sortField));
          return state.sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        })
      : sortBy(filtered, (s) => getSortField(s, state.sortField) as number, state.sortDir);

  const cap = Math.min(sorted.length, 500);
  const rows = sorted.slice(0, cap);

  root.innerHTML = `
    <h1 class="view-title">Directory</h1>
    <p class="view-subtitle">
      Every government-funded residential aged care service in Australia, with ${glossaryLink('star-ratings', 'Star Ratings')} from the ${state.reportingPeriod} quarterly extract. Sort any column. Click a service for the full breakdown.
    </p>
    <div class="directory-wrap">
      <div class="directory-scroll">
        <table class="directory-table">
          <thead>
            <tr>
              ${COLUMNS.map((c) => {
                const sorted = state.sortField === c.key;
                const arrow = sorted ? (state.sortDir === 'asc' ? '↑' : '↓') : '';
                const tip = c.tooltip ? `<span class="glossary-link" data-term="${c.tooltip}"></span>` : '';
                return `<th data-key="${c.key}" class="${sorted ? 'sorted' : ''} ${c.numeric ? 'numeric' : ''}">${c.label} ${arrow}${tip}</th>`;
              }).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (s) => `
              <tr>
                <td><span class="service-link" data-slug="${escapeHtml(s.slug)}" data-tip="${escapeHtml(`${s.name} — click for full detail`)}">${escapeHtml(s.name)}</span><br><span class="muted">${escapeHtml(s.provider)} · ${escapeHtml(s.size)} · ${escapeHtml(s.purpose)}</span></td>
                <td>${escapeHtml(s.state)} · ${escapeHtml(s.suburb)}</td>
                ${ratingCell(s.overall, s.name, 'Overall')}
                ${ratingCell(s.residents_exp, s.name, "Residents' Experience")}
                ${ratingCell(s.compliance, s.name, 'Compliance')}
                ${ratingCell(s.staffing, s.name, 'Staffing')}
                ${ratingCell(s.quality_measures, s.name, 'Quality Measures')}
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
    <p class="muted" style="margin-top: 12px; font-size: var(--font-size-xs);">
      Showing ${formatNumber(rows.length)} of ${formatNumber(filtered.length)} matching services${
        filtered.length > cap ? ` (capped to ${cap} for performance — narrow your filters to see more)` : ''
      }.
    </p>
  `;

  root.querySelectorAll<HTMLElement>('th[data-key]').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.key as SortKey;
      onSort(key);
    });
  });
  root.querySelectorAll<HTMLElement>('.service-link').forEach((a) => {
    a.addEventListener('click', () => onOpenService(a.dataset.slug || ''));
  });
}

function ratingCell(r: number | null, name: string, dimension: string): string {
  if (r === null) {
    const tip = escapeHtml(`${name} — ${dimension}: no rating published`);
    return `<td class="numeric muted" data-tip="${tip}">–</td>`;
  }
  const tip = escapeHtml(`${name} — ${dimension}: ${r}★`);
  return `<td class="numeric" data-tip="${tip}"><span class="rating" data-r="${r}" aria-label="${tip}">${r}</span></td>`;
}
