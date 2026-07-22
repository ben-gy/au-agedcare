// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import { GLOSSARY } from './glossary.ts';
import { escapeHtml } from './utils.ts';

let tooltipEl: HTMLDivElement | null = null;
let currentTerm: string | null = null;

function ensure(): HTMLDivElement {
  if (tooltipEl) return tooltipEl;
  const el = document.createElement('div');
  el.className = 'glossary-tooltip';
  document.body.appendChild(el);
  tooltipEl = el;
  return el;
}

function hide() {
  ensure().classList.remove('open');
  currentTerm = null;
}

function show(term: string, target: HTMLElement) {
  const entry = GLOSSARY[term];
  if (!entry) return;
  const el = ensure();
  el.innerHTML = `<strong>${escapeHtml(entry.term)}</strong>${escapeHtml(entry.short)}<p>${escapeHtml(entry.long)}</p>`;
  el.classList.add('open');
  const r = target.getBoundingClientRect();
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  let left = r.left;
  let top = r.bottom + 6;
  if (left + w > window.innerWidth - 16) left = window.innerWidth - w - 16;
  if (top + h > window.innerHeight - 16) top = r.top - h - 6;
  el.style.left = `${Math.max(8, left)}px`;
  el.style.top = `${Math.max(8, top)}px`;
  currentTerm = term;
}

export function attachGlossaryHandlers() {
  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement | null;
    if (!t) return;
    const link = t.closest<HTMLElement>('.glossary-link');
    if (link) {
      const term = link.dataset.term;
      if (!term) return;
      if (currentTerm === term) {
        hide();
      } else {
        show(term, link);
      }
      e.stopPropagation();
      return;
    }
    if (currentTerm) hide();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && currentTerm) hide();
  });
}

export function glossaryLink(term: string, label?: string): string {
  const entry = GLOSSARY[term];
  if (!entry) return escapeHtml(label || term);
  return `<span class="glossary-link" data-term="${escapeHtml(term)}">${escapeHtml(label || entry.term)}</span>`;
}
