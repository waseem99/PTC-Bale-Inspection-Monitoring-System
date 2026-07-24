/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly VITE_DATA_MODE?: 'mock' | 'live';
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_REQUEST_TIMEOUT_MS?: string;
  readonly VITE_MOCK_LATENCY_MS?: string;
  readonly VITE_MOCK_FAILURE_RATE?: string;
  readonly VITE_DEMO_PASSWORD?: string;
  readonly VITE_ALLOW_DEMO_CREDENTIALS?: string;
  readonly VITE_BUILD_VERSION?: string;
  readonly VITE_ENVIRONMENT_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
