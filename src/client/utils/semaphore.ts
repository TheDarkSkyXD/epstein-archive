export class Semaphore {
  private tasks: (() => void)[] = [];
  private activeCount = 0;

  constructor(public max: number) {}

  async acquire(): Promise<() => void> {
    if (this.activeCount < this.max) {
      this.activeCount++;
      return this.release.bind(this);
    }

    return new Promise<() => void>((resolve) => {
      this.tasks.push(() => resolve(this.release.bind(this)));
    });
  }

  private release() {
    this.activeCount--;
    if (this.tasks.length > 0 && this.activeCount < this.max) {
      this.activeCount++;
      const nextTask = this.tasks.shift();
      if (nextTask) nextTask();
    }
  }
}

export function isHeavyRoute(url: string): boolean {
  if (url.includes('/api/analytics/enhanced')) return true;
  if (url.includes('/api/map/entities')) return true;
  if (url.includes('/api/graph/')) return true;
  if (/\/api\/entities\/\d+\/media/.test(url)) return true;
  return false;
}
