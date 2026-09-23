import { Button, Drawer } from '@heroui/react';
import { IconMenu2, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { usePlatformStore } from '../../stores';
import { currentScope, isLandingPath, isMarketingPath, PRICING_PATH } from '../../utils';
import { Link } from '../Link/Link';
import { AuthButtons } from './AuthButtons';
import { LanguageSwitcher } from './LanguageSwitcher';
import { OFFER_MENU_ITEMS, TOOLS_MENU_ITEMS } from './offerMenuItems';

const navItemClass =
  'flex items-center px-3 py-2.5 rounded-xl text-sm text-foreground/70 hover:text-foreground hover:bg-default transition-colors text-start';

export function MobileDrawer() {
  const { t, i18n } = useTranslation();
  const { platformType } = usePlatformStore();
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const isLanding = isMarketingPath(pathname);
  const isRu = currentScope() === 'ru';
  const isTelegram = platformType === 'telegram';

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

      <Drawer.Backdrop variant='blur' isOpen={isOpen} onOpenChange={setIsOpen} className={'z-100'}>
        <Drawer.Content placement={i18n.dir() === 'rtl' ? 'left' : 'right'}>
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
                  <Link
                    href={PRICING_PATH}
                    className={navItemClass}
                    onClick={() => setIsOpen(false)}
                  >
                    {t('header.nav.pricing')}
                  </Link>
                  {OFFER_MENU_ITEMS.map((item) => (
                    <Link
                      key={item.id}
                      href={item.path}
                      className={navItemClass}
                      onClick={() => setIsOpen(false)}
                    >
                      {t(item.labelKey)}
                    </Link>
                  ))}
                  {TOOLS_MENU_ITEMS.map((item) => (
                    <Link
                      key={item.id}
                      href={item.path}
                      className={navItemClass}
                      onClick={() => setIsOpen(false)}
                    >
                      {t(item.labelKey)}
                    </Link>
                  ))}
                  {isLandingPath(pathname) && (
                    <button
                      type='button'
                      className={navItemClass}
                      onClick={() => scrollTo('partnership')}
                    >
                      {t('header.nav.partnership')}
                    </button>
                  )}
                </nav>
              )}

              {platformType === 'web' && <AuthButtons />}

              {!isRu && !isTelegram && (
                <div className='flex items-center gap-2 px-3 py-2 mt-auto'>
                  <LanguageSwitcher />
                </div>
              )}
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </div>
  );
}
