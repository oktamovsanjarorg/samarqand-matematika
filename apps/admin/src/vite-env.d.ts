/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_DEV_INIT_DATA?: string;
  /** Mini App manzili (T-158: o'quvchi ko'rinishi); standart "/" */
  readonly VITE_MINIAPP_URL?: string;
}
