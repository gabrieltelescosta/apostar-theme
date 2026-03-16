import { BaseModule } from '../base-module'
import type { ModuleEntry } from '../../types/config'
import { injectStyles } from '../../utils/dom'
import { logger } from '../../core/logger'
import styles from './casino-nav.scss?inline'

const STYLE_ID = 'apw-styles-casino-nav'
const FONT_ID = 'apw-font-jost'

export default class CasinoNavModule extends BaseModule {
  name = 'casino-nav'
  selfManaged = true

  private headObserver: MutationObserver | null = null
  private bodyObserver: MutationObserver | null = null
  private isNormalizing = false

  async init(config: ModuleEntry): Promise<void> {
    await super.init(config)

    injectStyles(styles, STYLE_ID)
    this.injectFont()
    this.normalizeTexts()
    this.stabilizeSearch()
    this.setupObservers()

    logger.info('Casino Nav Reskin ativo')
  }

  protected template(): string {
    return ''
  }

  render(): void {
    // Self-managed: no-op
  }

  destroy(): void {
    if (this.headObserver) {
      this.headObserver.disconnect()
      this.headObserver = null
    }
    if (this.bodyObserver) {
      this.bodyObserver.disconnect()
      this.bodyObserver = null
    }

    var styleEl = document.getElementById(STYLE_ID)
    if (styleEl) styleEl.remove()
  }

  private injectFont(): void {
    if (document.getElementById(FONT_ID)) return
    var link = document.createElement('link')
    link.id = FONT_ID
    link.rel = 'stylesheet'
    link.href =
      'https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700;800&display=swap'
    document.head.appendChild(link)
  }

  private normalizeTexts(): void {
    this.isNormalizing = true

    var els = document.querySelectorAll('.casino-navigation-menu__item-text')
    for (var i = 0; i < els.length; i++) {
      var el = els[i] as HTMLElement
      var raw = (el.textContent || '').trim()
      if (!raw) continue
      var normalized = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
      if (el.textContent !== normalized) el.textContent = normalized
    }

    var provEls = document.querySelectorAll(
      '.casino-providers__item, .casino-providers__item span',
    )
    for (var j = 0; j < provEls.length; j++) {
      var provEl = provEls[j] as HTMLElement
      var rawProv = (provEl.textContent || '').trim()
      if (!rawProv) continue
      var normalizedProv =
        rawProv.charAt(0).toUpperCase() + rawProv.slice(1).toLowerCase()
      if (provEl.textContent !== normalizedProv)
        provEl.textContent = normalizedProv
    }

    this.isNormalizing = false
  }

  private stabilizeSearch(): void {
    var search = document.querySelector('.casino-search') as HTMLElement | null
    if (search) {
      search.style.cssText +=
        'display:flex!important;flex-wrap:nowrap!important;overflow:hidden!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;'
    }

    var wrapper = document.querySelector(
      '.casino-search__wrapper',
    ) as HTMLElement | null
    if (wrapper) {
      wrapper.style.cssText +=
        'flex:1 1 0%!important;min-width:0!important;overflow:hidden!important;'
    }

    var field = document.querySelector(
      '.casino-search__field',
    ) as HTMLElement | null
    if (field) {
      field.style.cssText +=
        'flex:1 1 0%!important;min-width:0!important;overflow:hidden!important;'
    }

    var mobileWrapper = document.querySelector(
      '.casino-search .search-box-wrapper',
    ) as HTMLElement | null
    if (mobileWrapper) {
      mobileWrapper.style.cssText +=
        'flex:1 1 0%!important;min-width:0!important;overflow:hidden!important;'
    }

    var mobileField = document.querySelector(
      '.casino-search .search-box',
    ) as HTMLElement | null
    if (mobileField) {
      mobileField.style.cssText +=
        'flex:1 1 0%!important;min-width:0!important;overflow:hidden!important;'
    }
  }

  private setupObservers(): void {
    this.headObserver = new MutationObserver(() => {
      if (!document.getElementById(STYLE_ID)) {
        injectStyles(styles, STYLE_ID)
      }
    })
    this.headObserver.observe(document.head, { childList: true })

    var globalTimer: ReturnType<typeof setTimeout> | undefined
    this.bodyObserver = new MutationObserver(() => {
      if (this.isNormalizing) return
      clearTimeout(globalTimer)
      globalTimer = setTimeout(() => {
        injectStyles(styles, STYLE_ID)
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
}
