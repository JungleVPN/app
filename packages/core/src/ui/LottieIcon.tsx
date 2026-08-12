import { DotLottie } from '@lottiefiles/dotlottie-web';
import { useEffect, useRef } from 'react';

interface Props {
  src: string;
  loop?: boolean;
  size?: number;
  className?: string;
}

export function LottieIcon({ src, loop = false, size = 110, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const dotLottie = new DotLottie({
      canvas: canvasRef.current,
      src,
      loop,
      autoplay: true,
    });

    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? dotLottie.play() : dotLottie.pause()),
      { threshold: 0 },
    );
    io.observe(canvasRef.current);

    return () => {
      io.disconnect();
      dotLottie.destroy();
    };
  }, [src, loop]);

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
