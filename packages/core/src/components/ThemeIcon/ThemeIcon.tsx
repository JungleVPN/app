import { Button } from '@heroui/react';
import type { ColorGradientStyle } from '../../utils/colorParser';

interface IProps {
  getIconFromLibrary: (iconKey: string) => string;
  gradientStyle: ColorGradientStyle;
  svgIconKey: string;
}

export const ThemeIconComponent = (props: IProps) => {
  const { svgIconKey, getIconFromLibrary } = props;

  return (
    <Button isIconOnly className='size-9 shrink-0 rounded-full' variant='primary'>
      <span
        className='flex size-full items-center justify-center [&_svg]:size-4.5'
        dangerouslySetInnerHTML={{
          __html: getIconFromLibrary(svgIconKey),
        }}
      />
    </Button>
  );
};
