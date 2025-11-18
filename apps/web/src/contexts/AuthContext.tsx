import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/config/constants';

interface User {
  id: string;
  walletAddress: string;
  email?: string;
  username?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const login = async () => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsLoading(true);

      // Get nonce from server
      const { data: nonceData } = await apiClient.get(API_ENDPOINTS.AUTH.NONCE, {
        params: { address },
      });

      // Create message to sign
      const message = `Sign this message to authenticate with NebulAX Exchange\n\nWallet: ${address}\nNonce: ${nonceData.nonce}\nTimestamp: ${Date.now()}`;

      // Sign message
      const signature = await signMessageAsync({ message });

      // Verify signature and get token
      const { data: authData } = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, {
        address,
        message,
        signature,
      });

      // Store token
      localStorage.setItem('auth_token', authData.token);

      // Set user
      setUser(authData.user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    apiClient.post(API_ENDPOINTS.AUTH.LOGOUT).catch(console.error);
  };

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const { data } = await apiClient.get(API_ENDPOINTS.AUTH.VERIFY);
        setUser(data.user);
      } catch (error) {
        console.error('Auth verification failed:', error);
        localStorage.removeItem('auth_token');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
