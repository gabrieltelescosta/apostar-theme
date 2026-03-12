import type { ModuleFactory } from '../types/modules'
import { logger } from './logger'

const registry = new Map<string, ModuleFactory>()

export const moduleRegistry = {
  register(name: string, factory: ModuleFactory) {
    if (registry.has(name)) {
      logger.warn(`Module "${name}" already registered, overwriting.`)
    }
    registry.set(name, factory)
    logger.info(`Module "${name}" registered.`)
  },

  get(name: string): ModuleFactory | undefined {
    return registry.get(name)
  },

  has(name: string): boolean {
    return registry.has(name)
  },

  list(): string[] {
    return Array.from(registry.keys())
  },
}
