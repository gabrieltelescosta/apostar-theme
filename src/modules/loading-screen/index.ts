import { BaseModule } from '../base-module'
import type { ModuleEntry } from '../../types/config'
import { injectStyles } from '../../utils/dom'
import styles from './loading-screen.scss?inline'

const SCREEN_ID = 'ab-loading-screen'

export default class LoadingScreenModule extends BaseModule {
  name = 'loading-screen'
  selfManaged = true

  private overlay: HTMLElement | null = null
  private dismissed = false

  async init(config: ModuleEntry): Promise<void> {
    await super.init(config)

    if (document.getElementById(SCREEN_ID)) return

    injectStyles(styles, 'apw-styles-loading-screen')

    this.overlay = document.createElement('div')
    this.overlay.id = SCREEN_ID

    const logoSrc = this.data<string>(
      'logoSrc',
      'https://media.pl-01.cdn-platform.com/cms/sites/image-1747145012195681.webp',
    )
    this.overlay.innerHTML = `<img src="${logoSrc}" alt="Loading">`
    document.body.appendChild(this.overlay)

    window.addEventListener('load', () => setTimeout(() => this.dismiss(), 300))
    setTimeout(() => this.dismiss(), 5000)
  }

  protected template(): string {
    return ''
  }

  render(): void {}

  destroy(): void {
    this.dismiss()
  }

  private dismiss(): void {
    if (this.dismissed || !this.overlay) return
    this.dismissed = true
    this.overlay.style.opacity = '0'
    setTimeout(() => {
      this.overlay?.remove()
      this.overlay = null
    }, 500)
  }
}
