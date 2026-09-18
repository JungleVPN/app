import { Card } from '@heroui/react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

type FeatureCardProps = {
  variant?: 'feature';
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
  learnMoreLabel?: never;
  learnMoreHref?: never;
};

type StatCardProps = {
  variant: 'stat';
  icon?: ReactNode;
  title: string;
  description?: string;
  className?: string;
  learnMoreLabel?: string;
  learnMoreHref?: string;
};

type ContentCardProps = FeatureCardProps | StatCardProps;

export function ContentCard(props: ContentCardProps) {
  if (props.variant === 'stat') {
    const { title, description, learnMoreLabel, learnMoreHref = '#', icon, className } = props;
    return (
      <Card
        variant='tertiary'
        className={`relative bg-white  flex h-full flex-col justify-between p-8 shadow-surface shadow-md min-h-64 ${className ?? ''}`}
      >
        <div className={icon ? 'pe-32' : ''}>
          <h3 className='mb-3 text-2xl font-bold'>{title}</h3>
          {description && (
            <p className='text-muted text-sm leading-relaxed max-w-md'>{description}</p>
          )}
        </div>
        {learnMoreLabel && (
          <Link to={learnMoreHref} className='mt-10 text-sm font-medium underline'>
            {learnMoreLabel}
          </Link>
        )}
        {icon && (
          <div className='absolute inset-e-0 lg:inset-e-0 bottom-0 h-32 lg:h-36'>{icon}</div>
        )}
      </Card>
    );
  }

  const { icon, title, description, className } = props;
  return (
    <Card
      variant='default'
      className={`flex flex-col h-full bg-white items-center gap-3 p-6 text-center shadow-surface transition-all duration-300 hover:scale-[1.03] hover:shadow-md cursor-default ${className ?? ''}`}
    >
      <div className='text-primary'>{icon}</div>
      <Card.Header className='flex-col items-center gap-1 p-0'>
        <Card.Title className='text-base font-bold'>{title}</Card.Title>
        <Card.Description className='text-xs'>{description}</Card.Description>
      </Card.Header>
    </Card>
  );
}
