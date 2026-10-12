import { useEffect, useMemo, useState } from 'react';
import { Apple, ArrowDownRight, ArrowUpRight, Beef, Bird, Coffee, Download, Leaf, MapPin, RefreshCw, UsersRound } from 'lucide-react';
import { BananaIcon, CornIcon, MangoIcon, RiceCornIcon, VegetableIcon } from './CommodityIcons';
import { cleanName, fetchTab, normalizePeriod, parseCommoditySheet, sortYears, totalFor } from './data';
import type { CommodityRow, CommoditySheet, DataFile, Period, Sector } from './data';
import RsbsaPage, { parseAreas, parseProfiles } from './RsbsaPage';
import type { AreaRow, ProfileRow } from './RsbsaPage';

type Loaded = { kind: 'commodity'; sheet: CommoditySheet; area?: CommoditySheet; trees?: CommoditySheet } | { kind: 'farmers'; profiles: ProfileRow[]; areas: AreaRow[] };
type Point = { label: string; value: number };
type Rank = { name: string; value: number };

const nav: { key: Sector; label: string; icon: typeof Apple | typeof BananaIcon; description: string; defaultCommodity?: string; scope: string; breakYear?: number }[] = [
  { key: 'crops', label: 'Rice & corn', icon: RiceCornIcon, description: 'Harvest and yield', defaultCommodity: 'Palay', scope: 'Region + provinces', breakYear: 2025 },
  { key: 'fruit', label: 'Fruit crops', icon: BananaIcon, description: 'Banana and mango', defaultCommodity: 'Banana', scope: 'Region + provinces', breakYear: 2024 },
  { key: 'vegetables', label: 'Vegetables', icon: VegetableIcon, description: 'Seven crop series', defaultCommodity: 'Eggplant', scope: 'Region + provinces', breakYear: 2024 },
  { key: 'major', label: 'Other crops', icon: Coffee, description: 'Coffee and cacao', defaultCommodity: 'Cacao', scope: 'Region only', breakYear: 2024 },
  { key: 'livestock', label: 'Livestock', icon: Beef, description: 'Four animal types', defaultCommodity: 'Hog', scope: 'Region + provinces from 2023', breakYear: 2025 },
  { key: 'poultry', label: 'Poultry', icon: Bird, description: 'Chicken, duck and eggs', defaultCommodity: 'Chicken', scope: 'Chicken province detail', breakYear: 2025 },
  { key: 'farmers', label: 'RSBSA profile', icon: UsersRound, description: 'People and places', scope: '101 municipalities' },
];

const fmt = (value: number, digits = 0) => new Intl.NumberFormat('en-PH', { maximumFractionDigits: digits }).format(value);
const compact = (value: number) => value >= 1_000_000 ? `${fmt(value / 1_000_000, 2)}M` : value >= 1_000 ? `${fmt(value / 1_000, 1)}K` : fmt(value);

function TrendChart({ points, unit, color, label, breakYear }: { points: Point[]; unit: string; color: string; label: string; breakYear?: number }) {
  const width = 820, height = 270, left = 48, right = 18, top = 25, bottom = 40;
  const plotW = width - left - right, plotH = height - top - bottom;
  const max = Math.max(1, ...points.map(point => point.value)) * 1.12;
  const coordinates = points.map((point, index) => ({
    x: left + (points.length === 1 ? plotW / 2 : (index / (points.length - 1)) * plotW),
    y: top + plotH - point.value / max * plotH,
  }));
  const boundaryIndex = points.findIndex(point => Number(point.label) >= (breakYear ?? Infinity));
  const path = coordinates.map((point, index) => `${index && index !== boundaryIndex ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  return <div className="trend-chart">
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label} by year in ${unit}`} preserveAspectRatio="xMidYMid meet">
      {[0, .5, 1].map(fraction => <g key={fraction}><line x1={left} x2={width - right} y1={top + plotH * fraction} y2={top + plotH * fraction} stroke="#d9dfd5" strokeDasharray="3 6" /><text x={left - 10} y={top + plotH * fraction + 4} textAnchor="end" className="axis-label">{compact(max * (1 - fraction))}</text></g>)}
      {boundaryIndex > 0 && <g><line x1={(coordinates[boundaryIndex - 1].x + coordinates[boundaryIndex].x) / 2} x2={(coordinates[boundaryIndex - 1].x + coordinates[boundaryIndex].x) / 2} y1={top} y2={top + plotH} stroke="#88968d" strokeDasharray="5 5" /><text x={(coordinates[boundaryIndex - 1].x + coordinates[boundaryIndex].x) / 2 + 6} y={top + 11} className="axis-label">Boundary change</text></g>}
      {path && <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
      {coordinates.map((point, index) => <g key={points[index].label}><circle cx={point.x} cy={point.y} r="5" fill="#fff" stroke={color} strokeWidth="2.5" /><title>{points[index].label}: {fmt(points[index].value, 2)} {unit}</title><text x={point.x} y={height - 11} textAnchor="middle" className="axis-label">{points[index].label}</text></g>)}
    </svg>
  </div>;
}

function RankedBars({ data, unit, color = 'green' }: { data: Rank[]; unit: string; color?: 'green' | 'gold' }) {
  const max = Math.max(1, ...data.map(item => item.value));
  if (!data.length) return <p className="empty-small">No comparable locations in this selection.</p>;
  return <ol className={`ranked-bars ${color}`}>
    {data.map((item, index) => <li key={item.name}>
      <span className="rank-number">{String(index + 1).padStart(2, '0')}</span>
      <div className="rank-content"><div className="rank-heading"><span title={item.name}>{cleanName(item.name)}</span><strong>{compact(item.value)} <small>{unit}</small></strong></div><div className="bar-track"><div style={{ width: `${item.value / max * 100}%` }} /></div></div>
    </li>)}
  </ol>;
}

function parseLoaded(sector: Sector, csv: string, areaCsv?: string, treeCsv?: string): Loaded {
  if (sector === 'farmers') return { kind: 'farmers', profiles: parseProfiles(csv), areas: parseAreas(areaCsv || '') };
  return { kind: 'commodity', sheet: parseCommoditySheet(csv), area: areaCsv ? parseCommoditySheet(areaCsv) : undefined, trees: treeCsv ? parseCommoditySheet(treeCsv) : undefined };
}

function sourceRows(rows: CommodityRow[], commodity: string, level: 'country' | 'regional' | 'provincial') {
  return rows.filter(row => row.commodity === commodity &&
    (level === 'country' ? /country|national/i.test(row.level) || /philippines/i.test(row.name) :
      level === 'regional' ? /region/i.test(row.level) && /western visayas/i.test(row.name) : /province/i.test(row.level)));
}

function nationalRows(rows: CommodityRow[], commodity: string) {
  return sourceRows(rows, commodity, 'regional');
}

function reportedValue(sheet: CommoditySheet, commodity: string, year: string, period: Period): number | null {
  const indexes = sheet.columns.map((column, index) => ({ column, index })).filter(item => item.column.year === year && normalizePeriod(item.column.period) === period).map(item => item.index);
  const values = nationalRows(sheet.rows, commodity).flatMap(row => indexes.map(index => row.values[index])).filter((value): value is number => value !== null);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

function rankings(rows: CommodityRow[], commodity: string, indexes: number[], level: 'regional' | 'provincial'): Rank[] {
  const totals = new Map<string, number>();
  sourceRows(rows, commodity, level).filter(row => indexes.some(index => row.values[index] !== null)).forEach(row => totals.set(row.name, (totals.get(row.name) || 0) + totalFor(row, indexes)));
  return [...totals].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const text = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}

function CommodityPage({ sector, data }: { sector: Exclude<Sector, 'farmers'>; data: Extract<Loaded, { kind: 'commodity' }> }) {
  const { sheet, area, trees } = data;
  const commodities = useMemo(() => [...new Set(sheet.rows.map(row => row.commodity))].sort(), [sheet]);
  const section = nav.find(item => item.key === sector)!;
  const [commodity, setCommodity] = useState(section.defaultCommodity || commodities[0]);
  const [year, setYear] = useState('ALL');
  const [period, setPeriod] = useState<Period>('Annual');
  const availablePeriods = useMemo(() => [...new Set(sheet.columns.map(column => normalizePeriod(column.period)).filter((value): value is Period => Boolean(value)))], [sheet]);
  const activePeriod = availablePeriods.includes(period) ? period : availablePeriods[0] || 'Annual';
  const national = nationalRows(sheet.rows, commodity);
  const years = sortYears(sheet.columns).filter(itemYear => sheet.columns.some((column, index) => column.year === itemYear && normalizePeriod(column.period) === activePeriod && national.some(row => row.values[index] !== null)));
  useEffect(() => { setYear('ALL'); }, [commodity, activePeriod]);
  const selectedColumns = sheet.columns.map((column, index) => ({ ...column, arrayIndex: index }))
    .filter(column => normalizePeriod(column.period) === activePeriod && (year === 'ALL' || column.year === year));
  const trend: Point[] = years.map(itemYear => ({ label: itemYear, value: reportedValue(sheet, commodity, itemYear, activePeriod) })).filter((point): point is Point => point.value !== null);
  const activeYear = year === 'ALL' ? trend.at(-1)?.label : year;
  const current = trend.find(point => point.label === activeYear)?.value ?? null;
  const prior = trend.find(point => Number(point.label) === Number(activeYear) - 1)?.value;
  const delta = prior !== undefined && prior !== 0 && current !== null && Number(activeYear) !== section.breakYear ? (current - prior) / prior * 100 : null;
  const currentArea = area && activeYear ? reportedValue(area, commodity, activeYear, activePeriod) : null;
  const yieldValue = sector === 'crops' && current !== null && currentArea !== null && currentArea > 0 ? current / currentArea : null;
  const areaTrend: Point[] = area ? years.map(itemYear => ({ label: itemYear, value: reportedValue(area, commodity, itemYear, activePeriod) })).filter((point): point is Point => point.value !== null) : [];
  const treeTrend: Point[] = trees ? years.map(itemYear => ({ label: itemYear, value: reportedValue(trees, commodity, itemYear, activePeriod) })).filter((point): point is Point => point.value !== null) : [];
  const yieldTrend: Point[] = sector === 'crops' ? trend.map(point => ({ label: point.label, value: reportedValue(area!, commodity, point.label, activePeriod) })).filter((point): point is Point => point.value !== null && point.value > 0).map(point => ({ label: point.label, value: trend.find(item => item.label === point.label)!.value / point.value })) : [];
  const rankYear = year === 'ALL' ? activeYear : year;
  const rankIndexes = selectedColumns.filter(column => column.year === rankYear).map(column => column.arrayIndex);
  const placeRanks = rankings(sheet.rows, commodity, rankIndexes, 'provincial');
  const commodityName = commodity.toLowerCase();
  const productionUnit = sector === 'livestock' || (sector === 'poultry' && !/eggs/i.test(commodity)) ? 'metric tons, liveweight' : sector === 'poultry' ? 'metric tons of eggs' : 'metric tons';
  const CommodityMark = /corn/i.test(commodity) ? CornIcon : /mango/i.test(commodity) ? MangoIcon : section.icon;
  const direction = Number(activeYear) === section.breakYear ? 'Regional coverage changed at this point; a direct previous-year comparison is withheld.' : delta === null ? 'No previous-year comparison is available.' : `${Math.abs(delta).toFixed(1)}% ${delta >= 0 ? 'higher' : 'lower'} than ${Number(activeYear) - 1}.`;
  const lead = current !== null ? `${fmt(current, 2)} ${productionUnit} of ${commodityName} were recorded in ${activeYear} (${activePeriod.toLowerCase()}).` : 'No production figure is available for this selection.';

  return <>
    <section className="story-lead" aria-labelledby="story-title">
      <div><h2 id="story-title">{lead}</h2><p className="story-sub">{direction} Choose a commodity or period below to explore the figures.</p></div>
      <div className="story-mark"><CommodityMark size={42} strokeWidth={1.3} /><span>WESTERN VISAYAS</span></div>
    </section>
    <section className="filter-strip" aria-label="Data filters">
      <label>Commodity<select value={commodity} onChange={event => setCommodity(event.target.value)}>{commodities.map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Period<select value={activePeriod} onChange={event => setPeriod(event.target.value as Period)}>{availablePeriods.map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Year<select value={year} onChange={event => setYear(event.target.value)}><option value="ALL">Latest available</option>{years.map(item => <option key={item}>{item}</option>)}</select></label>
      <span className="filter-foot">PSA OpenSTAT snapshot · {section.scope}. One commodity at a time.</span>
    </section>
    <section className="metric-row" aria-label="Key measures">
      <div><span className="metric-label">Production</span><strong>{current === null ? '—' : compact(current)}</strong><small>{productionUnit} · {activeYear || 'selected year'}</small></div>
      <div><span className="metric-label">Year on year</span><strong className={delta !== null && delta < 0 ? 'down' : ''}>{delta === null ? '—' : <>{delta >= 0 ? <ArrowUpRight size={25} /> : <ArrowDownRight size={25} />}{Math.abs(delta).toFixed(1)}%</>}</strong><small>same period, previous year</small></div>
      {area && <div><span className="metric-label">{sector === 'crops' ? 'Yield' : 'Area'}</span><strong>{sector === 'crops' ? yieldValue === null ? '—' : fmt(yieldValue, 2) : currentArea === null ? '—' : compact(currentArea)}</strong><small>{sector === 'crops' ? 'metric tons per hectare' : 'hectares · planted/harvested'}</small></div>}
      <div><span className="metric-label">{placeRanks.length ? 'Top province' : 'Geographic coverage'}</span><strong className="text-metric">{placeRanks[0] ? cleanName(placeRanks[0].name) : 'Region only'}</strong><small>{placeRanks.length ? `by production · ${rankYear}` : 'no province comparison in source'}</small></div>
    </section>
    <section className="data-section"><div className="section-heading"><div><h3>How production has changed</h3><p>Western Visayas regional figures. The dashed marker shows a change in regional coverage; compare across it with care.</p></div><span className="unit-tag">{productionUnit}</span></div><TrendChart points={trend} unit={productionUnit} color="var(--accent)" label="Production" breakYear={section.breakYear} /></section>
    {areaTrend.length > 0 && <section className="data-section"><div className="section-heading"><div><h3>{sector === 'crops' ? 'Area harvested' : 'Area planted or harvested'}</h3><p>Reported area for the same commodity and period. This is a separate source measure.</p></div><span className="unit-tag">Hectares</span></div><TrendChart points={areaTrend} unit="hectares" color="var(--accent)" label="Area" breakYear={section.breakYear} /></section>}
    {sector === 'crops' && yieldTrend.length > 0 && <section className="data-section yield-section"><div className="section-heading"><div><h3>Yield per hectare</h3><p>Production divided by harvested area for the same period.</p></div><span className="unit-tag">MT / ha</span></div><TrendChart points={yieldTrend} unit="MT/ha" color="#ad782b" label="Yield" /></section>}
    {treeTrend.length > 0 && <section className="data-section"><div className="section-heading"><div><h3>Bearing trees, hills or vines</h3><p>Reported source counts. These are not hectares or production volume.</p></div><span className="unit-tag">Count</span></div><TrendChart points={treeTrend} unit="bearing trees/hills/vines" color="var(--accent)" label="Bearing plants" breakYear={section.breakYear} /></section>}
    {placeRanks.length > 0 ? <section className="data-section"><div className="section-heading"><div><h3>Where output is concentrated</h3><p>Province figures for {rankYear}, where supplied by OpenSTAT. The regional total is shown above and is not added to these values.</p></div><span className="unit-tag">Provinces</span></div><RankedBars data={placeRanks.slice(0, 8)} unit={productionUnit} /></section> : <section className="data-section coverage-note"><h3>Regional figures only</h3><p>This dataset does not provide a comparable province breakdown for {rankYear}. The chart above uses the reported Western Visayas total.</p></section>}
    {placeRanks.length > 0 && <section className="data-section table-section"><div className="section-heading"><div><h3>Province figures</h3><p>Sorted by production. Figures reflect the active filters.</p></div><button className="text-button" onClick={() => downloadCsv(`western-visayas-${sector}-${rankYear}.csv`, [['Province', `Production (${productionUnit})`], ...placeRanks.map(item => [item.name, item.value])])}><Download size={17} /> Export CSV</button></div><div className="table-scroll"><table><thead><tr><th>Rank</th><th>Province</th><th>Production <span>{productionUnit}</span></th></tr></thead><tbody>{placeRanks.map((item, index) => <tr key={item.name}><td>{String(index + 1).padStart(2, '0')}</td><td>{item.name}</td><td>{fmt(item.value, 2)}</td></tr>)}</tbody></table></div></section>}
  </>;
}

export default function App() {
  const [sector, setSector] = useState<Sector>('crops');
  const [loaded, setLoaded] = useState<Partial<Record<Sector, Loaded>>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (loaded[sector]) return;
    let cancelled = false;
    setLoading(true); setError('');
    const tabs: DataFile[] = sector === 'crops' ? ['crops', 'area'] : sector === 'fruit' ? ['fruit', 'fruit_area', 'fruit_trees'] : sector === 'vegetables' ? ['vegetables', 'vegetables_area'] : sector === 'farmers' ? ['rsbsa_profiles', 'rsbsa_areas'] : [sector];
    Promise.all(tabs.map(fetchTab))
      .then(([csv, areaCsv, treeCsv]) => { if (!cancelled) setLoaded(previous => ({ ...previous, [sector]: parseLoaded(sector, csv, areaCsv, treeCsv) })); })
      .catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to read the workbook.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sector, reload]);
  const current = loaded[sector];
  const section = nav.find(item => item.key === sector)!;
  return <div className={`app-shell theme-${sector}`}>
    <aside className="sidebar"><div className="brand"><span className="brand-icon"><Leaf size={25} strokeWidth={1.7} /></span><div><strong>AGRICULTURE PORTAL</strong><small>WESTERN VISAYAS</small></div></div><div className="sidebar-rule" /><p className="nav-caption">EXPLORE THE DATA</p><nav aria-label="Main navigation">{nav.map(item => { const Icon = item.icon; return <button key={item.key} className={`nav-item nav-${item.key} ${sector === item.key ? 'selected' : ''}`} onClick={() => setSector(item.key)} aria-current={sector === item.key ? 'page' : undefined}><Icon size={20} strokeWidth={1.8} /><span><strong>{item.label}</strong><small>{item.description}</small></span><span className="nav-arrow">↗</span></button>; })}</nav><div className="sidebar-bottom"><p className="sidebar-stamp">NSM <span>2026</span></p><p>Western Visayas agriculture, presented for National Statistics Month.</p></div></aside>
    <main className="main"><header className="topline"><div><span className="topline-mark"><MapPin size={15} /> WESTERN VISAYAS</span><span className="topline-divider" /> <span>DEPARTMENT OF AGRICULTURE</span></div><span>PSA OpenSTAT + RSBSA snapshot</span></header><div className="content"><div className="page-heading"><div><h1>{section.label}</h1><p>{section.scope} · Source figures are presented at their reported geographic level.</p></div><button className="refresh" onClick={() => { setLoaded(previous => ({ ...previous, [sector]: undefined })); setReload(value => value + 1); }} aria-label="Refresh data" title="Refresh data"><RefreshCw size={19} /></button></div>
      {loading && !current ? <div className="loading-state" role="status"><span className="loading-bar" /><h2>Reading the data snapshot…</h2><p>Preparing the figures and comparisons.</p></div> : error ? <div className="error-state" role="alert"><h2>We couldn’t load this section.</h2><p>{error}</p><p>The published data file may be unavailable.</p><button onClick={() => setReload(value => value + 1)}>Try again</button></div> : current?.kind === 'farmers' ? <RsbsaPage key={sector} profiles={current.profiles} areas={current.areas} /> : current?.kind === 'commodity' ? <CommodityPage key={sector} sector={sector as Exclude<Sector, 'farmers'>} data={current} /> : null}
      <footer><span>AGRICULTURE PORTAL / DA · NSM 2026</span><span>Source: supplied PSA OpenSTAT exports and RSBSA workbook. Snapshot built 12 Oct 2026.</span></footer></div></main>
  </div>;
}
