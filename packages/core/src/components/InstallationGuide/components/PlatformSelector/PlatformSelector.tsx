import { Label, ListBox, Select } from '@heroui/react';
import type { TSubscriptionPagePlatformKey } from '@workspace/types';
import type { Key } from 'react';
import { useTranslation } from 'react-i18next';

export interface PlatformOption {
  value: TSubscriptionPagePlatformKey;
  label: string;
  icon: string;
}

interface PlatformSelectorProps {
  options: PlatformOption[];
  selectedPlatformId: TSubscriptionPagePlatformKey;
  onSelect: (platform: TSubscriptionPagePlatformKey) => void;
}

export function PlatformSelector({ options, selectedPlatformId, onSelect }: PlatformSelectorProps) {
  const { t } = useTranslation();

  if (options.length <= 1) return null;

  const selectedIcon = options.find((opt) => opt.value === selectedPlatformId)?.icon ?? '';

  return (
    <Select
      className='w-[150px]'
      value={selectedPlatformId}
      variant='secondary'
      onChange={(value: Key | null) => {
        if (value == null) return;
        onSelect(value as TSubscriptionPagePlatformKey);
      }}
    >
      <Label className='sr-only'>{t('a11y.platform')}</Label>
      <Select.Trigger className={'items-center'}>
        <span
          className='flex size-5 shrink-0 items-center justify-center mr-1'
          // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted SVG icon string
          dangerouslySetInnerHTML={{ __html: selectedIcon }}
        />
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className='bg-overlay text-overlay-foreground'>
        <ListBox className='text-overlay-foreground'>
          {options.map((opt) => (
            <ListBox.Item key={opt.value} id={opt.value} textValue={opt.label}>
              <ListBox.ItemIndicator />
              <Label>{opt.label}</Label>
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
