import { ScrollShadow, ScrollShadowProps } from '@heroui/react';

export const ScrollShadowComponent = (props: ScrollShadowProps) => {
  return (
    <ScrollShadow className='flex-1 overflow-y-auto' hideScrollBar {...props}>
      {props.children}
    </ScrollShadow>
  );
};
