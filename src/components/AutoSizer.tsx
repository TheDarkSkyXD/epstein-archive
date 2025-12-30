import React, { useEffect, useRef, useState, ReactNode } from 'react';

interface Size {
  width: number;
  height: number;
}

interface AutoSizerProps {
  children: (size: Size) => ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const AutoSizer: React.FC<AutoSizerProps> = ({ children, className, style }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });

    resizeObserver.observe(element);
    
    // Initial measure
    const rect = element.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={className} 
      style={{ width: '100%', height: '100%', overflow: 'hidden', ...style }}
    >
      {size.width > 0 && size.height > 0 && children(size)}
    </div>
  );
};

export default AutoSizer;
