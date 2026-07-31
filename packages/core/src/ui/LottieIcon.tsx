import { DotLottie } from '@lottiefiles/dotlottie-web';
import { useEffect, useRef } from 'react';

interface Props {
  src: string;
  loop?: boolean;
  className?: string;
}

export function LottieIcon({ src, loop = false, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const dotLottie = new DotLottie({
      canvas: canvasRef.current,
      src,
      loop,
      autoplay: true,
    });

    return () => {
      dotLottie.destroy();
    };
  }, [src, loop]);

  return (
    <canvas
      ref={canvasRef}
      width={'110px'}
      height={'110px'}
      style={{
        width: '110px',
        height: '110px',
      }}
      className={className ?? 'mx-auto h-[110px] w-[110px]'}
    />
  );
}
