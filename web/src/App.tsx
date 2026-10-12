import { useEffect, useMemo, useState } from 'react';
import { Apple, ArrowDownRight, ArrowUpRight, Beef, Bird, Coffee, Download, MapPin, RefreshCw, UsersRound } from 'lucide-react';
import { BananaIcon, RiceCornIcon, VegetableIcon } from './CommodityIcons';
import { cleanName, fetchTab, normalizePeriod, parseCommoditySheet, sortYears, totalFor } from './data';
import type { CommodityRow, CommoditySheet, DataFile, Period, Sector } from './data';
type Loaded = { sheet: CommoditySheet; area?: CommoditySheet; trees?: CommoditySheet };
type Point = { label: string; value: number };
type Rank = { name: string; value: number };

const nav: { key: Sector; label: string; icon: typeof Apple | typeof BananaIcon; description: string; defaultCommodity?: string; scope: string }[] = [
  { key: 'crops', label: 'Rice & corn', icon: RiceCornIcon, description: 'Harvest and yield', defaultCommodity: 'Palay', scope: 'Region + provinces' },
  { key: 'fruit', label: 'Fruit crops', icon: BananaIcon, description: 'Banana and mango', defaultCommodity: 'Banana', scope: 'Region + provinces' },
  { key: 'vegetables', label: 'Vegetables', icon: VegetableIcon, description: 'Seven crop series', defaultCommodity: 'Eggplant', scope: 'Region + provinces' },
  { key: 'major', label: 'Other high value crops', icon: Coffee, description: 'Coffee and cacao', defaultCommodity: 'Cacao', scope: 'Region only' },
  { key: 'livestock', label: 'Livestock', icon: Beef, description: 'Four animal types', defaultCommodity: 'Hog', scope: 'Region + provinces from 2023' },
  { key: 'poultry', label: 'Poultry', icon: Bird, description: 'Chicken, duck and eggs', defaultCommodity: 'Chicken', scope: 'Chicken province detail' },
];

const RSBSA_URL = 'https://app.powerbi.com/view?r=eyJrIjoiMDk5MDdkMDgtNjU4Mi00MjNiLTg4NDUtMTY0ZjFkNTMwMWNhIiwidCI6IjI1MzYzMDI3LTUyNjQtNGE1Mi04MmRjLTgzYWNiZTMwY2M4YiIsImMiOjEwfQ%3D%3D';

const fmt = (value: number, digits = 0) => new Intl.NumberFormat('en-PH', { maximumFractionDigits: digits }).format(value);
const compact = (value: number) => value >= 1_000_000 ? `${fmt(value / 1_000_000, 2)}M` : value >= 1_000 ? `${fmt(value / 1_000, 1)}K` : fmt(value);

function ProductionBars({ points, unit }: { points: Point[]; unit: string }) {
  const max = Math.max(1, ...points.map(point => point.value));
  if (!points.length) return <p className="empty-small">No production values for this selection.</p>;
  return <div className="production-chart" role="img" aria-label={`Production by year, ${unit}. ${points.map(point => `${point.label}: ${fmt(point.value, 2)}`).join('; ')}`}>
    <div className="production-chart-guide"><span>YEAR</span><span>LONGER BAR = MORE PRODUCTION</span><span>PRODUCTION</span></div>
    {points.map((point, index) => <div key={point.label}>
      <div className={`production-chart-row ${index === points.length - 1 ? 'latest' : ''}`} title={`${point.label}: ${fmt(point.value, 2)} ${unit}`}>
        <span className="production-year">{point.label}</span>
        <span className="production-track"><span style={{ width: `${Math.max(2, point.value / max * 100)}%` }} /></span>
        <strong>{fmt(point.value, 2)}</strong>
      </div>
    </div>)}
    <p className="production-chart-note">Each bar is one year for the selected reporting period. Values are {unit}.</p>
  </div>;
}

function TrendChart({ points, unit, color, label }: { points: Point[]; unit: string; color: string; label: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const width = 820, height = 270, left = 48, right = 18, top = 25, bottom = 40;
  const plotW = width - left - right, plotH = height - top - bottom;
  const max = Math.max(1, ...points.map(point => point.value)) * 1.12;
  const coordinates = points.map((point, index) => ({
    x: left + (points.length === 1 ? plotW / 2 : (index / (points.length - 1)) * plotW),
    y: top + plotH - point.value / max * plotH,
  }));
  const path = coordinates.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const shown = points[selected !== null && selected < points.length ? selected : points.length - 1];
  return <div className="trend-chart">
    <div className="chart-readout" aria-live="polite"><span>{shown ? `${selected === null ? 'Latest' : 'Selected'} · ${shown.label}` : 'No values available'}</span><strong>{shown ? `${fmt(shown.value, 2)} ${unit}` : '—'}</strong><small>Hover, tap, or focus a point for its exact value.</small></div>
    <svg viewBox={`0 0 ${width} ${height}`} role="group" aria-label={`${label} by year in ${unit}`} preserveAspectRatio="xMidYMid meet" onPointerMove={event => { if (!coordinates.length) return; const bounds = event.currentTarget.getBoundingClientRect(); const x = (event.clientX - bounds.left) / bounds.width * width; const nearest = coordinates.reduce((best, point, index) => Math.abs(point.x - x) < Math.abs(coordinates[best].x - x) ? index : best, 0); setSelected(nearest); }}>
      {[0, .5, 1].map(fraction => <g key={fraction}><line x1={left} x2={width - right} y1={top + plotH * fraction} y2={top + plotH * fraction} stroke="#d9dfd5" strokeDasharray="3 6" /><text x={left - 10} y={top + plotH * fraction + 4} textAnchor="end" className="axis-label">{compact(max * (1 - fraction))}</text></g>)}
      {path && <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
      {coordinates.map((point, index) => <g key={points[index].label}><circle cx={point.x} cy={point.y} r="15" fill="transparent" tabIndex={0} role="img" aria-label={`${points[index].label}: ${fmt(points[index].value, 2)} ${unit}`} onPointerEnter={() => setSelected(index)} onFocus={() => setSelected(index)} onClick={() => setSelected(index)} /><circle cx={point.x} cy={point.y} r={selected === index ? 7 : 5} fill="#fff" stroke={color} strokeWidth="2.5" pointerEvents="none" /><text x={point.x} y={height - 11} textAnchor="middle" className="axis-label">{points[index].label}</text></g>)}
    </svg>
  </div>;
}

function RankedBars({ data, unit, color = 'green' }: { data: Rank[]; unit: string; color?: 'green' | 'gold' }) {
  const max = Math.max(1, ...data.map(item => item.value));
  if (!data.length) return <p className="empty-small">No comparable locations in this selection.</p>;
  return <ol className={`ranked-bars ${color}`}>
    {data.map((item, index) => <li key={item.name}>
      <span className="rank-number">{String(index + 1).padStart(2, '0')}</span>
      <div className="rank-content"><div className="rank-heading"><span title={item.name}>{cleanName(item.name)}</span><strong>{unit === 'MT/ha' ? fmt(item.value, 2) : compact(item.value)} <small>{unit}</small></strong></div><div className="bar-track"><div style={{ width: `${item.value / max * 100}%` }} /></div></div>
    </li>)}
  </ol>;
}

function parseLoaded(csv: string, areaCsv?: string, treeCsv?: string): Loaded {
  return { sheet: parseCommoditySheet(csv), area: areaCsv ? parseCommoditySheet(areaCsv) : undefined, trees: treeCsv ? parseCommoditySheet(treeCsv) : undefined };
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

function hasObservedCoverageChange(sheet: CommoditySheet, commodity: string): boolean {
  const indexFor = (year: string) => sheet.columns.findIndex(column => column.year === year && normalizePeriod(column.period) === 'Annual');
  const oldIndex = indexFor('2024'), newIndex = indexFor('2025');
  if (oldIndex < 0 || newIndex < 0) return false;
  const oldRegion = reportedValue(sheet, commodity, '2024', 'Annual');
  const newRegion = reportedValue(sheet, commodity, '2025', 'Annual');
  const oldProvinces = rankings(sheet.rows, commodity, [oldIndex], 'provincial');
  const newProvinces = rankings(sheet.rows, commodity, [newIndex], 'provincial');
  if (oldRegion === null || newRegion === null || oldProvinces.length < 5 || newProvinces.length < 5) return false;
  const oldSum = oldProvinces.reduce((sum, place) => sum + place.value, 0);
  const newSum = newProvinces.reduce((sum, place) => sum + place.value, 0);
  return oldRegion - oldSum > oldRegion * .05 && Math.abs(newRegion - newSum) <= Math.max(1, newRegion * .001);
}

function sameProvinceComparison(sheet: CommoditySheet, commodity: string, period: Period) {
  const provinceTotals = (year: string) => {
    const indexes = sheet.columns.map((column, index) => ({ column, index }))
      .filter(item => item.column.year === year && normalizePeriod(item.column.period) === period)
      .map(item => item.index);
    return rankings(sheet.rows, commodity, indexes, 'provincial');
  };
  const before = provinceTotals('2024'), after = provinceTotals('2025');
  const currentProvinces = ['Aklan', 'Antique', 'Capiz', 'Guimaras', 'Iloilo'];
  if (before.length !== 5 || after.length !== 5 ||
    !currentProvinces.every(name => before.some(item => cleanName(item.name) === name) && after.some(item => cleanName(item.name) === name))) return null;
  const beforeTotal = before.reduce((sum, item) => sum + item.value, 0);
  const afterTotal = after.reduce((sum, item) => sum + item.value, 0);
  const beforeRegion = reportedValue(sheet, commodity, '2024', period);
  const afterRegion = reportedValue(sheet, commodity, '2025', period);
  if (!beforeTotal || beforeRegion === null || afterRegion === null ||
    beforeRegion - beforeTotal <= beforeRegion * .05 ||
    Math.abs(afterRegion - afterTotal) > Math.max(1, afterRegion * .001)) return null;
  return { beforeTotal, afterTotal, beforeRegion, afterRegion, change: (afterTotal - beforeTotal) / beforeTotal * 100 };
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const text = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}

function CommodityPage({ sector, data }: { sector: Sector; data: Loaded }) {
  const { sheet, area, trees } = data;
  const commodities = useMemo(() => [...new Set(sheet.rows.map(row => row.commodity))].sort(), [sheet]);
  const section = nav.find(item => item.key === sector)!;
  const SectionIcon = section.icon;
  const [commodity, setCommodity] = useState(section.defaultCommodity || commodities[0]);
  const [provinceMetric, setProvinceMetric] = useState<'production' | 'area' | 'yield' | 'trees'>('production');
  const breakYear = hasObservedCoverageChange(sheet, commodity) ? 2025 : undefined;
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
  const delta = prior !== undefined && prior !== 0 && current !== null ? (current - prior) / prior * 100 : null;
  const provinceComparison = Number(activeYear) === breakYear ? sameProvinceComparison(sheet, commodity, activePeriod) : null;
  const coverageCaution = delta !== null && Number(activeYear) === breakYear;
  const displayDelta = provinceComparison?.change ?? delta;
  const currentArea = area && activeYear ? reportedValue(area, commodity, activeYear, activePeriod) : null;
  const yieldValue = sector === 'crops' && current !== null && currentArea !== null && currentArea > 0 ? current / currentArea : null;
  const areaTrend: Point[] = area ? years.map(itemYear => ({ label: itemYear, value: reportedValue(area, commodity, itemYear, activePeriod) })).filter((point): point is Point => point.value !== null) : [];
  const treeTrend: Point[] = trees ? years.map(itemYear => ({ label: itemYear, value: reportedValue(trees, commodity, itemYear, activePeriod) })).filter((point): point is Point => point.value !== null) : [];
  const yieldTrend: Point[] = sector === 'crops' ? trend.map(point => ({ label: point.label, value: reportedValue(area!, commodity, point.label, activePeriod) })).filter((point): point is Point => point.value !== null && point.value > 0).map(point => ({ label: point.label, value: trend.find(item => item.label === point.label)!.value / point.value })) : [];
  const rankYear = year === 'ALL' ? activeYear : year;
  const rankIndexes = selectedColumns.filter(column => column.year === rankYear).map(column => column.arrayIndex);
  const placeRanks = rankings(sheet.rows, commodity, rankIndexes, 'provincial');
  const measureRanks = (source?: CommoditySheet) => source ? rankings(source.rows, commodity, source.columns.map((column, index) => ({ column, index }))
    .filter(item => item.column.year === rankYear && normalizePeriod(item.column.period) === activePeriod)
    .map(item => item.index), 'provincial') : [];
  const areaRanks = measureRanks(area), treeRanks = measureRanks(trees);
  const areaByProvince = new Map(areaRanks.map(item => [item.name, item.value]));
  const treesByProvince = new Map(treeRanks.map(item => [item.name, item.value]));
  const showArea = placeRanks.some(item => areaByProvince.has(item.name));
  const showYield = sector === 'crops' && placeRanks.some(item => (areaByProvince.get(item.name) || 0) > 0);
  const showTrees = placeRanks.some(item => treesByProvince.has(item.name));
  const activeProvinceMetric = provinceMetric === 'area' && showArea || provinceMetric === 'yield' && showYield || provinceMetric === 'trees' && showTrees ? provinceMetric : 'production';
  const provinceChart = activeProvinceMetric === 'area' ? areaRanks : activeProvinceMetric === 'trees' ? treeRanks : activeProvinceMetric === 'yield' ? placeRanks
    .filter(item => (areaByProvince.get(item.name) || 0) > 0)
    .map(item => ({ name: item.name, value: item.value / areaByProvince.get(item.name)! }))
    .sort((a, b) => b.value - a.value) : placeRanks;
  const commodityName = commodity.toLowerCase();
  const productionUnit = sector === 'livestock' || (sector === 'poultry' && !/eggs/i.test(commodity)) ? 'metric tons, liveweight' : sector === 'poultry' ? 'metric tons of eggs' : 'metric tons';
  const provinceChartUnit = activeProvinceMetric === 'area' ? 'hectares' : activeProvinceMetric === 'yield' ? 'MT/ha' : activeProvinceMetric === 'trees' ? 'bearing plants' : productionUnit;
  const direction = provinceComparison ? `Across the same five provinces, production was ${Math.abs(provinceComparison.change).toFixed(1)}% ${provinceComparison.change >= 0 ? 'higher' : 'lower'} than in 2024. The published regional totals cover different areas; see the comparison below.` : delta === null ? 'No previous-year comparison is available.' : `${Math.abs(delta).toFixed(1)}% ${delta >= 0 ? 'higher' : 'lower'} than ${Number(activeYear) - 1} in the reported totals.${coverageCaution ? ' PSA included Negros Occidental in the 2024 Western Visayas total, so this is not a same-area comparison.' : ''}`;
  const lead = current !== null ? `${fmt(current, 2)} ${productionUnit} of ${commodityName} were recorded in ${activeYear} (${activePeriod.toLowerCase()}).` : 'No production figure is available for this selection.';

  return <>
    <section className="story-lead" aria-labelledby="story-title">
      <div><h2 id="story-title">{lead}</h2><p className="story-sub">{direction} Choose a commodity or period below to explore the figures.</p></div>
      <div className="story-mark"><SectionIcon size={48} strokeWidth={1.3} /><span>{commodity.toUpperCase()}</span></div>
    </section>
    <section className="filter-strip" aria-label="Data filters">
      <label>Commodity<select value={commodity} onChange={event => setCommodity(event.target.value)}>{commodities.map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Period<select value={activePeriod} onChange={event => setPeriod(event.target.value as Period)}>{availablePeriods.map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Year<select value={year} onChange={event => setYear(event.target.value)}><option value="ALL">Latest available</option>{years.map(item => <option key={item}>{item}</option>)}</select></label>
      <span className="filter-foot">Choose a commodity, period, and year.</span>
    </section>
    <section className="metric-row" aria-label="Key measures">
      <div><span className="metric-label">Production</span><strong>{current === null ? '—' : compact(current)}</strong><small>{productionUnit} · {activeYear || 'selected year'}</small></div>
      <div><span className="metric-label">{provinceComparison ? 'Same five provinces' : coverageCaution ? 'Reported year on year' : 'Year on year'}</span><strong className={displayDelta !== null && displayDelta < 0 ? 'down' : ''}>{displayDelta === null ? '—' : <>{displayDelta >= 0 ? <ArrowUpRight size={25} /> : <ArrowDownRight size={25} />}{Math.abs(displayDelta).toFixed(1)}%</>}</strong><small>{provinceComparison ? '2025 vs 2024 · same period' : coverageCaution ? 'reported totals · area changed in 2025' : 'same period, previous year'}</small></div>
      {area && <div><span className="metric-label">{sector === 'crops' ? 'Yield' : 'Area'}</span><strong>{sector === 'crops' ? yieldValue === null ? '—' : fmt(yieldValue, 2) : currentArea === null ? '—' : compact(currentArea)}</strong><small>{sector === 'crops' ? 'metric tons per hectare' : 'hectares · planted/harvested'}</small></div>}
      <div><span className="metric-label">{placeRanks.length ? 'Top province' : 'Geographic coverage'}</span><strong className="text-metric">{placeRanks[0] ? cleanName(placeRanks[0].name) : 'Region only'}</strong><small>{placeRanks.length ? `by production · ${rankYear}` : 'no province comparison in source'}</small></div>
    </section>
    <section className="data-section"><div className="section-heading"><div><h3 className="icon-heading"><span className="section-icon"><SectionIcon size={24} strokeWidth={1.8} /></span>Production by year: {commodity}</h3><p>Western Visayas, {activePeriod.toLowerCase()}. Read across each row for the year and exact output. Longer bars indicate more output.</p></div><span className="unit-tag">{productionUnit}</span></div><ProductionBars points={trend} unit={productionUnit} />{breakYear && <p className="unit-explainer">PSA's 2024 Western Visayas regional total includes Negros Occidental, but this export lists only five current provinces. From 2025, PSA reports Negros Island Region separately. The chart retains the published totals; its 2024 and 2025 bars cover different areas.</p>}{provinceComparison && <div className="province-comparison"><h4>Compare the same five provinces</h4><p>Aklan, Antique, Capiz, Guimaras, and Iloilo appear in both years. Summing only these places gives a comparable change.</p><div><span>2024 · {fmt(provinceComparison.beforeTotal, 2)} {productionUnit}</span><span>2025 · {fmt(provinceComparison.afterTotal, 2)} {productionUnit}</span><strong>{provinceComparison.change >= 0 ? '+' : '−'}{Math.abs(provinceComparison.change).toFixed(1)}%</strong></div><small>Published regional totals: {fmt(provinceComparison.beforeRegion, 2)} in 2024 and {fmt(provinceComparison.afterRegion, 2)} in 2025. Their percentage change uses different geographic coverage.</small></div>}{sector === 'livestock' || sector === 'poultry' ? <p className="unit-explainer">{sector === 'poultry' && /eggs/i.test(commodity) ? 'Egg production is measured by weight, not number of eggs.' : 'Animal production is measured by liveweight, not the number of heads or birds.'}</p> : null}</section>
    {areaTrend.length > 0 && <section className="data-section"><div className="section-heading"><div><h3>{sector === 'crops' ? 'Area harvested' : 'Area planted or harvested'}</h3><p>Reported area for the same commodity and period. This is a separate source measure.</p></div><span className="unit-tag">Hectares</span></div><TrendChart points={areaTrend} unit="hectares" color="var(--accent)" label="Area" /></section>}
    {sector === 'crops' && yieldTrend.length > 0 && <section className="data-section yield-section"><div className="section-heading"><div><h3>Yield per hectare</h3><p>Production divided by harvested area for the same period.</p></div><span className="unit-tag">MT / ha</span></div><TrendChart points={yieldTrend} unit="MT/ha" color="#ad782b" label="Yield" /></section>}
    {treeTrend.length > 0 && <section className="data-section"><div className="section-heading"><div><h3>Bearing trees, hills or vines</h3><p>Reported source counts. These are not hectares or production volume.</p></div><span className="unit-tag">Count</span></div><TrendChart points={treeTrend} unit="bearing trees/hills/vines" color="var(--accent)" label="Bearing plants" /></section>}
    {placeRanks.length > 0 ? <section className="data-section">
      <div className="section-heading"><div><h3>Compare provinces</h3><p>{rankYear} · {activePeriod.toLowerCase()}. Choose a measure to see where it is highest.</p></div><span className="unit-tag">{provinceChartUnit}</span></div>
      <div className="province-metric-switch" role="group" aria-label="Province comparison measure">
        {([['production', 'Production'], ...(showArea ? [['area', 'Area']] : []), ...(showYield ? [['yield', 'Yield']] : []), ...(showTrees ? [['trees', 'Bearing plants']] : [])] as [typeof provinceMetric, string][]).map(([key, label]) => <button key={key} type="button" className={activeProvinceMetric === key ? 'active' : ''} aria-pressed={activeProvinceMetric === key} onClick={() => setProvinceMetric(key)}>{label}</button>)}
      </div>
      <RankedBars data={provinceChart.slice(0, 8)} unit={provinceChartUnit} />
      <p className="chart-foot">Province figures are reported separately from the regional total. {activeProvinceMetric === 'yield' ? 'Yield is calculated as production ÷ harvested area.' : activeProvinceMetric === 'area' && sector !== 'crops' ? 'The source labels area as planted/harvested.' : ''}</p>
    </section> : <section className="data-section coverage-note"><h3>Regional figures only</h3><p>This dataset does not provide a comparable province breakdown for {rankYear}. The chart above uses the reported Western Visayas total.</p></section>}
    {placeRanks.length > 0 && <section className="data-section table-section"><div className="section-heading"><div><h3>Province figures</h3><p>Sorted by production. Figures reflect the active filters. A dash means the source has no matching value.</p></div><button className="text-button" onClick={() => downloadCsv(`western-visayas-${sector}-${rankYear}.csv`, [['Province', `Production (${productionUnit})`, ...(showArea ? ['Area (hectares)'] : []), ...(showYield ? ['Calculated yield (metric tons per hectare)'] : []), ...(showTrees ? ['Bearing plants (count)'] : [])], ...placeRanks.map(item => { const hectares = areaByProvince.get(item.name); return [item.name, item.value, ...(showArea ? [hectares ?? ''] : []), ...(showYield ? [hectares ? item.value / hectares : ''] : []), ...(showTrees ? [treesByProvince.get(item.name) ?? ''] : [])]; })])}><Download size={17} /> Export CSV</button></div><div className="table-scroll"><table><thead><tr><th>Rank</th><th>Province</th><th>Production <span>{productionUnit}</span></th>{showArea && <th>Area <span>hectares</span></th>}{showYield && <th>Yield <span>MT/ha</span></th>}{showTrees && <th>Bearing plants <span>count</span></th>}</tr></thead><tbody>{placeRanks.map((item, index) => { const hectares = areaByProvince.get(item.name); return <tr key={item.name}><td>{String(index + 1).padStart(2, '0')}</td><td>{item.name}</td><td>{fmt(item.value, 2)}</td>{showArea && <td>{hectares === undefined ? '—' : fmt(hectares, 2)}</td>}{showYield && <td>{hectares ? fmt(item.value / hectares, 2) : '—'}</td>}{showTrees && <td>{treesByProvince.has(item.name) ? fmt(treesByProvince.get(item.name)!, 0) : '—'}</td>}</tr>; })}</tbody></table></div>{showArea && <p className="chart-foot">{sector === 'crops' ? 'Area is harvested area; yield is calculated as production ÷ harvested area.' : 'PSA labels this measure “area planted/harvested.” It is shown as reported and is not treated as a crop yield.'}</p>}{showTrees && <p className="chart-foot">Bearing plants are source counts, separate from hectares and production.</p>}</section>}
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
    const tabs: DataFile[] = sector === 'crops' ? ['crops', 'area'] : sector === 'fruit' ? ['fruit', 'fruit_area', 'fruit_trees'] : sector === 'vegetables' ? ['vegetables', 'vegetables_area'] : [sector];
    Promise.all(tabs.map(fetchTab))
      .then(([csv, areaCsv, treeCsv]) => { if (!cancelled) setLoaded(previous => ({ ...previous, [sector]: parseLoaded(csv, areaCsv, treeCsv) })); })
      .catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to read the workbook.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sector, reload]);
  const current = loaded[sector];
  const section = nav.find(item => item.key === sector)!;
  return <div className={`app-shell theme-${sector} preview-shell`}>
    <aside className="sidebar">
      <div className="brand"><img className="brand-logo" src="/assets/dawv-logo.png" alt="Department of Agriculture Western Visayas logo" /><div><strong>DAWV AGRI PORTAL</strong><small>WESTERN VISAYAS</small></div></div>
      <div className="sidebar-rule" /><p className="nav-caption">EXPLORE THE DATA</p>
      <nav aria-label="Main navigation">
        {nav.map(item => { const Icon = item.icon; return <button key={item.key} className={`nav-item nav-${item.key} ${sector === item.key ? 'selected' : ''}`} onClick={() => setSector(item.key)} aria-current={sector === item.key ? 'page' : undefined}><Icon size={20} strokeWidth={1.8} /><span><strong>{item.label}</strong><small>{item.description}</small></span><span className="nav-arrow">↗</span></button>; })}
        <a className="nav-item nav-external" href={RSBSA_URL} target="_blank" rel="noopener noreferrer"><UsersRound size={20} strokeWidth={1.8} /><span><strong>RSBSA profile</strong><small>Open Power BI report</small></span><span className="nav-arrow" aria-hidden="true">↗</span></a>
        <a className="nav-item nav-external" href="https://app.powerbi.com/view?r=eyJrIjoiMTE4ZDU2OWItMTAxMi00ZDllLWFhMWMtZDMyOWQ4OTBmNWZjIiwidCI6IjI1MzYzMDI3LTUyNjQtNGE1Mi04MmRjLTgzYWNiZTMwY2M4YiIsImMiOjEwfQ%3D%3D" target="_blank" rel="noopener noreferrer"><RiceCornIcon size={20} /><span><strong>Weekly Rice Price Monitoring</strong><small>Open Power BI report</small></span><span className="nav-arrow" aria-hidden="true">↗</span></a>
      </nav>
      <div className="sidebar-bottom"><p className="sidebar-stamp">NSM <span>2026</span></p><p>Western Visayas agriculture, presented for National Statistics Month.</p></div>
    </aside>
    <main className="main">
      <header className="topline"><div><span className="topline-mark"><MapPin size={15} /> WESTERN VISAYAS</span><span className="topline-divider" /> <span>DEPARTMENT OF AGRICULTURE</span></div></header>
      <div className="content">
        <section className="nsm-banner" aria-label="37th National Statistics Month">
          <div className="nsm-banner-copy">
            <span className="nsm-kicker">Celebrating the 37th National Statistics Month · October 2026</span>
            <p><strong>Tuklas Pilipinas:</strong> Statistics as Beacon Towards Inclusive, Resilient, and Sustainable Tourism</p>
          </div>
          <div className="nsm-banner-art">
            <img className="nsm-statman" src="/assets/statman-cutout.png" alt="Statman mascot from the supplied NSM artwork" />
            <img className="nsm-logos" src="/assets/37th-nsm-logos.png" alt="Philippine Statistics Authority and Bagong Pilipinas logos" />
          </div>
        </section>
        <div className="page-heading"><div><h1>{section.label}</h1><p>{section.scope} · Figures are presented at their reported geographic level.</p></div><button className="refresh" onClick={() => { setLoaded(previous => ({ ...previous, [sector]: undefined })); setReload(value => value + 1); }} aria-label="Refresh data" title="Refresh data"><RefreshCw size={19} /></button></div>
        {loading && !current ? <div className="loading-state" role="status"><span className="loading-bar" /><h2>Reading the data snapshot…</h2><p>Preparing the figures and comparisons.</p></div> : error ? <div className="error-state" role="alert"><h2>We couldn’t load this section.</h2><p>{error}</p><p>The published data file may be unavailable.</p><button onClick={() => setReload(value => value + 1)}>Try again</button></div> : current ? <CommodityPage key={sector} sector={sector} data={current} /> : null}
        <footer><span>DAWV AGRI PORTAL / DA · 37th NSM 2026</span><span>Source: supplied PSA OpenSTAT exports. Snapshot built 12 Oct 2026.</span></footer>
      </div>
    </main>
  </div>;
}
