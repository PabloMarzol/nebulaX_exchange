import { useState } from 'react';
import { Search } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import type { Token } from '../../lib/api/swapApi';

interface TokenSelectorProps {
  tokens: Token[];
  selectedToken: Token | null;
  onSelectToken: (token: Token) => void;
  label?: string;
}

export function TokenSelector({ tokens, selectedToken, onSelectToken, label }: TokenSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTokens = tokens.filter(
    (token) =>
      token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectToken = (token: Token) => {
    onSelectToken(token);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="outline" className="w-full justify-between">
          {selectedToken ? (
            <div className="flex items-center gap-2">
              {selectedToken.logoURI && (
                <img src={selectedToken.logoURI} alt={selectedToken.symbol} className="w-6 h-6 rounded-full" />
              )}
              <span className="font-semibold">{selectedToken.symbol}</span>
              <span className="text-xs text-muted-foreground">{selectedToken.name}</span>
            </div>
          ) : (
            <span>{label || 'Select Token'}</span>
          )}
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background rounded-lg shadow-lg z-50 max-h-[80vh] overflow-hidden">
          <div className="p-4 border-b">
            <Dialog.Title className="text-lg font-semibold mb-4">Select Token</Dialog.Title>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, symbol or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-[400px] p-2">
            {filteredTokens.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">No tokens found</div>
            ) : (
              filteredTokens.map((token) => (
                <button
                  key={token.address}
                  onClick={() => handleSelectToken(token)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  {token.logoURI && (
                    <img src={token.logoURI} alt={token.symbol} className="w-8 h-8 rounded-full" />
                  )}
                  <div className="flex-1 text-left">
                    <div className="font-semibold">{token.symbol}</div>
                    <div className="text-xs text-muted-foreground">{token.name}</div>
                  </div>
                  {selectedToken?.address === token.address && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </button>
              ))
            )}
          </div>

          <div className="p-4 border-t">
            <Dialog.Close asChild>
              <Button variant="outline" className="w-full">
                Cancel
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
