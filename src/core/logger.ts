let debugEnabled = false

export function enableDebug(enabled: boolean) {
  debugEnabled = enabled
}

function prefix() {
  return `[APW ${new Date().toISOString().slice(11, 23)}]`
}

export const logger = {
  info(...args: unknown[]) {
    if (debugEnabled) console.log(prefix(), ...args)
  },
  warn(...args: unknown[]) {
    if (debugEnabled) console.warn(prefix(), ...args)
  },
  error(...args: unknown[]) {
    console.error(prefix(), ...args)
  },
}
