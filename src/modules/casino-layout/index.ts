import { BaseModule } from '../base-module'
import type { ModuleEntry } from '../../types/config'
import { injectStyles } from '../../utils/dom'
import { domWatcher } from '../../core/dom-watcher'
import styles from './casino-layout.scss?inline'

const TARGET_SELECTOR = '.casino__layout__wrapper'
const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg,#0a1e35,#004786)',
  'linear-gradient(135deg,#04091c,#0a2847)',
  'linear-gradient(135deg,#0a2847,#104480)',
  'linear-gradient(135deg,#061524,#004786)',
  'linear-gradient(135deg,#0d2a4a,#0a1e35)',
  'linear-gradient(135deg,#04091c,#104480)',
  'linear-gradient(135deg,#0a1e35,#0d2a4a)',
  'linear-gradient(135deg,#061524,#0a1e35)',
]
const HEADER_KEYWORDS = [
  'em alta', 'novidades', 'crash', 'slots', 'roleta', 'megaways',
  'bonus buy', 'bônus', 'populares', 'recomendados', 'ao vivo', 'live', 'jackpot', 'favoritos',
]
const LINK_KEYWORDS = ['ver tudo', 'ver mais', 'see all', 'show all', 'view all']

export default class CasinoLayoutModule extends BaseModule {
  name = 'casino-layout'
  selfManaged = true


  async init(config: ModuleEntry): Promise<void> {
    await super.init(config)
    injectStyles(styles, 'apw-styles-casino-layout')

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
    domWatcher.unregister(this.name)
    document.querySelectorAll('[data-ab-casino]').forEach((el) => el.removeAttribute('data-ab-casino'))
    document.querySelectorAll('[data-ab-layout]').forEach((el) => el.removeAttribute('data-ab-layout'))
    document.querySelectorAll('[data-ab-header]').forEach((el) => el.removeAttribute('data-ab-header'))
    document.querySelectorAll('[data-ab-size-l]').forEach((el) => el.removeAttribute('data-ab-size-l'))
    document.querySelectorAll('.ab-see-more-card').forEach((el) => el.remove())
  }

  // ── Image helpers ──

  private getFallbackGradient(el: Element): string {
    const parent = el.parentElement
    const idx = parent ? Array.from(parent.children).indexOf(el as HTMLElement) : 0
    return FALLBACK_GRADIENTS[Math.abs(idx) % FALLBACK_GRADIENTS.length]
  }

  private extractImageSrc(bg: HTMLElement): string | null {
    const img = bg.querySelector<HTMLImageElement>('img')
    if (img) {
      if (img.currentSrc && img.currentSrc.length > 10) return img.currentSrc
      if (img.src && img.src.length > 10 && !img.src.endsWith('/')) return img.src
      const lazySrc =
        img.getAttribute('data-src') ||
        img.getAttribute('data-lazy') ||
        img.getAttribute('data-original')
      if (lazySrc && lazySrc.length > 5) return lazySrc
      const srcset = img.getAttribute('srcset')
      if (srcset) {
        const first = srcset.split(',')[0].trim().split(' ')[0]
        if (first && first.length > 5) return first
      }
    }
    for (const attr of ['data-image', 'data-src', 'data-bg']) {
      const val = bg.getAttribute(attr)
      if (val && val.length > 5) return val
    }
    const inlineBg = (bg as HTMLElement).style.backgroundImage
    if (inlineBg && inlineBg !== 'none') {
      const match = inlineBg.match(/url\(["']?(.+?)["']?\)/)
      if (match?.[1] && match[1].length > 5) return match[1]
    }
    return null
  }

  private applyFallback(bg: HTMLElement): void {
    bg.style.background = this.getFallbackGradient(bg)
    bg.setAttribute('data-ab-fallback', 'true')
  }

  private normalizeImages(container: HTMLElement): void {
    container.querySelectorAll<HTMLElement>('.tile-container__bg:not([data-ab-img])').forEach((bg) => {
      bg.setAttribute('data-ab-img', '1')
      const src = this.extractImageSrc(bg)
      if (!src) { this.applyFallback(bg); return }

      let img = bg.querySelector<HTMLImageElement>('img')
      if (!img) {
        img = document.createElement('img')
        img.className = 'tile-container__bg-image'
        img.alt = ''
        img.loading = 'lazy'
        bg.prepend(img)
      }

      if (img.src !== src && img.getAttribute('src') !== src) img.src = src
      img.style.display = ''
      bg.removeAttribute('data-ab-fallback')

      if (!img.hasAttribute('data-ab-err')) {
        img.setAttribute('data-ab-err', '1')
        let tried = false
        img.addEventListener('error', () => {
          if (!tried) {
            tried = true
            const alt =
              bg.getAttribute('data-image') ||
              img!.getAttribute('data-src') ||
              img!.getAttribute('data-lazy')
            if (alt && img!.src !== alt) { img!.src = alt; return }
          }
          img!.style.display = 'none'
          this.applyFallback(bg)
        })
      }
    })
  }

  // ── Game URL / click ──

  private getGameUrl(tile: HTMLElement): string | null {
    if (tile.tagName === 'A' && (tile as HTMLAnchorElement).href) return (tile as HTMLAnchorElement).href
    const playBtn = tile.querySelector<HTMLElement>('.tile-container__play-btn')
    if (playBtn) {
      if (playBtn.tagName === 'A') return (playBtn as HTMLAnchorElement).href
      const parentA = playBtn.closest('a')
      if (parentA) return (parentA as HTMLAnchorElement).href
    }
    const anyLink = tile.querySelector<HTMLAnchorElement>('a[href]')
    if (anyLink) return anyLink.href
    return tile.getAttribute('data-href') || tile.getAttribute('data-url') || tile.getAttribute('data-link')
  }

  private makeImageClickable(tile: HTMLElement): void {
    const bg = tile.querySelector<HTMLElement>('.tile-container__bg')
    if (!bg || bg.hasAttribute('data-ab-linked')) return
    bg.setAttribute('data-ab-linked', '1')

    const url = this.getGameUrl(tile)
    if (url) {
      bg.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest?.('.tile-container__favorite')) return
        window.location.href = url
      })
    } else {
      bg.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest?.('.tile-container__favorite')) return
        const playBtn = tile.querySelector<HTMLElement>('.tile-container__play-btn')
        if (playBtn) { playBtn.click(); return }
        const parentLink = tile.closest('a')
        if (parentLink) { (parentLink as HTMLElement).click(); return }
        tile.click()
      })
    }
  }

  // ── Container marking ──

  private markCasinoContainer(el: HTMLElement): void {
    let node: HTMLElement | null = el
    let depth = 10
    while (node && depth-- > 0) {
      if (
        node.classList?.contains('casino__layout__wrapper') ||
        node.classList?.contains('infinite-scroll-game-list')
      ) {
        node.setAttribute('data-ab-casino', 'true')
        return
      }
      if (node.classList?.contains('tile-games-container')) {
        const scrollParent = node.closest<HTMLElement>('.infinite-scroll-game-list')
        if (scrollParent) { scrollParent.setAttribute('data-ab-casino', 'true'); return }
      }
      if (node === document.body || node === document.documentElement) break
      node = node.parentElement
    }
    const swiperContainer = el.closest<HTMLElement>('.swiper-container, .swiper')
    if (swiperContainer?.parentElement && swiperContainer.parentElement !== document.body) {
      swiperContainer.parentElement.setAttribute('data-ab-casino', 'true')
      return
    }
    let parent = el.parentElement?.parentElement?.parentElement
    if (parent && parent !== document.body && parent !== document.documentElement) {
      parent.setAttribute('data-ab-casino', 'true')
      return
    }
    parent = el.parentElement?.parentElement ?? null
    if (parent && parent !== document.body && parent !== document.documentElement) {
      parent.setAttribute('data-ab-casino', 'true')
    }
  }

  // ── Section headers ──

  private isHeaderText(text: string | null): boolean {
    if (!text) return false
    const lower = text.trim().toLowerCase()
    if (lower.length < 2 || lower.length > 40) return false
    if (HEADER_KEYWORDS.some((k) => lower.includes(k))) return true
    if (lower.length <= 25 && /^[a-záàâãéèêíïóôõöúçñ\s]+$/i.test(lower)) return true
    return false
  }

  private isLinkText(text: string | null): boolean {
    if (!text) return false
    const lower = text.trim().toLowerCase()
    return LINK_KEYWORDS.some((k) => lower.includes(k))
  }

  private styleSectionHeaders(): void {
    const processedParents = new Set<Element>()
    document.querySelectorAll<HTMLElement>('[data-ab-casino] .tile-container').forEach((tile) => {
      const swiperParent =
        tile.closest('.swiper-wrapper') ||
        tile.closest('.swiper-container') ||
        tile.closest('.tile-games-container') ||
        tile.parentElement
      if (!swiperParent) return

      const section = swiperParent.parentElement
      if (!section) return
      const sectionWrapper = section.parentElement
      if (!sectionWrapper || processedParents.has(sectionWrapper)) return

      const candidates: Element[] = []
      let prev = section.previousElementSibling
      while (prev && candidates.length < 3) { candidates.push(prev); prev = prev.previousElementSibling }
      Array.from(sectionWrapper.children).slice(0, 5).forEach((c) => {
        if (c !== section && !c.querySelector('.tile-container')) candidates.push(c)
      })

      let foundHeader = false
      candidates.forEach((el) => {
        if (el.hasAttribute('data-ab-header') || !el.textContent?.trim()) return
        const headings = el.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6,span,div,p,a')
        headings.forEach((h) => {
          if (h.hasAttribute('data-ab-header')) return
          const hText = h.textContent ?? ''
          if (this.isHeaderText(hText) && h.children.length <= 2) {
            h.setAttribute('data-ab-header', 'title')
            foundHeader = true
          }
          if (this.isLinkText(hText)) {
            h.setAttribute('data-ab-header', 'link')
            foundHeader = true
          }
        })
        if (!foundHeader && el.children.length <= 3) {
          let directText = ''
          el.childNodes.forEach((n) => { if (n.nodeType === Node.TEXT_NODE) directText += n.textContent })
          if (this.isHeaderText(directText.trim())) {
            el.setAttribute('data-ab-header', 'title')
            foundHeader = true
          }
        }
        if (foundHeader) el.setAttribute('data-ab-header', 'wrapper')
      })
      if (foundHeader) processedParents.add(sectionWrapper)
    })
  }

  // ── "Ver mais" cards ──

  private injectSeeMoreCards(): void {
    document.querySelectorAll<HTMLElement>('[data-ab-casino] .swiper-wrapper').forEach((grid) => {
      if (grid.closest('.casino-providers-block')) return
      if (grid.querySelector('.ab-see-more-card')) return
      const section = grid.closest('.swiper-container, .swiper') || grid.parentElement
      if (!section) return
      const headerArea = section.parentElement
      if (!headerArea) return

      let verTudoBtn: HTMLElement | null =
        headerArea.querySelector('.casino__category__header .chips-item') ||
        headerArea.querySelector("[data-ab-header='link']")

      if (!verTudoBtn) {
        let ancestor: HTMLElement | null = section as HTMLElement
        for (let up = 0; up < 5 && ancestor; up++) {
          ancestor = ancestor.parentElement
          if (ancestor) {
            verTudoBtn =
              ancestor.querySelector('.casino__category__header .chips-item') ||
              ancestor.querySelector("[data-ab-header='link']")
            if (verTudoBtn) break
          }
        }
      }

      const tileCount = grid.querySelectorAll('.tile-container, .swiper-slide').length
      const computedCols = getComputedStyle(grid).gridTemplateColumns
      let colCount = 2
      if (computedCols && computedCols !== 'none') {
        colCount = computedCols.split(' ').length
      } else {
        const w = window.innerWidth
        colCount = w >= 769 ? 4 : w >= 400 ? 3 : 2
      }
      if (tileCount > 0 && tileCount % colCount === 0) return

      const card = document.createElement('div')
      card.className = 'ab-see-more-card'
      card.innerHTML =
        '<div class="ab-see-more-shimmer"></div>' +
        '<div class="ab-see-more-card__icon"><svg viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
        '<span class="ab-see-more-card__label">Ver mais</span>'

      if (verTudoBtn) {
        const btn = verTudoBtn
        card.addEventListener('click', () => btn.click())
      }
      grid.appendChild(card)
    })
  }

  // ── Tile enhancement ──

  private enhanceTiles(container: HTMLElement): void {
    container.querySelectorAll<HTMLElement>('.ab-cashback-badge').forEach((b) => b.remove())

    container.querySelectorAll<HTMLElement>('.tile-container').forEach((tile) => {
      if (tile.hasAttribute('data-ab-layout')) return
      tile.setAttribute('data-ab-layout', 'true')
      this.makeImageClickable(tile)

      const fav = tile.querySelector<HTMLElement>('.tile-container__favorite')
      const bg = tile.querySelector<HTMLElement>('.tile-container__bg')
      if (fav && bg) {
        bg.appendChild(fav)
        const innerBtn = fav.querySelector<HTMLElement>('.transparent-btn')
        const isActive =
          (innerBtn?.classList.contains('active')) ||
          fav.classList.contains('active') ||
          fav.classList.contains('is-active')
        if (isActive) fav.classList.add('ab-fav-on')

        if (!fav.hasAttribute('data-ab-fav-toggle')) {
          fav.setAttribute('data-ab-fav-toggle', '1')
          fav.addEventListener('click', function (e) {
            e.stopPropagation()
            e.preventDefault()
            const btn = (this as HTMLElement).querySelector<HTMLElement>('.transparent-btn')
            const wasOn = (this as HTMLElement).classList.contains('ab-fav-on')
            if (wasOn) (this as HTMLElement).classList.remove('ab-fav-on')
            else (this as HTMLElement).classList.add('ab-fav-on')
            ;(this as HTMLElement).classList.toggle('active')
            btn?.classList.toggle('active')
          })
        }
      }
      this.markCasinoContainer(tile)
    })
  }

  // ── Main enhance ──

  private enhance(): boolean {
    let found = false

    const target = document.querySelector<HTMLElement>(TARGET_SELECTOR)
    if (target) {
      target.setAttribute('data-ab-casino', 'true')
      this.normalizeImages(target)
      this.enhanceTiles(target)
      found = true
    }

    document
      .querySelectorAll<HTMLElement>(
        '.casino-category-wrapper, .casino-games-wrapper, .casino__games, .casino-section, .infinite-scroll-game-list, [class*="casino"] > .swiper-container, [class*="casino"] > .swiper',
      )
      .forEach((section) => {
        if (!section.querySelector('.tile-container:not([data-ab-layout])')) return
        if (section.classList.contains('infinite-scroll-game-list')) {
          section.setAttribute('data-ab-casino', 'true')
          this.normalizeImages(section)
          this.enhanceTiles(section)
          found = true
        } else {
          const container = section.closest<HTMLElement>('[class*="casino"]') || section
          if (container !== document.body && container !== document.documentElement) {
            container.setAttribute('data-ab-casino', 'true')
            this.normalizeImages(container)
            this.enhanceTiles(container)
            found = true
          }
        }
      })

    if (!found) {
      document.querySelectorAll<HTMLElement>('.swiper-container, .swiper').forEach((swiper) => {
        const tiles = swiper.querySelectorAll('.tile-container:not([data-ab-layout])')
        if (tiles.length >= 4) {
          const ancestor = swiper.parentElement
          if (ancestor && ancestor !== document.body && ancestor !== document.documentElement) {
            ancestor.setAttribute('data-ab-casino', 'true')
            this.normalizeImages(ancestor)
            this.enhanceTiles(ancestor)
            found = true
          }
        }
      })
    }

    if (found) {
      this.styleSectionHeaders()
      this.injectSeeMoreCards()

      document.querySelectorAll<HTMLElement>('[data-ab-casino] .tile-container.size-l').forEach((sl) => {
        const wrapper = sl.closest<HTMLElement>('.swiper-slide') || sl.parentElement
        if (wrapper && !wrapper.hasAttribute('data-ab-size-l')) {
          wrapper.setAttribute('data-ab-size-l', 'true')
        }
      })
    }

    return found
  }

  // ── Init ──

  private start(): void {
    injectStyles(styles, 'apw-styles-casino-layout')
    this.enhance()
    domWatcher.register(this.name, () => this.enhance(), 20)
  }
}
