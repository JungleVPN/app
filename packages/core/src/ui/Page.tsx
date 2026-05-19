import { Surface } from '@heroui/react';
import React, { PropsWithChildren } from 'react';

interface PageProps extends PropsWithChildren {
  icon?: string | React.ReactElement;
  title: string;
  subtitle?: string;
  description?: string;
}

export function Page(props: PageProps) {
  const { icon, title, subtitle, description, children } = props;

  return (
    <Surface variant={'transparent'} className={'flex flex-col items-center justify-center'}>
      {typeof icon === 'string' ? (
        <img src={icon} alt={title} className={'mx-auto h-[100px] w-[100px]'} />
      ) : (
        icon
      )}
      <p className={'mt-1 text-xl'}>{title}</p>
      <p className={'text-md text-muted m-1'}>{subtitle}</p>
      <p className={'text-sm text-muted'}>{description}</p>
      <div className={'mt-5 flex w-full flex-col py-2'}>{children}</div>
    </Surface>
  );
}
