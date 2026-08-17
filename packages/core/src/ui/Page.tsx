import { Chip, type ChipProps, Surface } from '@heroui/react';
import React, { PropsWithChildren } from 'react';
import { BackButton } from './BackButton';

interface PageProps extends PropsWithChildren {
  icon?: string | React.ReactElement;
  chip?: string;
  chipColor?: ChipProps['color'];
  title: string;
  titleClassName?: string;
  subtitleClassName?: string;
  subtitle?: string;
  description?: string;
}

export function Page(props: PageProps) {
  const {
    icon,
    chip,
    chipColor,
    title,
    titleClassName,
    subtitleClassName,
    subtitle,
    description,
    children,
  } = props;

  return (
    <Surface variant={'transparent'} className={'flex flex-col items-center justify-center'}>
      <div className={'relative flex w-full items-center justify-center'}>
        <BackButton className={'absolute top-0 left-0'} />
        {typeof icon === 'string' ? (
          <img src={icon} alt={title} className={'mx-auto h-25 w-25'} />
        ) : (
          icon
        )}
      </div>
      {chip && <Chip color={chipColor}>{chip}</Chip>}
      <h1 className={titleClassName ?? 'mt-1 text-xl'}>{title}</h1>
      <p className={subtitleClassName ?? 'text-md text-muted m-1'}>{subtitle}</p>
      <p className={'text-sm text-muted'}>{description}</p>
      <div className={'mt-5 flex w-full flex-col py-2'}>{children}</div>
    </Surface>
  );
}
