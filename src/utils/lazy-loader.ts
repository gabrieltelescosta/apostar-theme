import { logger } from '../core/logger'

const loadedChunks = new Map<string, unknown>()

export async function lazyLoad<T>(
  name: string,
  loader: () => Promise<T>,
): Promise<T> {
  if (loadedChunks.has(name)) {
    return loadedChunks.get(name) as T
  }

  logger.info(`Lazy loading "${name}"...`)
  const mod = await loader()
  loadedChunks.set(name, mod)
  logger.info(`"${name}" loaded.`)
  return mod
}
