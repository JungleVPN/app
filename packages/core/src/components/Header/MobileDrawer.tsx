import { Button, Drawer } from '@heroui/react';
import { IconMenu2, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { usePlatformStore } from '../../stores';
import { AuthButtons } from './AuthButtons';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';

export function MobileDrawer() {
  const { t } = useTranslation();
  const { platformType } = usePlatformStore();
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const isLanding = pathname === '/';

  const scrollTo = (id: string) => {
    setIsOpen(false);
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 150);
  };

  return (
    <div className='flex items-center gap-2'>
      <Button
        isIconOnly
        variant='tertiary'
        size='md'
        aria-label={t('header.menu')}
        onPress={() => setIsOpen(true)}
      >
        <IconMenu2 stroke={2} size={20} />
      </Button>

      <Drawer.Backdrop variant='blur' isOpen={isOpen} onOpenChange={setIsOpen}>
        <Drawer.Content placement='right'>
          <Drawer.Dialog>
            <Drawer.Header className='flex flex-row items-center justify-between'>
              <Drawer.Heading className='flex items-center gap-2'>
                {t('header.menu')}
              </Drawer.Heading>
              <Button
                isIconOnly
                variant='tertiary'
                size='sm'
                slot='close'
                aria-label={t('common.close')}
              >
                <IconX stroke={2} size={18} />
              </Button>
            </Drawer.Header>

            <Drawer.Body className='flex flex-col gap-2'>
              {isLanding && (
                <nav className='flex flex-col gap-1'>
                  {(['pricing', 'partnership'] as const).map((id) => (
                    <button
                      key={id}
                      type='button'
                      className='flex items-center px-3 py-2.5 rounded-xl text-sm text-foreground/70 hover:text-foreground hover:bg-default transition-colors text-left'
                      onClick={() => scrollTo(id)}
                    >
                      {t(`header.nav.${id}`)}
                    </button>
                  ))}
                </nav>
              )}

              {platformType === 'web' && <AuthButtons />}

              <div className='flex items-center gap-2 px-3 py-2 mt-auto'>
                <ThemeToggle />
                <LanguageSwitcher />
              </div>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </div>
  );
}
