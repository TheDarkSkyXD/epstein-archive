import React, { useRef, useEffect, useState } from 'react';
import { useSensitiveSettings } from '../contexts/SensitiveSettingsContext';
import { EyeOff } from 'lucide-react';

interface SensitiveContentProps {
  isSensitive?: boolean;
  children: React.ReactNode;
  className?: string;
  label?: string;
}

export const SensitiveContent: React.FC<SensitiveContentProps> = ({
  isSensitive = false,
  children,
  className = '',
  label = 'Sensitive Content',
}) => {
  const { showAllSensitive } = useSensitiveSettings();
  const [revealed, setRevealed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  const particlesRef = useRef<
    Array<{ x: number; y: number; vx: number; vy: number; alpha: number; color: string }>
  >([]);
  const isAnimating = useRef(false);

  const shouldHide = isSensitive && !showAllSensitive && !revealed;

  useEffect(() => {
    if (!shouldHide || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to match container
    const resize = () => {
      if (containerRef.current && canvas) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
        drawNoise(ctx, canvas.width, canvas.height);
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [shouldHide]);

  const drawNoise = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Fill with blur/noise aesthetic - dark moody version matching theme
    ctx.fillStyle = '#1a1a1a'; // Dark background
    ctx.fillRect(0, 0, width, height);

    // Add noise
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = Math.random() * 20;
      data[i] = data[i] + noise; // r
      data[i + 1] = data[i + 1] + noise; // g
      data[i + 2] = data[i + 2] + noise; // b
      // alpha stays
    }
    ctx.putImageData(imageData, 0, 0);

    // Draw Icon/Text
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, width / 2, height / 2 + 20);

    // Draw Eye Icon (simplified)
    ctx.beginPath();
    ctx.arc(width / 2, height / 2 - 10, 10, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.stroke();
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAnimating.current) return;
    isAnimating.current = true;

    // Initialize particles
    const canvas = canvasRef.current;
    if (!canvas) return; // Should not happen
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Create particles from grid
    const PARTICLE_SIZE = 4;
    const particles = [];

    // Optimization: Don't use every pixel, use grid
    for (let x = 0; x < width; x += PARTICLE_SIZE) {
      for (let y = 0; y < height; y += PARTICLE_SIZE) {
        // Calculate velocity away from click center (assume click is roughly center or random)
        // Actually, let's make them disperse randomly + downward slightly like dust
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;

        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          color: `rgba(${30 + Math.random() * 20}, ${30 + Math.random() * 20}, ${30 + Math.random() * 20},`,
        });
      }
    }
    particlesRef.current = particles;

    animate();
  };

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous frame

    let activeParticles = 0;

    particlesRef.current.forEach((p) => {
      if (p.alpha <= 0.01) return;

      p.x += p.vx;
      p.y += p.vy;
      p.alpha *= 0.92; // Decay

      // Gravity/Dust feel
      p.vy += 0.2;

      ctx.fillStyle = `${p.color} ${p.alpha})`;
      ctx.fillRect(p.x, p.y, 4, 4); // Draw square particles for speed
      activeParticles++;
    });

    if (activeParticles > 0) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      setRevealed(true);
      isAnimating.current = false;
    }
  };

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  if (!shouldHide) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ minHeight: '100px' }}
    >
      {/* Hidden Content (for layout sizing if needed, or we might need accurate sizing) */}
      <div className="invisible" aria-hidden="true">
        {children}
      </div>

      {/* Canvas Overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-pointer z-10 w-full h-full"
        onClick={handleClick}
        title="Click to reveal sensitive content"
      />

      {/* Accessible Button Overlay (visually hidden but focusable) */}
      <button className="sr-only" onClick={handleClick}>
        Reveal sensitive content
      </button>

      {/* Icon overlay before canvas draws (to avoid FOUC) or rendered on canvas */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-gray-400">
        {!canvasRef.current && <EyeOff size={32} />}
      </div>
    </div>
  );
};
