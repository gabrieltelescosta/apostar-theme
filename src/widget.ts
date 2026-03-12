alert('teste gabriel')

import { bootstrap, destroyAll } from './core/bootstrap'
import { moduleRegistry } from './core/module-registry'
import { eventBus } from './core/event-bus'

moduleRegistry.register('cashback-bar', () => import('./modules/cashback-bar/index'))

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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => bootstrap())
} else {
  bootstrap()
}
