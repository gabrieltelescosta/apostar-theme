import { loadGlobalConfig, loadPageConfig } from './config'
import { moduleRegistry } from './module-registry'
import { enableDebug, logger } from './logger'
import { eventBus } from './event-bus'
import { injectStyles } from '../utils/dom'
import type { ModuleEntry } from '../types/config'
import type { WidgetModule } from '../types/modules'
import globalStyles from '../styles/global.scss?inline'

const activeModules: WidgetModule[] = []

function setupTrigger(entry: ModuleEntry, instance: WidgetModule, target: HTMLElement) {
  const trigger = entry.trigger
  if (!trigger) return false

  const activate = () => {
    instance.render(target)
    activeModules.push(instance)
    eventBus.emit('module:rendered', entry.type)
  }

  switch (trigger.event) {
    case 'time':
      setTimeout(activate, trigger.delay ?? 3000)
      break
    case 'scroll':
      {
        const threshold = trigger.threshold ?? 50
        const handler = () => {
          const scrollPct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
          if (scrollPct >= threshold) {
            window.removeEventListener('scroll', handler)
            activate()
          }
        }
        window.addEventListener('scroll', handler, { passive: true })
      }
      break
    case 'exit-intent':
      {
        const handler = (e: MouseEvent) => {
          if (e.clientY <= 0) {
            document.removeEventListener('mouseleave', handler)
            if (trigger.delay) {
              setTimeout(activate, trigger.delay)
            } else {
              activate()
            }
          }
        }
        document.addEventListener('mouseleave', handler)
      }
      break
    case 'click':
      if (trigger.selector) {
        document.querySelector(trigger.selector)?.addEventListener('click', activate, { once: true })
      }
      break
  }

  return true
}

function resolveTarget(entry: ModuleEntry): HTMLElement | null {
  if (!entry.target) {
    return document.body
  }
  return document.querySelector<HTMLElement>(entry.target)
}

function insertAtPosition(target: HTMLElement, wrapper: HTMLElement, position: string) {
  switch (position) {
    case 'replace':
      target.innerHTML = ''
      target.appendChild(wrapper)
      break
    case 'before':
      target.parentElement?.insertBefore(wrapper, target)
      break
    case 'after':
      target.parentElement?.insertBefore(wrapper, target.nextSibling)
      break
    case 'prepend':
      target.insertBefore(wrapper, target.firstChild)
      break
    case 'append':
    default:
      target.appendChild(wrapper)
      break
  }
}

async function loadAndRenderModule(entry: ModuleEntry) {
  const factory = moduleRegistry.get(entry.type)
  if (!factory) {
    logger.warn(`No module registered for type "${entry.type}".`)
    return
  }

  try {
    const { default: ModuleClass } = await factory()
    const instance = new ModuleClass()
    await instance.init(entry)

    if (instance.selfManaged) {
      activeModules.push(instance)
      eventBus.emit('module:rendered', entry.type)
      logger.info(`Self-managed module "${entry.type}" initialized.`)
      return
    }

    const target = resolveTarget(entry)
    if (!target) {
      logger.warn(`Target "${entry.target}" not found for module "${entry.type}".`)
      return
    }

    const wrapper = document.createElement('div')
    wrapper.setAttribute('data-apw-module', entry.type)

    const hasTrigger = setupTrigger(entry, instance, wrapper)

    if (!hasTrigger) {
      instance.render(wrapper)
      activeModules.push(instance)
      eventBus.emit('module:rendered', entry.type)
    }

    insertAtPosition(target, wrapper, entry.position ?? 'append')
    logger.info(`Module "${entry.type}" mounted.`)
  } catch (err) {
    logger.error(`Failed to load module "${entry.type}":`, err)
  }
}

export async function bootstrap() {
  alert('[APW] bootstrap started')

  const globalCfg = await loadGlobalConfig()
  alert(`[APW] globalCfg loaded: ${JSON.stringify(globalCfg).slice(0, 100)}`)
  enableDebug(globalCfg.debug)

  injectStyles(globalStyles, 'apw-global-styles')

  const pageCfg = await loadPageConfig()
  alert(`[APW] pageCfg: ${pageCfg.modules.length} modules`)

  if (pageCfg.modules.length === 0) {
    alert('[APW] No modules found, stopping')
    return
  }

  await Promise.allSettled(pageCfg.modules.map(loadAndRenderModule))

  alert('[APW] All modules rendered')
  eventBus.emit('widget:ready')
}

export function destroyAll() {
  activeModules.forEach((m) => {
    try {
      m.destroy()
    } catch (err) {
      logger.error(`Error destroying module "${m.name}":`, err)
    }
  })
  activeModules.length = 0
  eventBus.clear()
  logger.info('All modules destroyed.')
}
