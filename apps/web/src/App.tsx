import { QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { queryClient } from './lib/api/queryClient';
import { wagmiConfig } from './lib/web3/config';
import { AuthProvider } from './contexts/AuthContext';
import { LiveDataProvider } from './contexts/LiveDataContext';
import { Router } from './Router';
import './lib/web3/web3modal'; // Initialize Web3Modal

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LiveDataProvider>
            <Router />
          </LiveDataProvider>
        </AuthProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
