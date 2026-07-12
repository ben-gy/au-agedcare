import type { Service, ResidentExpDist } from '../types.ts';
import type { AppState } from '../state.ts';
import { escapeHtml, formatNumber, formatPercent, formatStars, formatRating } from '../utils.ts';
import { glossaryLink } from '../glossaryTooltip.ts';

const RE_QUESTIONS: { key: keyof Service['re']; label: string }[] = [
  { key: 'food', label: 'I like the food here' },
  { key: 'safety', label: 'I feel safe here' },
  { key: 'operation', label: 'I am satisfied with how this place is run' },
  { key: 'care_need', label: 'I get the care I need' },
  { key: 'competent', label: 'Staff know what they are doing' },
  { key: 'independent', label: 'I am encouraged to do as much as possible for myself' },
  { key: 'explain', label: 'Staff explain things to me' },
  { key: 'respect', label: 'Staff treat me with respect' },
  { key: 'follow_up', label: 'Staff follow up when I raise things' },
  { key: 'caring', label: 'Staff are kind and caring' },
  { key: 'voice', label: 'I have a say in my daily activities' },
  { key: 'home', label: 'This place feels like home' },
];

const QM_LABELS: { key: keyof Service['qm']; label: string; gloss: string; goodIsLow: boolean }[] = [
  { key: 'pressure_injuries', label: 'Pressure injuries', gloss: 'pressure-injuries', goodIsLow: true },
  { key: 'restrictive_practices', label: 'Restrictive practices', gloss: 'restrictive-practices', goodIsLow: true },
  { key: 'weight_loss', label: 'Unplanned weight loss', gloss: 'weight-loss', goodIsLow: true },
  { key: 'falls', label: 'Falls', gloss: 'falls', goodIsLow: true },
  { key: 'falls_major', label: 'Major fall injury', gloss: 'falls-major', goodIsLow: true },
  { key: 'polypharmacy', label: 'Polypharmacy (9+ meds)', gloss: 'polypharmacy', goodIsLow: true },
  { key: 'antipsychotic', label: 'Antipsychotic use', gloss: 'antipsychotic', goodIsLow: true },
];

export function renderDetailPanel(state: AppState, service: Service): string {
  const median = state.agg.national.median_qm;

  return `
    <div class="detail-header">
      <button class="detail-close" aria-label="Close detail">×</button>
      <div class="detail-title">${escapeHtml(service.name)}</div>
      <div class="detail-subtitle">
        ${escapeHtml(service.provider)} · ${escapeHtml(service.suburb)}, ${escapeHtml(service.state)} · ${escapeHtml(service.size)} · ${escapeHtml(service.purpose)}
      </div>
    </div>
    <div class="detail-body">
      <div class="detail-section">
        <h4>${glossaryLink('star-ratings', 'Star Ratings')} — ${escapeHtml(service.reporting_period)}</h4>
        <div class="detail-ratings">
          ${ratingTile('Overall', service.overall)}
          ${ratingTile('Residents Exp.', service.residents_exp, 'residents-experience')}
          ${ratingTile('Compliance', service.compliance, 'compliance-rating')}
          ${ratingTile('Staffing', service.staffing, 'staffing-rating')}
          ${ratingTile('Quality M.', service.quality_measures, 'quality-measures')}
        </div>
      </div>

      <div class="detail-section">
        <h4>Service details</h4>
        <div class="detail-kvs">
          <div class="detail-kv"><div class="k">Planning region</div><div class="v">${escapeHtml(service.planning_region || '—')}</div></div>
          <div class="detail-kv"><div class="k">${glossaryLink('mmm', 'MMM region')}</div><div class="v">${escapeHtml(service.mmm_region || '—')} ${escapeHtml(service.mmm_code || '')}</div></div>
        </div>
      </div>

      <div class="detail-section">
        <h4>${glossaryLink('care-minutes', 'Care minutes')} — target vs actual</h4>
        <div class="cm-grid">
          ${careMinuteCard('Registered Nurse', service.s.rn_target, service.s.rn_actual)}
          ${careMinuteCard('Total care', service.s.total_target, service.s.total_actual)}
        </div>
      </div>

      <div class="detail-section">
        <h4>${glossaryLink('quality-measures', 'Quality measures')} — vs national median</h4>
        <div class="qm-list">
          ${QM_LABELS.map((m) => {
            const v = service.qm[m.key];
            const med = median[m.key] ?? null;
            let cls = '';
            let vs = '';
            if (v !== null && med !== null) {
              const diff = v - med;
              const better = m.goodIsLow ? diff < 0 : diff > 0;
              cls = better ? 'good' : diff !== 0 ? 'bad' : '';
              vs = `${diff > 0 ? '+' : ''}${diff.toFixed(1)} vs national`;
            }
            return `
              <div class="qm-row">
                <div class="qm-label">${glossaryLink(m.gloss, m.label)}</div>
                <div class="qm-val">${formatPercent(v, 1)}</div>
                <div class="qm-vs ${cls}">${vs || '—'}</div>
              </div>`;
          }).join('')}
        </div>
      </div>

      <div class="detail-section">
        <h4>${glossaryLink('residents-experience', "Residents' Experience")} survey — ${service.re.interview_year ?? 'last interview'}</h4>
        ${
          service.re.food
            ? RE_QUESTIONS.map((q) => {
                const d = service.re[q.key] as ResidentExpDist | null;
                if (!d) return '';
                return reBar(q.label, d);
              }).join('') +
              `<div class="re-legend">
                <span class="lg-always">Always</span>
                <span class="lg-most">Most of the time</span>
                <span class="lg-some">Some of the time</span>
                <span class="lg-never">Never</span>
              </div>`
            : `<p class="muted">No resident interviews on file for this reporting period.</p>`
        }
      </div>

      <div class="detail-section">
        <h4>Compliance — Aged Care Quality Standards</h4>
        <div class="standards-grid">
          ${standardRow('Standard 1: The individual', service.c.standards.s1)}
          ${standardRow('Standard 2: The organisation', service.c.standards.s2)}
          ${standardRow('Standard 3: The care and services', service.c.standards.s3)}
          ${standardRow('Standard 4: The environment', service.c.standards.s4)}
          ${standardRow('Standard 5: Clinical care', service.c.standards.s5)}
          ${standardRow('Standard 6: Food and nutrition', service.c.standards.s6)}
          ${standardRow('Standard 7: The residential community', service.c.standards.s7)}
        </div>
        ${
          service.c.decision_type
            ? `<p class="muted" style="margin-top: 8px; font-size: var(--font-size-xs);">Last decision: ${escapeHtml(service.c.decision_type)} (${escapeHtml(service.c.decision_applied || '')})</p>`
            : ''
        }
      </div>

      <div class="detail-section">
        <h4>Source</h4>
        <p class="muted" style="font-size: var(--font-size-sm);">
          Department of Health, Disability and Ageing — Star Ratings quarterly data extract, ${escapeHtml(service.reporting_period)}.
        </p>
      </div>
    </div>
  `;
}

function ratingTile(label: string, v: number | null, gloss?: string): string {
  const r = v ?? 0;
  const tip = escapeHtml(v === null ? `${label}: no rating published` : `${label}: ${v} out of 5 stars`);
  return `
    <div class="detail-rating">
      <div class="label">${gloss ? glossaryLink(gloss, label) : escapeHtml(label)}</div>
      <div class="value" style="color: var(--rating-${r})" data-tip="${tip}">${v ?? '—'}</div>
      <div class="stars" data-tip="${tip}" aria-label="${tip}">${formatStars(v)}</div>
    </div>`;
}

function reBar(label: string, d: ResidentExpDist): string {
  const total = (d.always ?? 0) + (d.most ?? 0) + (d.some ?? 0) + (d.never ?? 0);
  const seg = (v: number | null) => (total ? ((v ?? 0) / total) * 100 : 0);
  const positive = ((d.always ?? 0) + (d.most ?? 0));
  const tip = (answer: string, v: number | null) => escapeHtml(`"${label}" — ${answer}: ${v ?? 0}% of residents`);
  return `
    <div class="re-question">
      <div class="re-label">
        <span>${escapeHtml(label)}</span>
        <span class="muted">${total ? `${positive}% positive` : '—'}</span>
      </div>
      <div class="re-bar">
        <div class="re-seg always" style="width:${seg(d.always)}%" data-tip="${tip('Always', d.always)}" aria-label="${tip('Always', d.always)}"></div>
        <div class="re-seg most" style="width:${seg(d.most)}%" data-tip="${tip('Most of the time', d.most)}" aria-label="${tip('Most of the time', d.most)}"></div>
        <div class="re-seg some" style="width:${seg(d.some)}%" data-tip="${tip('Some of the time', d.some)}" aria-label="${tip('Some of the time', d.some)}"></div>
        <div class="re-seg never" style="width:${seg(d.never)}%" data-tip="${tip('Never', d.never)}" aria-label="${tip('Never', d.never)}"></div>
      </div>
    </div>`;
}

function careMinuteCard(label: string, target: number | null, actual: number | null): string {
  if (target === null || actual === null) {
    return `
      <div class="cm-card">
        <div class="cm-title">${escapeHtml(label)}</div>
        <div class="cm-value muted">—</div>
        <div class="cm-gap muted">No data</div>
      </div>`;
  }
  const gap = actual - target;
  const fillPct = Math.min(100, (actual / target) * 100);
  const cls = gap < 0 ? 'under' : 'over';
  const tip = escapeHtml(
    `${label}: ${formatNumber(actual, 1)} of ${formatNumber(target, 1)} target min/day (${gap >= 0 ? '+' : ''}${formatNumber(gap, 1)}, ${formatNumber((actual / target) * 100, 0)}% of target)`,
  );
  return `
    <div class="cm-card">
      <div class="cm-title">${escapeHtml(label)} — actual</div>
      <div class="cm-value">${formatNumber(actual, 1)}<span class="muted" style="font-size: var(--font-size-sm); font-weight: 400;"> min/day</span></div>
      <div class="cm-bar" data-tip="${tip}" aria-label="${tip}"><div class="cm-bar-fill ${cls}" style="width:${fillPct}%"></div></div>
      <div class="cm-gap ${cls}">${gap >= 0 ? '+' : ''}${formatNumber(gap, 1)} vs ${formatNumber(target, 1)} target</div>
    </div>`;
}

function standardRow(label: string, value: string): string {
  const v = (value || '').trim();
  let cls = '';
  if (/non[- ]?compliant|not met/i.test(v)) cls = 'non-compliant';
  else if (/compliant|met/i.test(v)) cls = 'compliant';
  return `
    <div class="standard-row">
      <span>${escapeHtml(label)}</span>
      <span class="status ${cls}">${escapeHtml(v || '—')}</span>
    </div>`;
}

// Keep eslint/ts happy if formatRating is removed
export const _unused = formatRating;
