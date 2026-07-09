export class Timer {
  constructor(onTick) {
    this.onTick = onTick;
    this.intervalId = null;
    this.elapsedMs = 0;
    this.startedAt = null;
  }

  start() {
    if (this.intervalId) return;
    this.startedAt = performance.now() - this.elapsedMs;
    this.intervalId = setInterval(() => {
      this.elapsedMs = performance.now() - this.startedAt;
      this.onTick?.(this.elapsedSeconds);
    }, 200);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reset() {
    this.stop();
    this.elapsedMs = 0;
    this.onTick?.(0);
  }

  get elapsedSeconds() {
    return Math.floor(this.elapsedMs / 1000);
  }

  get isRunning() {
    return this.intervalId !== null;
  }
}
