import createGlobe, { Arc } from 'cobe';
import { useEffect, useRef } from 'react';

const LOCATIONS = {
  us: [38.7509, -77.4753] as [number, number], // USA
  ru: [55.7558, 37.6176] as [number, number], // Russia (Moscow)
  de: [50.1109, 8.6821] as [number, number], // Germany (Frankfurt)
  ar: [25.2048, 55.2708] as [number, number], // UAE (Dubai)
  cn: [31.2304, 121.4737] as [number, number], // China (Shanghai)
  br: [-23.5505, -46.6333] as [number, number], // Brazil (São Paulo)
} as const;

type LocationKey = keyof typeof LOCATIONS;

const MARKERS = Object.values(LOCATIONS).map((location) => ({ location, size: 0.1 }));

const ARC_COLOR: [number, number, number] = [0.3, 0.3, 0.3];

function buildArcs(fromKey: LocationKey): Arc[] {
  const from = LOCATIONS[fromKey];
  return (Object.keys(LOCATIONS) as LocationKey[])
    .filter((key) => key !== fromKey)
    .map((key) => ({ from, to: LOCATIONS[key], color: ARC_COLOR }));
}

function resolveFromKey(): LocationKey {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  if (hostname === import.meta.env.PUBLIC_DOMAIN_RU) return 'ru';
  if (hostname === import.meta.env.PUBLIC_DOMAIN_AR) return 'ar';
  return 'de'; // EU / default
}

const ARCH = buildArcs(resolveFromKey());

function themeConfig(dark: boolean) {
  return {
    dark: dark ? 1 : 0,
    diffuse: dark ? 2 : 1.2,
    mapBrightness: dark ? 6 : 8,
    baseColor: dark
      ? ([0.3, 0.3, 0.3] as [number, number, number])
      : ([1, 1, 1] as [number, number, number]),
    glowColor: [1, 1, 1] as [number, number, number],
  };
}

export function Globe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef({ dragging: false, lastX: 0, lastY: 0, startPhi: 0, startTheta: 0 });
  const phiRef = useRef(0);
  const thetaRef = useRef(0.3);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const SIZE = 1000;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    canvas.className = 'w-full h-full cursor-grab active:cursor-grabbing select-none';
    container.appendChild(canvas);

    const isDark = document.documentElement.classList.contains('dark');

    const headChildCountBefore = document.head.childElementCount;
    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: SIZE * dpr,
      height: SIZE * dpr,
      phi: phiRef.current,
      theta: thetaRef.current,
      mapSamples: 16000,
      markerElevation: 0,
      arcs: ARCH,
      arcWidth: 0.4,
      arcHeight: 0.4,
      markerColor: [1, 0.78, 0.1],
      markers: MARKERS,
      ...themeConfig(isDark),
    });

    // cobe appends a <style> to document.head and mutates its textContent on every
    // globe.update() call (60fps). React DevTools watches document.head via
    // MutationObserver, so those mutations cause the DevTools panel to re-scan
    // the fiber tree constantly. Removing the detached element stops the mutations;
    // cobe's closure still holds a reference and can write to it without error.
    Array.from(document.head.children)
      .slice(headChildCountBefore)
      .map((el) => el.remove());

    let animId = 0;

    function animate() {
      if (!pointerRef.current.dragging) {
        phiRef.current += 0.01;
      }
      const pulse = 0.01 + 0.025 * Math.abs(Math.sin(Date.now() / 600));
      globe.update({
        phi: phiRef.current,
        theta: thetaRef.current,
        markers: MARKERS.map((m) => ({ ...m, size: pulse })),
      });
      animId = requestAnimationFrame(animate);
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (animId === 0) animId = requestAnimationFrame(animate);
        } else {
          cancelAnimationFrame(animId);
          animId = 0;
        }
      },
      { threshold: 0 },
    );
    io.observe(container);

    let currentDark = isDark;
    const observer = new MutationObserver(() => {
      const dark = document.documentElement.classList.contains('dark');
      if (dark === currentDark) return;
      currentDark = dark;
      globe.update(themeConfig(dark));
    });
    observer.observe(document.documentElement, { attributeFilter: ['class'] });

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      pointerRef.current.dragging = true;
      pointerRef.current.lastX = e.clientX;
      pointerRef.current.lastY = e.clientY;
      pointerRef.current.startPhi = phiRef.current;
      pointerRef.current.startTheta = thetaRef.current;
      canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pointerRef.current.dragging) return;
      phiRef.current = pointerRef.current.startPhi + (e.clientX - pointerRef.current.lastX) * 0.006;
      thetaRef.current = Math.max(
        -Math.PI / 2,
        Math.min(
          Math.PI / 2,
          pointerRef.current.startTheta + (e.clientY - pointerRef.current.lastY) * 0.006,
        ),
      );
    };

    const onPointerUp = () => {
      pointerRef.current.dragging = false;
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      io.disconnect();
      globe.destroy();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      container.innerHTML = '';
    };
  }, []);

  return <div ref={containerRef} className='w-full aspect-square' />;
}
