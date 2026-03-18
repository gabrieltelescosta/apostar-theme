import { BaseModule } from '../base-module'
import type { ModuleEntry } from '../../types/config'
import { injectStyles } from '../../utils/dom'
import styles from './casino-nav-reskin.scss?inline'

export default class CasinoNavReskinModule extends BaseModule {
  name = 'casino-nav-reskin'
  selfManaged = true

  private headObserver: MutationObserver | null = null
  private bodyObserver: MutationObserver | null = null
  private isNormalizing = false

  async init(config: ModuleEntry): Promise<void> {
    await super.init(config)
    injectStyles(styles, 'apw-styles-casino-nav-reskin')

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.start())
    } else {
      this.start()
    }
  }

  protected template(): string {
    return ''
  }

  render(): void {}

  destroy(): void {
    this.headObserver?.disconnect()
    this.bodyObserver?.disconnect()
    this.headObserver = null
    this.bodyObserver = null
  }

  // ── Private ──

  private start(): void {
    this.normalizeTexts()
    this.stabilizeSearch()
    this.setupScrollFade()
    setTimeout(() => this.resetCategoryScroll(), 150)

    this.headObserver = new MutationObserver(() => {
      if (!document.getElementById('apw-styles-casino-nav-reskin')) {
        injectStyles(styles, 'apw-styles-casino-nav-reskin')
      }
    })
    this.headObserver.observe(document.head, { childList: true })

    let debounce: ReturnType<typeof setTimeout>
    this.bodyObserver = new MutationObserver(() => {
      if (this.isNormalizing) return
      clearTimeout(debounce)
      debounce = setTimeout(() => {
        injectStyles(styles, 'apw-styles-casino-nav-reskin')
        this.normalizeTexts()
        this.stabilizeSearch()
      }, 80)
    })
    this.bodyObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    })
  }

  private normalizeTexts(): void {
    this.isNormalizing = true

    document.querySelectorAll<HTMLElement>('.casino-navigation-menu__item-text').forEach((el) => {
      const raw = (el.textContent ?? '').trim()
      if (!raw) return
      const normalized = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
      if (el.textContent !== normalized) el.textContent = normalized
    })

    document
      .querySelectorAll<HTMLElement>('.casino-providers__item, .casino-providers__item span')
      .forEach((el) => {
        const raw = (el.textContent ?? '').trim()
        if (!raw) return
        const normalized = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
        if (el.textContent !== normalized) el.textContent = normalized
      })

    this.isNormalizing = false
  }

  private stabilizeSearch(): void {
    const search = document.querySelector<HTMLElement>('.casino-search')
    if (search) {
      search.style.cssText +=
        'display:flex!important;flex-wrap:nowrap!important;overflow:hidden!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;'
    }

    const mobileWrapper = document.querySelector<HTMLElement>('.casino-search .search-box-wrapper')
    if (mobileWrapper) {
      mobileWrapper.style.cssText += 'flex:1 1 0%!important;min-width:0!important;overflow:hidden!important;'
    }

    const mobileField = document.querySelector<HTMLElement>('.casino-search .search-box')
    if (mobileField) {
      mobileField.style.cssText += 'flex:1 1 0%!important;min-width:0!important;overflow:hidden!important;'
    }
  }

  private setupScrollFade(): void {
    const pairs = [
      { list: '.casino-navigation-menu__list', container: '.casino-navigation-menu' },
      { list: '.casino-providers__list', container: '.casino-providers' },
    ]

    pairs.forEach(({ list: listSel, container: containerSel }) => {
      const list = document.querySelector<HTMLElement>(listSel)
      const container = document.querySelector<HTMLElement>(containerSel)
      if (!list || !container) return
      if ((list as HTMLElement & { __abScrollBound?: boolean }).__abScrollBound) return
      ;(list as HTMLElement & { __abScrollBound?: boolean }).__abScrollBound = true

      const check = () => {
        if (list.scrollLeft + list.clientWidth >= list.scrollWidth - 5) {
          container.classList.add('ab-scroll-end')
        } else {
          container.classList.remove('ab-scroll-end')
        }
      }

      list.addEventListener('scroll', check, { passive: true })
      check()
    })
  }

  private resetCategoryScroll(): void {
    const list = document.querySelector<HTMLElement>('.casino-navigation-menu__list')
    if (list) list.scrollLeft = 0
  }
}
