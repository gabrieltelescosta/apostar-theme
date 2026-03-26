import { BaseModule } from '../base-module'
import type { ModuleEntry } from '../../types/config'
import { injectStyles } from '../../utils/dom'
import { domWatcher } from '../../core/dom-watcher'
import styles from './switch-toggle-hide.scss?inline'

export default class SwitchToggleHideModule extends BaseModule {
  name = 'switch-toggle-hide'
  selfManaged = true

  async init(config: ModuleEntry): Promise<void> {
    await super.init(config)
    injectStyles(styles, 'apw-styles-switch-toggle-hide')
    this.start()
  }

  protected template(): string {
    return ''
  }

  render(): void {}

  destroy(): void {
    domWatcher.unregister(this.name)
  }

  private start(): void {
    this.applyFix()
    domWatcher.register(this.name, () => {
      if (!document.getElementById('apw-styles-switch-toggle-hide')) {
        injectStyles(styles, 'apw-styles-switch-toggle-hide')
      }
      this.applyFix()
    }, 10)
  }

  private applyFix(): void {
    document.querySelectorAll<HTMLElement>('.switch-button-toggle').forEach((el) => {
      el.classList.remove('active')
      el.style.setProperty('display', 'none', 'important')
    })
  }
}
