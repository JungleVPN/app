import { Surface } from '@heroui/react';
import type { IInfoBlockProps } from '../../types/infoBlock';
import { Paragraph } from '../../ui/Paragraph';

const colorGradients: Record<string, { background: string; border: string }> = {
  blue: {
    background:
      'linear-gradient(135deg, rgba(34, 139, 230, 0.1) 0%, rgba(28, 126, 214, 0.05) 100%)',
    border: 'rgba(34, 139, 230, 0.2)',
  },
  cyan: {
    background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)',
    border: 'rgba(34, 211, 238, 0.2)',
  },
  green: {
    background: 'linear-gradient(135deg, rgba(64, 192, 87, 0.1) 0%, rgba(55, 178, 77, 0.05) 100%)',
    border: 'rgba(64, 192, 87, 0.2)',
  },
  teal: {
    background:
      'linear-gradient(135deg, rgba(32, 201, 151, 0.1) 0%, rgba(18, 184, 134, 0.05) 100%)',
    border: 'rgba(32, 201, 151, 0.2)',
  },
  red: {
    background: 'linear-gradient(135deg, rgba(250, 82, 82, 0.1) 0%, rgba(224, 49, 49, 0.05) 100%)',
    border: 'rgba(250, 82, 82, 0.2)',
  },
  yellow: {
    background: 'linear-gradient(135deg, rgba(250, 176, 5, 0.1) 0%, rgba(245, 159, 0, 0.05) 100%)',
    border: 'rgba(250, 176, 5, 0.2)',
  },
  orange: {
    background: 'linear-gradient(135deg, rgba(253, 126, 20, 0.1) 0%, rgba(247, 103, 7, 0.05) 100%)',
    border: 'rgba(253, 126, 20, 0.2)',
  },
  violet: {
    background:
      'linear-gradient(135deg, rgba(151, 117, 250, 0.1) 0%, rgba(132, 94, 247, 0.05) 100%)',
    border: 'rgba(151, 117, 250, 0.2)',
  },
};

export const InfoBlock = (props: IInfoBlockProps) => {
  const { color, icon, title, value } = props;

  const gradient = colorGradients[color] || colorGradients.cyan;

  return (
    <Surface
      className='rounded-lg p-2 backdrop-blur-md transition-colors'
      style={{
        background: gradient.background,
        border: `1px solid ${gradient.border}`,
      }}
      variant='transparent'
    >
      <div className='flex flex-col gap-1'>
        <div className='flex min-w-0 items-center gap-1'>
          <Surface
            className='flex size-6 shrink-0 items-center justify-center rounded-sm'
            variant='secondary'
          >
            {icon}
          </Surface>
          <Paragraph>{title}</Paragraph>
        </div>
        <Paragraph>{value}</Paragraph>
      </div>
    </Surface>
  );
};
