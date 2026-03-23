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

  private readonly FONT_ID = 'apw-font-jost'

  private readonly NAV_ICON_MAP: Record<string, string> = {
    home: 'category_49752_Home_1773945397536.webp',
    all_games: 'category_49802_Todos_1773945468130.webp',
    favourites: 'category_41103_Favoritos_1773945796824.webp',
    search: 'category_50002_SEARCH_1773954791879.webp',
  }
  private readonly CDN_BASE = 'https://media.pl-01.cdn-platform.com/games/'

  async init(config: ModuleEntry): Promise<void> {
    await super.init(config)
    injectStyles(styles, 'apw-styles-casino-nav-reskin')
    this.injectFont()
    this.preloadNavIcons()

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
    this.replaceNavIcons()
    this.stabilizeSearch()
    this.setupScrollFade()
    setTimeout(() => this.resetCategoryScroll(), 150)

    this.headObserver = new MutationObserver(() => {
      if (!document.getElementById('apw-styles-casino-nav-reskin')) {
        injectStyles(styles, 'apw-styles-casino-nav-reskin')
      }
    })
    this.headObserver.observe(document.head, { childList: true })

    let iconPending = false
    let debounce: ReturnType<typeof setTimeout>
    const bodyOpts: MutationObserverInit = { childList: true, subtree: true }
    this.bodyObserver = new MutationObserver(() => {
      if (this.isNormalizing) return
      if (!iconPending) {
        iconPending = true
        requestAnimationFrame(() => {
          this.replaceNavIcons()
          iconPending = false
        })
      }
      clearTimeout(debounce)
      debounce = setTimeout(() => {
        this.bodyObserver?.disconnect()
        if (!document.getElementById('apw-styles-casino-nav-reskin')) {
          injectStyles(styles, 'apw-styles-casino-nav-reskin')
        }
        this.normalizeTexts()
        this.stabilizeSearch()
        this.bodyObserver?.observe(document.body, bodyOpts)
      }, 250)
    })
    this.bodyObserver.observe(document.body, bodyOpts)
  }

  private normalizeText(el: HTMLElement): void {
    const raw = (el.textContent ?? '').trim()
    if (!raw) return
    const normalized = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
    if (el.textContent !== normalized) el.textContent = normalized
  }

  private normalizeTexts(): void {
    this.isNormalizing = true

    document.querySelectorAll<HTMLElement>(
      '.casino-navigation-menu__item-text:not([data-ab-norm])',
    ).forEach((el) => {
      el.setAttribute('data-ab-norm', '1')
      this.normalizeText(el)
    })

    document.querySelectorAll<HTMLElement>(
      '.casino-providers__item:not([data-ab-norm])',
    ).forEach((el) => {
      el.setAttribute('data-ab-norm', '1')
      const span = el.querySelector<HTMLElement>('span')
      if (span) this.normalizeText(span)
      else this.normalizeText(el)
    })

    this.isNormalizing = false
  }

  private stabilizeSearch(): void {
    const search = document.querySelector<HTMLElement>('.casino-search')
    if (search && !search.hasAttribute('data-ab-stable')) {
      search.setAttribute('data-ab-stable', '1')
      search.style.cssText +=
        'display:flex!important;flex-wrap:nowrap!important;overflow:hidden!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;'
    }

    const mobileWrapper = document.querySelector<HTMLElement>('.casino-search .search-box-wrapper')
    if (mobileWrapper && !mobileWrapper.hasAttribute('data-ab-stable')) {
      mobileWrapper.setAttribute('data-ab-stable', '1')
      mobileWrapper.style.cssText += 'flex:1 1 0%!important;min-width:0!important;overflow:hidden!important;'
    }

    const mobileField = document.querySelector<HTMLElement>('.casino-search .search-box')
    if (mobileField && !mobileField.hasAttribute('data-ab-stable')) {
      mobileField.setAttribute('data-ab-stable', '1')
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

  private preloadNavIcons(): void {
    Object.values(this.NAV_ICON_MAP).forEach((file) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = this.CDN_BASE + file
      document.head.appendChild(link)
    })
  }

  private injectFont(): void {
    if (document.getElementById(this.FONT_ID)) return
    const link = document.createElement('link')
    link.id = this.FONT_ID
    link.rel = 'stylesheet'
    link.href =
      'https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700;800&display=swap'
    document.head.appendChild(link)
  }

  private replaceNavIcons(): void {
    document.querySelectorAll<HTMLElement>('.casino-navigation-menu__item').forEach((item) => {
      const dataId = item.getAttribute('data-id')
      if (!dataId || !this.NAV_ICON_MAP[dataId]) return
      const iconWrap = item.querySelector<HTMLElement>('.casino-navigation-menu__item-icon')
      if (!iconWrap) return
      if (iconWrap.querySelector('img')) return
      const svg = iconWrap.querySelector('svg')
      if (!svg) return
      const img = document.createElement('img')
      img.src = this.CDN_BASE + this.NAV_ICON_MAP[dataId]
      img.alt = dataId
      img.loading = 'eager'
      img.style.cssText = 'width:22px;height:22px;object-fit:contain;'
      svg.parentNode?.replaceChild(img, svg)
    })
  }
}
