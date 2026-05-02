declare module 'react' {
  export function createElement(...args: any[]): any
  export const Fragment: any
}

declare namespace JSX {
  interface IntrinsicElements {
    [elementName: string]: any
  }
}
