export const env = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:3000',
  zeroXApiKey: import.meta.env.VITE_ZERO_X_API_KEY || '',
  walletConnectProjectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || '',
  stripePublicKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY || '',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;
