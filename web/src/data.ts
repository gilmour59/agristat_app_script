export type Sector = 'crops' | 'livestock' | 'poultry' | 'farmers';
export type Period = 'Annual' | 'Quarter 1' | 'Quarter 2' | 'Quarter 3' | 'Quarter 4';

export interface TimeColumn { index: number; year: string; period: string }
export interface CommodityRow { commodity: string; name: string; level: string; values: (number | null)[] }
export interface CommoditySheet { columns: TimeColumn[]; rows: CommodityRow[] }
export interface FarmerRow {
  province: string; municipality: string; district: string;
  total: number; male: number; female: number; averageAge: number;
  seniors: number; farmers: number;
}

export const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1muaZSkxWoVbHAsI7934gYycYuIf7QR2UC9P2rmNwPXE/edit';

export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === '"') {
      if (quoted && input[i + 1] === '"') { field += '"'; i += 1; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      row.push(field); field = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && input[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      if (row.some(cell => cell.trim())) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some(cell => cell.trim())) rows.push(row);
  return rows;
}

export function valueOf(value: string | undefined): number | null {
  if (!value || value.trim() === '' || value.trim() === '..' || value.trim() === '-') return null;
  const number = Number(value.replace(/,/g, '').replace(/%$/, '').trim());
  return Number.isFinite(number) ? number : null;
}

export function parseCommoditySheet(csv: string): CommoditySheet {
  const rows = parseCsv(csv);
  const years = rows[0] || [];
  const periods = rows[1] || [];
  let lastYear = '';
  const columns: TimeColumn[] = [];
  for (let index = 3; index < Math.max(years.length, periods.length); index += 1) {
    lastYear = years[index]?.trim() || lastYear;
    const period = periods[index]?.trim() || '';
    if (/^20\d{2}$/.test(lastYear) && period) columns.push({ index, year: lastYear, period });
  }
  const records = rows.slice(2).filter(row => row[0]?.trim() && row[1]?.trim() && row[2]?.trim())
    .map(row => ({
      commodity: row[0].trim(), name: row[1].trim(), level: row[2].trim(),
      values: columns.map(column => valueOf(row[column.index])),
    }));
  if (!columns.length || !records.length) throw new Error('The source tab has no usable time series.');
  return { columns, rows: records };
}

export function parseFarmersSheet(csv: string): FarmerRow[] {
  const rows = parseCsv(csv);
  if (rows[0]?.[0]?.trim().toLowerCase() !== 'province' ||
      rows[0]?.[3]?.trim().toLowerCase() !== 'total registrants' ||
      rows[1]?.[5]?.trim().toLowerCase() !== 'total') {
    throw new Error('The FarmersProfile headers have changed.');
  }
  const records = rows.slice(2).filter(row => row[0]?.trim() && row[1]?.trim() && valueOf(row[5]) !== null)
    .map(row => ({
      province: row[0].trim(), municipality: row[1].trim(), district: row[2]?.trim() || 'Unspecified',
      male: valueOf(row[3]) || 0, female: valueOf(row[4]) || 0, total: valueOf(row[5]) || 0,
      averageAge: valueOf(row[6]) || 0, seniors: valueOf(row[7]) || 0, farmers: valueOf(row[14]) || 0,
    }));
  if (!records.length) throw new Error('The registry tab has no municipality rows.');
  return records;
}

export function normalizePeriod(period: string): Period | null {
  if (/^annual$/i.test(period)) return 'Annual';
  const match = period.match(/^(?:quarter\s*|q)([1-4])$/i);
  return match ? `Quarter ${match[1]}` as Period : null;
}

export function sortYears(columns: TimeColumn[]): string[] {
  return [...new Set(columns.map(column => column.year))].sort((a, b) => Number(a) - Number(b));
}

export function totalFor(row: CommodityRow, columnIndexes: number[]): number {
  return columnIndexes.reduce((sum, index) => sum + (row.values[index] || 0), 0);
}

export function cleanName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s+/g, ' ').trim();
}

export async function fetchTab(tab: 'crops' | 'area' | 'livestock' | 'poultry' | 'farmers'): Promise<string> {
  const response = await fetch(`/api/sheet?tab=${tab}`);
  if (!response.ok) {
    const detail = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(detail?.error || `Data request failed (${response.status}).`);
  }
  return response.text();
}
