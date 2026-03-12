export function qs<T extends HTMLElement = HTMLElement>(
  selector: string,
  parent: ParentNode = document,
): T | null {
  return parent.querySelector<T>(selector)
}

export function qsa<T extends HTMLElement = HTMLElement>(
  selector: string,
  parent: ParentNode = document,
): T[] {
  return Array.from(parent.querySelectorAll<T>(selector))
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>,
  children?: (string | Node)[],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  if (attrs) {
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value))
  }
  if (children) {
    children.forEach((child) => {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child))
      } else {
        el.appendChild(child)
      }
    })
  }
  return el
}

export function injectStyles(css: string, id?: string) {
  if (id && document.getElementById(id)) return

  const style = document.createElement('style')
  style.textContent = css
  if (id) style.id = id
  document.head.appendChild(style)
}

export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((result, str, i) => {
    const value = values[i] ?? ''
    const escaped =
      typeof value === 'string'
        ? value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        : String(value)
    return result + str + escaped
  }, '')
}

export function htmlUnsafe(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((result, str, i) => result + str + String(values[i] ?? ''), '')
}
