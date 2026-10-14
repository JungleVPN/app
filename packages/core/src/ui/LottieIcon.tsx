import { useEffect, useRef } from 'react';

interface Props {
  src: string;
  loop?: boolean;
  autoplay?: boolean;
  size?: number;
  className?: string;
}

export function LottieIcon({ src, loop = false, autoplay = true, size = 110, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let player: { play: () => void; pause: () => void; destroy: () => void } | undefined;
    let disposed = false;

    // The player (JS + ~600 KB WASM) is only fetched once the icon nears the viewport,
    // keeping it off the critical path of the initial render.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          player?.pause();
          return;
        }
        if (player) {
          player.play();
          return;
        }
        void import('@lottiefiles/dotlottie-web').then(({ DotLottie }) => {
          if (disposed || player) return;
          player = new DotLottie({ canvas, src, loop, autoplay });
        });
      },
      { rootMargin: '200px' },
    );
    io.observe(canvas);

    return () => {
      disposed = true;
      io.disconnect();
      player?.destroy();
    };
  }, [src, loop, autoplay]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`mx-auto ${className || ''}`}
    />
  );
}
