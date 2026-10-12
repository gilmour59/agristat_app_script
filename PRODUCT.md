# Agristat product context

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

NSM contest viewers and statistics practitioners. The dashboard should give both groups a plain-language takeaway first, then enough detail to inspect the figures.

## Product Purpose

Present Philippine agricultural statistics in an understandable, explorable dashboard. A successful visit lets someone identify the main trend, compare places or periods, and inspect the underlying figures and units.

## Positioning

The current project places palay and corn production, harvested area and yield, livestock and poultry production, and a farmers profile in one interface.

## Operating Context

The current product is a React and TypeScript application in `web/`, deployable on Vercel. The public [NSM workbook](https://docs.google.com/spreadsheets/d/1muaZSkxWoVbHAsI7934gYycYuIf7QR2UC9P2rmNwPXE/edit) is its live read-only data source. The earlier Apps Script implementation remains at the repository root for reference.

## Capabilities and Constraints

- Keep the four subject sections and the linked workbook as source of truth.
- Keep the Department of Agriculture identity and wording, as requested by the user.
- The interface needs clear units, data scope, source labels, and usable desktop and mobile layouts.
- Use the source's two-row time headers and FarmersProfile column definitions accurately.
- Do not generate registry figures when source fields are unavailable.
- The workbook must remain public for anonymous visitors of a deployed site.

## Brand Commitments

Keep the Department of Agriculture identity. No verified official logo asset was supplied. The earlier AI-generated field image is not used in the React app.

## Evidence on Hand

The user supplied the copied NSM workbook. Its tab names and key headers were read directly, and public CSV export was verified. The repository contains no source-data snapshot.

## Product Principles

- Lead with the finding, then show the chart and underlying values.
- Make comparisons and units readable without requiring chart expertise.
- Distinguish verified data from illustrative or unavailable data.
- Keep filters and navigation predictable across all four sections.
