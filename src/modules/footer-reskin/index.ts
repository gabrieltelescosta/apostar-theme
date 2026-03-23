import { BaseModule } from '../base-module'
import type { ModuleEntry } from '../../types/config'
import { injectStyles } from '../../utils/dom'
import { domWatcher } from '../../core/dom-watcher'
import styles from './footer-reskin.scss?inline'

const ATTR = 'data-ab-footer'
const FONT_ID = 'apw-font-jost-footer'

export default class FooterReskinModule extends BaseModule {
  name = 'footer-reskin'
  selfManaged = true

  async init(config: ModuleEntry): Promise<void> {
    await super.init(config)

    if (!document.getElementById(FONT_ID)) {
      const font = document.createElement('link')
      font.id = FONT_ID
      font.rel = 'stylesheet'
      font.href =
        'https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700;800&display=swap'
      document.head.appendChild(font)
    }

    injectStyles(styles, 'apw-styles-footer-reskin')
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
  }

  private inject(): void {
    const footer = document.querySelector<HTMLElement>('footer.footer')
    if (!footer || footer.hasAttribute(ATTR)) return
    footer.setAttribute(ATTR, '1')
  }
}
