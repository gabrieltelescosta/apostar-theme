import { BaseModule } from '../base-module'
import type { ModuleEntry } from '../../types/config'
import { injectStyles } from '../../utils/dom'
import styles from './support-button.scss?inline'

declare global {
  interface Window {
    MoveoAI?: {
      init(opts: Record<string, unknown>): Promise<{ openWindow(): void }>
    }
  }
}

interface MoveoInstance {
  openWindow(): void
}

const IDS = {
  button: 'moveo-custom-support-button-v2',
  iconCss: 'moveo-bootstrap-icons-css',
  moveoScript: 'moveo-sdk-script-v2',
} as const

const DRAG_THRESHOLD = 8
const MARGIN = 20
const STORAGE_KEY = 'moveo_draggable_button_position_v2'

function loadCss(href: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) { resolve(); return }
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = href
    link.onload = () => resolve()
    link.onerror = () => reject(new Error('Failed to load CSS: ' + href))
    document.head.appendChild(link)
  })
}

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.MoveoAI) { resolve(); return }
    const existing = document.getElementById(id)
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load script: ' + src)), { once: true })
      return
    }
    const script = document.createElement('script')
    script.id = id
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load script: ' + src))
    document.head.appendChild(script)
  })
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export default class SupportButtonModule extends BaseModule {
  name = 'support-button'
  selfManaged = true

  private button: HTMLButtonElement | null = null
  private moveo: MoveoInstance | null = null
  private isPointerDown = false
  private isDragging = false
  private startX = 0
  private startY = 0
  private startLeft = 0
  private startTop = 0

  private boundPointerMove = this.onPointerMove.bind(this)
  private boundPointerUp = this.onPointerUp.bind(this)
  private boundResize = this.onResize.bind(this)

  async init(config: ModuleEntry): Promise<void> {
    await super.init(config)

    if (document.getElementById(IDS.button)) return

    await loadCss(
      'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
      IDS.iconCss,
    )

    injectStyles(styles, 'apw-styles-support-button')

    this.button = this.createButton()
    this.restorePosition()
    this.bindEvents()
    await this.initMoveo()
  }

  protected template(): string {
    return ''
  }

  render(): void {}

  destroy(): void {
    window.removeEventListener('pointermove', this.boundPointerMove)
    window.removeEventListener('pointerup', this.boundPointerUp)
    window.removeEventListener('resize', this.boundResize)
    this.button?.remove()
    this.button = null
    this.moveo = null
  }

  private createButton(): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.id = IDS.button
    btn.type = 'button'
    btn.setAttribute('aria-label', 'Abrir suporte')
    btn.setAttribute('title', 'Suporte')
    btn.innerHTML = '<i class="bi bi-chat-dots-fill" aria-hidden="true"></i>'
    document.body.appendChild(btn)
    return btn
  }

  private bindEvents(): void {
    if (!this.button) return

    this.button.addEventListener('pointerdown', (e) => this.onPointerDown(e))
    window.addEventListener('pointermove', this.boundPointerMove)
    window.addEventListener('pointerup', this.boundPointerUp)
    window.addEventListener('resize', this.boundResize)
  }

  private onPointerDown(e: PointerEvent): void {
    if (!this.button) return
    this.isPointerDown = true
    this.isDragging = false

    const rect = this.button.getBoundingClientRect()
    this.startX = e.clientX
    this.startY = e.clientY
    this.startLeft = rect.left
    this.startTop = rect.top

    this.button.classList.add('is-dragging')

    try { this.button.setPointerCapture(e.pointerId) } catch { /* noop */ }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.isPointerDown || !this.button) return

    const dx = e.clientX - this.startX
    const dy = e.clientY - this.startY

    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      this.isDragging = true
    }
    if (!this.isDragging) return

    this.applyPosition(this.startLeft + dx, this.startTop + dy)
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.isPointerDown || !this.button) return

    this.isPointerDown = false
    this.button.classList.remove('is-dragging')

    try { this.button.releasePointerCapture(e.pointerId) } catch { /* noop */ }

    if (this.isDragging) {
      this.savePosition()
      this.isDragging = false
      return
    }

    if (this.moveo) {
      this.moveo.openWindow()
    }
  }

  private onResize(): void {
    if (!this.button) return
    const rect = this.button.getBoundingClientRect()
    this.applyPosition(rect.left, rect.top)
  }

  private applyPosition(left: number, top: number): void {
    if (!this.button) return
    const rect = this.button.getBoundingClientRect()
    const safeLeft = clamp(left, MARGIN, window.innerWidth - rect.width - MARGIN)
    const safeTop = clamp(top, MARGIN, window.innerHeight - rect.height - MARGIN)
    this.button.style.left = safeLeft + 'px'
    this.button.style.top = safeTop + 'px'
    this.button.style.right = 'auto'
    this.button.style.bottom = 'auto'
  }

  private savePosition(): void {
    if (!this.button) return
    const rect = this.button.getBoundingClientRect()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ left: rect.left, top: rect.top }))
  }

  private restorePosition(): void {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return
    try {
      const { left, top } = JSON.parse(saved)
      this.applyPosition(left, top)
    } catch { /* corrupted data, ignore */ }
  }

  private async initMoveo(): Promise<void> {
    const integrationId = this.data<string>('integrationId', 'b41604ae-2744-430f-b8e6-522c65889b4f')

    await loadScript('https://cdn.moveo.ai/webclient/v2/moveo.min.js', IDS.moveoScript)

    if (window.MoveoAI) {
      this.moveo = await window.MoveoAI.init({
        integrationId,
        version: 'v2',
        launcher: { show: false },
        language: 'pt-br',
      })
    }
  }
}
