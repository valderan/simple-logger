/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly LOGGER_VERSION?: string;
  readonly LOGGER_PAGE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
