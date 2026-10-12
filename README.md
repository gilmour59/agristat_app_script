# Western Visayas Agriculture Data Portal

The NSM submission is a React dashboard in [`web/`](web/), hosted at [agristat-nsm.vercel.app](https://agristat-nsm.vercel.app). It presents Western Visayas agricultural production from supplied PSA OpenSTAT CSVs and selected RSBSA municipality aggregates. Each chart identifies its reporting geography; province rankings appear only where the source provides province figures.

The local database importer is in [`scripts/build_database.py`](scripts/build_database.py), and [`scripts/export_dashboard.py`](scripts/export_dashboard.py) prepares the site's reviewed CSV snapshots. See [`data/README.md`](data/README.md) for source and quality notes and [`web/README.md`](web/README.md) for refresh and deployment instructions.

The former Google Apps Script implementation remains at the repository root for reference. Future work includes evaluating a direct PSA OpenSTAT API import after validating it against these source exports.
