import type { GlobalConfig, PageConfig } from '../types/config'
import { logger } from './logger'
import { storageGet, storageSet } from '../utils/storage'

let globalConfig: GlobalConfig | null = null

const isDev = import.meta.env?.DEV ?? false

function resolveBaseUrl(): string {
  if (isDev) return ''

  if (globalConfig?.cdnBase) return globalConfig.cdnBase

  try {
    const url = new URL(import.meta.url)
    return `${url.origin}${url.pathname.replace(/\/widget\.js$/, '').replace(/\/modules\/.*$/, '')}`
  } catch {
    // import.meta.url unavailable
  }

  return ''
}

function detectPage(): string {
  const path = window.location.pathname.replace(/\/$/, '') || '/'

  const segments = path.split('/').filter(Boolean)
  if (segments.length === 0) return 'home'

  return segments[0]
}

export async function loadGlobalConfig(): Promise<GlobalConfig> {
  if (globalConfig) return globalConfig

  const base = resolveBaseUrl()
  const url = `${base}/config/global.json`

  try {
    const cached = storageGet<GlobalConfig>('apw:global-config')
    if (cached) {
      globalConfig = cached
      logger.info('Global config loaded from cache.')
      return cached
    }

    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data: GlobalConfig = await res.json()
    globalConfig = data
    storageSet('apw:global-config', data, data.cacheTTL ?? 300)
    logger.info('Global config fetched.', data)
    return data
  } catch (err) {
    logger.error('Failed to load global config:', err)
    globalConfig = {
      cdnBase: resolveBaseUrl(),
      debug: false,
      cacheTTL: 300,
      featureFlags: {},
    }
    return globalConfig
  }
}

export async function loadPageConfig(): Promise<PageConfig> {
  const global = await loadGlobalConfig()
  const base = global.cdnBase || resolveBaseUrl()
  const page = detectPage()
  const cacheKey = `apw:page-config:${page}`

  try {
    const cached = storageGet<PageConfig>(cacheKey)
    if (cached) {
      logger.info(`Page config "${page}" loaded from cache.`)
      return cached
    }

    let data: PageConfig | null = null

    if (global.configEndpoint) {
      const res = await fetch(`${global.configEndpoint}?page=${page}`)
      if (res.ok) data = await res.json()
    }

    if (!data) {
      const res = await fetch(`${base}/config/pages/${page}.json`)
      if (res.ok) {
        data = await res.json()
      } else {
        logger.warn(`No config for "${page}", falling back to default.`)
        const fallback = await fetch(`${base}/config/pages/default.json`)
        if (fallback.ok) data = await fallback.json()
      }
    }

    if (!data) {
      data = { page, modules: [] }
    }

    storageSet(cacheKey, data, global.cacheTTL ?? 300)
    logger.info(`Page config "${page}" loaded.`, data)
    return data
  } catch (err) {
    logger.error(`Failed to load page config for "${page}":`, err)
    return { page, modules: [] }
  }
}

export function getGlobalConfig(): GlobalConfig | null {
  return globalConfig
}
