import { BaseModule } from '../base-module'
import type { ModuleEntry } from '../../types/config'
import { injectStyles } from '../../utils/dom'
import { domWatcher } from '../../core/dom-watcher'
import styles from './static-content.scss?inline'

const ATTR = 'data-ab-sc'

export default class StaticContentModule extends BaseModule {
  name = 'static-content'
  selfManaged = true

  async init(config: ModuleEntry): Promise<void> {
    await super.init(config)
    injectStyles(styles, 'apw-styles-static-content')
    this.inject()
    domWatcher.register(this.name, () => this.inject(), 50)
  }

  protected template(): string {
    return ''
  }

  render(): void {}

  destroy(): void {
    domWatcher.unregister(this.name)
    document.querySelectorAll(`[${ATTR}]`).forEach((el) => el.removeAttribute(ATTR))
    document.querySelectorAll('.ab-sc-title').forEach((el) => el.classList.remove('ab-sc-title'))
  }

  private inject(): void {
    const inner = document.querySelector<HTMLElement>('.static-content__inner')
    if (!inner) return

    const wrapper = inner.closest<HTMLElement>('.static-content__wrapper')
    if (wrapper?.hasAttribute(ATTR)) return
    wrapper?.setAttribute(ATTR, '1')

    inner
      .querySelectorAll<HTMLElement>(
        'span[style*="font-size:30px"], span[style*="font-size: 30px"]',
      )
      .forEach((span) => {
        const p = span.closest('p')
        if (p && !p.classList.contains('ab-sc-title')) {
          p.classList.add('ab-sc-title')
        }
      })
  }
}
