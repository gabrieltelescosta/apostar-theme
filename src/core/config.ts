import type { GlobalConfig, PageConfig } from '../types/config'
import { logger } from './logger'
import { storageGet, storageSet } from '../utils/storage'

let globalConfig: GlobalConfig | null = null

const isDev = import.meta.env?.DEV ?? false

function resolveBaseUrl(): string {
  if (isDev) return ''

  if (globalConfig?.cdnBase) return globalConfig.cdnBase

  const script = document.querySelector<HTMLScriptElement>('script[src*="widget.js"]')
  if (script?.src) {
    const url = new URL(script.src)
    return `${url.origin}${url.pathname.replace(/\/widget\.js$/, '')}`
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

  alert(`[APW] loadPageConfig: base="${base}" page="${page}"`)

  try {
    const cached = storageGet<PageConfig>(cacheKey)
    if (cached) {
      alert(`[APW] cache hit: ${cached.modules.length} modules`)
      return cached
    }

    let data: PageConfig | null = null

    if (global.configEndpoint) {
      const res = await fetch(`${global.configEndpoint}?page=${page}`)
      if (res.ok) data = await res.json()
    }

    if (!data) {
      const pageUrl = `${base}/config/pages/${page}.json`
      alert(`[APW] fetching: ${pageUrl}`)
      try {
        const res = await fetch(pageUrl)
        alert(`[APW] page fetch status: ${res.status}`)
        if (res.ok) {
          data = await res.json()
        } else {
          const defaultUrl = `${base}/config/pages/default.json`
          alert(`[APW] fallback: ${defaultUrl}`)
          const fallback = await fetch(defaultUrl)
          alert(`[APW] default fetch status: ${fallback.status}`)
          if (fallback.ok) data = await fallback.json()
        }
      } catch (fetchErr) {
        alert(`[APW] fetch error: ${fetchErr}`)
      }
    }

    if (!data) {
      data = { page, modules: [] }
    }

    alert(`[APW] final: ${data.modules.length} modules`)
    storageSet(cacheKey, data, global.cacheTTL ?? 300)
    return data
  } catch (err) {
    alert(`[APW] loadPageConfig ERROR: ${err}`)
    return { page, modules: [] }
  }
}

export function getGlobalConfig(): GlobalConfig | null {
  return globalConfig
}
