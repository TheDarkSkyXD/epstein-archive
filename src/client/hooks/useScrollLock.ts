import { useEffect } from 'react';

let lockCount = 0;
let previousBodyOverflow = '';
let previousBodyPaddingRight = '';
let previousHtmlOverflow = '';

/**
 * Hook to lock body scroll when a modal is open.
 * Handles multiple nested modals correctly by maintaining a lock count (conceptually,
 * though simplistic implementation usually suffices for this app).
 *
 * Also adds padding to body to prevent layout shift from scrollbar disappearance.
 */
export const useScrollLock = (isOpen: boolean) => {
  useEffect(() => {
    if (!isOpen) return;

    lockCount += 1;
    if (lockCount === 1) {
      const bodyStyle = window.getComputedStyle(document.body);
      const htmlStyle = window.getComputedStyle(document.documentElement);
      previousBodyOverflow = bodyStyle.overflow;
      previousBodyPaddingRight = document.body.style.paddingRight;
      previousHtmlOverflow = htmlStyle.overflow;

      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
        document.body.style.paddingRight = previousBodyPaddingRight;
        document.documentElement.style.overflow = previousHtmlOverflow;
      }
    };
  }, [isOpen]);
};
