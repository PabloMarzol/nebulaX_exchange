import { Link } from 'wouter';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useAuth } from '@/contexts/AuthContext';
import { truncateAddress } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function Header() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { user, isAuthenticated, login, logout } = useAuth();

  const handleConnect = async () => {
    if (!isConnected) {
      // Connect wallet first
      connect({ connector: connectors[0] });
    } else if (!isAuthenticated) {
      // Then authenticate
      await login();
    }
  };

  const handleDisconnect = () => {
    logout();
    disconnect();
  };

  return (
    <header className="border-b border-border bg-background w-full">
      <div className="flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary">NebulaX</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center space-x-6">
            <Link href="/trading" className="text-sm font-medium hover:text-primary transition-colors">
              Trading
            </Link>
            <Link href="/swap" className="text-sm font-medium hover:text-primary transition-colors">
              Swap
            </Link>
            <Link href="/portfolio" className="text-sm font-medium hover:text-primary transition-colors">
              Portfolio
            </Link>
          </nav>

          {/* Wallet Connect */}
          <div>
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-muted-foreground">
                  {truncateAddress(user.walletAddress)}
                </span>
                <Button onClick={handleDisconnect} variant="outline" size="sm">
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button onClick={handleConnect} size="sm">
                {!isConnected ? 'Connect Wallet' : 'Sign In'}
              </Button>
            )}
          </div>
      </div>
    </header>
  );
}
