import { Button, Dropdown, Label } from '@heroui/react';
import { IconChevronDown } from '@tabler/icons-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useHoverOpen, useNavigation } from '../../hooks';
import { OFFER_MENU_ITEMS, pathForOfferItem } from './offerMenuItems';

type OfferMenuProps = {
  triggerClassName?: string;
};

/**
 * The header's "What we offer" menu. It opens on hover rather than on press —
 * the trigger is a disclosure, not an action, so a press does nothing. Keyboard
 * focus opens it too, which is what keeps it reachable without a pointer.
 *
 * Navigation runs through `useNavigation` rather than an item `href`, because
 * React Aria's menu items are not wired to the router — a plain anchor here
 * would force a full page load.
 */
export function OfferMenu({ triggerClassName }: OfferMenuProps) {
  const { t } = useTranslation();
  const navigate = useNavigation();
  const pointerInside = useRef(false);
  // A press focuses the trigger as well, and that must not stand in for the
  // hover the menu belongs to.
  const focusFromPointer = useRef(false);
  // Escape hands focus back to the trigger. Without this, that returning focus
  // would reopen the menu the user just dismissed.
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
        // React Aria toggles on press and closes on an outside interaction. Only
        // the closes matter here, and only once the pointer has left — otherwise
        // a press would collapse the menu hover just opened.
        if (nextOpen || pointerInside.current) return;
        focusReopenBlocked.current = true;
        closeNow();
      }}
    >
      {/* React Aria's Button keeps its own focus and pointer handling, so those
          listeners live on a wrapper instead. `display: contents` keeps it out of
          the layout, and hover stays on the button itself. */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: the wrapper only
          observes focus; the button inside carries the menu's semantics. */}
      <span
        className='contents'
        onFocus={() => {
          if (focusFromPointer.current || focusReopenBlocked.current) return;
          open();
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
          // React Aria marks the trigger as pressed for as long as the menu is
          // open, and HeroUI shrinks a pressed button. This one reads as a nav
          // item, not a button, so it holds its size. The override has to name
          // `transform`, which is the property HeroUI's own rule sets.
          className={`${triggerClassName ?? ''} flex items-center gap-1 [transform:none]!`}
          variant='tertiary'
          onHoverStart={enter}
          onHoverEnd={leave}
        >
          {t('header.nav.offer')}
          <IconChevronDown
            size={18}
            stroke={2}
            aria-hidden='true'
            className={`transition-transform duration-200 ease-out ${isOpen ? 'rotate-180' : ''}`}
          />
        </Button>
      </span>
      {/* Non-modal: a modal popover makes the page behind it non-interactive, which
          pulls the pointer off the trigger and leaves the hover state flickering. */}
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
          {OFFER_MENU_ITEMS.map((item) => {
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
