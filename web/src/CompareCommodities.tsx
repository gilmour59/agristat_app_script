import { useMemo, useState } from 'react';
import { cleanName, normalizePeriod, sortYears } from './data';
import type { CommoditySheet, Period, Sector } from './data';

type Group = { label: string; items: string[]; note?: string };
type Measure = 'production' | 'area' | 'trees';

const fmt = (value: number, digits = 2) => new Intl.NumberFormat('en-PH', { maximumFractionDigits: digits }).format(value);
const fiveProvinces = ['Aklan', 'Antique', 'Capiz', 'Guimaras', 'Iloilo'];

function groupFor(sector: Sector, commodities: string[]): Group[] {
  const has = (items: string[]) => items.filter(item => commodities.includes(item));
  const groups: Group[] = sector === 'crops' ? [
    { label: 'Main crops', items: has(['Palay', 'Corn']) },
    { label: 'Palay systems', items: has(['Irrigated Palay', 'Rainfed Palay']) },
    { label: 'Corn types', items: has(['White Corn', 'Yellow Corn']) },
  ] : sector === 'fruit' ? [
    { label: 'Main fruits', items: has(['Banana', 'Mango']) },
    { label: 'Banana varieties', items: commodities.filter(item => item.startsWith('Banana ')) },
    { label: 'Mango varieties', items: commodities.filter(item => item.startsWith('Mango ')) },
  ] : sector === 'vegetables' ? [
    { label: 'Vegetable series', items: commodities },
  ] : sector === 'major' ? [
    { label: 'Regional products', items: has(['Cacao', 'Coffee (dried berries w/ pulp)', 'Coffee (green coffee beans)']), note: 'Coffee dried berries and green beans are different product forms. They are shown separately and are not added together.' },
    { label: 'Coffee dried berry types', items: commodities.filter(item => /^Coffee (Arabica|Excelsa|Liberica|Others|Robusta) \(dried berries\)/.test(item)) },
    { label: 'Coffee green bean types', items: commodities.filter(item => /^Coffee (Arabica|Excelsa|Liberica|Others|Robusta) \(green coffee beans\)/.test(item)) },
  ] : sector === 'livestock' ? [
    { label: 'Animal types', items: commodities },
  ] : [
    { label: 'Chicken and duck', items: has(['Chicken', 'Duck']) },
    { label: 'Chicken types', items: has(['Broiler', 'Gamefowl', 'Layer', 'Native/Improved']) },
    { label: 'Egg production', items: has(['Chicken eggs', 'Duck eggs']) },
  ];
  return groups.filter(group => group.items.length);
}

function valueFor(sheet: CommoditySheet, commodity: string, year: string, period: Period): number | null {
  const index = sheet.columns.findIndex(column => column.year === year && normalizePeriod(column.period) === period);
  if (index < 0) return null;
  const row = sheet.rows.find(item => item.commodity === commodity && /region/i.test(item.level) && /western visayas/i.test(item.name));
  return row?.values[index] ?? null;
}

function sameFiveValue(sheet: CommoditySheet, commodity: string, year: string, period: Period): number | null {
  const index = sheet.columns.findIndex(column => column.year === year && normalizePeriod(column.period) === period);
  if (index < 0) return null;
  const rows = sheet.rows.filter(row => row.commodity === commodity && /province/i.test(row.level) && fiveProvinces.includes(cleanName(row.name)) && row.values[index] !== null);
  return rows.length === fiveProvinces.length ? rows.reduce((sum, row) => sum + row.values[index]!, 0) : null;
}

export default function CompareCommodities({ sector, sheet, area, trees }: {
  sector: Sector; sheet: CommoditySheet; area?: CommoditySheet; trees?: CommoditySheet;
}) {
  const commodities = useMemo(() => [...new Set(sheet.rows.map(row => row.commodity))].sort(), [sheet]);
  const groups = useMemo(() => groupFor(sector, commodities), [sector, commodities]);
  const [groupIndex, setGroupIndex] = useState(0);
  const [measure, setMeasure] = useState<Measure>('production');
  const [period, setPeriod] = useState<Period>('Annual');
  const [year, setYear] = useState('2025');
  const group = groups[groupIndex] || groups[0];
  const source = measure === 'area' ? area || sheet : measure === 'trees' ? trees || sheet : sheet;
  const periods = [...new Set(source.columns.map(column => normalizePeriod(column.period)).filter((item): item is Period => Boolean(item)))];
  const activePeriod = periods.includes(period) ? period : periods[0] || 'Annual';
  const years = sortYears(source.columns).filter(itemYear => group.items.some(item => valueFor(source, item, itemYear, activePeriod) !== null));
  const activeYear = years.includes(year) ? year : years.at(-1) || year;
  const unit = measure === 'area' ? 'hectares' : measure === 'trees' ? 'bearing plants' :
    sector === 'livestock' || sector === 'poultry' && group.label !== 'Egg production' ? 'metric tons, liveweight' :
      sector === 'poultry' ? 'metric tons of eggs' : 'metric tons';
  const comparison = group.items.map(commodity => ({ commodity, value: valueFor(source, commodity, activeYear, activePeriod) }));
  const available = comparison.filter((item): item is { commodity: string; value: number } => item.value !== null).sort((a, b) => b.value - a.value);
  const missing = comparison.filter(item => item.value === null);
  const max = Math.max(1, ...available.map(item => item.value));
  const crossBoundary = measure === 'production' && (sector === 'livestock' || sector === 'poultry') && activeYear === '2025';
  const changes = group.items.map(commodity => {
    const previousYear = String(Number(activeYear) - 1);
    const current = crossBoundary ? sameFiveValue(source, commodity, activeYear, activePeriod) : valueFor(source, commodity, activeYear, activePeriod);
    const previous = crossBoundary ? sameFiveValue(source, commodity, previousYear, activePeriod) : valueFor(source, commodity, previousYear, activePeriod);
    return { commodity, change: current !== null && previous !== null && previous !== 0 ? (current - previous) / previous * 100 : null };
  });
  const changeMax = Math.max(1, ...changes.map(item => Math.abs(item.change ?? 0)));
  const biggestMovement = changes.filter((item): item is { commodity: string; change: number } => item.change !== null)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0];

  return <div className="compare-view">
    <section className="compare-intro"><h2>Compare commodities</h2><p>Compare reported Western Visayas figures within a related group. Parent crops and their subtypes are kept in separate groups to avoid counting the same production twice.</p></section>
    <div className="compare-controls" aria-label="Commodity comparison filters">
      <label>Commodity group<select value={groupIndex} onChange={event => setGroupIndex(Number(event.target.value))}>{groups.map((item, index) => <option key={item.label} value={index}>{item.label}</option>)}</select></label>
      {(area || trees) && <label>Measure<select value={measure} onChange={event => setMeasure(event.target.value as Measure)}><option value="production">Production</option>{area && <option value="area">Area</option>}{trees && <option value="trees">Bearing plants</option>}</select></label>}
      <label>Period<select value={activePeriod} onChange={event => setPeriod(event.target.value as Period)}>{periods.map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Year<select value={activeYear} onChange={event => setYear(event.target.value)}>{years.map(item => <option key={item}>{item}</option>)}</select></label>
    </div>
    <div className="compare-findings" aria-label="Comparison highlights">
      <p><span>Largest reported figure</span><strong>{available[0]?.commodity || 'No figure available'}</strong><small>{available[0] ? `${fmt(available[0].value)} ${unit} · ${activeYear}` : 'Choose another period or measure'}</small></p>
      <p><span>Biggest annual change</span><strong>{biggestMovement ? `${biggestMovement.commodity} · ${biggestMovement.change >= 0 ? '+' : '−'}${fmt(Math.abs(biggestMovement.change), 1)}%` : 'No comparable change'}</strong><small>{crossBoundary ? 'Compared across the same five provinces' : `Compared with ${Number(activeYear) - 1}`}</small></p>
    </div>
    {activeYear === '2026' && <p className="compare-partial">2026 figures are partial. Compare the same period across years; annual 2026 is not yet available in this snapshot.</p>}
    <section className="data-section compare-section"><div className="section-heading"><div><h3>{group.label} · {activeYear}</h3><p>Western Visayas, {activePeriod.toLowerCase()}. Longer bars show more {measure === 'production' ? 'production' : measure === 'area' ? 'area' : 'bearing plants'}.</p></div><span className="unit-tag">{unit}</span></div>
      {group.note && <p className="compare-note">{group.note}</p>}
      {available.length ? <div className="compare-bars">{available.map(item => <div className="compare-bar" key={item.commodity}><span>{item.commodity}</span><div className="compare-track"><i style={{ width: `${item.value / max * 100}%` }} /></div><strong>{fmt(item.value)} <small>{unit}</small></strong></div>)}</div> : <p className="empty-small">No reported values for this selection.</p>}
      {missing.length > 0 && <p className="chart-foot">No reported {measure} figure for {missing.map(item => item.commodity).join(', ')} in this period.</p>}
    </section>
    <section className="data-section compare-section"><div className="section-heading"><div><h3>Change from {Number(activeYear) - 1}</h3><p>Same period, percentage change. {crossBoundary ? 'Uses the same five listed provinces in both years.' : 'Uses the reported regional series in both years.'}</p></div><span className="unit-tag">percent</span></div>
      <div className="compare-changes">{changes.map(item => <div className="compare-change" key={item.commodity}><span>{item.commodity}</span><div className="compare-change-track"><i className={item.change !== null && item.change < 0 ? 'negative' : 'positive'} style={{ width: `${Math.abs(item.change ?? 0) / changeMax * 48}%` }} /></div><strong className={item.change !== null && item.change < 0 ? 'negative' : ''}>{item.change === null ? '—' : `${item.change >= 0 ? '+' : '−'}${fmt(Math.abs(item.change), 1)}%`}</strong></div>)}</div>
      {crossBoundary && <p className="chart-foot">A dash means the five-province comparison is unavailable. Published regional totals around the 2025 boundary change are not compared here.</p>}
    </section>
  </div>;
}
