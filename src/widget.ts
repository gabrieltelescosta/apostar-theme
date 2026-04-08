import { bootstrap, destroyAll } from './core/bootstrap'
import { moduleRegistry } from './core/module-registry'
import { eventBus } from './core/event-bus'
import './utils/sounds'
import './utils/confetti'
import type { sounds } from './utils/sounds'
import type { ConfettiOptions } from './utils/confetti'

declare global {
  interface Window {
    __APW_INIT?: boolean
    __abSounds: typeof sounds
    apostarConfetti: (opts?: ConfettiOptions) => void
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

  moduleRegistry.register('css-vars',           () => import('./modules/css-vars/index'))
  moduleRegistry.register('header-reskin',      () => import('./modules/header-reskin/index'))
  moduleRegistry.register('switch-toggle-hide', () => import('./modules/switch-toggle-hide/index'))

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
}
