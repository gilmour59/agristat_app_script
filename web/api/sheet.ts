import type { IncomingMessage, ServerResponse } from 'node:http';
import { isSheetTab, readSheet } from '../src/server/sheets.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const query = new URL(req.url || '/', 'https://agristat.local').searchParams;
  const tab = query.get('tab') || '';
  if (!isSheetTab(tab)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unknown sheet tab.' }));
    return;
  }
  try {
    const csv = await readSheet(tab);
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
    });
    res.end(csv);
  } catch (error) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unable to load sheet.' }));
  }
}
