import React, { useState, useRef, useCallback } from 'react';
import { useSharedIntersectionObserver } from '../hooks/useSharedIntersectionObserver';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  placeholderSrc?: string;
  threshold?: number;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholderSrc = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMSAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNlNWU3ZWIiIC8+PC9zdmc+', // Light gray placeholder
  threshold = 0.1,
  className,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Use shared IntersectionObserver instead of creating one per image
  const handleIntersection = useCallback((intersecting: boolean) => {
    if (intersecting) {
      setIsInView(true);
    }
  }, []);

  useSharedIntersectionObserver(imgRef, handleIntersection, {
    threshold,
    rootMargin: '200px',
  });

  return (
    <div
      className={`relative overflow-hidden ${className || ''}`}
      style={{ backgroundColor: '#f3f4f6' }}
    >
      <img
        ref={imgRef}
        src={isInView ? src : placeholderSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-500 ease-in-out ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        {...props}
      />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default LazyImage;
