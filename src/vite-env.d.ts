/// <reference types="vite/client" />

declare module '*.scss?inline' {
  const content: string
  export default content
}

interface SmarticoSDK {
  getUserID?: () => string | undefined
  dp?: (action: string) => void
}

interface Window {
  _smartico?: SmarticoSDK
  apostarMoney: (opts?: {
    duration?: number
    billCount?: number
    colors?: Array<{ body: string; border: string; text: string }>
  }) => void
}
