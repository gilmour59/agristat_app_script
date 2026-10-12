# DAWV Agri Portal

The NSM submission is a React dashboard in [`web/`](web/), hosted at [dawvagri-portal.vercel.app](https://dawvagri-portal.vercel.app). It presents Western Visayas agricultural production from supplied PSA OpenSTAT CSVs. The RSBSA section links to a separate Power BI report. Each chart identifies its reporting geography and unit; province rankings appear only where the source provides province figures.

The local database importer is in [`scripts/build_database.py`](scripts/build_database.py), and [`scripts/export_dashboard.py`](scripts/export_dashboard.py) prepares the site's reviewed CSV snapshots. See [`data/README.md`](data/README.md) for source and quality notes, [`web/README.md`](web/README.md) for refresh and deployment instructions, and [`REVIEW_QUESTIONNAIRE.md`](REVIEW_QUESTIONNAIRE.md) for questions to review with colleagues.

The former Google Apps Script implementation remains at the repository root for reference. Future work includes evaluating a direct PSA OpenSTAT API import after validating it against these source exports.
