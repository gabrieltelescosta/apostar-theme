import { logger } from './logger'

type NukeCallback = () => void

class WidgetGuard {
  private errorCount = 0
  private readonly MAX_ERRORS = 5
  private _nuked = false
  private nukeCallback: NukeCallback | null = null

  get isNuked(): boolean {
    return this._nuked
  }

  setNukeCallback(cb: NukeCallback): void {
    this.nukeCallback = cb
  }

  report(source: string, err?: unknown): void {
    if (this._nuked) return
    this.errorCount++
    logger.warn(`[WidgetGuard] Error #${this.errorCount} from "${source}":`, err)

    if (this.errorCount >= this.MAX_ERRORS) {
      this.nuke()
    }
  }

  nuke(): void {
    if (this._nuked) return
    this._nuked = true
    logger.warn(`[WidgetGuard] Threshold reached (${this.MAX_ERRORS}). Nuking all widgets.`)

    try {
      this.nukeCallback?.()
    } catch (e) {
      logger.error('[WidgetGuard] Error during destroyAll:', e)
    }

    document.querySelectorAll<HTMLStyleElement>('style[id^="apw-"]').forEach((s) => s.remove())
    document.querySelectorAll('[data-apw-module]').forEach((el) => el.remove())

    document.body.className = document.body.className
      .split(' ')
      .filter((c) => !c.startsWith('ab-'))
      .join(' ')

    document.querySelectorAll('[data-ab-footer],[data-ab-sc],[data-ab-cb],[data-ab-stable]').forEach((el) => {
      for (const attr of [...el.attributes]) {
        if (attr.name.startsWith('data-ab-')) {
          el.removeAttribute(attr.name)
        }
      }
    })

    document.querySelectorAll<HTMLElement>('[style*="display: none"], [style*="display:none"]').forEach((el) => {
      if (el.classList.contains('casino__winners') || el.classList.contains('cl-wrapper')) {
        el.style.removeProperty('display')
      }
    })
  }
}

export const widgetGuard = new WidgetGuard()
