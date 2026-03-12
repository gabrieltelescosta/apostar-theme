import { BaseModule } from '../base-module'
import type { ModuleEntry } from '../../types/config'
import { injectStyles } from '../../utils/dom'
import { logger } from '../../core/logger'
import styles from './cashback-bar.scss?inline'

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

  async init(config: ModuleEntry): Promise<void> {
    await super.init(config)

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
    if (window.apostarMoney) {
      window.apostarMoney()
    }
    if (window._smartico?.dp) {
      window._smartico.dp(this.smarticoAction)
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

    pill.innerHTML = `
      <span class="pill-icon">🎁</span>
      <span class="pill-text">Você tem cashback!</span>
      <span class="pill-value">${this.formatBRL(amount)}</span>
    `

    pill.addEventListener('click', () => this.openSmartico())
    document.body.appendChild(pill)

    const tooltip = document.createElement('div')
    tooltip.id = `${PILL_ID}-tooltip`
    tooltip.textContent = 'Cashback aqui! 💰'
    document.body.appendChild(tooltip)
    tooltip.style.right = (pill.offsetWidth + 6) + 'px'

    setTimeout(() => {
      tooltip.classList.add('fade-out')
      setTimeout(() => tooltip.remove(), 600)
    }, 8000)
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
            <span>Você tem</span>
            <span class="value">${this.formatBRL(amount)}</span>
            <span>de Cashback!</span>
          </span>
        </div>
        <span class="close">✕</span>
      </div>
    `

    bar.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.close')) return
      this.openSmartico()
      bar.remove()
      this.createPill(amount)
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
