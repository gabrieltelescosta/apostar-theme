import type { ModuleEntry } from './config'

export interface WidgetModule {
  name: string
  selfManaged?: boolean
  init(config: ModuleEntry): Promise<void>
  render(target: HTMLElement): void
  destroy(): void
}

export type ModuleFactory = () => Promise<{ default: new () => WidgetModule }>
