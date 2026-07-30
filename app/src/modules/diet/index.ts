/**
 * 饮食模块公开 API。
 *
 * 模块外部只允许从这里 import，不要深入 engine/ data/ 内部路径。
 * 保持这一条纪律，将来把整个 modules/diet 目录搬成 @pdash/diet 独立包时，
 * 只需要把 import 路径从 '@/modules/diet' 换成包名，业务代码零改动。
 */
export * from './types';
export * from './engine';
export { ING_DB } from './data/ing-db';
export { dietRoutes } from './routes';
export { useDietStore } from './store/diet-store';

/** localStorage 键名，与 v1.0 单文件版一致，不可更改 */
export const DIET_DB_KEY = 'pdash_v4';
