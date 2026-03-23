import { BaseModule } from '../base-module'
import type { ModuleEntry } from '../../types/config'
import { injectStyles } from '../../utils/dom'
import { domWatcher } from '../../core/dom-watcher'
import styles from './static-content.scss?inline'

const ATTR = 'data-ab-sc'
const FONT_ID = 'apw-font-jost-sc'

export default class StaticContentModule extends BaseModule {
  name = 'static-content'
  selfManaged = true

  async init(config: ModuleEntry): Promise<void> {
    await super.init(config)

    if (!document.getElementById(FONT_ID) && !document.querySelector('link[href*="Jost"]')) {
      const font = document.createElement('link')
      font.id = FONT_ID
      font.rel = 'stylesheet'
      font.href =
        'https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700;800&display=swap'
      document.head.appendChild(font)
    }

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
    this.applyDesktop()
    this.applyMobile()
  }

  private detectTitles(container: HTMLElement): void {
    container
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

  private applyDesktop(): void {
    const inner = document.querySelector<HTMLElement>('.static-content__inner')
    if (!inner) return

    const wrapper = inner.closest<HTMLElement>('.static-content__wrapper')
    if (wrapper?.hasAttribute(ATTR)) return
    wrapper?.setAttribute(ATTR, '1')
    this.detectTitles(inner)
  }

  private applyMobile(): void {
    const mobilePrint = document.querySelector<HTMLElement>('.static-page__print')
    if (!mobilePrint || mobilePrint.hasAttribute(ATTR)) return
    mobilePrint.setAttribute(ATTR, '1')

    const mobileInner = mobilePrint.querySelector<HTMLElement>(':scope > div')
    if (mobileInner) {
      this.detectTitles(mobileInner)
    }
  }
}
