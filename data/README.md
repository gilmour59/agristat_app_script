# Western Visayas agriculture data snapshot

This folder contains a **local SQLite database** built from the 13 supplied PSA OpenSTAT CSV exports and the RSBSA workbook dated 2026-09-18. The database is ignored by Git. The tracked importer and quality report make the transformation reviewable without publishing the RSBSA workbook or its detailed aggregates to the public repository.

## Build

Requires Python 3.10+ and `openpyxl` for reading the workbook.

```sh
python3 -m pip install openpyxl
python3 scripts/build_database.py \
  --source-dir /Users/gilmour59/Downloads \
  --rsbsa '/Users/gilmour59/Downloads/RSBSA Data (09-18-26).xlsx' \
  --output data/agristat.sqlite
```

The importer requires the 13 named CSVs. It replaces the database only after the whole import and SQLite integrity check succeed. Each source has a SHA-256 hash for provenance. Run it again after replacing source exports. `agristat.report.json` is the latest audit summary.

## Tables and source choices

| Table | Grain | Contents |
| --- | --- | --- |
| `source_file` | One imported file | Original title, filename, hash, import time |
| `openstat_observation` | File × commodity × place × year × period | Value and original cell text; unavailable markers become SQL `NULL` |
| `rsbsa_geography` | One source row | Region, province, district, or municipality; original row number and label |
| `rsbsa_profile` | Geography row × category | Male, female, total, age, senior, IP, PWD, 4Ps, ARB |
| `rsbsa_area` | Geography row × area measure | Physical, declared, and verified areas; source rates stored as ratios |
| `rsbsa_training` | Source geography row × training cell | Original mixed LGU training counts and dates, preserved for review |
| `rsbsa_region_rank` | Ranking-sheet region | Registrants and verified area with ranks |

OpenSTAT exports are grouped by measure:

- **Palay and corn:** production volume and harvested area by crop type, region/province, quarter/semester/year. The corrected volume export covers 2020–2026. Separate monthly rice/corn stock inventory is **national Philippines data**, so it is kept in the database but excluded from Western Visayas dashboard charts.
- **Livestock and poultry:** regional time series plus province-level livestock and chicken-by-type data. The livestock region and province exports contain overlapping regional cells; choose one source before aggregating.
- **Other crops:** major-crop regional volume; mango/banana volume, planted/harvested area, and bearing-tree counts; vegetable/root-crop volume and area. Major-crop and fruit-crop exports repeat the same regional banana/mango volume values.
- **RSBSA:** ten overlapping profile categories and area indicators. `registrants` is the broad total; categories such as farmers, rice farmers, and agri-youth are **not additive**.

## Rules for charts and totals

1. Select one geographic level. Province rows must not be added to the already supplied regional row; district and municipality totals also repeat higher-level totals.
2. Select one period type. Annual and semester totals repeat quarters for production volume. Monthly stock is an inventory level, so it must not be summed as production.
3. Area planted/harvested and bearing-tree series are stock-like measures: their annual source values are **not** the sum of quarterly values. Use the annual value directly.
4. Keep `NULL` distinct from zero. Both `..` and `...` appear as missing markers; `0.00` is retained as an actual source value. Do not infer a complete 2026 year from the partial 2026 cells.
5. Production volumes and stocks use metric tons; livestock and slaughter poultry volume is liveweight, while eggs are measured by egg weight. Harvested or planted areas use hectares; bearing trees/hills/vines use counts. These units were checked against PSA OpenSTAT source metadata.
6. Western Visayas historical regional totals cross boundary changes associated with Negros Island Region. The app marks the break in trends. Province comparisons are shown only for years with province rows; regional and province values are never added together.
7. RSBSA's ranking tab and detailed table disagree on Region VI registrants by 6,991. The detailed regional row matches the sum of five provinces and 101 municipalities. Keep the ranking separate until the source owner reconciles it; the local audit report has the exact figures.
8. The RSBSA workbook has 35 male + female versus total mismatches across geography/category rows, plus 92 fractional count cells (mostly agri-youth sex splits). Preserve the source values and avoid using affected splits as exact person counts until confirmed. See the local `agristat.report.json` for examples.
9. RSBSA rate cells are stored as source ratios (for example 0.508) and displayed as percentages (50.8%). Values above 100% are retained and flagged, not silently changed.

Example: annual palay volume for provinces, using the specified metric-ton unit and one source file:

```sql
SELECT o.geography AS province, o.year, o.value AS metric_tons
FROM openstat_observation AS o
JOIN source_file AS s ON s.id = o.source_id
WHERE s.filename = 'rice_corn_volume.csv'
  AND o.commodity = 'Palay'
  AND o.geography_level = 'province'
  AND o.period_type = 'annual'
  AND o.value IS NOT NULL
ORDER BY o.year, o.geography;
```

## App integration and future refresh

The React app uses selected CSV snapshots exported from this database with `python3 scripts/export_dashboard.py`. These include production, crop area, bearing plants, all ten RSBSA profile categories, and eight RSBSA land measures. Public municipality rows omit IP, PWD, 4Ps, and ARB counts; those original aggregates and the LGU training cells remain in the local database and [private Google Sheet review copy](https://docs.google.com/spreadsheets/d/1m1gtpdDOeje1TFO5c_XrJHqtO9MMHLexBT0GdvL42GI/edit). The full RSBSA workbook and SQLite database stay local and are ignored by Git. The Sheet is a separate review snapshot and does not refresh with the app.

**Future work:** investigate the PSA OpenSTAT API, confirm its terms, authentication, dataset identifiers, dimensions, units, and update cadence, then replace the CSV import step with a scheduled fetch that writes the same schema. Keep the CSV importer as a reproducible fallback and compare API values against this snapshot before cutting over.
