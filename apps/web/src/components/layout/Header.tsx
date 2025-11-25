import { Link } from 'wouter';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { LogOut, Wallet, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Header() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const handleConnect = () => {
    if (!isConnected) {
      connect({ connector: connectors[0] });
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  // Truncate address for display (0x1234...5678)
  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="border-b border-primary/20 sticky top-0 z-50 backdrop-blur-xl bg-background/70">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <a className="flex items-center gap-2 group">
              <div className="relative">
                <Sparkles className="w-6 h-6 text-primary group-hover:rotate-12 transition-transform duration-300" />
                <div className="absolute inset-0 bg-primary/20 blur-xl group-hover:bg-primary/30 transition-all" />
              </div>
              <span className="text-2xl lg:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] animate-gradient">
                Nebula X
              </span>
            </a>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            <Link href="/trading">
              <a className="relative px-6 py-2 text-base font-medium text-foreground/80 hover:text-foreground transition-colors group">
                <span className="relative z-10">Trading</span>
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 rounded-lg transition-all duration-300" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-primary to-accent group-hover:w-full transition-all duration-300" />
              </a>
            </Link>
            <Link href="/swap">
              <a className="relative px-6 py-2 text-base font-medium text-foreground/80 hover:text-foreground transition-colors group">
                <span className="relative z-10">Swap</span>
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 rounded-lg transition-all duration-300" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-primary to-accent group-hover:w-full transition-all duration-300" />
              </a>
            </Link>
            <Link href="/portfolio">
              <a className="relative px-6 py-2 text-base font-medium text-foreground/80 hover:text-foreground transition-colors group">
                <span className="relative z-10">Portfolio</span>
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 rounded-lg transition-all duration-300" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-primary to-accent group-hover:w-full transition-all duration-300" />
              </a>
            </Link>
          </nav>

          {/* Wallet Connection */}
          <div className="flex items-center gap-3">
            {isConnected && address ? (
              <>
                {/* Wallet Address Display */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/30 bg-primary/5 backdrop-blur-sm">
                  <Wallet className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    {truncateAddress(address)}
                  </span>
                </div>

                {/* Disconnect Button */}
                <button
                  onClick={handleDisconnect}
                  className="p-2 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all group"
                  title="Disconnect Wallet"
                >
                  <LogOut className="w-5 h-5 text-foreground/70 group-hover:text-primary transition-colors" />
                </button>
              </>
            ) : (
              <Button
                onClick={handleConnect}
                className="relative px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(167,139,250,0.4)]"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Connect Wallet
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-0 hover:opacity-100 transition-opacity" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}