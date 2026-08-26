import { Spinner, Surface } from '@heroui/react';

export function Loading() {
  return (
    <Surface
      className='flex w-full flex-col items-center justify-center gap-2'
      variant='transparent'
    >
      <Spinner color='accent' size='lg' />
    </Surface>
  );
}
