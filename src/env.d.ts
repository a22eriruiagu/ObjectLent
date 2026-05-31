/// <reference types="vite/client" />

/**
 * Declaració de tipus per a mòduls Vue
 * Permet a TypeScript reconèixer les importacions de fitxers .vue
 */
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
