type Handler = (...args: unknown[]) => void

const listeners = new Map<string, Set<Handler>>()

export const eventBus = {
  on(event: string, handler: Handler) {
    if (!listeners.has(event)) {
      listeners.set(event, new Set())
    }
    listeners.get(event)!.add(handler)
    return () => this.off(event, handler)
  },

  off(event: string, handler: Handler) {
    listeners.get(event)?.delete(handler)
  },

  emit(event: string, ...args: unknown[]) {
    listeners.get(event)?.forEach((handler) => {
      try {
        handler(...args)
      } catch (err) {
        console.error(`[APW] Event handler error for "${event}":`, err)
      }
    })
  },

  clear() {
    listeners.clear()
  },
}
