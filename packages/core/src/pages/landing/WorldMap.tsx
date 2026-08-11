import DottedMap from 'dotted-map';
import { useMemo } from 'react';

const PINS = [
  { lat: 60.1699, lng: 24.9384 }, // Finland (Helsinki)
  { lat: 50.1109, lng: 8.6821 }, // Germany (Frankfurt)
  { lat: 48.2082, lng: 16.3738 }, // Austria (Vienna)
  { lat: 55.7558, lng: 37.6176 }, // Russia (Moscow)
  { lat: 38.7509, lng: -77.4753 }, // USA (Manassas, VA)
  { lat: 52.3676, lng: 4.9041 }, // Netherlands (Amsterdam)
];

export function WorldMap() {
  const svgMap = useMemo(() => {
    const map = new DottedMap({ height: 100, grid: 'diagonal' });

    PINS.forEach(({ lat, lng }) => {
      map.addPin({
        lat,
        lng,
        svgOptions: { color: '#ffcb3d', radius: 0.7 },
      });
    });

    return map.getSVG({
      radius: 0.5,
      color: '#b4b4b4',
      shape: 'circle',
      backgroundColor: 'transparent',
    });
  }, []);

  return (
    <img
      src={`data:image/svg+xml;utf8,${encodeURIComponent(svgMap)}`}
      alt='World map showing VPN server locations'
      className='h-auto w-full opacity-90 mask-[linear-gradient(to_bottom,transparent,var(--background)_20%,var(--background)_80%,transparent)] select-none'
    />
  );
}
