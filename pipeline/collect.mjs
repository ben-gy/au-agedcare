#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Download the latest Star Ratings quarterly data extract from the Department of Health,
// parse the XLSX, join suburb centroids, write public/data/services.json.

import { mkdirSync, writeFileSync, existsSync, createWriteStream } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import https from 'node:https';
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'public', 'data');
const CACHE_DIR = join(__dirname, '.cache');
mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(CACHE_DIR, { recursive: true });

// May 2026 quarterly extract — update when a newer extract appears.
// Newest URL pattern: https://www.health.gov.au/sites/default/files/YYYY-MM/star-ratings-quarterly-data-extract-MONTH-YEAR_N.xlsx
const EXTRACT_URL = 'https://www.health.gov.au/sites/default/files/2026-05/star-ratings-quarterly-data-extract-may-2026_0.xlsx';
const POSTCODES_URL = 'https://raw.githubusercontent.com/matthewproctor/australianpostcodes/master/australian_postcodes.csv';

const REPORTING_PERIOD = 'May 2026';

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    const req = (u) =>
      https.get(u, { headers: { 'User-Agent': 'au-agedcare/1.0' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          res.resume();
          return req(res.headers.location);
        }
        if (res.statusCode !== 200) {
          file.close();
          return reject(new Error(`HTTP ${res.statusCode} for ${u}`));
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      });
    req(url).on('error', (err) => {
      file.close();
      reject(err);
    });
  });
}

function parseCsv(text) {
  // Minimal CSV parser — handles quoted fields, commas inside quotes, escaped quotes.
  const rows = [];
  let row = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') {
        row.push(cur);
        cur = '';
      } else if (c === '\n') {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = '';
      } else if (c === '\r') {
        // ignore
      } else cur += c;
    }
  }
  if (cur.length || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

function loadPostcodes() {
  const cachePath = join(CACHE_DIR, 'postcodes.json');
  if (existsSync(cachePath)) {
    return JSON.parse(readFileSync(cachePath, 'utf8'));
  }
  return null;
}

function savePostcodes(map) {
  writeFileSync(join(CACHE_DIR, 'postcodes.json'), JSON.stringify(map));
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function toNum(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = parseFloat(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function toInt(v) {
  const n = toNum(v);
  return n === null ? null : Math.round(n);
}

async function main() {
  const xlsxPath = join(CACHE_DIR, 'star-ratings.xlsx');
  if (!existsSync(xlsxPath)) {
    console.log(`Downloading ${EXTRACT_URL}...`);
    await download(EXTRACT_URL, xlsxPath);
  } else {
    console.log(`Using cached ${xlsxPath}`);
  }

  console.log('Parsing XLSX...');
  const buf = readFileSync(xlsxPath);
  const wb = xlsxRead(buf, { type: 'buffer' });
  const sheet = wb.Sheets['Detailed data'];
  if (!sheet) throw new Error('Sheet "Detailed data" not found');
  const rows = xlsxUtils.sheet_to_json(sheet, { defval: '' });
  console.log(`Parsed ${rows.length} services from XLSX`);

  // Build suburb centroid lookup
  let pcMap = loadPostcodes();
  if (!pcMap) {
    console.log('Downloading suburb centroids...');
    const pcPath = join(CACHE_DIR, 'postcodes.csv');
    if (!existsSync(pcPath)) {
      await download(POSTCODES_URL, pcPath);
    }
    const pcText = readFileSync(pcPath, 'utf8');
    const pcRows = parseCsv(pcText);
    const header = pcRows[0];
    const colLocality = header.indexOf('locality');
    const colState = header.indexOf('state');
    const colLat = header.indexOf('lat');
    const colLng = header.indexOf('long');
    pcMap = {};
    for (let i = 1; i < pcRows.length; i++) {
      const r = pcRows[i];
      if (!r || r.length < header.length) continue;
      const loc = (r[colLocality] || '').toUpperCase().trim();
      const st = (r[colState] || '').toUpperCase().trim();
      const la = parseFloat(r[colLat]);
      const lo = parseFloat(r[colLng]);
      if (!loc || !st || !Number.isFinite(la) || !Number.isFinite(lo)) continue;
      // Skip clearly bad coords (0,0)
      if (la === 0 && lo === 0) continue;
      const key = `${st}|${loc}`;
      if (!pcMap[key]) pcMap[key] = { lat: la, lng: lo };
    }
    savePostcodes(pcMap);
    console.log(`Cached ${Object.keys(pcMap).length} suburb centroids`);
  } else {
    console.log(`Loaded ${Object.keys(pcMap).length} cached suburb centroids`);
  }

  const services = [];
  let geoMatched = 0;
  for (const r of rows) {
    const name = String(r['Service Name'] || '').trim();
    const provider = String(r['Provider Name'] || '').trim();
    const suburb = String(r['Service Suburb'] || '').trim();
    const state = String(r['State/Territory'] || '').trim();
    const slug = slugify(`${name}-${suburb}-${state}`);
    const key = `${state.toUpperCase()}|${suburb.toUpperCase()}`;
    const geo = pcMap[key] || null;
    if (geo) geoMatched++;

    services.push({
      slug,
      name,
      provider,
      suburb,
      state,
      reporting_period: String(r['Reporting Period'] || REPORTING_PERIOD),
      purpose: String(r['Purpose'] || ''),
      planning_region: String(r['Aged Care Planning Region'] || ''),
      mmm_region: String(r['MMM Region'] || ''),
      mmm_code: String(r['MMM Code'] || ''),
      size: String(r['Size'] || ''),
      overall: toInt(r['Overall Star Rating']),
      residents_exp: toInt(r["Residents' Experience rating"]),
      compliance: toInt(r['Compliance rating']),
      staffing: toInt(r['Staffing rating']),
      quality_measures: toInt(r['Quality Measures rating']),
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,
      re: {
        interview_year: toInt(r['[RE] Interview Year']),
        food: extractRE(r, 'Food'),
        safety: extractRE(r, 'Safety'),
        operation: extractRE(r, 'Operation'),
        care_need: extractRE(r, 'Care Need'),
        competent: extractRE(r, 'Competent'),
        independent: extractRE(r, 'Independent'),
        explain: extractRE(r, 'Explain'),
        respect: extractRE(r, 'Respect'),
        follow_up: extractRE(r, 'Follow Up'),
        caring: extractRE(r, 'Caring'),
        voice: extractRE(r, 'Voice'),
        home: extractRE(r, 'Home'),
      },
      c: {
        decision_type: String(r['[C] Decision type'] || ''),
        decision_applied: String(r['[C] Date Decision Applied'] || ''),
        decision_ends: String(r['[C] Date Decision Ends'] || ''),
        reason: String(r['[C] Compliance Rating Reason'] || ''),
        audit_closed: String(r['[C] Date Audit Closed'] || ''),
        standards: {
          s1: String(r['[C] Standard 1: The individual'] || ''),
          s2: String(r['[C] Standard 2: The organisation'] || ''),
          s3: String(r['[C] Standard 3: The care and services'] || ''),
          s4: String(r['[C] Standard 4: The environment'] || ''),
          s5: String(r['[C] Standard 5: Clinical care'] || ''),
          s6: String(r['[C] Standard 6: Food and nutrition'] || ''),
          s7: String(r['[C] Standard 7: The residential community'] || ''),
        },
      },
      s: {
        rn_target: toNum(r['[S] Registered Nurse Care Minutes - Target']),
        rn_actual: toNum(r['[S] Registered Nurse Care Minutes - Actual']),
        total_target: toNum(r['[S] Total Care Minutes - Target']),
        total_actual: toNum(r['[S] Total Care Minutes - Actual']),
      },
      qm: {
        pressure_injuries: toNum(r['[QM] Pressure injuries*']),
        restrictive_practices: toNum(r['[QM] Restrictive practices']),
        weight_loss: toNum(r['[QM] Unplanned weight loss*']),
        falls: toNum(r['[QM] Falls and major injury - falls*']),
        falls_major: toNum(r['[QM] Falls and major injury - major injury from a fall*']),
        polypharmacy: toNum(r['[QM] Medication management - polypharmacy']),
        antipsychotic: toNum(r['[QM] Medication management - antipsychotic']),
      },
    });
  }

  console.log(`Geocoded ${geoMatched}/${services.length} services (${((100 * geoMatched) / services.length).toFixed(1)}%)`);

  const out = {
    source: 'Department of Health Star Ratings quarterly extract (' + REPORTING_PERIOD + ')',
    source_url: EXTRACT_URL,
    generated_at: new Date().toISOString(),
    reporting_period: REPORTING_PERIOD,
    count: services.length,
    services,
  };
  writeFileSync(join(DATA_DIR, 'services.json'), JSON.stringify(out));
  console.log(`Wrote ${join(DATA_DIR, 'services.json')} (${(JSON.stringify(out).length / 1024 / 1024).toFixed(1)} MB)`);
}

function extractRE(r, q) {
  // Returns { always, most, some, never } as percentages, nulls if no interview.
  const a = toNum(r[`[RE] ${q} - Always`]);
  const m = toNum(r[`[RE] ${q} - Most of the time`]);
  const s = toNum(r[`[RE] ${q} - Some of the time`]);
  const n = toNum(r[`[RE] ${q} - Never`]);
  if (a === null && m === null && s === null && n === null) return null;
  return { always: a, most: m, some: s, never: n };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
