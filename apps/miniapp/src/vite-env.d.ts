/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_DEV_INIT_DATA?: string;
  /** Admin panel manzili (T-158); standart "/admin" (bir domen) */
  readonly VITE_ADMIN_URL?: string;
}
