export type ModulePosition = 'before' | 'after' | 'replace' | 'prepend' | 'append'

export interface TriggerConfig {
  event: 'exit-intent' | 'scroll' | 'time' | 'click' | 'smartico-ready'
  delay?: number
  threshold?: number
  selector?: string
}

export interface ModuleEntry {
  type: string
  target?: string
  position?: ModulePosition
  trigger?: TriggerConfig
  data: Record<string, unknown>
}

export interface PageConfig {
  page: string
  modules: ModuleEntry[]
}

export interface GlobalConfig {
  cdnBase: string
  configEndpoint?: string
  debug: boolean
  cacheTTL: number
  featureFlags: Record<string, boolean>
}
