import type { ModuleEntry } from '../types/config'
import type { WidgetModule } from '../types/modules'
import { injectStyles } from '../utils/dom'

export abstract class BaseModule implements WidgetModule {
  abstract name: string
  protected config!: ModuleEntry
  protected container: HTMLElement | null = null

  async init(config: ModuleEntry): Promise<void> {
    this.config = config
    const styles = this.getStyles()
    if (styles) {
      injectStyles(styles, `apw-styles-${this.name}`)
    }
  }

  render(target: HTMLElement): void {
    this.container = target
    target.innerHTML = this.template()
    this.afterRender(target)
  }

  destroy(): void {
    if (this.container) {
      this.container.innerHTML = ''
      this.container = null
    }
  }

  protected abstract template(): string

  protected getStyles(): string | null {
    return null
  }

  protected afterRender(_target: HTMLElement): void {
    // Override in subclasses for event binding etc.
  }

  protected data<T = unknown>(key: string, fallback?: T): T {
    return (this.config.data[key] as T) ?? (fallback as T)
  }
}
