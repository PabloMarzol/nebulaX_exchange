import { ExternalLink, CreditCard } from 'lucide-react';
import { useAccount } from 'wagmi';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { openOnrampModal } from '../../lib/web3/web3modal';

export function Web3ModalOnRamp() {
  const { address, isConnected } = useAccount();

  const handleOpenOnramp = () => {
    openOnrampModal();
  };

  return (
    <Card className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Buy Crypto Instantly</h2>
        <p className="text-sm text-muted-foreground">
          Purchase cryptocurrency using credit/debit card via Meld.io
        </p>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <h4 className="text-sm font-semibold mb-2 text-blue-600 dark:text-blue-400">
          Powered by Meld.io & Web3Modal
        </h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Fast and secure onramp service</li>
          <li>• Multiple payment methods supported</li>
          <li>• Competitive exchange rates</li>
          <li>• Crypto delivered directly to your wallet</li>
        </ul>
      </div>

      {/* Connect Wallet Notice */}
      {!isConnected && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            Please connect your wallet first to use the onramp service.
          </p>
        </div>
      )}

      {/* Connected Wallet Info */}
      {isConnected && address && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-sm text-green-600 dark:text-green-400 mb-1">
            Wallet Connected
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            {address.slice(0, 6)}...{address.slice(-4)}
          </p>
        </div>
      )}

      {/* Buy Button */}
      <Button
        onClick={handleOpenOnramp}
        disabled={!isConnected}
        className="w-full flex items-center justify-center gap-2"
        size="lg"
      >
        <CreditCard className="w-5 h-5" />
        Open Onramp Widget
        <ExternalLink className="w-4 h-4" />
      </Button>

      {/* Advantages */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-500">50+</div>
          <div className="text-xs text-muted-foreground">Countries</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-500">100+</div>
          <div className="text-xs text-muted-foreground">Crypto Assets</div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Powered by Meld.io</span>
          <span>Secure & Trusted</span>
        </div>
      </div>
    </Card>
  );
}
