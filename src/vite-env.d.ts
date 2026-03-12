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
}
