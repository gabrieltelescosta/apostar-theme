import { BaseModule } from '../base-module'
import type { ModuleEntry } from '../../types/config'
import { injectStyles } from '../../utils/dom'
import styles from './css-vars.scss?inline'

export default class CssVarsModule extends BaseModule {
  name = 'css-vars'
  selfManaged = true

  async init(config: ModuleEntry): Promise<void> {
    await super.init(config)
    injectStyles(styles, 'apw-styles-css-vars')
  }

  protected template(): string {
    return ''
  }

  render(): void {}
  destroy(): void {}
}
