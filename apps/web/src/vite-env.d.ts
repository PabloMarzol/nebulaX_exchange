/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_WALLET_CONNECT_PROJECT_ID: string;
  readonly VITE_ZERO_X_API_KEY: string;
  readonly VITE_STRIPE_PUBLIC_KEY: string;
  readonly VITE_STRIPE_LIVE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Web3Modal global type
interface Window {
  w3mModal?: {
    open: () => void;
    close: () => void;
  };
}
