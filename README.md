# Aged Care Quality (AU)

**Search and compare every Australian residential aged care home — Star Ratings, staffing levels, resident surveys, and quality measures from official government data.**

🔗 **Live:** [https://au-agedcare.benrichardson.dev](https://au-agedcare.benrichardson.dev)

## What is this?

A searchable, comparable view of every government-funded residential aged care service in Australia. All 2,596 services are drawn from the Department of Health, Disability and Ageing's quarterly Star Ratings extract — currently May 2026.

Each home is rated overall plus across four dimensions: **Residents' Experience**, **Compliance**, **Staffing**, and **Quality Measures**. The site lets families and researchers compare services by suburb, provider, sector, size, and rurality — surfacing patterns that the official "Find a provider" tool deliberately hides (e.g. providers with multiple under-performing homes, statistical outliers on falls or pressure injuries, services failing the regulated care minutes target).

Built because choosing a residential aged care home is one of the most consequential decisions a family makes — and the official data is dense, lives in a 1.7 MB spreadsheet, and is hard to slice.

## Who is this for?

- **Families** choosing or comparing residential aged care homes for a parent or partner — usually mid-decision, time-pressured, and wanting honest, sourced data not marketing copy.
- **Journalists and policy researchers** wanting to slice the Star Ratings data by region, sector, or provider to find stories or recommendations.
- **Aged care workers and managers** looking at where their service sits nationally on every metric.

## Data Sources

| Source | What it provides | Update frequency |
|--------|-------------------|-----------------|
| Department of Health — Star Ratings quarterly data extract | 2,596 services × 87 columns: Overall + 4 sub-ratings, residents' experience survey results, care minutes target vs actual, compliance standards, quality measure rates | Quarterly (Feb / May / Aug / Nov) |
| AIHW GEN aged care data series | Index of all historical quarterly extracts | Quarterly |
| Matthew Proctor — Australian Postcodes | Suburb + state → lat/lng centroids for the map view | Versioned |

## Features

- **Directory** — fully searchable, sortable table of every service with filter bar (state, sector, size, MMM region, min rating, "under care-minute target only").
- **Map** — Leaflet plot of every service, marker colour = Overall Rating, click for popup → full detail panel.
- **Leaderboards** — Top 25 / Bottom 25 nationally, switchable across each rating dimension.
- **Provider matrix** — Top 40 multi-service providers compared on each rating dimension; spot systemic patterns.
- **Care Minutes scatter** — actual minutes per resident per day vs the regulated target, with under-target highlighted.
- **Quality Measures heatmap** — services × 7 measures (pressure injuries, restrictive practices, weight loss, falls, major fall injury, polypharmacy, antipsychotic use), colour-coded vs national median.
- **By State** — small-multiples histograms and averages for each jurisdiction.
- **Insights** — auto-detected anomalies: 1-star services, providers with 3+ low-rated homes, services failing care minutes by ≥15%, statistical outliers on multiple quality measures, top performers.
- **Service detail panel** — click any service from any view to see all 87 columns laid out cleanly: ratings, 12-question residents' experience survey, care minutes target/actual, 7 quality measures vs national median, compliance against all 7 Aged Care Quality Standards.
- **Glossary tooltips** — click any underlined term for an explanation of jargon (MMM, care minutes, polypharmacy, etc).
- **Direct service links** — URL hash like `#service=dellacourt-west-albury-nsw` opens that home's detail card directly; shareable.

## Tech Stack

- **Runtime:** Vanilla TypeScript
- **Build:** Vite 6
- **Map:** Leaflet 1.9 + CARTO light tiles + GeoJSON suburb centroids
- **Testing:** Vitest (32 tests)
- **Hosting:** GitHub Pages (static, no backend)
- **Data:** GitHub Actions pipeline downloads the Department of Health XLSX, parses with `xlsx`, joins suburb centroids, and writes `public/data/services.json` (~3.8 MB) and `public/data/aggregates.json` (~30 KB). Cron runs monthly to pick up new quarterly extracts.

## Local Development

```bash
# Install dependencies
npm install

# Refresh data from the Department of Health extract
npm run pipeline

# Start dev server
npm run dev

# Run tests
npm test

# Production build
npm run build

# Preview production build
npm run preview
```

## How it works

1. **Pipeline (`pipeline/collect.mjs`)** downloads the May 2026 Star Ratings XLSX from health.gov.au, parses the "Detailed data" sheet (87 columns), downloads suburb centroids from Matthew Proctor's repo, joins each service's `(suburb, state)` to lat/lng, and writes typed JSON to `public/data/services.json`.
2. **Pipeline (`pipeline/aggregate.mjs`)** computes national + per-state averages, distribution histograms, top providers, quality-measure medians and standard deviations, and runs anomaly detection rules to produce `public/data/aggregates.json`.
3. **Frontend** loads both JSONs at boot, mounts the shell, and renders eight tab views. The filter bar applies to all views via a shared `applyFilters` function. The service detail panel renders inline from in-memory data — no extra fetches.
4. **GitHub Actions data pipeline** runs monthly to pick up new quarterly extracts.

## license

[GNU Affero General Public License v3.0 or later](./LICENSE), with an attribution
requirement added under section 7(b) — see
[ADDITIONAL-TERMS.md](./ADDITIONAL-TERMS.md).

In short: you may run, modify, redistribute and even sell this, but if you
distribute it — or run a modified version where other people can reach it — you
have to publish your source under the same licence and keep the attribution. A
separate commercial licence without those obligations is available on request:
<hi@ben.gy>.

Third-party components keep their own licences — see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
