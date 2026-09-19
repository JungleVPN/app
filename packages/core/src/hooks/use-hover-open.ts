import { useCallback, useEffect, useRef, useState } from 'react';

type UseHoverOpenOptions = {
  /**
   * How long the menu stays open after the pointer leaves. The grace period is
   * what lets the pointer cross the gap between the trigger and the popover
   * without the menu collapsing underneath it.
   */
  closeDelayMs?: number;
  /** Called when the user dismisses the menu with Escape. */
  onDismiss?: () => void;
};

/**
 * Open/closed state for a menu that opens on hover rather than on click.
 */
export function useHoverOpen({ closeDelayMs = 150, onDismiss }: UseHoverOpenOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPendingClose = useCallback(() => {
    if (closeTimer.current === null) return;
    clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  const open = useCallback(() => {
    cancelPendingClose();
    setIsOpen(true);
  }, [cancelPendingClose]);

  const close = useCallback(() => {
    cancelPendingClose();
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      setIsOpen(false);
    }, closeDelayMs);
  }, [cancelPendingClose, closeDelayMs]);

  const closeNow = useCallback(() => {
    cancelPendingClose();
    setIsOpen(false);
  }, [cancelPendingClose]);

  useEffect(() => cancelPendingClose, [cancelPendingClose]);

  // A hover menu still has to be dismissible from the keyboard. The listener runs
  // in the capture phase because an overlay holding focus stops Escape from
  // bubbling as far as the document.
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      onDismiss?.();
      closeNow();
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen, closeNow, onDismiss]);

  return { isOpen, open, close, closeNow };
}
