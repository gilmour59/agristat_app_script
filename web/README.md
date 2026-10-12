# Western Visayas Agriculture Data Portal

React + TypeScript dashboard for the Department of Agriculture NSM submission. The Vercel project at [agristat-nsm.vercel.app](https://agristat-nsm.vercel.app) uses `web` as its root directory and deploys pushes to `main`.

The public site reads versioned CSV snapshots in `public/data/` generated from the local SQLite database. It does not depend on the review Google Sheet being public. The source database combines the supplied PSA OpenSTAT exports and the RSBSA workbook. The portal shows crop production and area, fruit bearing plants, and RSBSA people and land measures. Public municipality rows omit IP, PWD, 4Ps, and ARB counts. National rice and corn stock data remain in the local database and are excluded from the Western Visayas pages.

## Run locally

```sh
npm install
npm run dev
```

## Refresh the data

From the repository root, after replacing source files in Downloads:

```sh
python3 scripts/build_database.py --source-dir /Users/gilmour59/Downloads --rsbsa '/Users/gilmour59/Downloads/RSBSA Data (09-18-26).xlsx' --output data/agristat.sqlite
python3 scripts/export_dashboard.py --database data/agristat.sqlite --output web/public/data
```

Review `data/agristat.report.json` locally, then commit and push the generated CSVs. The full RSBSA workbook and SQLite database are not committed. The [private review Google Sheet](https://docs.google.com/spreadsheets/d/1m1gtpdDOeje1TFO5c_XrJHqtO9MMHLexBT0GdvL42GI/edit) is a separate snapshot and does not automatically refresh with the site.

Future work: investigate PSA OpenSTAT API access, dimensions, units, and update cadence, then compare API responses against these supplied CSVs before automating updates.
