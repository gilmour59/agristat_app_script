# Western Visayas Agriculture Data Portal product context

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

NSM contest viewers and statistics practitioners. Give both groups a plain-language takeaway first, then the figures and source scope.

## Product Purpose

Present Western Visayas agricultural statistics in a readable dashboard. Viewers can identify a trend, compare provinces when the source allows it, and inspect the underlying values and units.

## Positioning

The portal groups rice and corn, fruit, vegetables, other major crops, livestock, poultry, and selected RSBSA registry aggregates. It keeps the Department of Agriculture identity while using a generic portal name.

## Operating Context

The React and TypeScript app in `web/` deploys on Vercel. It reads versioned CSV snapshots exported from a local SQLite database built from supplied PSA OpenSTAT CSVs and an RSBSA workbook. A private Google Sheet is available for source review. The earlier Apps Script remains at the repository root for reference.

## Capabilities and Constraints

- Keep each reported geography explicit. Do not add province values to a regional total.
- Show province rankings only where the source contains province records.
- Mark regional boundary changes in historical trends.
- Keep national rice/corn stocks out of Western Visayas charts.
- Preserve source values, including RSBSA inconsistencies, and never generate missing figures.
- Use units, periods, and snapshot dates near charts and tables.

## Brand Commitments

Keep the Department of Agriculture identity. No verified official logo asset was supplied. Commodity illustrations are simple original SVG symbols rather than institutional logos.

## Evidence on Hand

The user supplied 13 PSA OpenSTAT CSVs and the RSBSA workbook. The corrected rice/corn volume export covers 2020–2026. The importer records source hashes and generates a local quality report.

## Product Principles

- Lead with the finding, then show the chart and underlying values.
- Make comparisons and units readable without requiring chart expertise.
- Distinguish regional, provincial, national, and unavailable data.
- Keep filters and navigation predictable across all sections.
