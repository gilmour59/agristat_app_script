import { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Beef, Bird, Download, ExternalLink, Leaf, MapPin, RefreshCw, Sprout, UsersRound, Wheat } from 'lucide-react';
import { cleanName, fetchTab, normalizePeriod, parseCommoditySheet, parseFarmersSheet, SHEET_URL, sortYears, totalFor } from './data';
import type { CommodityRow, CommoditySheet, FarmerRow, Period, Sector } from './data';

type Loaded = { kind: 'commodity'; sheet: CommoditySheet; area?: CommoditySheet } | { kind: 'farmers'; rows: FarmerRow[] };
type Point = { label: string; value: number };
type Rank = { name: string; value: number };

const nav: { key: Sector; label: string; icon: typeof Wheat; description: string }[] = [
  { key: 'crops', label: 'Palay & corn', icon: Wheat, description: 'Harvest and yield' },
  { key: 'livestock', label: 'Livestock', icon: Beef, description: 'Production volume' },
  { key: 'poultry', label: 'Poultry', icon: Bird, description: 'Production volume' },
  { key: 'farmers', label: 'Farmers profile', icon: UsersRound, description: 'Registry and people' },
];

const fmt = (value: number, digits = 0) => new Intl.NumberFormat('en-PH', { maximumFractionDigits: digits }).format(value);
const compact = (value: number) => value >= 1_000_000 ? `${fmt(value / 1_000_000, 2)}M` : value >= 1_000 ? `${fmt(value / 1_000, 1)}K` : fmt(value);

function TrendChart({ points, unit, color, label }: { points: Point[]; unit: string; color: string; label: string }) {
  const width = 820, height = 270, left = 48, right = 18, top = 25, bottom = 40;
  const plotW = width - left - right, plotH = height - top - bottom;
  const max = Math.max(1, ...points.map(point => point.value)) * 1.12;
  const coordinates = points.map((point, index) => ({
    x: left + (points.length === 1 ? plotW / 2 : (index / (points.length - 1)) * plotW),
    y: top + plotH - point.value / max * plotH,
  }));
  const path = coordinates.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const area = coordinates.length ? `${path} L ${coordinates.at(-1)!.x} ${top + plotH} L ${coordinates[0].x} ${top + plotH} Z` : '';
  const gradientId = `fade-${label.replace(/\W/g, '')}`;
  return <div className="trend-chart">
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label} by year in ${unit}`} preserveAspectRatio="xMidYMid meet">
      <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".2" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      {[0, .5, 1].map(fraction => <g key={fraction}><line x1={left} x2={width - right} y1={top + plotH * fraction} y2={top + plotH * fraction} stroke="#d9dfd5" strokeDasharray="3 6" /><text x={left - 10} y={top + plotH * fraction + 4} textAnchor="end" className="axis-label">{compact(max * (1 - fraction))}</text></g>)}
      {area && <path d={area} fill={`url(#${gradientId})`} />}
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

function parseLoaded(sector: Sector, csv: string, areaCsv?: string): Loaded {
  if (sector === 'farmers') return { kind: 'farmers', rows: parseFarmersSheet(csv) };
  return { kind: 'commodity', sheet: parseCommoditySheet(csv), area: areaCsv ? parseCommoditySheet(areaCsv) : undefined };
}

function sourceRows(rows: CommodityRow[], commodity: string, level: 'country' | 'regional' | 'provincial') {
  return rows.filter(row => (commodity === 'ALL' || row.commodity === commodity) &&
    (level === 'country' ? /country|national/i.test(row.level) || /philippines/i.test(row.name) :
      level === 'regional' ? /region/i.test(row.level) : /province/i.test(row.level)));
}

function nationalRows(rows: CommodityRow[], commodity: string) {
  const country = sourceRows(rows, commodity, 'country');
  return country.length ? country : sourceRows(rows, commodity, 'regional');
}

function rankings(rows: CommodityRow[], commodity: string, indexes: number[], level: 'regional' | 'provincial'): Rank[] {
  const totals = new Map<string, number>();
  sourceRows(rows, commodity, level).forEach(row => totals.set(row.name, (totals.get(row.name) || 0) + totalFor(row, indexes)));
  return [...totals].map(([name, value]) => ({ name, value })).filter(item => item.value > 0).sort((a, b) => b.value - a.value);
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const text = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}

function CommodityPage({ sector, data }: { sector: Exclude<Sector, 'farmers'>; data: Extract<Loaded, { kind: 'commodity' }> }) {
  const { sheet, area } = data;
  const commodities = useMemo(() => [...new Set(sheet.rows.map(row => row.commodity))].sort(), [sheet]);
  const years = useMemo(() => sortYears(sheet.columns), [sheet]);
  const [commodity, setCommodity] = useState('ALL');
  const [year, setYear] = useState('ALL');
  const [period, setPeriod] = useState<Period>('Annual');
  const [placeLevel, setPlaceLevel] = useState<'regional' | 'provincial'>('regional');
  useEffect(() => { setCommodity('ALL'); setYear('ALL'); setPeriod('Annual'); setPlaceLevel('regional'); }, [sector]);
  const availablePeriods = useMemo(() => [...new Set(sheet.columns.map(column => normalizePeriod(column.period)).filter((value): value is Period => Boolean(value)))], [sheet]);
  const activePeriod = availablePeriods.includes(period) ? period : availablePeriods[0] || 'Annual';
  const selectedColumns = sheet.columns.map((column, index) => ({ ...column, arrayIndex: index }))
    .filter(column => normalizePeriod(column.period) === activePeriod && (year === 'ALL' || column.year === year));
  const indexes = selectedColumns.map(column => column.arrayIndex);
  const national = nationalRows(sheet.rows, commodity);
  const trend: Point[] = years.map(itemYear => ({ label: itemYear,
    value: national.reduce((sum, row) => sum + totalFor(row, sheet.columns.map((column, index) => ({ column, index }))
      .filter(item => item.column.year === itemYear && normalizePeriod(item.column.period) === activePeriod).map(item => item.index)), 0),
  })).filter(point => point.value > 0);
  const activeYear = year === 'ALL' ? trend.at(-1)?.label : year;
  const current = trend.find(point => point.label === activeYear)?.value || 0;
  const prior = trend.find(point => Number(point.label) === Number(activeYear) - 1)?.value;
  const delta = prior && current ? (current - prior) / prior * 100 : null;
  const areaNational = area ? nationalRows(area.rows, commodity) : [];
  const currentArea = area && activeYear ? areaNational.reduce((sum, row) => sum + totalFor(row, area.columns.map((column, index) => ({ column, index }))
    .filter(item => item.column.year === activeYear && normalizePeriod(item.column.period) === activePeriod).map(item => item.index)), 0) : 0;
  const yieldValue = currentArea > 0 ? current / currentArea : null;
  const yieldTrend: Point[] = area ? trend.map(point => {
    const areaIndexes = area.columns.map((column, index) => ({ column, index }))
      .filter(item => item.column.year === point.label && normalizePeriod(item.column.period) === activePeriod).map(item => item.index);
    const totalArea = areaNational.reduce((sum, row) => sum + totalFor(row, areaIndexes), 0);
    return { label: point.label, value: totalArea > 0 ? point.value / totalArea : 0 };
  }).filter(point => point.value > 0) : [];
  const rankYear = year === 'ALL' ? activeYear : year;
  const rankIndexes = selectedColumns.filter(column => column.year === rankYear).map(column => column.arrayIndex);
  const regionRanks = rankings(sheet.rows, commodity, rankIndexes, 'regional');
  const placeRanks = rankings(sheet.rows, commodity, rankIndexes, placeLevel);
  const commodityName = commodity === 'ALL' ? (sector === 'crops' ? 'palay and corn' : sector) : commodity.toLowerCase();
  const direction = delta === null ? 'No previous-year comparison is available.' : `${Math.abs(delta).toFixed(1)}% ${delta >= 0 ? 'higher' : 'lower'} than ${Number(activeYear) - 1}.`;
  const lead = current ? `${fmt(current)} metric tons of ${commodityName} were recorded in ${activeYear} (${activePeriod.toLowerCase()}).` : 'No production figure is available for this selection.';

  return <>
    <section className="story-lead" aria-labelledby="story-title">
      <div><h2 id="story-title">{lead}</h2><p className="story-sub">{direction} Choose a commodity or period below to explore the figures.</p></div>
      <div className="story-mark"><Sprout size={42} strokeWidth={1.3} /><span>DA / NSM</span></div>
    </section>
    <section className="filter-strip" aria-label="Data filters">
      <label>Commodity<select value={commodity} onChange={event => setCommodity(event.target.value)}><option value="ALL">All commodities</option>{commodities.map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Period<select value={activePeriod} onChange={event => setPeriod(event.target.value as Period)}>{availablePeriods.map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Year<select value={year} onChange={event => setYear(event.target.value)}><option value="ALL">Latest available</option>{years.map(item => <option key={item}>{item}</option>)}</select></label>
      <span className="filter-foot">Values are read from the live NSM workbook.</span>
    </section>
    <section className="metric-row" aria-label="Key measures">
      <div><span className="metric-label">Production</span><strong>{current ? compact(current) : '—'}</strong><small>metric tons · {activeYear || 'selected year'}</small></div>
      <div><span className="metric-label">Year on year</span><strong className={delta !== null && delta < 0 ? 'down' : ''}>{delta === null ? '—' : <>{delta >= 0 ? <ArrowUpRight size={25} /> : <ArrowDownRight size={25} />}{Math.abs(delta).toFixed(1)}%</>}</strong><small>same period, previous year</small></div>
      {sector === 'crops' && <div><span className="metric-label">Yield</span><strong>{yieldValue === null ? '—' : fmt(yieldValue, 2)}</strong><small>metric tons per hectare</small></div>}
      <div><span className="metric-label">Top region</span><strong className="text-metric">{regionRanks[0] ? cleanName(regionRanks[0].name) : '—'}</strong><small>by production · {rankYear || 'selected year'}</small></div>
    </section>
    <section className="data-section"><div className="section-heading"><div><h3>How production has changed</h3><p>Annual values use the same commodity and period selection. Hover points for exact figures.</p></div><span className="unit-tag">Metric tons</span></div><TrendChart points={trend} unit="MT" color="#15583b" label="Production" /></section>
    {sector === 'crops' && yieldTrend.length > 0 && <section className="data-section yield-section"><div className="section-heading"><div><h3>Yield per hectare</h3><p>Production divided by harvested area for the same period.</p></div><span className="unit-tag">MT / ha</span></div><TrendChart points={yieldTrend} unit="MT/ha" color="#ad782b" label="Yield" /></section>}
    <section className="data-section"><div className="section-heading"><div><h3>Where output is concentrated</h3><p>Ranked using {activePeriod.toLowerCase()} production for {rankYear || 'the selected year'}.</p></div><div className="segmented" role="group" aria-label="Geography level"><button className={placeLevel === 'regional' ? 'active' : ''} onClick={() => setPlaceLevel('regional')}>Regions</button><button className={placeLevel === 'provincial' ? 'active' : ''} onClick={() => setPlaceLevel('provincial')}>Provinces</button></div></div><RankedBars data={placeRanks.slice(0, 8)} unit="MT" />{placeRanks.length > 8 && <p className="chart-foot">Showing the top 8 of {placeRanks.length} locations. The table below includes all.</p>}</section>
    <section className="data-section table-section"><div className="section-heading"><div><h3>Location figures</h3><p>Sorted by production. Figures reflect the active filters.</p></div><button className="text-button" onClick={() => downloadCsv(`agristat-${sector}-${rankYear}.csv`, [['Location', 'Production (MT)'], ...placeRanks.map(item => [item.name, item.value])])}><Download size={17} /> Export CSV</button></div><div className="table-scroll"><table><thead><tr><th>Rank</th><th>Location</th><th>Production <span>MT</span></th></tr></thead><tbody>{placeRanks.map((item, index) => <tr key={item.name}><td>{String(index + 1).padStart(2, '0')}</td><td>{item.name}</td><td>{fmt(item.value, 2)}</td></tr>)}</tbody></table></div></section>
  </>;
}

function FarmersPage({ rows }: { rows: FarmerRow[] }) {
  const provinces = useMemo(() => [...new Set(rows.map(row => row.province))].sort(), [rows]);
  const [province, setProvince] = useState('ALL');
  const filtered = rows.filter(row => province === 'ALL' || row.province === province);
  const total = filtered.reduce((sum, row) => sum + row.total, 0);
  const male = filtered.reduce((sum, row) => sum + row.male, 0);
  const female = filtered.reduce((sum, row) => sum + row.female, 0);
  const seniors = filtered.reduce((sum, row) => sum + row.seniors, 0);
  const farmers = filtered.reduce((sum, row) => sum + row.farmers, 0);
  const ageBase = filtered.reduce((sum, row) => sum + (row.averageAge > 0 ? row.total : 0), 0);
  const age = ageBase ? filtered.reduce((sum, row) => sum + row.averageAge * row.total, 0) / ageBase : 0;
  const provinceRanks = provinces.map(name => ({ name, value: rows.filter(row => row.province === name).reduce((sum, row) => sum + row.total, 0) })).sort((a, b) => b.value - a.value);
  const municipalityRanks = filtered.map(row => ({ name: province === 'ALL' ? `${row.municipality}, ${row.province}` : row.municipality, value: row.total })).sort((a, b) => b.value - a.value);
  return <>
    <section className="story-lead" aria-labelledby="story-title"><div><h2 id="story-title">{fmt(total)} people are listed in the registry{province === 'ALL' ? ' across the available provinces' : ` in ${province}`}.</h2><p className="story-sub">{total ? `${fmt(female / total * 100, 1)}% are female, and ${fmt(seniors / total * 100, 1)}% are recorded as seniors.` : 'No records match this selection.'} Counts are from the Total Registrants columns.</p></div><div className="story-mark"><UsersRound size={42} strokeWidth={1.3} /><span>RSBSA</span></div></section>
    <section className="filter-strip farmers-filter" aria-label="Registry filters"><label>Province<select value={province} onChange={event => setProvince(event.target.value)}><option value="ALL">All provinces</option>{provinces.map(item => <option key={item}>{item}</option>)}</select></label><span className="filter-foot">Municipality records in the FarmersProfile tab. No generated estimates.</span></section>
    <section className="metric-row" aria-label="Registry measures"><div><span className="metric-label">Total registrants</span><strong>{compact(total)}</strong><small>male and female combined</small></div><div><span className="metric-label">Average age</span><strong>{total ? fmt(age) : '—'}</strong><small>years · weighted by registrants</small></div><div><span className="metric-label">Recorded seniors</span><strong>{compact(seniors)}</strong><small>{total ? `${fmt(seniors / total * 100, 1)}% of registrants` : 'of registrants'}</small></div><div><span className="metric-label">Farmer subset</span><strong>{compact(farmers)}</strong><small>separate FARMERS column</small></div></section>
    <section className="data-section"><div className="section-heading"><div><h3>Gender distribution</h3><p>Male and female registrants in the selected area.</p></div><span className="unit-tag">People</span></div><div className="composition"><div style={{ width: `${male + female ? male / (male + female) * 100 : 0}%` }} /><div style={{ width: `${male + female ? female / (male + female) * 100 : 0}%` }} /></div><div className="composition-legend"><span><i className="male-dot" /> Male <strong>{fmt(male)}</strong></span><span><i className="female-dot" /> Female <strong>{fmt(female)}</strong></span></div></section>
    {province === 'ALL' && <section className="data-section"><div className="section-heading"><div><h3>Where registrants are concentrated</h3><p>Ranked by the total number of people listed.</p></div><span className="unit-tag">People</span></div><RankedBars data={provinceRanks} unit="people" /></section>}
    <section className="data-section"><div className="section-heading"><div><h3>Largest local registries</h3><p>Top eight municipalities in this selection.</p></div><span className="unit-tag">People</span></div><RankedBars data={municipalityRanks.slice(0, 8)} unit="people" color="gold" /></section>
    <section className="data-section table-section"><div className="section-heading"><div><h3>Municipality records</h3><p>The average age is reported by the source sheet for each municipality.</p></div><button className="text-button" onClick={() => downloadCsv('agristat-farmers-profile.csv', [['Province', 'Municipality', 'District', 'Registrants', 'Male', 'Female', 'Average age', 'Seniors', 'Farmers subset'], ...filtered.map(row => [row.province, row.municipality, row.district, row.total, row.male, row.female, row.averageAge, row.seniors, row.farmers])])}><Download size={17} /> Export CSV</button></div><div className="table-scroll"><table><thead><tr><th>Province</th><th>Municipality</th><th>District</th><th>Registrants</th><th>Female</th><th>Avg. age</th><th>Seniors</th></tr></thead><tbody>{[...filtered].sort((a, b) => b.total - a.total).map(row => <tr key={`${row.province}-${row.municipality}`}><td>{row.province}</td><td>{row.municipality}</td><td>{row.district}</td><td>{fmt(row.total)}</td><td>{fmt(row.female)}</td><td>{row.averageAge || '—'}</td><td>{fmt(row.seniors)}</td></tr>)}</tbody></table></div></section>
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
    Promise.all(sector === 'crops' ? [fetchTab('crops'), fetchTab('area')] : [fetchTab(sector)])
      .then(([csv, areaCsv]) => { if (!cancelled) setLoaded(previous => ({ ...previous, [sector]: parseLoaded(sector, csv, areaCsv) })); })
      .catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to read the workbook.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sector, reload]);
  const current = loaded[sector];
  const section = nav.find(item => item.key === sector)!;
  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><span className="brand-icon"><Leaf size={25} strokeWidth={1.7} /></span><div><strong>AGRISTAT</strong><small>DATA, CLEARLY TOLD</small></div></div><div className="sidebar-rule" /><p className="nav-caption">EXPLORE THE DATA</p><nav aria-label="Main navigation">{nav.map(item => { const Icon = item.icon; return <button key={item.key} className={`nav-item ${sector === item.key ? 'selected' : ''}`} onClick={() => setSector(item.key)} aria-current={sector === item.key ? 'page' : undefined}><Icon size={20} strokeWidth={1.8} /><span><strong>{item.label}</strong><small>{item.description}</small></span><span className="nav-arrow">↗</span></button>; })}</nav><div className="sidebar-bottom"><p className="sidebar-stamp">NSM <span>2026</span></p><p>Philippine agriculture, presented for the National Statistics Month.</p><a href={SHEET_URL} target="_blank" rel="noreferrer">Open source workbook <ExternalLink size={14} /></a></div></aside>
    <main className="main"><header className="topline"><div><span className="topline-mark"><MapPin size={15} /> PHILIPPINES</span><span className="topline-divider" /> <span>DEPARTMENT OF AGRICULTURE</span></div><a href={SHEET_URL} target="_blank" rel="noreferrer">Source workbook <ExternalLink size={15} /></a></header><div className="content"><div className="page-heading"><div><h1>{section.label}</h1><p>Understand the story in the data, then inspect the figures behind it.</p></div><button className="refresh" onClick={() => { setLoaded(previous => ({ ...previous, [sector]: undefined })); setReload(value => value + 1); }} aria-label="Refresh data" title="Refresh data"><RefreshCw size={19} /></button></div>
      {loading && !current ? <div className="loading-state" role="status"><span className="loading-bar" /><h2>Reading the source workbook…</h2><p>Preparing the latest figures and comparisons.</p></div> : error ? <div className="error-state" role="alert"><h2>We couldn’t load this section.</h2><p>{error}</p><p>Check that the copied Google Sheet is still public and the tab structure has not changed.</p><button onClick={() => setReload(value => value + 1)}>Try again</button></div> : current?.kind === 'farmers' ? <FarmersPage rows={current.rows} /> : current?.kind === 'commodity' ? <CommodityPage key={sector} sector={sector as Exclude<Sector, 'farmers'>} data={current} /> : null}
      <footer><span>AGRISTAT / DA · NSM 2026</span><span>Source: linked Google Sheets workbook. Figures reflect its current contents.</span></footer></div></main>
  </div>;
}
