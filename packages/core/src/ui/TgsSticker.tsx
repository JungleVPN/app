import lottie, { type AnimationItem } from 'lottie-web';
import { useEffect, useRef } from 'react';

interface Props {
  src: string;
  className?: string;
}

export function TgsSticker({ src, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let anim: AnimationItem | null = null;
    let cancelled = false;

    async function load() {
      const response = await fetch(src);
      const blob = await response.blob();

      const ds = new DecompressionStream('gzip');
      const decompressed = blob.stream().pipeThrough(ds);
      const text = await new Response(decompressed).text();

      if (cancelled || !containerRef.current) return;

      anim = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: JSON.parse(text),
      });
    }

    load().catch((err) => console.error('[TgsSticker] failed to load', src, err));

    return () => {
      cancelled = true;
      anim?.destroy();
    };
  }, [src]);

  return <div ref={containerRef} className={className} />;
}
