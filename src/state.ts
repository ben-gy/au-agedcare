import type { AggregatesPayload, Filters, Service, ServicesPayload, ViewId } from './types.ts';

export interface AppState {
  services: Service[];
  servicesBySlug: Map<string, Service>;
  agg: AggregatesPayload;
  reportingPeriod: string;
  generatedAt: string;
  sourceUrl: string;
  filters: Filters;
  view: ViewId;
  leaderboardMetric: 'overall' | 'residents_exp' | 'compliance' | 'staffing' | 'quality_measures';
  sortField: 'overall' | 'name' | 'state' | 'staffing' | 'compliance' | 'residents_exp' | 'quality_measures';
  sortDir: 'asc' | 'desc';
  selectedSlug: string | null;
}

export const DEFAULT_FILTERS: Filters = {
  state: 'ALL',
  search: '',
  minRating: 0,
  size: 'ALL',
  purpose: 'ALL',
  mmm: 'ALL',
  failingMinutesOnly: false,
};

export async function loadData(): Promise<{ services: ServicesPayload; agg: AggregatesPayload }> {
  const base = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL || '/';
  const dataBase = base.endsWith('/') ? base : base + '/';
  const [servicesRes, aggRes] = await Promise.all([
    fetch(`${dataBase}data/services.json`),
    fetch(`${dataBase}data/aggregates.json`),
  ]);
  if (!servicesRes.ok) throw new Error(`Failed to load services data (${servicesRes.status})`);
  if (!aggRes.ok) throw new Error(`Failed to load aggregates data (${aggRes.status})`);
  const [services, agg] = (await Promise.all([servicesRes.json(), aggRes.json()])) as [
    ServicesPayload,
    AggregatesPayload,
  ];
  return { services, agg };
}
