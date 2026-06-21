import L from 'leaflet';
import type { AppState } from '../state.ts';
import { applyFilters, escapeHtml, ratingColor } from '../utils.ts';
import { glossaryLink } from '../glossaryTooltip.ts';

let mapInstance: L.Map | null = null;
let layer: L.LayerGroup | null = null;

export function renderMap(root: HTMLElement, state: AppState, onOpenService: (slug: string) => void): void {
  root.innerHTML = `
    <h1 class="view-title">Map</h1>
    <p class="view-subtitle">
      Every residential aged care service plotted by suburb centroid. Marker colour = ${glossaryLink('star-ratings', 'Overall Star Rating')}. Click a marker for details.
    </p>
    <div class="map-legend">
      <strong>Overall Rating:</strong>
      <span class="legend-swatch"><span class="swatch" style="background:#3a7d44"></span> 5</span>
      <span class="legend-swatch"><span class="swatch" style="background:#7bb377"></span> 4</span>
      <span class="legend-swatch"><span class="swatch" style="background:#d8b65b"></span> 3</span>
      <span class="legend-swatch"><span class="swatch" style="background:#c97a1a"></span> 2</span>
      <span class="legend-swatch"><span class="swatch" style="background:#a3372b"></span> 1</span>
      <span class="legend-swatch"><span class="swatch" style="background:#b5bdbf"></span> N/A</span>
    </div>
    <div class="map-container" id="aged-care-map" role="application" aria-label="Map of Australian residential aged care services"></div>
  `;

  // Defer map init so the container has dimensions. setTimeout (not requestAnimationFrame)
  // so a backgrounded tab still initialises the map.
  setTimeout(() => initMap(state, onOpenService), 0);
}

function initMap(state: AppState, onOpenService: (slug: string) => void) {
  const el = document.getElementById('aged-care-map');
  if (!el) return;
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
  mapInstance = L.map(el, {
    minZoom: 3,
    maxZoom: 14,
    worldCopyJump: false,
  });
  mapInstance.setView([-26.5, 134], 4);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 18,
    subdomains: 'abcd',
  }).addTo(mapInstance);
  layer = L.layerGroup().addTo(mapInstance);
  paintMarkers(state, onOpenService);
}

function paintMarkers(state: AppState, onOpenService: (slug: string) => void) {
  if (!mapInstance || !layer) return;
  layer.clearLayers();
  const filtered = applyFilters(state.services, state.filters);

  // Jitter multiple homes at the same suburb so they don't perfectly overlap
  const counts = new Map<string, number>();
  for (const s of filtered) {
    if (s.lat === null || s.lng === null) continue;
    const k = `${s.lat.toFixed(3)}|${s.lng.toFixed(3)}`;
    const c = counts.get(k) ?? 0;
    counts.set(k, c + 1);
    const angle = (c * 137.508 * Math.PI) / 180;
    const r = c === 0 ? 0 : 0.012 + Math.log2(c + 1) * 0.006;
    const lat = s.lat + Math.sin(angle) * r;
    const lng = s.lng + Math.cos(angle) * r;

    const colour = ratingColor(s.overall);
    const marker = L.circleMarker([lat, lng], {
      radius: s.size === 'Large' ? 6 : s.size === 'Medium' ? 5 : 4,
      color: '#0f3859',
      weight: 1,
      fillColor: colour,
      fillOpacity: 0.85,
    });
    marker.bindPopup(
      `<strong style="color:#0f3859">${escapeHtml(s.name)}</strong><br>
       <span style="color:#466069">${escapeHtml(s.provider)}</span><br>
       <span>${escapeHtml(s.suburb)}, ${escapeHtml(s.state)}</span><br>
       <span style="color:#7a8e94">Overall: ${s.overall ?? '—'} · Staffing: ${s.staffing ?? '—'} · Compliance: ${s.compliance ?? '—'}</span><br>
       <a href="#service=${encodeURIComponent(s.slug)}" data-slug="${escapeHtml(s.slug)}" class="popup-link">View full detail →</a>`,
      { maxWidth: 280 },
    );
    marker.on('popupopen', (e) => {
      const popup = e.popup.getElement();
      if (!popup) return;
      const a = popup.querySelector<HTMLAnchorElement>('.popup-link');
      if (a) {
        a.addEventListener('click', (ev) => {
          ev.preventDefault();
          onOpenService(s.slug);
        });
      }
    });
    layer.addLayer(marker);
  }
}
