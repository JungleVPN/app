import { Button, Card } from '@heroui/react';
import { IconArrowsShuffle } from '@tabler/icons-react';

type PriceCardProps = {
  period: string;
  subtitle?: string;
  price: string;
  currency: string;
  interval: string;
  advantages?: string[];
  guarantee: string;
  cta: string;
  onCtaClick?: () => void;
  badge?: string;
  discount?: string;
  originalTotal?: string;
  discountedTotal?: string;
  totalLabel?: string;
  noDiscountLabel?: string;
  highlighted?: boolean;
};

export function PriceCard({
  period,
  subtitle,
  price,
  currency,
  interval,
  advantages,
  guarantee,
  cta,
  onCtaClick,
  badge,
  discount,
  originalTotal,
  discountedTotal,
  totalLabel,
  noDiscountLabel,
  highlighted,
}: PriceCardProps) {
  return (
    <div className={`relative flex flex-col ${highlighted ? 'z-10' : ''}`}>
      {highlighted && badge && (
        <div className='rounded-t-2xl bg-linear-to-r from-violet-500 to-blue-500 py-2 text-center text-sm font-semibold text-white'>
          🔥 {badge}
        </div>
      )}

      <Card
        variant='secondary'
        className={`w-full p-8 shadow-md ${highlighted ? 'rounded-t-none ring-2 ring-indigo-500' : ''}`}
      >
        <div className='mb-6 flex flex-col gap-1'>
          <span className='text-lg font-bold text-foreground'>{period}</span>
          {discount && <span className='text-sm font-semibold text-indigo-600'>{discount}</span>}
          {subtitle && !discount && <span className='text-sm text-muted'>{subtitle}</span>}
        </div>

        <div className='mb-6 flex items-baseline gap-1'>
          <span
            className={`text-5xl font-bold tracking-tight ${highlighted ? 'text-indigo-600' : 'text-foreground'}`}
          >
            {price}
            {currency}
          </span>
          <span className='text-sm text-muted'>{interval}</span>
        </div>

        <div className='mb-6'>
          {(originalTotal || discountedTotal) && (
            <div className='flex flex-wrap items-center gap-1 text-sm text-muted'>
              <span>{totalLabel}</span>
              <span className='line-through'>{originalTotal}</span>
              <span>→</span>
              <span className='text-foreground'>{discountedTotal}</span>
            </div>
          )}
          {noDiscountLabel && !originalTotal && (
            <span className='text-sm text-muted'>{noDiscountLabel}</span>
          )}
        </div>

        {advantages && advantages.length > 0 && (
          <ul className='mb-6 flex flex-col gap-2'>
            {advantages.map((item) => (
              <li key={item} className='flex items-center gap-2 text-sm text-foreground'>
                {item}
              </li>
            ))}
          </ul>
        )}

        <div className='mb-6 h-px bg-border' />

        <div className='mb-6 flex items-center gap-2 text-sm text-muted'>
          <IconArrowsShuffle size={18} className='shrink-0' />
          {guarantee}
        </div>

        <Button
          size='lg'
          className={
            highlighted
              ? 'w-full bg-indigo-600 text-white hover:bg-indigo-700'
              : 'w-full border border-indigo-500 bg-transparent text-indigo-600 hover:bg-indigo-50'
          }
          onClick={onCtaClick}
        >
          {cta}
        </Button>
      </Card>
    </div>
  );
}
