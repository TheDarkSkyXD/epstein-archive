import { useEffect, useState } from 'react';

/**
 * Custom hook for count-up animation
 * Smoothly animates a number from 0 to target value
 */
export function useCountUp(target: number, duration: number = 1500, enabled: boolean = true) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled || target === 0) {
      setCount(target);
      return;
    }

    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // Easing function for smooth animation (easeOutExpo)
      const easeOutExpo = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      setCount(Math.floor(target * easeOutExpo));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [target, duration, enabled]);

  return count;
}
