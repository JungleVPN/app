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
        variant='secondary'
        className={`relative flex flex-col justify-between p-8 shadow-surface shadow-md min-h-64 ${className ?? ''}`}
      >
        <div className={icon ? 'pr-40' : ''}>
          <h3 className='mb-3 text-2xl font-bold'>{title}</h3>
          {description && <p className='text-muted text-sm leading-relaxed'>{description}</p>}
        </div>
        {learnMoreLabel && (
          <Link to={learnMoreHref} className='mt-10 text-sm font-medium underline'>
            {learnMoreLabel}
          </Link>
        )}
        {icon && <div className='absolute right-10 bottom-10 h-32 w-32'>{icon}</div>}
      </Card>
    );
  }

  const { icon, title, description, className } = props;
  return (
    <Card
      variant='secondary'
      className={`flex flex-col items-center gap-3 p-6 text-center shadow-surface transition-all duration-300 hover:scale-[1.03] hover:shadow-md cursor-default ${className ?? ''}`}
    >
      <div className='text-primary'>{icon}</div>
      <Card.Header className='flex-col items-center gap-1 p-0'>
        <Card.Title className='text-base font-bold'>{title}</Card.Title>
        <Card.Description className='text-sm'>{description}</Card.Description>
      </Card.Header>
    </Card>
  );
}
