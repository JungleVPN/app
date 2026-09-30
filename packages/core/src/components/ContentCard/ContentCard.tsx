import { Card } from '@heroui/react';
import type { ReactNode } from 'react';
import { Heading } from '../../ui/Heading';
import { Paragraph } from '../../ui/Paragraph';
import { Link } from '../Link/Link';

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

type CompactCardProps = {
  variant: 'compact';
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
};

type ContentCardProps = FeatureCardProps | StatCardProps | CompactCardProps;

export function ContentCard(props: ContentCardProps) {
  if (props.variant === 'compact') {
    const { title, description, icon, className } = props;
    return (
      <Card
        variant='tertiary'
        className={`flex h-full flex-row-reverse items-center gap-8 bg-white p-8 shadow-surface shadow-md transition-all duration-300 hover:shadow-lg cursor-default ${className ?? ''}`}
      >
        <div className='flex flex-1 flex-col gap-4'>
          <Heading as='h3'>{title}</Heading>
          <Paragraph className={'text-muted text-base lg:text-lg'}>{description}</Paragraph>
        </div>
        <div className='w-20 shrink-0 *:m-0 *:h-auto *:w-full'>{icon}</div>
      </Card>
    );
  }

  if (props.variant === 'stat') {
    const { title, description, learnMoreLabel, learnMoreHref = '#', icon, className } = props;
    return (
      <Card
        variant='tertiary'
        className={`relative bg-white flex h-full flex-col justify-between items-center p-8 shadow-surface shadow-md min-h-64 transition-all duration-300 hover:shadow-lg cursor-default ${className ?? ''}`}
      >
        <div className='flex flex-col gap-4 w-full'>
          <Heading as='h3'>{title}</Heading>
          {description && (
            <Paragraph className={'max-w-md text-muted text-base lg:text-lg'}>
              {description}
            </Paragraph>
          )}
        </div>
        {learnMoreLabel && (
          <Link href={learnMoreHref} className='mt-10 text-sm font-medium underline'>
            {learnMoreLabel}
          </Link>
        )}
        {icon && <div className='h-auto w-fit'>{icon}</div>}
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
