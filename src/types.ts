// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
export interface ResidentExpDist {
  always: number | null;
  most: number | null;
  some: number | null;
  never: number | null;
}

export interface Service {
  slug: string;
  name: string;
  provider: string;
  suburb: string;
  state: string;
  reporting_period: string;
  purpose: string;
  planning_region: string;
  mmm_region: string;
  mmm_code: string;
  size: string;
  overall: number | null;
  residents_exp: number | null;
  compliance: number | null;
  staffing: number | null;
  quality_measures: number | null;
  lat: number | null;
  lng: number | null;
  re: {
    interview_year: number | null;
    food: ResidentExpDist | null;
    safety: ResidentExpDist | null;
    operation: ResidentExpDist | null;
    care_need: ResidentExpDist | null;
    competent: ResidentExpDist | null;
    independent: ResidentExpDist | null;
    explain: ResidentExpDist | null;
    respect: ResidentExpDist | null;
    follow_up: ResidentExpDist | null;
    caring: ResidentExpDist | null;
    voice: ResidentExpDist | null;
    home: ResidentExpDist | null;
  };
  c: {
    decision_type: string;
    decision_applied: string;
    decision_ends: string;
    reason: string;
    audit_closed: string;
    standards: {
      s1: string;
      s2: string;
      s3: string;
      s4: string;
      s5: string;
      s6: string;
      s7: string;
    };
  };
  s: {
    rn_target: number | null;
    rn_actual: number | null;
    total_target: number | null;
    total_actual: number | null;
  };
  qm: {
    pressure_injuries: number | null;
    restrictive_practices: number | null;
    weight_loss: number | null;
    falls: number | null;
    falls_major: number | null;
    polypharmacy: number | null;
    antipsychotic: number | null;
  };
}

export interface ServicesPayload {
  source: string;
  source_url: string;
  generated_at: string;
  reporting_period: string;
  count: number;
  services: Service[];
}

export interface StateAgg {
  count: number;
  avg_overall: number | null;
  avg_residents_exp: number | null;
  avg_compliance: number | null;
  avg_staffing: number | null;
  avg_quality: number | null;
  dist_overall: Record<string, number>;
  failing_rn_minutes: number;
  failing_total_minutes: number;
}

export interface ProviderAgg {
  name: string;
  count: number;
  avg_overall: number | null;
  avg_residents_exp: number | null;
  avg_compliance: number | null;
  avg_staffing: number | null;
  avg_quality: number | null;
  low_count: number;
  high_count: number;
  states: string[];
}

export interface InsightItem {
  slug?: string;
  name?: string;
  state?: string;
  suburb?: string;
  actual?: number;
  target?: number;
  gap?: number;
  flags?: string[];
  low_count?: number;
  total?: number;
}

export interface Insight {
  id: string;
  severity: 'info' | 'warn' | 'alert';
  title: string;
  detail: string;
  items: InsightItem[];
}

export interface AggregatesPayload {
  generated_at: string;
  reporting_period: string;
  source_url: string;
  national: {
    count: number;
    avg_overall: number | null;
    median_overall: number | null;
    dist_overall: Record<string, number>;
    dist_residents_exp: Record<string, number>;
    dist_compliance: Record<string, number>;
    dist_staffing: Record<string, number>;
    dist_quality: Record<string, number>;
    median_qm: Record<string, number | null>;
    stddev_qm: Record<string, number | null>;
    purpose_dist: Record<string, number>;
    size_dist: Record<string, number>;
    mmm_dist: Record<string, number>;
  };
  byState: Record<string, StateAgg>;
  providers: ProviderAgg[];
  total_provider_count: number;
  insights: Insight[];
}

export type ViewId =
  | 'directory'
  | 'map'
  | 'leaderboard'
  | 'providers'
  | 'care-minutes'
  | 'quality-measures'
  | 'states'
  | 'insights';

export interface Filters {
  state: string;
  search: string;
  minRating: number;
  size: string;
  purpose: string;
  mmm: string;
  failingMinutesOnly: boolean;
}
