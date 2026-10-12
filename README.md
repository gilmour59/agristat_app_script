# AGRISTAT

The current NSM dashboard is a React application in [`web/`](web/), live at [agristat-nsm.vercel.app](https://agristat-nsm.vercel.app). It reads the [public NSM workbook](https://docs.google.com/spreadsheets/d/1muaZSkxWoVbHAsI7934gYycYuIf7QR2UC9P2rmNwPXE/edit) through a read-only endpoint. Its Vercel project uses `web` as the root directory and is connected to this GitHub repository.

```sh
cd web
npm install
npm run dev
```

The earlier Google Apps Script files remain at the repository root for reference. See [`web/README.md`](web/README.md) for deployment details.
