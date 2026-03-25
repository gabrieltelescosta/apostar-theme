import { BaseModule } from '../base-module'
import type { ModuleEntry } from '../../types/config'
import { injectStyles } from '../../utils/dom'
import styles from './winners-ticker.scss?inline'

export default class WinnersTickerModule extends BaseModule {
  name = 'winners-ticker'
  selfManaged = true

  async init(config: ModuleEntry): Promise<void> {
    await super.init(config)
    injectStyles(styles, 'apw-styles-winners-ticker')
  }

  protected template(): string { return '' }
  render(): void {}
  destroy(): void {}
}
