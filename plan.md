# Site Plan: Aged Care Quality (AU)

## Overview
- **Name:** Aged Care Quality (AU)
- **Repo name:** au-agedcare
- **Tagline:** Search and compare every Australian residential aged care home — star ratings, staffing levels, resident surveys, and quality measures from official government data.

## Target Audience
Adult children and partners of older Australians who need residential aged care soon (or are already there) — usually a stressful, time-pressured search. Plus journalists, researchers, and policy people who want to slice the official Star Ratings dataset without wrangling a 1.7 MB government spreadsheet themselves.

## Value Proposition
- See *every* aged care home in one place — searchable by suburb, provider, state, or name — with the full Star Rating breakdown
- Compare homes on the things that matter: resident-experience survey results, actual vs target care minutes, quality-measure rates (falls, pressure injuries, weight loss, restrictive practices, polypharmacy, antipsychotic use)
- Spot patterns the official "Find a provider" tool hides: which providers run multiple low-rated homes, which states under-perform on staffing, which regions are quality black-spots
- See the map at a glance — Leaflet + suburb centroids, every home colour-coded by overall star rating
- All the data is from the Department of Health & AIHW GEN quarterly extract — no spin, no marketing copy

## Data Sources
| Source | URL | What it provides | Update frequency | Auth required? |
|--------|-----|-------------------|-----------------|----------------|
| Department of Health — Star Ratings quarterly extract (May 2026) | https://www.health.gov.au/resources/publications/star-ratings-quarterly-data-extract-may-2026 | XLSX with 2,596 services × 87 columns: overall + 4 sub-ratings, resident experience surveys, care minutes target vs actual, compliance standards, quality measure rates | Quarterly | No |
| AIHW GEN aged care data series | https://www.gen-agedcaredata.gov.au/resources/series | Index of all historical quarterly extracts (May 2023 → present) | Quarterly | No |
| Matthew Proctor — Australian Postcodes | https://github.com/matthewproctor/australianpostcodes | Suburb + state → lat/lng centroids, used to put each service on the map | Versioned | No |

## Key Features
1. **Full searchable directory** — every one of 2,596 services, filter by state, suburb, provider, star rating, size, sector (For Profit / Not for Profit / Government), MMM rurality
2. **Map view** — Leaflet map of all services, marker colour = overall star rating, click for full detail card
3. **National & state leaderboards** — top/bottom services by overall rating, by Residents' Experience, by Staffing, by Quality Measures
4. **Provider analysis** — top 40 providers by service count with average star rating per dimension; rapidly spot providers that under-perform across multiple homes
5. **Care minutes scatter** — actual care minutes vs the regulated target, per service, RN minutes vs total minutes; immediately shows who is staffing below target
6. **Quality measures heatmap** — services × measure (pressure injuries, restrictive practices, weight loss, falls, polypharmacy, antipsychotic), colour-coded vs national median
7. **Service detail panel** — click any service from any view to see the full 87-column breakdown laid out cleanly: every resident-experience question, all 7 compliance standards, care minutes target vs actual, all 7 quality measures, and reporting period
8. **Auto-generated insights** — failures of care minute targets, providers with ≥3 services rated 1–2 stars, suburbs concentrated with poor performers, quality measures more than 1 standard deviation off the national median
9. **State distribution charts** — small-multiples of star-rating histograms per state/territory, instantly showing each state's mix of good and bad homes
10. **Drill-down by URL hash** — `#service=slug` opens that home's detail card directly; shareable links

## Target Audience (detailed)
Two distinct groups:
- **Primary — Families in stress mode:** an adult son or daughter at the kitchen table with a laptop after a parent's hospital discharge meeting, googling "aged care near me" while a partner phones siblings. Mid-40s to 60s, mid-tech-comfort, wants clean answers and trustworthy data, not a sales brochure. Likely on desktop, sometimes phone.
- **Secondary — Journalists, advocacy groups, policy researchers:** want to compare providers, find scandalously low ratings, or slice the data by region or sector. Desktop, high tech-fluency, will use the leaderboard and matrix views.

Both groups need the data to feel *official* and *honest* — not gamified, not flashy. Calm, clinical, factual.

## Style Direction
**Tone:** calm, clinical, trustworthy — like a high-quality public-health information site.
**Colour palette:** light background (#f7faf9), navy headers (#0f3859), teal accent (#0e7c7b), soft sage for good outcomes (#3a7d44), warm amber for caution (#c97a1a), muted brick for problems (#a3372b). Avoids both consumer-app cheerfulness and dark hacker aesthetic; reads like a state public-health portal.
**UI density:** balanced — enough whitespace not to feel like a spreadsheet, but data-rich enough that a researcher can scan a leaderboard quickly.
**Dark/light theme:** light — this audience associates dark with consumer/entertainment apps; a light, clinical look signals official information.
**Reference sites for tone:** myagedcare.gov.au (audience match, but cleaner), Our World in Data (data-density inspiration but lighter on chrome).

## Technical Architecture
- **Stack:** Vanilla TypeScript + Vite
- **Data strategy:** pipeline — Node script downloads the official XLSX once, joins suburb centroids, computes aggregates, writes `public/data/services.json` (full detail) + `public/data/aggregates.json` (state/provider summaries) + `public/data/insights.json`. GitHub Actions cron runs monthly to pull any new quarterly extract.
- **Key libraries:** Leaflet (map), xlsx (pipeline only, server-side parsing). No chart library — all charts hand-rolled SVG.

## Layout
- Fixed header (56px): title left, view tabs centre, About (?) button + search box right
- Below header: persistent filter bar (state, suburb autocomplete, rating threshold, sector, size, "only homes failing care minutes")
- Main content area: switches per tab (Directory / Map / Leaderboards / Providers / Care Minutes / Quality Measures / States / Insights)
- Sticky footer with attribution + data freshness date + glossary link
- Service detail panel slides in from the right (45% width on desktop, full-screen modal on mobile)
- Responsive: filter bar wraps below 900px, panels stack below 768px, map fills viewport on mobile

## Pages/Views
Single-page, eight tab views all sharing the persistent filter bar:
1. **Directory** — sortable virtualised table
2. **Map** — Leaflet, star-colour markers, popup → detail panel
3. **Leaderboards** — top 25 / bottom 25 nationally, switchable by metric
4. **Providers** — matrix of top 40 providers × 4 sub-rating averages
5. **Care Minutes** — SVG scatter, actual vs target, with under-target highlighted
6. **Quality Measures** — heatmap of services × 7 quality measures
7. **States** — small-multiples histograms (one per state) of overall star ratings
8. **Insights** — auto-detected anomaly cards

## Visualization Strategy
- **Sortable, filterable directory table** — the core lookup. Every interaction in the site funnels users back here when they click a service name.
- **Leaflet map** — the most natural overview for a geographic dataset. Suburb-centroid jittering for multi-home suburbs. Marker colour encodes star rating.
- **Horizontal bar leaderboards** — fast scan of "who's best/worst at X", coloured by rating.
- **Matrix heatmap (providers × rating)** — exposes systemic provider performance across many services; impossible to see in a flat table.
- **Care-minutes scatter** — target-vs-actual is *the* live regulatory question; a scatter with the y=x reference line is the right shape.
- **Quality-measures heatmap** — every service × 7 measures, colour-coded vs national median; instantly surfaces outliers.
- **State small-multiples (histograms)** — comparing 8 jurisdictions side-by-side, distribution shapes tell a story totals can't.
- **Service detail panel with sub-question bar charts** — 13 resident-experience questions per service, each shown as a 4-segment stacked bar (Always / Most / Some / Never) — turns dense survey data into a quick visual scan.

Total: 8 distinct views. Floor of 5 is comfortably cleared.
