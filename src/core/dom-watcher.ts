type WatcherCallback = () => void

interface WatcherEntry {
  cb: WatcherCallback
  priority: number
}

class DOMWatcher {
  private observer: MutationObserver | null = null
  private entries = new Map<string, WatcherEntry>()
  private pending = false
  private lastRun = 0
  private started = false

  private static readonly THROTTLE_MS = 350

  private static readonly OPTS: MutationObserverInit = {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'data-src', 'data-image', 'data-lazy', 'data-original'],
  }

  register(id: string, cb: WatcherCallback, priority = 50): void {
    this.entries.set(id, { cb, priority })
    if (!this.started) this.start()
  }

  unregister(id: string): void {
    this.entries.delete(id)
    if (this.entries.size === 0) this.stop()
  }

  private start(): void {
    if (this.started) return
    this.started = true
    this.observer = new MutationObserver(() => this.handle())
    this.observer.observe(document.documentElement, DOMWatcher.OPTS)
  }

  private stop(): void {
    this.observer?.disconnect()
    this.observer = null
    this.started = false
    this.pending = false
  }

  private handle(): void {
    if (this.pending) return
    this.pending = true

    const elapsed = Date.now() - this.lastRun
    const wait = Math.max(0, DOMWatcher.THROTTLE_MS - elapsed)

    setTimeout(() => {
      requestAnimationFrame(() => {
        this.observer?.disconnect()

        const sorted = [...this.entries.values()].sort((a, b) => a.priority - b.priority)
        for (const entry of sorted) {
          try {
            entry.cb()
          } catch (e) {
            console.warn('[DOMWatcher]', e)
          }
        }

        this.lastRun = Date.now()
        this.pending = false

        if (this.started && this.observer) {
          this.observer.observe(document.documentElement, DOMWatcher.OPTS)
        }
      })
    }, wait)
  }
}

export const domWatcher = new DOMWatcher()
