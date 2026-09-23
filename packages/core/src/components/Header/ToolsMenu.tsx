import { Button, Dropdown, Label } from '@heroui/react';
import { IconChevronDown } from '@tabler/icons-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useHoverOpen, useNavigation } from '../../hooks';
import { pathForOfferItem, TOOLS_MENU_ITEMS } from './offerMenuItems';

type ToolsMenuProps = { triggerClassName?: string };

/** A hover-and-focus disclosure matching the header's existing offer menu. */
export function ToolsMenu({ triggerClassName }: ToolsMenuProps) {
  const { t } = useTranslation();
  const navigate = useNavigation();
  const pointerInside = useRef(false);
  const focusFromPointer = useRef(false);
  const focusReopenBlocked = useRef(false);
  const { isOpen, open, close, closeNow } = useHoverOpen({
    onDismiss: () => {
      focusReopenBlocked.current = true;
    },
  });
  const enter = () => {
    pointerInside.current = true;
    focusReopenBlocked.current = false;
    open();
  };
  const leave = () => {
    pointerInside.current = false;
    close();
  };

  return (
    <Dropdown
      isOpen={isOpen}
      onOpenChange={(nextOpen) => {
        if (nextOpen || pointerInside.current) return;
        focusReopenBlocked.current = true;
        closeNow();
      }}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: the nested button owns semantics. */}
      <span
        className='contents'
        onFocus={() => {
          if (!focusFromPointer.current && !focusReopenBlocked.current) open();
        }}
        onBlur={(event) => {
          focusFromPointer.current = false;
          if (event.currentTarget.contains(event.relatedTarget)) return;
          focusReopenBlocked.current = false;
          closeNow();
        }}
        onPointerDown={() => {
          focusFromPointer.current = true;
        }}
      >
        <Button
          className={`${triggerClassName ?? ''} flex items-center gap-1 [transform:none]!`}
          variant='tertiary'
          onHoverStart={enter}
          onHoverEnd={leave}
        >
          {t('header.nav.tools')}
          <IconChevronDown
            size={18}
            stroke={2}
            aria-hidden='true'
            className={`transition-transform duration-200 ease-out ${isOpen ? 'rotate-180' : ''}`}
          />
        </Button>
      </span>
      <Dropdown.Popover placement='bottom' isNonModal onMouseEnter={open} onMouseLeave={leave}>
        <Dropdown.Menu
          onAction={(key) => {
            const path = pathForOfferItem(String(key));
            if (!path) return;
            pointerInside.current = false;
            closeNow();
            navigate(path);
          }}
        >
          {TOOLS_MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Dropdown.Item key={item.id} id={item.id} textValue={t(item.labelKey)}>
                <span className='flex items-center gap-3'>
                  <span className='flex size-10 shrink-0 items-center justify-center rounded-xl border border-divider bg-surface-secondary'>
                    <Icon size={20} stroke={1.5} aria-hidden='true' />
                  </span>
                  <span className='flex flex-col gap-0.5'>
                    <Label className='font-semibold'>{t(item.labelKey)}</Label>
                    <span className='text-sm text-foreground/50'>{t(item.descriptionKey)}</span>
                  </span>
                </span>
              </Dropdown.Item>
            );
          })}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
