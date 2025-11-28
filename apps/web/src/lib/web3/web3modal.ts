import { createWeb3Modal } from '@web3modal/wagmi'
import { wagmiConfig } from './config'
import { env } from '@/config/env'

// Create Web3Modal instance with onramp support
export const web3modal = createWeb3Modal({
  wagmiConfig,
  projectId: env.walletConnectProjectId,
  enableAnalytics: false,
  enableOnramp: true, // Enable meld.io onramp
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#3b82f6',
    '--w3m-border-radius-master': '12px',
  },
})

// Helper to open onramp modal directly
export function openOnrampModal() {
  if (web3modal) {
    web3modal.open({ view: 'OnRampProviders' })
  }
}
