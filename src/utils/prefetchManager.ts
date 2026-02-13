/**
 * PREFETCH MANAGER
 *
 * Safe, rate-limited prefetching to prevent self-DDOS
 * - Max 3 concurrent requests
 * - Deduplication by entityId
 * - Cancels on fast scroll
 * - Respects Save-Data header
 * - Only prefetches lean DTOs
 */

interface PrefetchRequest {
  entityId: string;
  priority: number;
  timestamp: number;
  controller: AbortController;
}

class PrefetchManager {
  private queue: PrefetchRequest[] = [];
  private inFlight = new Map<string, AbortController>();
  private cache = new Map<string, { data: any; timestamp: number }>();

  private readonly MAX_CONCURRENT = 3;
  private readonly CACHE_TTL = 60000; // 60s
  private readonly SCROLL_VELOCITY_THRESHOLD = 500; // px/s

  private lastScrollY = 0;
  private lastScrollTime = Date.now();
  private scrollVelocity = 0;

  private enabled = true;

  constructor() {
    // Disable on slow connection or Save-Data
    if (typeof navigator !== 'undefined') {
      const connection = (navigator as any).connection;
      if (connection) {
        if (
          connection.saveData ||
          connection.effectiveType === 'slow-2g' ||
          connection.effectiveType === '2g'
        ) {
          this.enabled = false;
          console.log('[PrefetchManager] Disabled due to slow connection or Save-Data');
        }
      }
    }

    // Track scroll velocity
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', this.handleScroll, { passive: true });
    }
  }

  private handleScroll = () => {
    const now = Date.now();
    const currentScrollY = window.scrollY;

    const deltaY = Math.abs(currentScrollY - this.lastScrollY);
    const deltaTime = now - this.lastScrollTime;

    this.scrollVelocity = deltaTime > 0 ? (deltaY / deltaTime) * 1000 : 0;

    // Cancel all prefetches if scrolling fast
    if (this.scrollVelocity > this.SCROLL_VELOCITY_THRESHOLD) {
      this.cancelAll();
    }

    this.lastScrollY = currentScrollY;
    this.lastScrollTime = now;
  };

  /**
   * Prefetch entity overview DTO
   */
  async prefetch(entityId: string, priority = 0): Promise<void> {
    if (!this.enabled) return;

    // Check cache
    const cached = this.cache.get(entityId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return; // Already cached
    }

    // Check if already in flight
    if (this.inFlight.has(entityId)) {
      return; // Already prefetching
    }

    // Check if already queued
    if (this.queue.some((r) => r.entityId === entityId)) {
      return; // Already queued
    }

    // Add to queue
    const controller = new AbortController();
    this.queue.push({
      entityId,
      priority,
      timestamp: Date.now(),
      controller,
    });

    // Sort by priority (higher first)
    this.queue.sort((a, b) => b.priority - a.priority);

    // Process queue
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    // Process up to MAX_CONCURRENT requests
    while (this.inFlight.size < this.MAX_CONCURRENT && this.queue.length > 0) {
      const request = this.queue.shift();
      if (!request) break;

      this.inFlight.set(request.entityId, request.controller);

      try {
        // Only fetch lean DTO (no heavy tabs)
        const response = await fetch(`/api/entities/${request.entityId}`, {
          signal: request.controller.signal,
          headers: {
            'X-Prefetch': 'true', // Server can use this to deprioritize
          },
        });

        if (response.ok) {
          const data = await response.json();
          this.cache.set(request.entityId, {
            data,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        // Silently fail (prefetch is best-effort)
        if ((error as any).name !== 'AbortError') {
          console.warn(`[PrefetchManager] Failed to prefetch ${request.entityId}:`, error);
        }
      } finally {
        this.inFlight.delete(request.entityId);

        // Continue processing queue
        if (this.queue.length > 0) {
          this.processQueue();
        }
      }
    }
  }

  /**
   * Get cached data if available
   */
  getCached(entityId: string): any | null {
    const cached = this.cache.get(entityId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  /**
   * Cancel all in-flight and queued prefetches
   */
  cancelAll(): void {
    // Cancel in-flight
    for (const controller of this.inFlight.values()) {
      controller.abort();
    }
    this.inFlight.clear();

    // Cancel queued
    for (const request of this.queue) {
      request.controller.abort();
    }
    this.queue = [];
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get stats for debugging
   */
  getStats() {
    return {
      enabled: this.enabled,
      inFlight: this.inFlight.size,
      queued: this.queue.length,
      cached: this.cache.size,
      scrollVelocity: this.scrollVelocity.toFixed(2),
    };
  }
}

// Singleton instance
export const prefetchManager = new PrefetchManager();

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as any).prefetchManager = prefetchManager;
}
