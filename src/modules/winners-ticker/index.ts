import { BaseModule } from '../base-module'
import type { ModuleEntry } from '../../types/config'
import { injectStyles } from '../../utils/dom'
import { domWatcher } from '../../core/dom-watcher'
import { widgetGuard } from '../../core/widget-guard'
import styles from './winners-ticker.scss?inline'

interface WinnerItem {
  game: { name: string; iconUrl: string }
  info: { login: string; amount: number }
}

const CONTAINER_CLASS = 'ab-wt-container'
const FONT_ID = 'apw-font-jost-winners'
const STYLE_ID = 'apw-styles-winners-ticker'
const BODY_CLASS = 'ab-wt-active'
const ERROR_THRESHOLD = 2

export default class WinnersTickerModule extends BaseModule {
  name = 'winners-ticker'
  selfManaged = true

  private pollTimer: ReturnType<typeof setInterval> | null = null
  private lastDataHash = ''
  private singleSetHTML = ''
  private resizeTimer: ReturnType<typeof setTimeout> | null = null
  private errorCount = 0
  private fallen = false

  private get apiUrl(): string {
    return this.data<string>('apiUrl', '/api/gs/lastWinnings:list')
  }

  private get iconCdn(): string {
    return this.data<string>(
      'iconCdn',
      'https://media.pl-01.cdn-platform.com/games/',
    )
  }

  private get pollInterval(): number {
    return this.data<number>('pollInterval', 15000)
  }

  async init(config: ModuleEntry): Promise<void> {
    await super.init(config)

    if (!document.getElementById(FONT_ID)) {
      const font = document.createElement('link')
      font.id = FONT_ID
      font.rel = 'stylesheet'
      font.href =
        'https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700&display=swap'
      document.head.appendChild(font)
    }

    injectStyles(styles, STYLE_ID)

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
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null }
    if (this.resizeTimer) { clearTimeout(this.resizeTimer); this.resizeTimer = null }
    window.removeEventListener('resize', this.handleResize)
    domWatcher.unregister(this.name)
    document.body.classList.remove(BODY_CLASS)
    document.querySelector(`.${CONTAINER_CLASS}`)?.remove()
  }

  // ── Helpers ──

  private formatBRL(cents: number): string {
    return 'R$ ' + (cents / 100).toFixed(2).replace('.', ',')
  }

  private maskLogin(login: string): string {
    return login.slice(0, 6) + '***'
  }

  private buildCardHTML(item: WinnerItem): string {
    const iconSrc = this.iconCdn + item.game.iconUrl
    return (
      '<div class="ab-wt-card">' +
      `<img class="ab-wt-img" src="${iconSrc}" alt="${item.game.name}" loading="lazy"/>` +
      '<div class="ab-wt-details">' +
      '<div class="ab-wt-congrats">Parabéns!</div>' +
      '<div class="ab-wt-win-line">' +
      `<span>${this.maskLogin(item.info.login)}</span>` +
      '<span class="ab-wt-won">Ganhou</span>' +
      `<span class="ab-wt-amount">${this.formatBRL(item.info.amount)}</span>` +
      '</div>' +
      `<div class="ab-wt-game">${item.game.name}</div>` +
      '</div>' +
      '</div>'
    )
  }

  // ── API ──

  private fetchWinners(cb: (data: WinnerItem[]) => void): void {
    if (widgetGuard.isNuked || this.fallen) return

    fetch(this.apiUrl, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        device: 'mobile',
        'x-locale': 'BR_PT',
        'x-project-id': '286',
      },
      credentials: 'include',
    })
      .then((r) => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}`)
        }
        return r.json()
      })
      .then((data: unknown) => {
        this.errorCount = 0
        if (Array.isArray(data) && data.length > 0) cb(data as WinnerItem[])
      })
      .catch((e: unknown) => {
        this.errorCount++
        widgetGuard.report('winners-ticker', e)
        if (this.errorCount >= ERROR_THRESHOLD) {
          this.fallbackToNative()
        }
      })
  }

  // ── Render ──

  private insertContainer(
    container: HTMLElement,
    ref: HTMLElement,
    position: 'before' | 'after',
  ): void {
    if (position === 'before') {
      ref.parentNode?.insertBefore(container, ref)
    } else {
      ref.insertAdjacentElement('afterend', container)
    }
  }

  private hideOriginalWinnersWrapper(ticker: HTMLElement): void {
    const wrapper = document.querySelector<HTMLElement>('.casino__winners')
    if (wrapper && !wrapper.contains(ticker)) {
      wrapper.style.display = 'none'
    }
  }

  private ensureSeamless(container: HTMLElement): void {
    const track = container.querySelector<HTMLElement>('.ab-wt-track')
    if (!track || !this.singleSetHTML) return

    const containerW = container.offsetWidth
    if (containerW === 0) return

    const probe = document.createElement('div')
    probe.style.cssText =
      'position:absolute;visibility:hidden;width:max-content;display:flex;flex-wrap:nowrap;'
    probe.innerHTML = this.singleSetHTML
    container.appendChild(probe)
    const setW = probe.offsetWidth
    container.removeChild(probe)

    if (setW === 0) return

    const copies = Math.max(2, Math.ceil(containerW / setW) + 1)
    track.innerHTML = this.singleSetHTML.repeat(copies)

    const SPEED_PX_PER_SEC = 50
    const duration = setW / SPEED_PX_PER_SEC

    track.style.setProperty('--wt-offset', `-${setW}px`)
    track.style.animationDuration = `${duration}s`
  }

  private handleResize = (): void => {
    if (this.resizeTimer) clearTimeout(this.resizeTimer)
    this.resizeTimer = setTimeout(() => {
      const container = document.querySelector<HTMLElement>(`.${CONTAINER_CLASS}`)
      if (container) this.ensureSeamless(container)
    }, 300)
  }

  private renderTicker(
    ref: HTMLElement,
    position: 'before' | 'after',
    data: WinnerItem[],
  ): void {
    const cardsHTML = data.map((item) => this.buildCardHTML(item)).join('')
    this.singleSetHTML = cardsHTML

    const existing = document.querySelector<HTMLElement>(`.${CONTAINER_CLASS}`)
    const hash = cardsHTML.length + ':' + (data[0]?.info.login ?? '')

    if (existing) {
      if (hash !== this.lastDataHash) {
        this.lastDataHash = hash
        this.ensureSeamless(existing)
      }
      this.hideOriginalWinnersWrapper(existing)
      return
    }
    this.lastDataHash = hash

    const container = document.createElement('div')
    container.className = `${CONTAINER_CLASS} ab-wt-entering`
    container.innerHTML = `<div class="ab-wt-track">${cardsHTML}</div>`
    this.insertContainer(container, ref, position)
    this.hideOriginalWinnersWrapper(container)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container.classList.remove('ab-wt-entering')
        this.ensureSeamless(container)
      })
    })
  }

  // ── Init / polling ──

  private findRef(): { el: HTMLElement; pos: 'before' | 'after' } | null {
    const isDesktop = window.innerWidth >= 769
    if (!isDesktop) {
      const mobile = document.querySelector<HTMLElement>('.cl-wrapper.cl-horizontal')
      if (mobile) return { el: mobile, pos: 'before' }
    }
    const sliders = document.querySelector<HTMLElement>('.casino__sliders')
    if (sliders) return { el: sliders, pos: 'before' }
    const fallback = document.querySelector<HTMLElement>('.cl-wrapper.cl-horizontal')
    if (fallback) return { el: fallback, pos: 'before' }
    return null
  }

  private run(): boolean {
    const ref = this.findRef()
    if (!ref) return false
    this.fetchWinners((data) => this.renderTicker(ref.el, ref.pos, data))
    return true
  }

  private fallbackToNative(): void {
    if (this.fallen) return
    this.fallen = true

    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null }
    if (this.resizeTimer) { clearTimeout(this.resizeTimer); this.resizeTimer = null }
    window.removeEventListener('resize', this.handleResize)
    domWatcher.unregister(this.name)

    document.querySelector(`.${CONTAINER_CLASS}`)?.remove()
    document.body.classList.remove(BODY_CLASS)
    document.getElementById(STYLE_ID)?.remove()

    const nativeWinners = document.querySelector<HTMLElement>('.casino__winners')
    if (nativeWinners) nativeWinners.style.removeProperty('display')

    console.warn('[Winners Ticker] Fallback to native after consecutive errors.')
  }

  private start(): void {
    document.body.classList.add(BODY_CLASS)
    this.run()

    window.addEventListener('resize', this.handleResize)

    domWatcher.register(this.name, () => {
      if (widgetGuard.isNuked || this.fallen) {
        domWatcher.unregister(this.name)
        return
      }
      if (document.querySelector(`.${CONTAINER_CLASS}`)) {
        domWatcher.unregister(this.name)
        return
      }
      const ref = this.findRef()
      if (ref) this.fetchWinners((data) => this.renderTicker(ref.el, ref.pos, data))
    }, 40)

    this.pollTimer = setInterval(() => {
      if (widgetGuard.isNuked || this.fallen) {
        clearInterval(this.pollTimer!)
        this.pollTimer = null
        return
      }
      const ref = this.findRef()
      if (!ref) return
      this.fetchWinners((data) => this.renderTicker(ref.el, ref.pos, data))
    }, this.pollInterval)
  }
}
