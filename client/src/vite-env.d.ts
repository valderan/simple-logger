/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_LOGGER_VERSION?: string;
  readonly VITE_LOGGER_PAGE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
