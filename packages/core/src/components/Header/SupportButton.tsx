import { Button, Popover } from '@heroui/react';
import {
  IconBrandTelegram,
  IconCheck,
  IconCopy,
  IconHelpCircle,
  IconMail,
} from '@tabler/icons-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { coreEnv } from '../../env';
import { useClipboard } from '../../hooks';

interface SupportOption {
  id: 'telegram' | 'email';
  label: string;
  href: string;
  target?: string;
  icon: ReactNode;
  copyValue?: string;
}

export function SupportButton() {
  const { t } = useTranslation();
  const { supportUrl, supportEmail } = coreEnv;
  const { copied, copy } = useClipboard();
  const [isOpen, setIsOpen] = useState(false);

  const options: (SupportOption | null)[] = [
    supportUrl
      ? {
          id: 'telegram',
          label: t('header.support.telegram'),
          href: supportUrl,
          target: '_blank',
          icon: <IconBrandTelegram size={18} />,
        }
      : null,
    supportEmail
      ? {
          id: 'email',
          label: t('header.support.email'),
          href: `mailto:${supportEmail}`,
          icon: <IconMail size={18} />,
          copyValue: supportEmail,
        }
      : null,
  ];
  const supportOptions = options.filter((option): option is SupportOption => option !== null);

  if (supportOptions.length === 0) return null;

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button isIconOnly size='md' variant='tertiary' aria-label={t('a11y.support')}>
        <IconHelpCircle />
      </Button>
      <Popover.Content className='w-56 p-0'>
        <Popover.Dialog className='flex flex-col gap-0.5 p-1.5'>
          {supportOptions.map((option) => (
            <div
              key={option.id}
              className='flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 hover:bg-foreground/5 hover:rounded-2xl'
            >
              <a
                href={option.href}
                target={option.target}
                rel={option.target === '_blank' ? 'noopener noreferrer' : undefined}
                onClick={() => setIsOpen(false)}
                className='flex flex-1 items-center gap-2 text-sm'
              >
                {option.icon}
                <span>{option.label}</span>
              </a>
              {option.copyValue && (
                <Button
                  isIconOnly
                  size='sm'
                  variant='tertiary'
                  aria-label={t('a11y.copySupportEmail')}
                  className='size-6 shrink-0 [&_svg]:size-4'
                  onPress={() => copy(option.copyValue as string)}
                >
                  {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                </Button>
              )}
            </div>
          ))}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
