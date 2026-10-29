import { ReactNode, useEffect, useRef, useState } from 'react';

type StickyFooterRevealProps = {
  children: ReactNode;
};

/**
 * Pins the footer only while its slot is in view: a sticky element on the
 * bottom edge makes iOS 26 Safari paint its toolbar in the footer's colour.
 */
export function StickyFooterReveal({ children }: StickyFooterRevealProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;

    const observer = new IntersectionObserver(([entry]) => setIsPinned(entry.isIntersecting));
    observer.observe(slot);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={slotRef} className='mt-20' />
      <div className={`${isPinned ? 'sticky' : 'relative'} bottom-0 z-0 bg-[#1a1a1a] text-white`}>
        {children}
      </div>
    </>
  );
}
