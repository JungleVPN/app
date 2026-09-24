import { Chip, type ChipProps, Surface } from '@heroui/react';
import React, { PropsWithChildren } from 'react';
import { BackButton } from './BackButton';
import { Heading } from './Heading';
import { Paragraph } from './Paragraph';

interface PageProps extends PropsWithChildren {
  icon?: string | React.ReactElement;
  chip?: string;
  chipColor?: ChipProps['color'];
  title: string;
  subtitle?: string;
  description?: string;
  showBackButton?: boolean;
}

export function Page(props: PageProps) {
  const {
    icon,
    chip,
    chipColor,
    title,
    subtitle,
    description,
    showBackButton = true,
    children,
  } = props;

  return (
    <Surface variant={'transparent'} className={'flex flex-col items-center justify-center'}>
      <div className={'relative flex w-full items-center justify-center'}>
        {showBackButton && <BackButton className={'absolute top-0 left-0'} />}
        {typeof icon === 'string' ? (
          <img src={icon} alt={title} className={'mx-auto h-25 w-25'} />
        ) : (
          icon
        )}
      </div>
      {chip && <Chip color={chipColor}>{chip}</Chip>}
      <Heading>{title}</Heading>
      <Paragraph>{subtitle}</Paragraph>
      <Paragraph>{description}</Paragraph>
      <div className={'mt-5 flex w-full flex-col py-2'}>{children}</div>
    </Surface>
  );
}
