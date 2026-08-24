import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import { notify } from './shared/notify';
import { vFocusNext } from './shared/directives/focus-next';
import './styles/tailwind.css';

const app = createApp(App);

// 全局注册 Enter 聚焦串联指令（#2：报价行连续录入）
app.directive('focus-next', vFocusNext);

// 全局异常兜底：任何渲染期或 setup 期未捕获错误都会暴露给用户（而非静默白屏）。
app.config.errorHandler = (err: unknown, _instance, info: string) => {
  console.error('[app error]', err, info);
  notify('error', '程序发生错误：' + (err instanceof Error ? err.message : String(err)));
};

app.use(createPinia()).use(router).mount('#app');
