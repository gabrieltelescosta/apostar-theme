import { BaseModule } from '../base-module'
import type { ModuleEntry } from '../../types/config'
import { injectStyles } from '../../utils/dom'
import styles from './providers-block.scss?inline'

const ATTR = 'data-ab-pbr'

export default class ProvidersBlockModule extends BaseModule {
  name = 'providers-block'
  selfManaged = true

  private observer: MutationObserver | null = null

  async init(config: ModuleEntry): Promise<void> {
    await super.init(config)
    injectStyles(styles, 'apw-styles-providers-block')

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
    document.querySelectorAll(`[${ATTR}]`).forEach((el) => el.removeAttribute(ATTR))
  }

  // ── Private ──

  private getActiveProviders(): string[] {
    const p = new URLSearchParams(window.location.search).get('providerNames')
    return p ? p.split(',').map((s) => s.trim()) : []
  }

  private getProviderName(card: HTMLElement): string {
    const nameEl = card.querySelector<HTMLElement>('.provider-card__name')
    if (nameEl) return nameEl.textContent?.trim() ?? ''
    const imgEl = card.querySelector<HTMLImageElement>('.provider-card__img')
    return imgEl?.alt?.trim() ?? ''
  }

  private highlightActive(block: HTMLElement): void {
    const active = this.getActiveProviders()
    block.querySelectorAll<HTMLElement>('.provider-card').forEach((card) => {
      const name = this.getProviderName(card)
      if (active.includes(name)) card.classList.add('ab-pbr-active')
      else card.classList.remove('ab-pbr-active')
    })
  }

  private patchSwiper(block: HTMLElement): void {
    const swiperEl = block.querySelector<HTMLElement & { swiper?: { params: Record<string, unknown>; update: () => void } }>('.swiper')
    if (!swiperEl?.swiper) return
    const sw = swiperEl.swiper
    if (sw.params['grid']) (sw.params['grid'] as Record<string, unknown>)['rows'] = 1
    sw.params['slidesPerView'] = 'auto'
    sw.params['spaceBetween'] = 8
    sw.update()
  }

  private inject(): void {
    const block = document.querySelector<HTMLElement>('.casino-providers-block')
    if (!block) return

    if (!block.hasAttribute(ATTR)) {
      block.setAttribute(ATTR, '1')
      this.patchSwiper(block)
    }

    this.highlightActive(block)
  }

  private start(): void {
    this.inject()
    this.observer = new MutationObserver(() => this.inject())
    this.observer.observe(document.body, { childList: true, subtree: true })
  }
}
