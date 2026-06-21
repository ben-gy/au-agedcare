import './styles.css';
import { DEFAULT_FILTERS, loadData, type AppState } from './state.ts';
import type { Service, ViewId } from './types.ts';
import { escapeHtml, debounce, STATE_ORDER, uniqueValues } from './utils.ts';
import { attachGlossaryHandlers, glossaryLink } from './glossaryTooltip.ts';
import { renderDirectory } from './views/directory.ts';
import { renderMap } from './views/map.ts';
import { renderLeaderboard } from './views/leaderboard.ts';
import { renderProviders } from './views/providers.ts';
import { renderCareMinutes } from './views/careMinutes.ts';
import { renderQualityMeasures } from './views/qualityMeasures.ts';
import { renderStates } from './views/states.ts';
import { renderInsights } from './views/insights.ts';
import { renderDetailPanel } from './views/detail.ts';

const VIEWS: { id: ViewId; label: string }[] = [
  { id: 'directory', label: 'Directory' },
  { id: 'map', label: 'Map' },
  { id: 'leaderboard', label: 'Leaderboards' },
  { id: 'providers', label: 'Providers' },
  { id: 'care-minutes', label: 'Care Minutes' },
  { id: 'quality-measures', label: 'Quality Measures' },
  { id: 'states', label: 'By State' },
  { id: 'insights', label: 'Insights' },
];

const root = document.getElementById('app')!;

async function bootstrap() {
  root.innerHTML = skeletonShell();

  try {
    const { services: servicesPayload, agg } = await loadData();
    const servicesBySlug = new Map<string, Service>();
    for (const s of servicesPayload.services) servicesBySlug.set(s.slug, s);

    const initialView = parseHashView() ?? loadPref<ViewId>('view') ?? 'directory';

    const state: AppState = {
      services: servicesPayload.services,
      servicesBySlug,
      agg,
      reportingPeriod: servicesPayload.reporting_period,
      generatedAt: servicesPayload.generated_at,
      sourceUrl: servicesPayload.source_url,
      filters: { ...DEFAULT_FILTERS, ...(loadPref('filters') as Partial<typeof DEFAULT_FILTERS> | null) },
      view: initialView,
      leaderboardMetric: (loadPref<AppState['leaderboardMetric']>('lbm') ?? 'overall'),
      sortField: (loadPref<AppState['sortField']>('sortField') ?? 'overall'),
      sortDir: (loadPref<AppState['sortDir']>('sortDir') ?? 'desc'),
      selectedSlug: null,
    };

    mountShell(state);
    attachGlossaryHandlers();
    handleHashOnLoad(state);

    window.addEventListener('hashchange', () => {
      const slug = parseHashService();
      if (slug && slug !== state.selectedSlug) openService(state, slug);
      else if (!slug && state.selectedSlug) closeDetail(state);
    });
  } catch (err) {
    console.warn('Failed to load data', err);
    root.innerHTML = `<div class="state-message">
      <h2 style="color: var(--accent-secondary)">Failed to load data</h2>
      <p>${escapeHtml((err as Error).message)}</p>
      <p>Refresh the page to try again.</p>
    </div>`;
  }
}

function skeletonShell(): string {
  return `
    <header class="site-header">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-mark">★</div>
          <div class="brand-text">
            <span class="brand-title">Aged Care Quality (AU)</span>
            <span class="brand-sub">Loading…</span>
          </div>
        </div>
      </div>
    </header>
    <main class="main-content">
      <div class="state-message">Loading aged care services…</div>
    </main>`;
}

function mountShell(state: AppState) {
  const purposes = uniqueValues(state.services, (s) => s.purpose).sort();
  const sizes = ['Small', 'Medium', 'Large'];
  const mmms = uniqueValues(state.services, (s) => s.mmm_code).sort();

  root.innerHTML = `
    <header class="site-header">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-mark">★</div>
          <div class="brand-text">
            <span class="brand-title">Aged Care Quality (AU)</span>
            <span class="brand-sub">${escapeHtml(state.reportingPeriod)} extract · ${state.services.length.toLocaleString()} services</span>
          </div>
        </div>
        <nav class="view-tabs" role="tablist">
          ${VIEWS.map(
            (v) => `<button class="view-tab ${v.id === state.view ? 'active' : ''}" data-view="${v.id}">${v.label}</button>`,
          ).join('')}
        </nav>
        <div class="header-actions">
          <button class="icon-btn" id="about-btn" title="About this site" aria-label="About">?</button>
        </div>
      </div>
    </header>
    <div class="filter-bar" id="filter-bar">
      <div class="filter-group">
        <label for="f-search">Search</label>
        <input type="search" id="f-search" placeholder="Service, provider, suburb…" value="${escapeHtml(state.filters.search)}" />
      </div>
      <div class="filter-group">
        <label for="f-state">State</label>
        <select id="f-state">
          <option value="ALL">All states</option>
          ${STATE_ORDER.map(
            (s) => `<option value="${s}" ${state.filters.state === s ? 'selected' : ''}>${s}</option>`,
          ).join('')}
        </select>
      </div>
      <div class="filter-group">
        <label for="f-min-rating">Min Overall ★</label>
        <select id="f-min-rating">
          ${[0, 1, 2, 3, 4, 5]
            .map(
              (v) => `<option value="${v}" ${state.filters.minRating === v ? 'selected' : ''}>${v === 0 ? 'Any' : v + '★'}</option>`,
            )
            .join('')}
        </select>
      </div>
      <div class="filter-group">
        <label for="f-size">Size</label>
        <select id="f-size">
          <option value="ALL" ${state.filters.size === 'ALL' ? 'selected' : ''}>Any size</option>
          ${sizes.map((s) => `<option value="${s}" ${state.filters.size === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="filter-group">
        <label for="f-purpose">Sector</label>
        <select id="f-purpose">
          <option value="ALL" ${state.filters.purpose === 'ALL' ? 'selected' : ''}>Any sector</option>
          ${purposes
            .map((p) => `<option value="${escapeHtml(String(p))}" ${state.filters.purpose === p ? 'selected' : ''}>${escapeHtml(String(p))}</option>`)
            .join('')}
        </select>
      </div>
      <div class="filter-group">
        <label for="f-mmm">Region</label>
        <select id="f-mmm">
          <option value="ALL" ${state.filters.mmm === 'ALL' ? 'selected' : ''}>All regions</option>
          ${mmms.map((m) => `<option value="${escapeHtml(String(m))}" ${state.filters.mmm === m ? 'selected' : ''}>${escapeHtml(String(m))}</option>`).join('')}
        </select>
      </div>
      <label class="filter-toggle ${state.filters.failingMinutesOnly ? 'active' : ''}" id="f-failing-label">
        <input type="checkbox" id="f-failing" ${state.filters.failingMinutesOnly ? 'checked' : ''} />
        Under care-minute target only
      </label>
      <button class="filter-reset" id="f-reset">Reset filters</button>
      <div class="filter-summary" id="filter-summary"></div>
    </div>
    <main class="main-content" id="main-content"></main>
    <footer class="site-footer">
      <div class="footer-inner">
        <div>
          Built by <a href="https://benrichardson.dev/">benrichardson.dev</a>
        </div>
        <div class="footer-meta">
          <span>Source: Department of Health, Disability and Ageing — Star Ratings ${escapeHtml(state.reportingPeriod)}</span>
          <span class="muted">Updated ${new Date(state.generatedAt).toLocaleDateString('en-AU')}</span>
        </div>
      </div>
    </footer>
    <div class="detail-overlay" id="detail-overlay" aria-hidden="true"></div>
    <aside class="detail-panel" id="detail-panel" role="dialog" aria-hidden="true" aria-label="Service detail"></aside>
    <div class="modal-overlay" id="about-overlay" aria-hidden="true">
      <div class="modal" role="dialog" aria-labelledby="about-title">
        <button class="modal-close" id="about-close" aria-label="Close">×</button>
        <h2 id="about-title">About Aged Care Quality (AU)</h2>
        <p>
          A searchable, comparable view of every government-funded residential aged care service in Australia.
          All data is from the official Department of Health Star Ratings quarterly extract — currently
          <strong>${escapeHtml(state.reportingPeriod)}</strong>, covering ${state.services.length.toLocaleString()} services.
        </p>
        <h3>What are ${glossaryLink('star-ratings', 'Star Ratings')}?</h3>
        <p>
          Every residential aged care home is graded out of 5 stars overall, plus four sub-ratings:
          ${glossaryLink('residents-experience', 'Residents\' Experience')},
          ${glossaryLink('compliance-rating', 'Compliance')},
          ${glossaryLink('staffing-rating', 'Staffing')}, and
          ${glossaryLink('quality-measures', 'Quality Measures')}.
          A 1-star rating means the home is significantly below expectations on that dimension; 5 stars means significantly above.
        </p>
        <h3>What's in here</h3>
        <ul>
          <li><strong>Directory</strong> — searchable, sortable table of every service</li>
          <li><strong>Map</strong> — every service plotted by suburb, colour-coded by Overall Rating</li>
          <li><strong>Leaderboards</strong> — top 25 and bottom 25 nationally, switchable by metric</li>
          <li><strong>Providers</strong> — multi-service operators compared dimension by dimension</li>
          <li><strong>Care Minutes</strong> — actual ${glossaryLink('care-minutes', 'care minutes')} vs the regulated target, per service</li>
          <li><strong>Quality Measures</strong> — heatmap of falls, pressure injuries, weight loss, antipsychotic use vs national medians</li>
          <li><strong>By State</strong> — distribution and averages for each jurisdiction</li>
          <li><strong>Insights</strong> — auto-detected patterns: worst performers, providers with widespread issues, statistical outliers</li>
        </ul>
        <h3>Data freshness</h3>
        <p>
          The Department of Health publishes a new extract roughly every quarter (February, May, August, November).
          A scheduled GitHub Action checks for new releases and refreshes the data automatically.
        </p>
        <h3>How to read the dots</h3>
        <p>
          Each rating cell is colour-coded:
          <span class="rating" data-r="5">5</span> excellent,
          <span class="rating" data-r="4">4</span> above expectations,
          <span class="rating" data-r="3">3</span> meets expectations,
          <span class="rating" data-r="2">2</span> improvement needed,
          <span class="rating" data-r="1">1</span> significant improvement needed.
        </p>
        <h3>Caveats</h3>
        <p>
          Ratings are a point-in-time snapshot; staffing, leadership, and quality can change quickly. Always pair this with a tour and conversations with residents and families. For the official front-end use
          <a href="https://www.myagedcare.gov.au/find-a-provider" target="_blank" rel="noopener">My Aged Care — Find a provider</a>.
        </p>
      </div>
    </div>
  `;

  attachShellHandlers(state);
  attachAboutModal();
  renderCurrentView(state);
}

function attachShellHandlers(state: AppState) {
  document.querySelectorAll<HTMLButtonElement>('.view-tab').forEach((b) => {
    b.addEventListener('click', () => switchView(state, b.dataset.view as ViewId));
  });

  const search = document.getElementById('f-search') as HTMLInputElement | null;
  if (search) {
    const handler = debounce((v: string) => {
      state.filters.search = v;
      savePref('filters', state.filters);
      renderCurrentView(state);
      updateFilterSummary(state);
    }, 200);
    search.addEventListener('input', () => handler(search.value));
  }

  const bindSelect = (id: string, key: keyof typeof state.filters) => {
    const el = document.getElementById(id) as HTMLSelectElement | null;
    if (!el) return;
    el.addEventListener('change', () => {
      (state.filters as unknown as Record<string, unknown>)[key] = key === 'minRating' ? Number(el.value) : el.value;
      savePref('filters', state.filters);
      renderCurrentView(state);
      updateFilterSummary(state);
    });
  };
  bindSelect('f-state', 'state');
  bindSelect('f-min-rating', 'minRating');
  bindSelect('f-size', 'size');
  bindSelect('f-purpose', 'purpose');
  bindSelect('f-mmm', 'mmm');

  const fail = document.getElementById('f-failing') as HTMLInputElement | null;
  if (fail) {
    fail.addEventListener('change', () => {
      state.filters.failingMinutesOnly = fail.checked;
      document.getElementById('f-failing-label')?.classList.toggle('active', fail.checked);
      savePref('filters', state.filters);
      renderCurrentView(state);
      updateFilterSummary(state);
    });
  }

  const reset = document.getElementById('f-reset');
  if (reset) {
    reset.addEventListener('click', () => {
      state.filters = { ...DEFAULT_FILTERS };
      savePref('filters', state.filters);
      mountShell(state);
    });
  }

  document.getElementById('detail-overlay')?.addEventListener('click', () => closeDetail(state));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.selectedSlug) closeDetail(state);
  });

  updateFilterSummary(state);
}

function attachAboutModal() {
  const overlay = document.getElementById('about-overlay');
  const btn = document.getElementById('about-btn');
  const close = document.getElementById('about-close');
  if (!overlay || !btn || !close) return;
  btn.addEventListener('click', () => overlay.classList.add('open'));
  close.addEventListener('click', () => overlay.classList.remove('open'));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
}

function updateFilterSummary(state: AppState) {
  const el = document.getElementById('filter-summary');
  if (!el) return;
  const total = state.services.length;
  const matching = state.services.filter((s) => {
    if (state.filters.state !== 'ALL' && s.state !== state.filters.state) return false;
    if (state.filters.size !== 'ALL' && s.size !== state.filters.size) return false;
    if (state.filters.purpose !== 'ALL' && s.purpose !== state.filters.purpose) return false;
    if (state.filters.mmm !== 'ALL' && s.mmm_code !== state.filters.mmm) return false;
    if (state.filters.minRating > 0 && (s.overall === null || s.overall < state.filters.minRating)) return false;
    if (state.filters.failingMinutesOnly) {
      const a = s.s.total_actual;
      const t = s.s.total_target;
      if (a === null || t === null || a >= t) return false;
    }
    if (state.filters.search) {
      const q = state.filters.search.trim().toLowerCase();
      const hay = `${s.name} ${s.provider} ${s.suburb} ${s.state} ${s.planning_region}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }).length;
  el.innerHTML = `<strong>${matching.toLocaleString()}</strong> of ${total.toLocaleString()} services match`;
}

function switchView(state: AppState, view: ViewId) {
  state.view = view;
  savePref('view', view);
  document.querySelectorAll<HTMLButtonElement>('.view-tab').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === view);
  });
  renderCurrentView(state);
}

function renderCurrentView(state: AppState) {
  const main = document.getElementById('main-content');
  if (!main) return;
  switch (state.view) {
    case 'directory':
      renderDirectory(
        main,
        state,
        (slug) => openService(state, slug),
        (field) => {
          if (state.sortField === field) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
          else {
            state.sortField = field;
            state.sortDir = field === 'name' || field === 'state' ? 'asc' : 'desc';
          }
          savePref('sortField', state.sortField);
          savePref('sortDir', state.sortDir);
          renderCurrentView(state);
        },
      );
      break;
    case 'map':
      renderMap(main, state, (slug) => openService(state, slug));
      break;
    case 'leaderboard':
      renderLeaderboard(
        main,
        state,
        (slug) => openService(state, slug),
        (m) => {
          state.leaderboardMetric = m;
          savePref('lbm', m);
          renderCurrentView(state);
        },
      );
      break;
    case 'providers':
      renderProviders(main, state, (provider) => {
        state.filters.search = provider;
        savePref('filters', state.filters);
        state.view = 'directory';
        savePref('view', 'directory');
        const tab = document.querySelector<HTMLButtonElement>(`.view-tab[data-view="directory"]`);
        tab?.click();
        const search = document.getElementById('f-search') as HTMLInputElement | null;
        if (search) search.value = provider;
      });
      break;
    case 'care-minutes':
      renderCareMinutes(main, state, (slug) => openService(state, slug));
      break;
    case 'quality-measures':
      renderQualityMeasures(main, state, (slug) => openService(state, slug));
      break;
    case 'states':
      renderStates(main, state);
      break;
    case 'insights':
      renderInsights(
        main,
        state,
        (slug) => openService(state, slug),
        (provider) => {
          state.filters.search = provider;
          savePref('filters', state.filters);
          state.view = 'directory';
          const tab = document.querySelector<HTMLButtonElement>(`.view-tab[data-view="directory"]`);
          tab?.click();
        },
      );
      break;
  }
}

function openService(state: AppState, slug: string) {
  const svc = state.servicesBySlug.get(slug);
  if (!svc) return;
  state.selectedSlug = slug;
  const panel = document.getElementById('detail-panel');
  const overlay = document.getElementById('detail-overlay');
  if (!panel || !overlay) return;
  panel.innerHTML = renderDetailPanel(state, svc);
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  panel.querySelector('.detail-close')?.addEventListener('click', () => closeDetail(state));
  if (location.hash !== `#service=${encodeURIComponent(slug)}`) {
    history.replaceState(null, '', `#service=${encodeURIComponent(slug)}`);
  }
}

function closeDetail(state: AppState) {
  state.selectedSlug = null;
  const panel = document.getElementById('detail-panel');
  const overlay = document.getElementById('detail-overlay');
  if (panel) {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
  }
  if (overlay) {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
  }
  if (location.hash.startsWith('#service=')) history.replaceState(null, '', location.pathname);
}

function handleHashOnLoad(state: AppState) {
  const slug = parseHashService();
  if (slug) openService(state, slug);
}

function parseHashView(): ViewId | null {
  const m = location.hash.match(/view=([\w-]+)/);
  if (!m) return null;
  const v = m[1] as ViewId;
  return VIEWS.some((x) => x.id === v) ? v : null;
}

function parseHashService(): string | null {
  const m = location.hash.match(/service=([^&]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return null;
  }
}

function savePref(key: string, value: unknown) {
  try {
    localStorage.setItem(`au-agedcare:${key}`, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function loadPref<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`au-agedcare:${key}`);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

bootstrap();
