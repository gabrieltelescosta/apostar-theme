import { BaseModule } from '../base-module'
import type { ModuleEntry } from '../../types/config'
import { injectStyles } from '../../utils/dom'
import styles from './cashback-tags.scss?inline'

const TAG_CLASS = 'ab-cb-tag'
const FLASH_CLASS = 'ab-cb-flash'
const MARKED_ATTR = 'data-ab-cb'

export default class CashbackTagsModule extends BaseModule {
  name = 'cashback-tags'
  selfManaged = true

  private observer: MutationObserver | null = null
  private obsPending = false
  private readonly obsOpts: MutationObserverInit = { childList: true, subtree: true }
  private gamesMap: string[] = []
  private allGames = false

  async init(config: ModuleEntry): Promise<void> {
    await super.init(config)

    this.gamesMap = this.data<string[]>('games', [])
    this.allGames = this.data<boolean>('allGames', false)

    injectStyles(styles, 'apw-styles-cashback-tags')
    this.applyTags()

    this.observer = new MutationObserver(() => {
      if (this.obsPending) return
      this.obsPending = true
      setTimeout(() => {
        this.obsPending = false
        this.observer?.disconnect()
        this.applyTags()
        this.observer?.observe(document.body, this.obsOpts)
      }, 400)
    })
    this.observer.observe(document.body, this.obsOpts)
  }

  protected template(): string {
    return ''
  }

  render(): void {}

  destroy(): void {
    this.observer?.disconnect()
    this.observer = null
    document.querySelectorAll(`.${TAG_CLASS}`).forEach((el) => el.remove())
    document.querySelectorAll(`.${FLASH_CLASS}`).forEach((el) => el.remove())
    document.querySelectorAll(`[${MARKED_ATTR}]`).forEach((tile) => tile.removeAttribute(MARKED_ATTR))
  }

  // ── Private ──

  private normalize(str: string): string {
    return (str || '').trim().toLowerCase()
  }

  private applyTags(): void {
    document.querySelectorAll<HTMLElement>('.tile-container').forEach((tile) => {
      if (tile.getAttribute(MARKED_ATTR)) return

      let shouldApply = false

      if (this.allGames) {
        shouldApply = true
      } else {
        const nameEl = tile.querySelector<HTMLElement>('.tile-container__name')
        if (!nameEl) return
        const name = this.normalize(nameEl.textContent ?? '')
        if (!name) return
        if (this.gamesMap.some((k) => this.normalize(k) === name)) {
          shouldApply = true
        }
      }

      if (!shouldApply) return

      const bg = tile.querySelector<HTMLElement>('.tile-container__bg')
      if (!bg) return

      tile.setAttribute(MARKED_ATTR, '1')
      bg.style.position = 'relative'

      const flash = document.createElement('div')
      flash.className = FLASH_CLASS
      bg.appendChild(flash)

      const tag = document.createElement('div')
      tag.className = TAG_CLASS
      tag.textContent = 'Cashback'
      bg.appendChild(tag)
    })
  }
}
