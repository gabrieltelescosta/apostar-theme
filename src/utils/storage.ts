interface CacheEntry<T> {
  data: T
  expiry: number
}

export function storageSet<T>(key: string, data: T, ttlSeconds: number): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      expiry: Date.now() + ttlSeconds * 1000,
    }
    localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // localStorage full or unavailable
  }
}

export function storageGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null

    const entry: CacheEntry<T> = JSON.parse(raw)
    if (Date.now() > entry.expiry) {
      localStorage.removeItem(key)
      return null
    }

    return entry.data
  } catch {
    return null
  }
}

export function storageClear(prefix = 'apw:'): void {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(prefix)) keys.push(key)
  }
  keys.forEach((key) => localStorage.removeItem(key))
}
