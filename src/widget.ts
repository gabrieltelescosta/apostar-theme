import { bootstrap, destroyAll } from './core/bootstrap'
import { moduleRegistry } from './core/module-registry'
import { eventBus } from './core/event-bus'
import { apostarMoney } from './utils/money-rain'

moduleRegistry.register('cashback-bar', () => import('./modules/cashback-bar/index'))
moduleRegistry.register('casino-nav', () => import('./modules/casino-nav/index'))

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
