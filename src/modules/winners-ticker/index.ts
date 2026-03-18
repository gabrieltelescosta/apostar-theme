import { BaseModule } from '../base-module'
import type { ModuleEntry } from '../../types/config'
import { injectStyles } from '../../utils/dom'
import styles from './winners-ticker.scss?inline'

interface WinnerItem {
  game: { name: string; iconUrl: string }
  info: { login: string; amount: number }
}

const CONTAINER_CLASS = 'ab-wt-container'
const FONT_ID = 'apw-font-jost-winners'

export default class WinnersTickerModule extends BaseModule {
  name = 'winners-ticker'
  selfManaged = true

  private pollTimer: ReturnType<typeof setInterval> | null = null
  private mutationObserver: MutationObserver | null = null

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

    injectStyles(styles, 'apw-styles-winners-ticker')

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
    this.mutationObserver?.disconnect()
    this.mutationObserver = null
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
      .then((r) => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data) && data.length > 0) cb(data as WinnerItem[])
      })
      .catch((e: unknown) => console.warn('[Winners Ticker] API error:', e))
  }

  // ── Render ──

  private render(wrapper: HTMLElement, data: WinnerItem[]): void {
    const cardsHTML = data.map((item) => this.buildCardHTML(item)).join('')
    const doubled = cardsHTML + cardsHTML
    const existing = document.querySelector<HTMLElement>(`.${CONTAINER_CLASS}`)

    if (existing) {
      const track = existing.querySelector('.ab-wt-track')
      if (track) track.innerHTML = doubled
      return
    }

    const container = document.createElement('div')
    container.className = `${CONTAINER_CLASS} ab-wt-entering`
    container.innerHTML = `<div class="ab-wt-track">${doubled}</div>`
    wrapper.parentNode?.insertBefore(container, wrapper)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => container.classList.remove('ab-wt-entering'))
    })
  }

  // ── Init / polling ──

  private run(): boolean {
    const wrapper = document.querySelector<HTMLElement>('.cl-wrapper.cl-horizontal')
    if (!wrapper) return false
    this.fetchWinners((data) => this.render(wrapper, data))
    return true
  }

  private start(): void {
    this.run()

    this.mutationObserver = new MutationObserver(() => {
      const wrapper = document.querySelector<HTMLElement>('.cl-wrapper.cl-horizontal')
      if (wrapper && !document.querySelector(`.${CONTAINER_CLASS}`)) {
        this.fetchWinners((data) => this.render(wrapper, data))
      }
    })
    this.mutationObserver.observe(document.body, { childList: true, subtree: true })

    this.pollTimer = setInterval(() => {
      const wrapper = document.querySelector<HTMLElement>('.cl-wrapper.cl-horizontal')
      if (!wrapper) return
      this.fetchWinners((data) => this.render(wrapper, data))
    }, this.pollInterval)
  }
}
