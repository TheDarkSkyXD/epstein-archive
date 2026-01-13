import React, { useRef, useEffect, useState } from 'react';
import { useSensitiveSettings } from '../contexts/SensitiveSettingsContext';
import { EyeOff, Eye } from 'lucide-react';

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
  const [isRevealing, setIsRevealing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  const particlesRef = useRef<
    Array<{ x: number; y: number; vx: number; vy: number; alpha: number; size: number }>
  >([]);

  const shouldHide = isSensitive && !showAllSensitive && !revealed;

  useEffect(() => {
    if (!shouldHide || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const resize = () => {
      if (containerRef.current && canvas) {
        const rect = containerRef.current.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [shouldHide]);

  const handleReveal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRevealing) return;

    setIsRevealing(true);

    const canvas = canvasRef.current;
    if (!canvas) {
      setRevealed(true);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setRevealed(true);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Create particle explosion from click point
    const particles: Array<{ x: number; y: number; vx: number; vy: number; alpha: number; size: number }> = [];
    const particleCount = 150;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const speed = Math.random() * 8 + 3;
      const size = Math.random() * 4 + 2;

      particles.push({
        x: clickX,
        y: clickY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        size,
      });
    }

    // Add some random scatter particles
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;

      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 0.6,
        size: Math.random() * 3 + 1,
      });
    }

    particlesRef.current = particles;
    animate();
  };

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let activeParticles = 0;

    particlesRef.current.forEach((p) => {
      if (p.alpha <= 0.01) return;

      // Update position
      p.x += p.vx;
      p.y += p.vy;

      // Apply friction and gravity
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.vy += 0.3; // Gravity

      // Fade out
      p.alpha *= 0.94;

      // Draw particle with gradient
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      gradient.addColorStop(0, `rgba(100, 116, 139, ${p.alpha})`);
      gradient.addColorStop(1, `rgba(51, 65, 85, ${p.alpha * 0.5})`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      activeParticles++;
    });

    if (activeParticles > 0) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      setRevealed(true);
      setIsRevealing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
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
      {/* Actual content with blur */}
      <div
        className={`transition-all duration-700 ${
          isRevealing ? 'blur-sm opacity-70' : 'blur-2xl opacity-30'
        }`}
        style={{
          filter: isRevealing ? 'blur(8px) brightness(0.7)' : 'blur(40px) brightness(0.5)',
        }}
      >
        {children}
      </div>

      {/* Particle canvas overlay */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full pointer-events-none z-10 ${
          isRevealing ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Click overlay with icon */}
      {!isRevealing && (
        <button
          onClick={handleReveal}
          className="absolute inset-0 flex flex-col items-center justify-center z-20 cursor-pointer transition-all hover:bg-black/20 group"
          aria-label="Click to reveal sensitive content"
        >
          {/* Pulsing backdrop */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-md" />

          {/* Icon and label */}
          <div className="relative z-30 flex flex-col items-center gap-3 transition-transform group-hover:scale-110">
            <div className="w-16 h-16 rounded-full bg-slate-800/80 border-2 border-slate-600/50 flex items-center justify-center backdrop-blur-sm shadow-2xl group-hover:border-slate-500 transition-all">
              <EyeOff size={28} className="text-slate-300 group-hover:text-slate-200 transition-colors" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-white font-semibold text-base tracking-wide uppercase">
                {label}
              </span>
              <span className="text-slate-400 text-xs">Click to reveal</span>
            </div>
          </div>

          {/* Animated grain overlay */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.5' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }}
          />
        </button>
      )}

      {/* Revealing state overlay */}
      {isRevealing && (
        <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
          <div className="animate-pulse">
            <Eye size={48} className="text-white/60" />
          </div>
        </div>
      )}
    </div>
  );
};
