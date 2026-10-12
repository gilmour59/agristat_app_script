import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { isSheetTab, readSheet } from './src/server/sheets';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-sheets-api',
      configureServer(server) {
        server.middlewares.use('/api/sheet', async (req, res) => {
          const tab = new URL(req.url || '/', 'http://localhost').searchParams.get('tab') || '';
          if (!isSheetTab(tab)) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Unknown sheet tab.' }));
            return;
          }
          try {
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.end(await readSheet(tab));
          } catch (error) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unable to load sheet.' }));
          }
        });
      },
    },
  ],
});
