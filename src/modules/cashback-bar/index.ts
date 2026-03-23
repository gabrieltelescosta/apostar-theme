import { BaseModule } from '../base-module'
import type { ModuleEntry } from '../../types/config'
import { injectStyles } from '../../utils/dom'
import { logger } from '../../core/logger'
import { apostarMoney } from '../../utils/money-rain'
import styles from './cashback-bar.scss?inline'

const BAR_ID = 'apostar-cashback-widget-bar'
const PILL_ID = 'apostar-cashback-widget-pill'
const FONT_ID = 'apostar-cashback-widget-font'

const CASHBACK_SVG =
  '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
  '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.94s4.18 1.36 4.18 3.85c0 1.89-1.44 2.98-3.12 3.19z"/>' +
  '</svg>'

interface CashbackResponse {
  amount: number
  can_cashout: boolean
}

export default class CashbackBarModule extends BaseModule {
  name = 'cashback-bar'
  selfManaged = true

  private resizeObserver: ResizeObserver | null = null

  async init(config: ModuleEntry): Promise<void> {
    await super.init(config)

    // Skip if already dismissed today
    if (this.isHiddenToday()) return

    injectStyles(styles, 'apw-styles-cashback-bar')
    this.injectFont()

    try {
      const userId = await this.waitForSmarticoUserId()
      if (!userId) return

      const data = await this.getCashback(userId)
      if (!data || typeof data.amount !== 'number') return
      if (!data.can_cashout || data.amount <= 0) return

      const header = await this.waitForHeader()
      if (!header) return
      if (document.getElementById(BAR_ID)) return

      const bar = this.createBar(data.amount)
      header.after(bar)

      const updateStickyTop = () => {
        bar.style.top = header.offsetHeight + 'px'
      }
      updateStickyTop()

      if (window.ResizeObserver) {
        this.resizeObserver = new ResizeObserver(updateStickyTop)
        this.resizeObserver.observe(header)
      }

      apostarMoney()
      logger.info('Cashback bar rendered.')
    } catch (err) {
      logger.error('Cashback widget error:', err)
    }
  }

  protected template(): string {
    return ''
  }

  render(): void {}

  destroy(): void {
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    document.getElementById(BAR_ID)?.remove()
    document.getElementById(PILL_ID)?.remove()
    document.getElementById(`${PILL_ID}-tooltip`)?.remove()
  }

  // ── Config accessors ──

  private get smarticoAction(): string {
    return this.data<string>('smarticoAction', 'dp:gf_section&id=1297')
  }

  private get apiEndpoint(): string {
    return this.data<string>('apiEndpoint', 'https://api-internal.apostar.app/api/my-cashback')
  }

  private get headerSelectors(): string[] {
    return this.data<string[]>('headerSelectors', [
      'header.header.header-layout',
      'header.header-mobile-layout',
    ])
  }

  // ── Storage ──

  private storageKey(): string {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `cashbackBarHidden_${y}-${m}-${d}`
  }

  private isHiddenToday(): boolean {
    try { return !!localStorage.getItem(this.storageKey()) } catch (_) { return false }
  }

  private markHiddenToday(): void {
    try { localStorage.setItem(this.storageKey(), '1') } catch (_) { /* ignore */ }
  }

  // ── Font ──

  private injectFont(): void {
    if (document.getElementById(FONT_ID)) return
    const link = document.createElement('link')
    link.id = FONT_ID
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Jost:wght@500;600;700;800&display=swap'
    document.head.appendChild(link)
  }

  // ── Header helpers ──

  private getHeader(): HTMLElement | null {
    for (const selector of this.headerSelectors) {
      const el = document.querySelector<HTMLElement>(selector)
      if (el) return el
    }
    return null
  }

  private waitForHeader(): Promise<HTMLElement | null> {
    return new Promise((resolve) => {
      const header = this.getHeader()
      if (header) { resolve(header); return }

      const observer = new MutationObserver(() => {
        const el = this.getHeader()
        if (el) { observer.disconnect(); resolve(el) }
      })
      observer.observe(document.documentElement, { childList: true, subtree: true })
    })
  }

  private waitForSmarticoUserId(): Promise<string | null> {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        const id = window._smartico?.getUserID?.()
        if (id) { clearInterval(interval); resolve(id) }
      }, 300)
    })
  }

  // ── API ──

  private async getCashback(userId: string): Promise<CashbackResponse | null> {
    const res = await fetch(`${this.apiEndpoint}?clientId=${userId}`, {
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`Cashback API HTTP ${res.status}`)
    return res.json()
  }

  private openSmartico(): void {
    if (window._smartico?.dp) window._smartico.dp(this.smarticoAction)
  }

  private formatBRL(cents: number): string {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  // ── Pill (icon-only circular button) ──

  private createPill(_amount: number): void {
    if (document.getElementById(PILL_ID)) return

    const pill = document.createElement('div')
    pill.id = PILL_ID
    pill.innerHTML = '<img src="https://cdn.mnply.com.br/apostar-rebrand/icon_cashback.png" alt="Cashback" />'
    pill.addEventListener('click', () => this.openSmartico())
    document.body.appendChild(pill)

    const tooltip = document.createElement('div')
    tooltip.id = `${PILL_ID}-tooltip`
    tooltip.textContent = 'Cashback disponivel'
    document.body.appendChild(tooltip)

    setTimeout(() => {
      tooltip.classList.add('fade-out')
      setTimeout(() => tooltip.remove(), 600)
    }, 8000)
  }

  // ── Bar ──

  private createBar(amount: number): HTMLElement {
    const bar = document.createElement('div')
    bar.id = BAR_ID

    bar.innerHTML = `
      <div class="content">
        <div class="message">
          <span class="icon">${CASHBACK_SVG}</span>
          <span class="text">
            Você tem
            <span class="value">${this.formatBRL(amount)}</span>
            de Cashback!
          </span>
        </div>
        <span class="close">✕</span>
      </div>
    `

    // Click bar body: mark hidden today + open smartico (no pill)
    bar.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.close')) return
      this.markHiddenToday()
      this.openSmartico()
      bar.remove()
    })

    // Click close: remove bar + show pill
    const close = bar.querySelector<HTMLElement>('.close')
    if (close) {
      close.addEventListener('click', (e) => {
        e.stopPropagation()
        bar.remove()
        this.createPill(amount)
      })
    }

    return bar
  }
}
