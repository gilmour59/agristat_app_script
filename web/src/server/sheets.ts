export const SHEET_TABS = {
  crops: '1364795485',
  area: '3970033',
  livestock: '620779119',
  poultry: '1401570227',
  farmers: '751038840',
} as const;

export type SheetTab = keyof typeof SHEET_TABS;

export function isSheetTab(value: string): value is SheetTab {
  return Object.hasOwn(SHEET_TABS, value);
}

export async function readSheet(tab: SheetTab): Promise<string> {
  const sheetId = process.env.GOOGLE_SHEET_ID || '1muaZSkxWoVbHAsI7934gYycYuIf7QR2UC9P2rmNwPXE';
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/export?format=csv&gid=${SHEET_TABS[tab]}`;
  const response = await fetch(url, { headers: { Accept: 'text/csv' }, redirect: 'follow' });
  if (!response.ok) throw new Error(`Google Sheets returned ${response.status}. Check that the workbook is public.`);
  const body = await response.text();
  if (/^\s*<!doctype html|^\s*<html/i.test(body) || !body.includes(',')) {
    throw new Error('The workbook did not return CSV. Check its sharing settings.');
  }
  return body;
}
