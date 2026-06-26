# Aged Care Quality (AU) — Build Review

This file exists only to create a reviewable PR. All code is already deployed on `main`.

**Merge this PR to acknowledge the build.** Closing without merging is also fine.

## Links

- **GitHub Pages:** https://ben-gy.github.io/au-agedcare/ *(redirects to custom domain once DNS is set)*
- **Custom domain:** https://au-agedcare.benrichardson.dev *(DNS + cert provisioned automatically)*

## What this is

Every government-funded residential aged care service in Australia (2,596 homes), drawn from the Department of Health, Disability and Ageing's May 2026 Star Ratings quarterly extract. Eight view tabs (Directory, Map, Leaderboards, Provider matrix, Care Minutes scatter, Quality Measures heatmap, By State small-multiples, Insights) share a persistent filter bar. A service detail panel renders all 87 columns including the 12-question Residents' Experience survey, care minutes target vs actual, all seven Aged Care Quality Standards, and seven quality measures vs national medians.

## Notes

- Star Ratings dataset is heavily skewed (1 service at 1★, 0 at 2★, 484 at 3★, 1,568 at 4★, 127 at 5★, 416 unrated). The Insights tab surfaces this honestly.
- `requestAnimationFrame` was throttled in backgrounded tabs, breaking map init — switched to `setTimeout(0)`.
- GitHub Actions data pipeline runs monthly (`17 4 1 * *`) to pull new quarterly extracts.
