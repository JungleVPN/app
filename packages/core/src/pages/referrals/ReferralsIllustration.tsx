/**
 * Placeholder artwork for the referrals hero. The final illustration is still
 * being drawn, so this mock keeps the hero's composition and spacing honest
 * without shipping a stand-in raster asset.
 */
export function ReferralsIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 480 320'
      role='presentation'
      aria-hidden='true'
      focusable='false'
      className={className}
    >
      <circle cx='96' cy='232' r='76' fill='#ffffff' />
      <circle cx='404' cy='176' r='60' fill='#ffffff' />

      {[0, 1, 2].map((row) => (
        <g key={row} transform={`translate(24 ${40 + row * 56})`}>
          <rect width='224' height='44' rx='22' fill='none' stroke='#1a1a1a' strokeWidth='2.5' />
          <circle cx='30' cy='22' r='11' fill='none' stroke='#1a1a1a' strokeWidth='2.5' />
          <rect x='56' y='16' width='144' height='12' rx='6' fill='#1a1a1a' />
          <circle cx='272' cy='22' r='18' fill='#1a1a1a' />
          <path
            d='M264 22l6 6 11-12'
            fill='none'
            stroke='#ffffff'
            strokeWidth='2.5'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </g>
      ))}

      <rect x='348' y='36' width='72' height='72' rx='22' fill='#2f6bff' />
      <path d='M370 58h20a8 8 0 010 16h-20zm0 16h22a8 8 0 010 16h-22z' fill='#ffffff' />

      <g transform='translate(150 196)'>
        <rect width='96' height='84' rx='10' fill='#2f6bff' />
        <path d='M0 34h96M48 0v84' stroke='#1a1a1a' strokeWidth='2.5' />
      </g>

      <path
        d='M300 210c-18 22-10 50 16 50s34-28 16-50'
        fill='none'
        stroke='#1a1a1a'
        strokeWidth='2.5'
        strokeLinecap='round'
      />
      <circle cx='316' cy='190' r='26' fill='none' stroke='#1a1a1a' strokeWidth='2.5' />
      <path d='M24 296h432' stroke='#1a1a1a' strokeWidth='2.5' strokeLinecap='round' />
    </svg>
  );
}
