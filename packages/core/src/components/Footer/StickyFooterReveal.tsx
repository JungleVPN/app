import { ReactNode } from 'react';

type StickyFooterRevealProps = {
  children: ReactNode;
};

export function StickyFooterReveal({ children }: StickyFooterRevealProps) {
  return <div className='sticky bottom-0 z-0 bg-[#1a1a1a] mt-20 text-white'>{children}</div>;
}
