import { useMemo, useState } from 'react';
import { Download, Ruler, UsersRound } from 'lucide-react';
import { FemalePersonIcon, MalePersonIcon } from './CommodityIcons';
import { parseCsv, valueOf } from './data';

export interface ProfileRow {
  level: string; province: string; district: string; municipality: string; category: string;
  male: number | null; female: number | null; total: number | null; average_age: number | null;
  senior: number | null; ip: number | null; pwd: number | null; four_ps: number | null; arb: number | null;
}
export interface AreaRow {
  level: string; province: string; district: string; municipality: string;
  measure: string; value: number | null; unit: string;
}

export function parseProfiles(csv: string): ProfileRow[] {
  const rows = parseCsv(csv);
  if (rows[0]?.[0] !== 'level' || rows[0]?.[4] !== 'category') throw new Error('RSBSA profile headers have changed.');
  return rows.slice(1).filter(row => row[0] && row[4]).map(row => ({
    level: row[0], province: row[1], district: row[2], municipality: row[3], category: row[4],
    male: valueOf(row[5]), female: valueOf(row[6]), total: valueOf(row[7]), average_age: valueOf(row[8]),
    senior: valueOf(row[9]), ip: valueOf(row[10]), pwd: valueOf(row[11]), four_ps: valueOf(row[12]), arb: valueOf(row[13]),
  }));
}

export function parseAreas(csv: string): AreaRow[] {
  const rows = parseCsv(csv);
  if (rows[0]?.[0] !== 'level' || rows[0]?.[4] !== 'measure') throw new Error('RSBSA area headers have changed.');
  return rows.slice(1).filter(row => row[0] && row[4]).map(row => ({
    level: row[0], province: row[1], district: row[2], municipality: row[3],
    measure: row[4], value: valueOf(row[5]), unit: row[6],
  }));
}

const categories: [string, string][] = [
  ['registrants', 'All registrants'], ['farmers', 'Farmers'], ['farm_workers', 'Farm workers'],
  ['fisherfolk', 'Fisherfolk'], ['agri_youth', 'Agri-youth'], ['rice_farmers', 'Rice farmers'],
  ['corn_farmers', 'Corn farmers'], ['hvcdp_farmers', 'HVCDP farmers'],
  ['poultry_farmers', 'Poultry farmers'], ['livestock_farmers', 'Livestock farmers'],
];
type ProfileMetric = 'total' | 'male' | 'female' | 'average_age' | 'senior' | 'ip' | 'pwd' | 'four_ps' | 'arb';
const profileMetrics: [ProfileMetric, string][] = [
  ['total', 'Total people'], ['male', 'Male'], ['female', 'Female'], ['average_age', 'Average age'],
  ['senior', 'Seniors'], ['ip', 'Indigenous Peoples'], ['pwd', 'Persons with disabilities'],
  ['four_ps', '4Ps beneficiaries'], ['arb', 'Agrarian reform beneficiaries'],
];
const areaMeasures: [string, string][] = [
  ['physical_rice_area', 'Physical rice area'], ['declared_rice_area', 'Declared rice area'],
  ['verified_rice_area', 'Verified rice area'], ['rice_verification_percent', 'Rice verification rate'],
  ['physical_corn_area', 'Physical corn area'], ['declared_corn_area', 'Declared corn area'],
  ['verified_corn_area', 'Verified corn area'], ['corn_verification_percent', 'Corn verification rate'],
];
const labelOf = (pairs: [string, string][], value: string) => pairs.find(([key]) => key === value)?.[1] || value;
const fmt = (value: number | null, digits = 0) => value === null ? '—' : new Intl.NumberFormat('en-PH', { maximumFractionDigits: digits }).format(value);
const display = (value: number | null, unit: string) => value === null ? '—' : unit === 'ratio' ? `${fmt(value * 100, 1)}%` : `${fmt(value, unit === 'years' ? 1 : value % 1 ? 1 : 0)}${unit === 'hectares' ? ' ha' : unit === 'years' ? ' years' : ''}`;

function Bars({ items, unit }: { items: { name: string; value: number }[]; unit: string }) {
  const max = Math.max(1, ...items.map(item => item.value));
  if (!items.length) return <p className="empty-small">No comparable locations were reported.</p>;
  return <ol className="rsbsa-bars">{items.map(item => <li key={item.name}><div><span>{item.name}</span><strong>{display(item.value, unit)}</strong></div><div className="rsbsa-bar-track"><span style={{ width: `${Math.max(1, item.value / max * 100)}%` }} /></div></li>)}</ol>;
}

export default function RsbsaPage({ profiles, areas }: { profiles: ProfileRow[]; areas: AreaRow[] }) {
  const provinces = useMemo(() => [...new Set(profiles.filter(row => row.level === 'province').map(row => row.province))].sort(), [profiles]);
  const [view, setView] = useState<'people' | 'land'>('people');
  const [province, setProvince] = useState('ALL');
  const [category, setCategory] = useState('registrants');
  const [profileMetric, setProfileMetric] = useState<ProfileMetric>('total');
  const [areaMeasure, setAreaMeasure] = useState('verified_rice_area');
  const isRegion = province === 'ALL';
  const place = isRegion ? 'Western Visayas' : province;
  const selectedProfile = profiles.find(row => row.level === (isRegion ? 'region' : 'province') && (isRegion || row.province === province) && row.category === category);
  const selectedArea = (measure: string) => areas.find(row => row.level === (isRegion ? 'region' : 'province') && (isRegion || row.province === province) && row.measure === measure);
  const categoryBars = categories.map(([key, name]) => ({ name, value: profiles.find(row => row.level === (isRegion ? 'region' : 'province') && (isRegion || row.province === province) && row.category === key)?.total || 0 })).filter(item => item.value > 0).sort((a, b) => b.value - a.value);
  const groupUnit = profileMetric === 'average_age' ? 'years' : 'people';
  const peopleRows = profiles.filter(row => row.category === category && row.level === (isRegion ? 'province' : 'municipality') && (isRegion || row.province === province));
  const peopleRanks = peopleRows.map(row => ({ name: isRegion ? row.province : row.municipality, value: row[profileMetric] })).filter((row): row is { name: string; value: number } => row.value !== null).sort((a, b) => b.value - a.value);
  const municipalityProfiles = profiles.filter(row => row.level === 'municipality' && row.category === category && (isRegion || row.province === province)).sort((a, b) => (b[profileMetric] || 0) - (a[profileMetric] || 0));
  const areaUnit = areaMeasure.endsWith('percent') ? 'ratio' : 'hectares';
  const rateBasis = areaMeasure === 'rice_verification_percent' ? 'Rice rate = verified rice area ÷ physical rice area.' : areaMeasure === 'corn_verification_percent' ? 'Corn rate = verified corn area ÷ declared corn area.' : '';
  const chosenArea = selectedArea(areaMeasure);
  const landRows = areas.filter(row => row.measure === areaMeasure && row.level === (isRegion ? 'province' : 'municipality') && (isRegion || row.province === province) && row.value !== null);
  const outliers = areaUnit === 'ratio' ? landRows.filter(row => (row.value || 0) > 10) : [];
  const landRanks = landRows.filter(row => !outliers.includes(row)).map(row => ({ name: isRegion ? row.province : row.municipality, value: row.value! })).sort((a, b) => b.value - a.value);
  const municipalityAreas = areas.filter(row => row.level === 'municipality' && row.measure === areaMeasure && (isRegion || row.province === province)).sort((a, b) => (b.value || 0) - (a.value || 0));
  const male = selectedProfile?.male ?? null, female = selectedProfile?.female ?? null;
  const sexSum = (male ?? 0) + (female ?? 0);
  const sexMismatch = selectedProfile?.total !== null && selectedProfile?.total !== undefined && Math.abs(sexSum - selectedProfile.total) > .01;
  const support = (['senior', 'ip', 'pwd', 'four_ps', 'arb'] as const).map(key => ({ name: labelOf(profileMetrics, key), value: selectedProfile?.[key] ?? 0 })).sort((a, b) => b.value - a.value);
  return <>
    <section className="story-lead" aria-labelledby="story-title"><div><h2 id="story-title">{view === 'people' ? `${display(selectedProfile?.total ?? null, 'people')} ${labelOf(categories, category).toLowerCase()} are reported in ${place}.` : `${display(chosenArea?.value ?? null, areaUnit)} of ${labelOf(areaMeasures, areaMeasure).toLowerCase()} is reported for ${place}.`}</h2><p className="story-sub">RSBSA aggregate workbook, 18 September 2026. Select a group or land measure to inspect the original figures by place.</p></div><div className="story-mark">{view === 'people' ? <UsersRound size={42} strokeWidth={1.3} /> : <Ruler size={42} strokeWidth={1.3} />}<span>RSBSA</span></div></section>
    <div className="rsbsa-tabs" role="group" aria-label="RSBSA view"><button className={view === 'people' ? 'active' : ''} onClick={() => setView('people')}>People and livelihoods</button><button className={view === 'land' ? 'active' : ''} onClick={() => setView('land')}>Rice and corn land</button></div>
    <section className="filter-strip" aria-label="RSBSA filters"><label>Province<select value={province} onChange={event => setProvince(event.target.value)}><option value="ALL">Western Visayas</option>{provinces.map(item => <option key={item} value={item}>{item}</option>)}</select></label>{view === 'people' ? <><label>Group<select value={category} onChange={event => setCategory(event.target.value)}>{categories.map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label><label>Compare by<select value={profileMetric} onChange={event => setProfileMetric(event.target.value as ProfileMetric)}>{profileMetrics.map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label></> : <label>Land measure<select value={areaMeasure} onChange={event => setAreaMeasure(event.target.value)}>{areaMeasures.map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>}</section>
    {view === 'people' ? <>
      <section className="metric-row" aria-label="Selected group measures"><div><span className="metric-label">Reported total</span><strong>{display(selectedProfile?.total ?? null, 'people')}</strong><small>people · {labelOf(categories, category)}</small></div><div><span className="metric-label">Average age</span><strong>{display(selectedProfile?.average_age ?? null, 'years')}</strong><small>source average</small></div><div><span className="metric-label">Female</span><strong>{display(female, 'people')}</strong><small>source count</small></div><div><span className="metric-label">Senior</span><strong>{display(selectedProfile?.senior ?? null, 'people')}</strong><small>source count</small></div></section>
      <section className="data-section"><div className="section-heading"><div><h3>Who is in the registry</h3><p>Reported group totals for {place}. Groups overlap, so these bars must not be added together.</p></div><span className="unit-tag">People</span></div><Bars items={categoryBars} unit="people" /></section>
      <section className="data-section"><div className="section-heading"><div><h3>Selected group profile</h3><p>Each indicator is a separate source count; one person can appear in more than one indicator.</p></div><span className="unit-tag">People</span></div><div className="composition" aria-label="Male and female source counts"><div style={{ width: `${sexSum ? (male || 0) / sexSum * 100 : 0}%` }} /><div style={{ width: `${sexSum ? (female || 0) / sexSum * 100 : 0}%` }} /></div><div className="composition-legend"><span><span className="person-picture male-picture"><MalePersonIcon size={23} /></span> Male <strong>{display(male, 'people')}</strong></span><span><span className="person-picture female-picture"><FemalePersonIcon size={23} /></span> Female <strong>{display(female, 'people')}</strong></span></div>{sexMismatch && <p className="source-warning">The source male and female counts do not sum to its reported total for this selection.</p>}<Bars items={support} unit="people" /></section>
      <section className="data-section"><div className="section-heading"><div><h3>{isRegion ? 'Province comparison' : 'Municipality comparison'}</h3><p>{labelOf(profileMetrics, profileMetric)} for {labelOf(categories, category).toLowerCase()} at one geographic level.</p></div><span className="unit-tag">{groupUnit}</span></div><Bars items={peopleRanks.slice(0, 10)} unit={groupUnit} /></section>
      <section className="data-section table-section"><div className="section-heading"><div><h3>Municipality detail</h3><p>Values are reported by the source; missing cells remain blank. IP, PWD, 4Ps and ARB counts are shown at province level and above.</p></div><a className="text-button" href="/data/rsbsa_profiles.csv" download><Download size={17} /> Published profile fields</a></div><div className="table-scroll"><table><thead><tr><th>Province</th><th>Municipality</th><th>{labelOf(profileMetrics, profileMetric)}</th><th>Total</th><th>Average age</th></tr></thead><tbody>{municipalityProfiles.map(row => <tr key={`${row.province}-${row.municipality}`}><td>{row.province}</td><td>{row.municipality}</td><td>{display(row[profileMetric], groupUnit)}</td><td>{display(row.total, 'people')}</td><td>{display(row.average_age, 'years')}</td></tr>)}</tbody></table></div></section>
    </> : <>
      <section className="metric-row" aria-label="Land measures"><div><span className="metric-label">Physical rice area</span><strong>{display(selectedArea('physical_rice_area')?.value ?? null, 'hectares')}</strong><small>PSA reference</small></div><div><span className="metric-label">Declared rice area</span><strong>{display(selectedArea('declared_rice_area')?.value ?? null, 'hectares')}</strong><small>RSBSA declared</small></div><div><span className="metric-label">Verified rice area</span><strong>{display(selectedArea('verified_rice_area')?.value ?? null, 'hectares')}</strong><small>geotagged</small></div><div><span className="metric-label">Rice verification</span><strong>{display(selectedArea('rice_verification_percent')?.value ?? null, 'ratio')}</strong><small>verified ÷ physical area</small></div></section>
      <section className="data-section"><div className="section-heading"><div><h3>Rice and corn land measures</h3><p>Physical, declared, and verified areas are separate measures in hectares. They should not be stacked or added.</p></div><span className="unit-tag">Hectares</span></div><div className="land-groups">{(['rice', 'corn'] as const).map(crop => <div key={crop}><h4>{crop === 'rice' ? 'Rice' : 'Corn'}</h4><Bars items={['physical', 'declared', 'verified'].map(kind => ({ name: kind[0].toUpperCase() + kind.slice(1), value: selectedArea(`${kind}_${crop}_area`)?.value || 0 }))} unit="hectares" /></div>)}</div></section>
      <section className="data-section"><div className="section-heading"><div><h3>{isRegion ? 'Province comparison' : 'Municipality comparison'}</h3><p>{labelOf(areaMeasures, areaMeasure)} at one geographic level. {rateBasis || 'Areas are shown in hectares.'} Source rates are displayed as percentages.</p></div><span className="unit-tag">{areaUnit === 'ratio' ? 'Percent' : 'Hectares'}</span></div><Bars items={landRanks.slice(0, 10)} unit={areaUnit} />{outliers.length > 0 && <p className="source-warning">{outliers.length} source rate above 1,000% is omitted from the bar scale and retained in the table below.</p>}</section>
      <section className="data-section table-section"><div className="section-heading"><div><h3>Municipality land figures</h3><p>Source outliers are marked, not changed. A tiny declared area can produce a very large percentage.</p></div><a className="text-button" href="/data/rsbsa_areas.csv" download><Download size={17} /> All land fields</a></div><div className="table-scroll"><table><thead><tr><th>Province</th><th>Municipality</th><th>{labelOf(areaMeasures, areaMeasure)}</th><th>Unit</th></tr></thead><tbody>{municipalityAreas.map(row => <tr key={`${row.province}-${row.municipality}`}><td>{row.province}</td><td>{row.municipality}</td><td>{display(row.value, areaUnit)}{areaUnit === 'ratio' && (row.value || 0) > 10 ? ' · source outlier' : ''}</td><td>{areaUnit === 'ratio' ? 'percent' : 'hectares'}</td></tr>)}</tbody></table></div></section>
    </>}
    <p className="rsbsa-footnote">RSBSA data are source aggregates. Categories and indicators overlap. The workbook’s regional ranking tab differs from its detailed regional total by 6,991 registrants; this view uses the detailed rows.</p>
  </>;
}
