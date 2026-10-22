/// <reference types="vite/client" />

/** Versión del panel (package.json + commit), la inyecta vite.config.ts. */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Sitio público de reservas (enlace "Ver sitio de reservas" del menú). */
  readonly VITE_PUBLIC_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
