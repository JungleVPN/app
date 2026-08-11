import { ScrollShadow, ScrollShadowProps } from '@heroui/react';

export const ScrollShadowComponent = (props: ScrollShadowProps) => {
  return (
    <ScrollShadow hideScrollBar {...props}>
      {props.children}
    </ScrollShadow>
  );
};
