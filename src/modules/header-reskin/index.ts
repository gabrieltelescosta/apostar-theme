import { BaseModule } from '../base-module'
import type { ModuleEntry } from '../../types/config'
import { injectStyles } from '../../utils/dom'
import styles from './header-reskin.scss?inline'

const FONT_ID = 'apw-font-jost-header'

export default class HeaderReskinModule extends BaseModule {
  name = 'header-reskin'
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

    injectStyles(styles, 'apw-styles-header-reskin')
  }

  protected template(): string {
    return ''
  }

  render(): void {}
  destroy(): void {}
}
