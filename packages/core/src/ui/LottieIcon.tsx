import { useEffect, useRef, useState } from 'react';

interface Props {
  src: string;
  loop?: boolean;
  autoplay?: boolean;
  size?: number;
  className?: string;
}

type Player = { play: () => void; pause: () => void; destroy: () => void };

/**
 * Set once the WASM player has failed on this engine, for the rest of the visit.
 * On iOS 15 Safari it fails every animation and then throws uncaught errors,
 * so after the first failure no other icon starts it again.
 */
let playerBroken = false;

export function LottieIcon({ src, loop = false, autoplay = true, size = 110, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(playerBroken);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || playerBroken) return;

    let player: Player | undefined;
    let disposed = false;

    const fail = () => {
      playerBroken = true;
      const broken = player;
      player = undefined;
      // Destroying it inside its own event callback re-enters the WASM core,
      // which is what throws "recursive use of an object".
      if (broken) setTimeout(() => broken.destroy(), 0);
      if (!disposed) setFailed(true);
    };

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
        void import('@lottiefiles/dotlottie-web')
          .then(({ DotLottie }) => {
            if (disposed || player || playerBroken) return;
            const created = new DotLottie({ canvas, src, loop, autoplay });
            player = created;
            created.addEventListener('loadError', fail);
            created.addEventListener('renderError', fail);
          })
          .catch(fail);
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

  if (failed) {
    return (
      <div
        aria-hidden
        className={`mx-auto ${className || ''}`}
        style={{ width: size, height: size }}
      />
    );
  }

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
