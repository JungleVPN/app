/**
 * Regenerates the dotted world map used by the locations page.
 *
 * `dotted-map` carries ~350 KB of world geometry and spends hundreds of
 * milliseconds walking the dot grid, so the map is built here once and
 * committed as a static asset instead of being computed in the browser.
 *
 * Run with: pnpm --filter @workspace/core generate:world-map
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import DottedMap from 'dotted-map';

const PINS = [
  { lat: 60.1699, lng: 24.9384 }, // Finland (Helsinki)
  { lat: 50.1109, lng: 8.6821 }, // Germany (Frankfurt)
  { lat: 48.2082, lng: 16.3738 }, // Austria (Vienna)
  { lat: 55.7558, lng: 37.6176 }, // Russia (Moscow)
  { lat: 38.7509, lng: -77.4753 }, // USA (Manassas, VA)
  { lat: 52.3676, lng: 4.9041 }, // Netherlands (Amsterdam)
];

const map = new DottedMap({ height: 100, grid: 'diagonal' });

for (const { lat, lng } of PINS) {
  map.addPin({ lat, lng, svgOptions: { color: '#ffcb3d', radius: 0.7 } });
}

const svg = map.getSVG({
  radius: 0.5,
  color: '#999999',
  shape: 'circle',
  backgroundColor: 'transparent',
});

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../src/assets/world-map-dotted.svg');
writeFileSync(out, `${svg}\n`);
console.log(`wrote ${out} (${(svg.length / 1024).toFixed(0)} KB)`);
