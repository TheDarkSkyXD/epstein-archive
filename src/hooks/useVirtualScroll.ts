import { useState, useRef, useCallback } from 'react';

// Custom hook for virtual scrolling
export const useVirtualScroll = (itemCount: number, itemHeight: number, containerHeight: number) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  const scrollTopRef = useRef(0);

  const calculateVisibleRange = useCallback((scrollTop: number) => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 2; // +2 for buffer
    const end = Math.min(start + visibleCount, itemCount);
    
    return { start, end };
  }, [itemCount, itemHeight, containerHeight]);

  const handleScroll = useCallback((scrollTop: number) => {
    scrollTopRef.current = scrollTop;
    setVisibleRange(calculateVisibleRange(scrollTop));
  }, [calculateVisibleRange]);

  return {
    visibleRange,
    handleScroll,
    totalHeight: itemCount * itemHeight,
    offsetY: visibleRange.start * itemHeight
  };
};
