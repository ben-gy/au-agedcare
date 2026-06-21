import type { AppState } from '../state.ts';
import { applyFilters, escapeHtml, formatNumber, ratingColor } from '../utils.ts';
import { glossaryLink } from '../glossaryTooltip.ts';

export function renderCareMinutes(
  root: HTMLElement,
  state: AppState,
  onOpenService: (slug: string) => void,
): void {
  const services = applyFilters(state.services, state.filters).filter(
    (s) => s.s.total_actual !== null && s.s.total_target !== null,
  );

  const W = 900;
  const H = 540;
  const M = { top: 30, right: 24, bottom: 60, left: 70 };
  const innerW = W - M.left - M.right;
  const innerH = H - M.top - M.bottom;
  let minVal = Infinity;
  let maxVal = -Infinity;
  for (const s of services) {
    const a = s.s.total_actual!;
    const t = s.s.total_target!;
    minVal = Math.min(minVal, a, t);
    maxVal = Math.max(maxVal, a, t);
  }
  if (!Number.isFinite(minVal)) {
    minVal = 0;
    maxVal = 300;
  }
  minVal = Math.max(0, Math.floor(minVal / 20) * 20 - 20);
  maxVal = Math.ceil(maxVal / 20) * 20 + 20;

  const sx = (v: number) => M.left + ((v - minVal) / (maxVal - minVal)) * innerW;
  const sy = (v: number) => M.top + innerH - ((v - minVal) / (maxVal - minVal)) * innerH;

  const ticks: number[] = [];
  const step = (maxVal - minVal) / 5;
  for (let i = 0; i <= 5; i++) ticks.push(Math.round(minVal + i * step));

  const under = services.filter((s) => s.s.total_actual! < s.s.total_target!).length;
  const over = services.filter((s) => s.s.total_actual! >= s.s.total_target!).length;

  root.innerHTML = `
    <h1 class="view-title">Care minutes — actual vs target</h1>
    <p class="view-subtitle">
      Each dot is one service. The x-axis is the regulated total ${glossaryLink('care-minutes', 'care minutes')} target per resident per day; the y-axis is what they actually delivered last quarter. Dots above the diagonal beat their target; dots below fall short.
    </p>
    <div class="leaderboard-controls">
      <span class="metric-pill active">${formatNumber(services.length)} services with data</span>
      <span class="metric-pill" style="background:#e9efef;color:#a3372b">${formatNumber(under)} under target</span>
      <span class="metric-pill" style="background:#e9efef;color:#3a7d44">${formatNumber(over)} at or over target</span>
    </div>
    <div class="scatter-wrap">
      <svg class="scatter-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-label="Scatter plot of care minutes target vs actual">
        <!-- gridlines -->
        ${ticks
          .map(
            (t) => `
            <line x1="${sx(t)}" x2="${sx(t)}" y1="${M.top}" y2="${M.top + innerH}" stroke="#e2e9ea" stroke-width="1"/>
            <line x1="${M.left}" x2="${M.left + innerW}" y1="${sy(t)}" y2="${sy(t)}" stroke="#e2e9ea" stroke-width="1"/>
            <text x="${sx(t)}" y="${M.top + innerH + 18}" text-anchor="middle" fill="#7a8e94" font-size="11">${t}</text>
            <text x="${M.left - 8}" y="${sy(t) + 4}" text-anchor="end" fill="#7a8e94" font-size="11">${t}</text>
          `,
          )
          .join('')}
        <!-- diagonal -->
        <line x1="${sx(minVal)}" y1="${sy(minVal)}" x2="${sx(maxVal)}" y2="${sy(maxVal)}" stroke="#0f3859" stroke-dasharray="4 4" stroke-width="1.5"/>
        <text x="${sx(maxVal) - 4}" y="${sy(maxVal) + 14}" text-anchor="end" fill="#0f3859" font-size="11" font-weight="600">Target = Actual</text>
        <!-- axis labels -->
        <text x="${M.left + innerW / 2}" y="${H - 16}" text-anchor="middle" fill="#0a1f2c" font-size="13" font-weight="600">Target care minutes per resident per day</text>
        <text transform="translate(${M.left - 50}, ${M.top + innerH / 2}) rotate(-90)" text-anchor="middle" fill="#0a1f2c" font-size="13" font-weight="600">Actual care minutes delivered</text>
        <!-- dots -->
        ${services
          .map((s) => {
            const cx = sx(s.s.total_target!);
            const cy = sy(s.s.total_actual!);
            const fill = ratingColor(s.staffing);
            return `<circle class="scatter-dot" cx="${cx}" cy="${cy}" r="3.5" fill="${fill}" fill-opacity="0.7" stroke="#fff" stroke-width="0.5" data-slug="${escapeHtml(s.slug)}"><title>${escapeHtml(s.name)} — target ${s.s.total_target}, actual ${s.s.total_actual} (${escapeHtml(s.state)})</title></circle>`;
          })
          .join('')}
      </svg>
    </div>
    <p class="muted" style="margin-top: 12px;">
      Dot colour = the service's Staffing Star Rating (green = 5, red = 1).
    </p>
  `;

  root.querySelectorAll<SVGCircleElement>('.scatter-dot').forEach((dot) => {
    dot.addEventListener('click', () => onOpenService(dot.dataset.slug || ''));
  });
}
