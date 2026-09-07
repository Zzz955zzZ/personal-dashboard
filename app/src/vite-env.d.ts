/// <reference types="vite/client" />

/** 构建时由 vite.config.ts 注入的版本戳（git short sha），用于运行时检测新版本 */
declare const __APP_BUILD_ID__: string;

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}
