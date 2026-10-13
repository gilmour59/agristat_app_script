import { useMemo, useState } from 'react';
import boundaries from './westernVisayasGeo.json';
import { cleanName } from './data';

type Rank = { name: string; value: number };
type Feature = {
  properties: { name: string };
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] };
};

const features = boundaries.features as Feature[];
const format = (value: number) => new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 }).format(value);

function ringsFor(feature: Feature): number[][][][] {
  return feature.geometry.type === 'MultiPolygon'
    ? feature.geometry.coordinates as number[][][][]
    : [feature.geometry.coordinates as number[][][]];
}

const mapPaths = (() => {
  const points = features.flatMap(feature => ringsFor(feature).flatMap(polygon => polygon.flatMap(ring => ring)));
  const longitudes = points.map(point => point[0]);
  const latitudes = points.map(point => point[1]);
  const minX = Math.min(...longitudes), maxX = Math.max(...longitudes);
  const minY = Math.min(...latitudes), maxY = Math.max(...latitudes);
  const width = 560, height = 400, margin = 20;
  const scale = Math.min((width - 2 * margin) / (maxX - minX), (height - 2 * margin) / (maxY - minY));
  const offsetX = (width - (maxX - minX) * scale) / 2;
  const offsetY = (height - (maxY - minY) * scale) / 2;
  const project = ([x, y]: number[]) => `${(offsetX + (x - minX) * scale).toFixed(2)},${(offsetY + (maxY - y) * scale).toFixed(2)}`;
  return features.map(feature => ({
    name: feature.properties.name,
    path: ringsFor(feature).map(polygon => polygon.map(ring => `M${ring.map(project).join('L')}Z`).join('')).join(''),
  }));
})();

export default function ProvinceMap({ data, unit, year, measure }: { data: Rank[]; unit: string; year: string; measure: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const values = useMemo(() => new Map(data.map(item => [cleanName(item.name), item.value])), [data]);
  const max = Math.max(0, ...data.map(item => item.value));
  const active = selected && values.has(selected) ? selected : data[0] ? cleanName(data[0].name) : null;
  const activeValue = active ? values.get(active) : undefined;
  const color = (value: number | undefined) => value === undefined ? '#e5eae8' :
    `color-mix(in srgb, var(--accent) ${Math.round(18 + 77 * (max ? value / max : 0))}%, white)`;

  return <div className="province-map">
    <svg viewBox="0 0 560 400" role="group" aria-label={`${measure} by province in ${year}. ${data.map(item => `${cleanName(item.name)}: ${format(item.value)} ${unit}`).join('; ')}`}>
      {mapPaths.map(item => {
        const value = values.get(item.name);
        return <path key={item.name} d={item.path} fill={color(value)} fillRule="evenodd"
          className={active === item.name ? 'active' : ''} tabIndex={0}
          aria-label={`${item.name}: ${value === undefined ? 'no data' : `${format(value)} ${unit}`}`}
          onPointerEnter={() => setSelected(item.name)} onFocus={() => setSelected(item.name)} onClick={() => setSelected(item.name)}>
          <title>{item.name}: {value === undefined ? 'No data' : `${format(value)} ${unit}`}</title>
        </path>;
      })}
    </svg>
    <div className="province-map-readout" aria-live="polite"><strong>{active || 'Select a province'}</strong><span>{activeValue === undefined ? 'No figure for this selection' : `${format(activeValue)} ${unit}`}</span></div>
    <div className="province-map-legend"><span>Lower {measure.toLowerCase()}</span><i aria-hidden="true" /><span>Higher {measure.toLowerCase()}</span><span className="map-no-data"><b /> No data</span></div>
    <p className="province-map-source">Map shows the five provinces in this export. Boundaries: <a href={boundaries.source} target="_blank" rel="noopener noreferrer">geoBoundaries, sourced from NAMRIA/PSA/OCHA</a> (CC BY 3.0 IGO).</p>
  </div>;
}
