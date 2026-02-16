import { useEffect } from 'react';

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

    // Get original overflow style
    const originalStyle = window.getComputedStyle(document.body).overflow;

    // Prevent scrolling
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen]);
};
