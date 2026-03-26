import { bootstrap, destroyAll } from './core/bootstrap'
import { moduleRegistry } from './core/module-registry'
import { eventBus } from './core/event-bus'
import { apostarMoney } from './utils/money-rain'

declare global {
  interface Window {
    __APW_INIT?: boolean
    ApostarWidget: {
      destroy: typeof destroyAll
      events: typeof eventBus
      registry: typeof moduleRegistry
    }
  }
}

if (window.__APW_INIT) {
  console.warn('[APW] Widget already initialized, skipping duplicate.')
} else {
  window.__APW_INIT = true

  moduleRegistry.register('loading-screen',   () => import('./modules/loading-screen/index'))
  moduleRegistry.register('css-vars',          () => import('./modules/css-vars/index'))
  moduleRegistry.register('header-reskin',     () => import('./modules/header-reskin/index'))
  moduleRegistry.register('casino-nav-reskin', () => import('./modules/casino-nav-reskin/index'))
  moduleRegistry.register('casino-layout',     () => import('./modules/casino-layout/index'))
  moduleRegistry.register('cashback-tags',     () => import('./modules/cashback-tags/index'))
  moduleRegistry.register('winners-ticker',    () => import('./modules/winners-ticker/index'))
  moduleRegistry.register('casino-filters',    () => import('./modules/casino-filters/index'))
  moduleRegistry.register('providers-block',   () => import('./modules/providers-block/index'))
  moduleRegistry.register('cashback-bar',      () => import('./modules/cashback-bar/index'))
  moduleRegistry.register('footer-reskin',    () => import('./modules/footer-reskin/index'))
  moduleRegistry.register('static-content',   () => import('./modules/static-content/index'))
  moduleRegistry.register('switch-toggle-hide', () => import('./modules/switch-toggle-hide/index'))

  window.ApostarWidget = {
    destroy: destroyAll,
    events: eventBus,
    registry: moduleRegistry,
  }

  window.apostarMoney = apostarMoney

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => bootstrap())
  } else {
    bootstrap()
  }
}
