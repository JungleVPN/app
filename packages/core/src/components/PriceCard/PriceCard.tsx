import { Button, Card } from '@heroui/react';
import { IconArrowsShuffle, IconCheck } from '@tabler/icons-react';

type PriceCardProps = {
  period: string;
  subtitle?: string;
  price: string;
  currency: string;
  interval: string;
  advantages: string[];
  guarantee: string;
  cta: string;
  onCtaClick?: () => void;
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
}: PriceCardProps) {
  return (
    <Card className='w-full max-w-sm p-8 shadow-xl'>
      <div className='mb-6 flex flex-col gap-1'>
        <span className='text-lg font-bold text-foreground'>{period}</span>
        {subtitle && <span className='text-sm text-muted'>{subtitle}</span>}
      </div>

      <div className='mb-6 flex items-baseline gap-1'>
        <span className='text-5xl font-bold tracking-tight text-foreground'>
          {currency}
          {price}
        </span>
        <span className='text-sm text-muted'>{interval}</span>
      </div>

      <ul className='mb-6 flex flex-col gap-2'>
        {advantages.map((item) => (
          <li key={item} className='flex items-center gap-2 text-sm text-foreground'>
            <IconCheck size={16} className='shrink-0 text-primary' stroke={2.5} />
            {item}
          </li>
        ))}
      </ul>

      <div className='mb-6 h-px bg-border' />

      <div className='mb-6 flex items-center gap-2 text-sm text-muted'>
        <IconArrowsShuffle size={18} className='shrink-0' />
        {guarantee}
      </div>

      <Button size='lg' className='w-full' onClick={onCtaClick}>
        {cta}
      </Button>
    </Card>
  );
}
