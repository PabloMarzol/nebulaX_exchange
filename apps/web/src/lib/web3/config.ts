import { createConfig, http } from 'wagmi';
import { mainnet, polygon, arbitrum, bsc, base, optimism } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';
import { env } from '@/config/env';

export const wagmiConfig = createConfig({
  chains: [mainnet, polygon, arbitrum, bsc, base, optimism],
  connectors: [
    injected(),
    walletConnect({
      projectId: env.walletConnectProjectId,
    }),
    coinbaseWallet({
      appName: 'NebulAX Exchange',
    }),
  ],
  transports: {
    [mainnet.id]: http('https://eth.llamarpc.com'),
    [polygon.id]: http('https://polygon-rpc.com'),
    [arbitrum.id]: http('https://arb1.arbitrum.io/rpc'),
    [bsc.id]: http('https://bsc-dataseed.binance.org'),
    [base.id]: http('https://mainnet.base.org'),
    [optimism.id]: http('https://mainnet.optimism.io'),
  },
});
