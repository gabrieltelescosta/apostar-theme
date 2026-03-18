import { BaseModule } from '../base-module'
import type { ModuleEntry } from '../../types/config'
import { injectStyles } from '../../utils/dom'
import styles from './casino-filters.scss?inline'

const FILTER_SELECTOR = '.casino-game-list__header-top .chips-item'

export default class CasinoFiltersModule extends BaseModule {
  name = 'casino-filters'
  selfManaged = true

  private observer: MutationObserver | null = null

  async init(config: ModuleEntry): Promise<void> {
    await super.init(config)
    injectStyles(styles, 'apw-styles-casino-filters')

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
    this.observer?.disconnect()
    this.observer = null
  }

  // ── Helpers ──

  private getActiveCount(): number {
    const p = new URLSearchParams(window.location.search).get('providerNames')
    return p ? p.split(',').filter(Boolean).length : 0
  }

  private closePopup(
    popup: HTMLElement,
    callback?: () => void,
  ): void {
    if (popup.getAttribute('data-ab-cfr-closing') === '1') return
    popup.setAttribute('data-ab-cfr-closing', '1')

    const win = popup.querySelector<HTMLElement>('.popup__window')
    const backdrop = popup.querySelector<HTMLElement>('.popup-backdrop')
    win?.classList.add('ab-cfr-closing')
    backdrop?.classList.add('ab-cfr-closing')

    setTimeout(() => {
      if (callback) {
        callback()
      } else {
        const closeBtn = popup.querySelector<HTMLElement & { _abCfrNative?: boolean }>('.popup__header button')
        if (closeBtn) { closeBtn._abCfrNative = true; closeBtn.click() }
      }
    }, 300)
  }

  private enhancePopup(): void {
    const popup = document.querySelector<HTMLElement>('.casino-filter-popup')
    if (!popup || popup.getAttribute('data-ab-cfr-enhanced') === '1') return
    popup.setAttribute('data-ab-cfr-enhanced', '1')

    const win = popup.querySelector<HTMLElement>('.popup__window')

    if (win && !win.querySelector('.ab-cfr-drag-bar')) {
      const bar = document.createElement('div')
      bar.className = 'ab-cfr-drag-bar'
      win.insertBefore(bar, win.firstChild)
    }

    const secondaryBtn = popup.querySelector<HTMLElement>('.sticky-bottom-buttons-container .btn.secondary')
    if (secondaryBtn) {
      const span = secondaryBtn.querySelector('span')
      if (span) span.textContent = 'LIMPAR'
      else secondaryBtn.textContent = 'LIMPAR'
    }

    type NativeBtn = HTMLElement & { _abCfrNative?: boolean }

    const closeBtn = popup.querySelector<NativeBtn>('.popup__header button')
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        if (closeBtn._abCfrNative) { closeBtn._abCfrNative = false; return }
        e.preventDefault()
        e.stopImmediatePropagation()
        this.closePopup(popup, () => { closeBtn._abCfrNative = true; closeBtn.click() })
      }, true)
    }

    popup.querySelectorAll<NativeBtn>('.sticky-bottom-buttons-container .btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        if (btn._abCfrNative) { btn._abCfrNative = false; return }
        e.preventDefault()
        e.stopImmediatePropagation()
        this.closePopup(popup, () => { btn._abCfrNative = true; btn.click() })
      }, true)
    })

    const backdrop = popup.querySelector<HTMLElement>('.popup-backdrop')
    backdrop?.addEventListener('click', (e) => {
      if (e.target === backdrop) this.closePopup(popup)
    })

    popup.addEventListener('click', (e) => {
      if (e.target === popup) this.closePopup(popup)
    })

    if (win) {
      let touchStartY = 0
      let touchCurrentY = 0
      let isDragging = false

      const dragArea =
        win.querySelector<HTMLElement>('.popup__header') ||
        win.querySelector<HTMLElement>('.ab-cfr-drag-bar')
      const dragTarget = dragArea || win

      dragTarget.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY
        touchCurrentY = touchStartY
        isDragging = true
        win.style.transition = 'none'
      }, { passive: true })

      dragTarget.addEventListener('touchmove', (e) => {
        if (!isDragging) return
        touchCurrentY = e.touches[0].clientY
        const diff = touchCurrentY - touchStartY
        if (diff > 0) win.style.transform = `translateY(${diff}px)`
      }, { passive: true })

      dragTarget.addEventListener('touchend', () => {
        if (!isDragging) return
        isDragging = false
        const diff = touchCurrentY - touchStartY
        win.style.transition = ''
        win.style.transform = ''
        if (diff > 80) this.closePopup(popup)
      }, { passive: true })
    }
  }

  private injectFilterLabel(): void {
    document.querySelectorAll<HTMLElement>(FILTER_SELECTOR).forEach((btn) => {
      if (btn.querySelector('.ab-cfr-label')) return

      const label = document.createElement('span')
      label.className = 'ab-cfr-label'
      label.textContent = 'Provedores'
      btn.appendChild(label)

      const count = this.getActiveCount()
      if (count > 0) {
        const badge = document.createElement('span')
        badge.className = 'ab-cfr-badge'
        badge.textContent = String(count)
        btn.appendChild(badge)
        btn.classList.add('ab-cfr-has-filters')
      }
    })
  }

  private updateBadges(): void {
    const count = this.getActiveCount()
    document.querySelectorAll<HTMLElement>(FILTER_SELECTOR).forEach((btn) => {
      let badge = btn.querySelector<HTMLElement>('.ab-cfr-badge')
      if (count > 0) {
        if (!badge) {
          badge = document.createElement('span')
          badge.className = 'ab-cfr-badge'
          btn.appendChild(badge)
        }
        badge.textContent = String(count)
        btn.classList.add('ab-cfr-has-filters')
      } else {
        badge?.remove()
        btn.classList.remove('ab-cfr-has-filters')
      }
    })
  }

  private start(): void {
    this.injectFilterLabel()

    let debounce: ReturnType<typeof setTimeout>
    this.observer = new MutationObserver(() => {
      clearTimeout(debounce)
      debounce = setTimeout(() => {
        this.injectFilterLabel()
        this.updateBadges()
        this.enhancePopup()
      }, 80)
    })
    this.observer.observe(document.body, { childList: true, subtree: true })
  }
}
