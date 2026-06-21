import type { AppState } from '../state.ts';
import type { Service } from '../types.ts';
import { applyFilters, escapeHtml, sortBy } from '../utils.ts';

const METRICS: { key: AppState['leaderboardMetric']; label: string }[] = [
  { key: 'overall', label: 'Overall' },
  { key: 'residents_exp', label: "Residents' Experience" },
  { key: 'compliance', label: 'Compliance' },
  { key: 'staffing', label: 'Staffing' },
  { key: 'quality_measures', label: 'Quality Measures' },
];

export function renderLeaderboard(
  root: HTMLElement,
  state: AppState,
  onOpenService: (slug: string) => void,
  onMetric: (m: AppState['leaderboardMetric']) => void,
): void {
  const services = applyFilters(state.services, state.filters);
  const metric = state.leaderboardMetric;
  const getter = (s: Service) => s[metric];

  const top = sortBy(services.filter((s) => getter(s) !== null), getter, 'desc').slice(0, 25);
  const bottom = sortBy(services.filter((s) => getter(s) !== null), getter, 'asc').slice(0, 25);

  root.innerHTML = `
    <h1 class="view-title">Leaderboards</h1>
    <p class="view-subtitle">
      Highest and lowest performers nationally on each rating dimension. Use the filter bar to scope to a state, suburb, sector, or size.
    </p>
    <div class="leaderboard-controls">
      ${METRICS.map(
        (m) => `<button class="metric-pill ${m.key === metric ? 'active' : ''}" data-metric="${m.key}">${escapeHtml(m.label)}</button>`,
      ).join('')}
    </div>
    <div class="leaderboard-grid">
      <div class="leaderboard-section panel">
        <h3>Top 25 — Highest ${escapeHtml(METRICS.find((m) => m.key === metric)?.label || metric)}</h3>
        ${renderRows(top, getter)}
      </div>
      <div class="leaderboard-section panel">
        <h3>Bottom 25 — Lowest ${escapeHtml(METRICS.find((m) => m.key === metric)?.label || metric)}</h3>
        ${renderRows(bottom, getter)}
      </div>
    </div>
  `;

  root.querySelectorAll<HTMLButtonElement>('.metric-pill').forEach((b) => {
    b.addEventListener('click', () => onMetric(b.dataset.metric as AppState['leaderboardMetric']));
  });
  root.querySelectorAll<HTMLElement>('.leader-name').forEach((a) => {
    a.addEventListener('click', () => onOpenService(a.dataset.slug || ''));
  });
}

function renderRows(services: Service[], getter: (s: Service) => number | null): string {
  return services
    .map(
      (s, i) => `
      <div class="leader-row">
        <span class="leader-rank">${i + 1}</span>
        <div>
          <span class="leader-name" data-slug="${escapeHtml(s.slug)}">${escapeHtml(s.name)}</span>
          <div class="leader-sub">${escapeHtml(s.suburb)}, ${escapeHtml(s.state)} · ${escapeHtml(s.provider)}</div>
        </div>
        <span class="rating" data-r="${getter(s) ?? 0}">${getter(s) ?? '–'}</span>
      </div>
    `,
    )
    .join('');
}
