import { BaseModule } from '../base-module'
import type { ModuleEntry } from '../../types/config'
import { injectStyles } from '../../utils/dom'
import { logger } from '../../core/logger'
import styles from './cashback-bar.module.scss?inline'

const BAR_ID = 'apostar-cashback-widget-bar'
const PILL_ID = 'apostar-cashback-widget-pill'
const FONT_ID = 'apostar-cashback-widget-font'

interface CashbackResponse {
  amount: number
  can_cashout: boolean
}

export default class CashbackBarModule extends BaseModule {
  name = 'cashback-bar'
  selfManaged = true

  private resizeObserver: ResizeObserver | null = null
  private storageKey = ''

  async init(config: ModuleEntry): Promise<void> {
    await super.init(config)

    injectStyles(styles, 'apw-styles-cashback-bar')
    this.injectFont()

    this.storageKey = this.getTodayKey()

    try {
      if (localStorage.getItem(this.storageKey)) {
        logger.info('Cashback bar hidden for today.')
        return
      }
    } catch {
      // localStorage unavailable
    }

    try {
      const header = await this.waitForHeader()
      if (!header) return
      if (document.getElementById(BAR_ID)) return

      const userId = await this.waitForSmarticoUserId()
      if (!userId) return

      const cashback = await this.getCashback(userId)
      if (!cashback || cashback.amount <= 0) return

      const bar = this.createBar(cashback.amount)
      header.after(bar)
      logger.info('Cashback bar rendered.')
    } catch (err) {
      logger.error('Cashback widget error:', err)
    }
  }

  protected template(): string {
    return ''
  }

  render(): void {
    // Self-managed: no-op
  }

  destroy(): void {
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    document.getElementById(BAR_ID)?.remove()
    document.getElementById(PILL_ID)?.remove()
    document.getElementById(`${PILL_ID}-tooltip`)?.remove()
  }

  // ── Private helpers ──

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

  private getTodayKey(): string {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `cashbackBarHidden_${y}-${m}-${d}`
  }

  private injectFont(): void {
    if (document.getElementById(FONT_ID)) return
    const link = document.createElement('link')
    link.id = FONT_ID
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Jost:wght@500;600;700;800&display=swap'
    document.head.appendChild(link)
  }

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
      if (header) {
        resolve(header)
        return
      }

      const observer = new MutationObserver(() => {
        const el = this.getHeader()
        if (el) {
          observer.disconnect()
          resolve(el)
        }
      })

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      })
    })
  }

  private waitForSmarticoUserId(): Promise<string | null> {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        const id = window._smartico?.getUserID?.()
        if (id) {
          clearInterval(interval)
          resolve(id)
        }
      }, 300)
    })
  }

  private async getCashback(userId: string): Promise<CashbackResponse | null> {
    const res = await fetch(`${this.apiEndpoint}?clientId=${userId}`, {
      credentials: 'include',
    })

    if (!res.ok) {
      throw new Error(`Cashback API HTTP ${res.status}`)
    }

    return res.json()
  }

  private openSmartico(): void {
    if (window._smartico?.dp) {
      window._smartico.dp(this.smarticoAction)
    }
  }

  private markHiddenToday(): void {
    try {
      localStorage.setItem(this.storageKey, '1')
    } catch {
      // localStorage unavailable
    }
  }

  private formatBRL(cents: number): string {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  private createPill(amount: number): void {
    if (document.getElementById(PILL_ID)) return

    const pill = document.createElement('div')
    pill.id = PILL_ID

    const header = this.getHeader()
    const topPos = header ? header.offsetHeight + 12 : 70
    pill.style.top = `${topPos}px`

    pill.innerHTML = `
      <span class="pill-icon">🎁</span>
      <span class="pill-value">${this.formatBRL(amount)}</span>
    `

    pill.addEventListener('click', () => this.openSmartico())
    document.body.appendChild(pill)

    const tooltip = document.createElement('div')
    tooltip.id = `${PILL_ID}-tooltip`
    tooltip.textContent = 'Cashback aqui! 💰'
    tooltip.style.top = `${topPos + 14}px`
    document.body.appendChild(tooltip)

    setTimeout(() => {
      tooltip.classList.add('fade-out')
      setTimeout(() => tooltip.remove(), 600)
    }, 8000)

    if (window.ResizeObserver && header) {
      this.resizeObserver = new ResizeObserver(() => {
        const t = header.offsetHeight + 12
        pill.style.top = `${t}px`
        const tip = document.getElementById(`${PILL_ID}-tooltip`)
        if (tip) tip.style.top = `${t + 14}px`
      })
      this.resizeObserver.observe(header)
    }
  }

  private createBar(amount: number): HTMLElement {
    const bar = document.createElement('div')
    bar.id = BAR_ID

    const particles = [
      { left: '8%', delay: '0s', dur: '3.5s' },
      { left: '22%', delay: '0.8s', dur: '4.2s' },
      { left: '38%', delay: '1.5s', dur: '3.8s' },
      { left: '55%', delay: '0.3s', dur: '4.5s' },
      { left: '70%', delay: '2.0s', dur: '3.2s' },
      { left: '85%', delay: '1.2s', dur: '4.0s' },
    ]

    const particlesHTML = particles
      .map(
        (p) =>
          `<span class="money-particle" style="left:${p.left};animation-delay:${p.delay};animation-duration:${p.dur}">💰</span>`,
      )
      .join('')

    bar.innerHTML = `
      ${particlesHTML}
      <div class="content">
        <div class="message">
          <span class="icon">🎁</span>
          <span class="text">
            Você tem
            <span class="value">${this.formatBRL(amount)}</span>
            de Cashback!
          </span>
        </div>
        <span class="close">✕</span>
      </div>
    `

    bar.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.close')) return
      this.markHiddenToday()
      this.openSmartico()
      bar.remove()
    })

    const close = bar.querySelector('.close')
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
