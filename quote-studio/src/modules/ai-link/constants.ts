/** AI 链接代理地址（可被环境变量覆盖）。 */
export const DEFAULT_PROXY_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_PROXY_URL) ||
  'http://localhost:8787';
