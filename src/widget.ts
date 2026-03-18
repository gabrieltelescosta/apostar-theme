import { bootstrap, destroyAll } from './core/bootstrap'
import { moduleRegistry } from './core/module-registry'
import { eventBus } from './core/event-bus'
import { apostarMoney } from './utils/money-rain'

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

declare global {
  interface Window {
    ApostarWidget: {
      destroy: typeof destroyAll
      events: typeof eventBus
      registry: typeof moduleRegistry
    }
  }
}

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
