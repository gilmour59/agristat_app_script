# AGRISTAT web

React + TypeScript dashboard for the Department of Agriculture NSM submission, live at [agristat-nsm.vercel.app](https://agristat-nsm.vercel.app). The app reads the public [NSM workbook](https://docs.google.com/spreadsheets/d/1muaZSkxWoVbHAsI7934gYycYuIf7QR2UC9P2rmNwPXE/edit) through a read-only server endpoint; no sheet values are stored in the repository.

## Run locally

```sh
npm install
npm run dev
```

The Vite development server serves `/api/sheet` with the same source code as the Vercel function. The source spreadsheet must remain available to anyone with the link. If its sharing changes, the dashboard shows a data error rather than invented values.

## Deploy on Vercel

The `agristat-nsm` Vercel project is connected to this repository with **Root Directory** set to `web`. Pushes to `main` deploy automatically. Optionally set `GOOGLE_SHEET_ID` to another public workbook with the same tab structure. The server fetches only allowlisted tabs and caches successful responses for ten minutes.

The original Apps Script implementation remains at the repository root for reference.
