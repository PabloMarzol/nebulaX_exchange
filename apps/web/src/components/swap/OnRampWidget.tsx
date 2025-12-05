import { useState, useMemo, useEffect } from 'react';
import { ExternalLink, CreditCard, Building2, Loader2, ArrowRight } from 'lucide-react';
import { useAccount } from 'wagmi';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { useCreateOnRampOrder, useOnRampCurrencies, useOnRampCryptos, useOnRampQuote } from '../../hooks/useSwap';

export function OnRampWidget() {
  const { address, isConnected } = useAccount();
  const { data: currencies = [], isLoading: currenciesLoading } = useOnRampCurrencies();
  const { data: cryptos = [], isLoading: cryptosLoading } = useOnRampCryptos();
  const createOrder = useCreateOnRampOrder();

  const [fiatAmount, setFiatAmount] = useState('');
  const [fiatCurrency, setFiatCurrency] = useState('USD');
  const [cryptoCurrency, setCryptoCurrency] = useState('USDT');
  const [network, setNetwork] = useState('erc20');
  const [walletAddress, setWalletAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<1 | 2>(1); // 1 = Instant, 2 = Bank Transfer
  const [phoneNumber, setPhoneNumber] = useState('');

  // Auto-fill wallet address from connected wallet
  useEffect(() => {
    if (address && !walletAddress) {
      setWalletAddress(address);
    }
  }, [address, walletAddress]);

  // Derived state for Quote
  const quoteParams = useMemo(() => {
    const amount = parseFloat(fiatAmount);
    if (!amount || amount < 10) return null;
    return {
      fiatAmount: amount,
      fiatCurrency,
      cryptoCurrency,
      network: network.toLowerCase(),
    };
  }, [fiatAmount, fiatCurrency, cryptoCurrency, network]);

  const { data: quote, isLoading: isQuoteLoading, isError: isQuoteError } = useOnRampQuote(quoteParams);

  // Get networks for selected crypto
  const availableNetworks = useMemo(() => {
    const crypto = cryptos.find((c) => c.symbol === cryptoCurrency);
    return crypto?.networks || [];
  }, [cryptos, cryptoCurrency]);

  const handleCreateOrder = async () => {
    if (!fiatAmount || parseFloat(fiatAmount) < 10) {
      alert('Minimum amount is $10');
      return;
    }

    if (!walletAddress || !walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      alert('Please enter a valid wallet address');
      return;
    }

    // Open popup immediately to avoid blocker
    const width = 500;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    const popup = window.open(
      'about:blank',
      'OnRampPayment',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
    );

    if (!popup) {
      alert('Please allow popups to proceed with payment');
      return;
    }

    try {
      popup.document.write('<div style="display:flex;justify-content:center;align-items:center;height:100%;font-family:sans-serif;"><h3>Initiating Secure Payment...</h3></div>');

      const order = await createOrder.mutateAsync({
        fiatAmount: parseFloat(fiatAmount),
        fiatCurrency,
        cryptoCurrency,
        network,
        walletAddress,
        paymentMethod,
        phoneNumber: phoneNumber || undefined,
        language: 'en',
      });

      // Redirect popup to OnRamp
      popup.location.href = order.onrampUrl;

      // Monitor for closure or success via postMessage (handled separately)
      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          // Refresh history or check status if needed
        }
      }, 1000);

    } catch (error) {
      popup.close();
      console.error('Failed to create order:', error);
      alert(error instanceof Error ? error.message : 'Failed to create order');
    }
  };

  // Listener for popup success meessage
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin if possible, or check message structure
      if (event.data && (event.data.type === 'ONRAMP_COMPLETE' || event.data.type === 'ONRAMP_SUCCESS')) {
        console.log('OnRamp Success:', event.data);
        // Show success UI, confetti, etc.
        // For now just alert, ideally update UI state
        // You might want to invalidate queries here using queryClient if imported
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <Card className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Buy Crypto with Fiat</h2>
        <p className="text-sm text-muted-foreground">
          Purchase cryptocurrency using credit/debit card or bank transfer
        </p>
      </div>

      {/* Inputs */}
      <div className="space-y-4">
        {/* Row 1: Amount & Currency */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">You Pay</label>
            <div className="relative">
              <Input
                type="number"
                value={fiatAmount}
                onChange={(e) => setFiatAmount(e.target.value)}
                min="10"
                className="pr-20"
                placeholder="100"
              />
              <div className="absolute right-1 top-1 bottom-1">
                <select
                  value={fiatCurrency}
                  onChange={(e) => setFiatCurrency(e.target.value)}
                  className="h-full bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer"
                >
                  {currencies.map((c: any) => (
                    <option key={c.code} value={c.code}>{c.code}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">You Receive</label>
            <div className="relative">
               <select
                  value={cryptoCurrency}
                  onChange={(e) => {
                    setCryptoCurrency(e.target.value);
                    const newCrypto = cryptos.find((c: any) => c.symbol === e.target.value);
                    if (newCrypto && newCrypto.networks.length > 0) {
                      setNetwork(newCrypto.networks[0].code);
                    }
                  }}
                  className="w-full h-10 px-3 py-2 rounded-md border bg-background text-sm"
                >
                  {cryptos.map((c: any) => (
                    <option key={c.symbol} value={c.symbol}>{c.name} ({c.symbol})</option>
                  ))}
                </select>
            </div>
          </div>
        </div>

        {/* Network & Wallet */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Network</label>
          <select
            value={network}
            onChange={(e) => setNetwork(e.target.value)}
            className="w-full h-10 px-3 py-2 rounded-md border bg-background text-sm"
          >
            {availableNetworks.map((n: any) => (
              <option key={n.code} value={n.code}>{n.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Receiving Wallet Address</label>
          <Input
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="0x..."
            className="font-mono"
          />
          {isConnected && address && walletAddress !== address && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWalletAddress(address)}
              className="text-xs"
            >
              Use connected wallet
            </Button>
          )}
        </div>
        
        {/* Payment Method */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Payment Method</label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={paymentMethod === 1 ? 'default' : 'outline'}
              onClick={() => setPaymentMethod(1)}
              className="flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Instant (UPI/Card)
            </Button>
            <Button
              variant={paymentMethod === 2 ? 'default' : 'outline'}
              onClick={() => setPaymentMethod(2)}
              className="flex items-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              Bank Transfer
            </Button>
          </div>
        </div>
      </div>

      {/* Quote Display - Embedded! */}
      <div className="bg-muted/50 p-4 rounded-lg space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Estimated Quote</label>
        {isQuoteLoading && (
          <div className="flex items-center gap-2 text-sm text-blue-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Fetching real-time quote...
          </div>
        )}
        {quote && !isQuoteLoading && (
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between text-lg font-medium">
              <span>{quote.cryptoAmount.toFixed(6)} {quote.cryptoCurrency}</span>
              <span className="text-sm text-muted-foreground">≈ {quote.fiatAmount} {quote.fiatCurrency}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground border-t pt-2 mt-2">
              <span>Network Fee</span>
              <span>Included</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Rate</span>
              <span>1 {quote.cryptoCurrency} = {(quote.rate).toFixed(2)} {quote.fiatCurrency}</span>
            </div>
          </div>
        )}
        {!quote && !isQuoteLoading && (
           <div className="text-sm text-muted-foreground">Enter amount to see quote</div>
        )}
        {isQuoteError && (
           <div className="text-sm text-red-500">Failed to fetch quote. Please try again.</div>
        )}
      </div>

      {/* Button */}
      <Button
        size="lg"
        className="w-full flex items-center justify-center gap-2"
        onClick={handleCreateOrder}
        disabled={!quote || createOrder.isPending || !walletAddress}
      >
        {createOrder.isPending ? 'Processing...' : 'Proceed to Payment'}
        <ArrowRight className="w-4 h-4" />
      </Button>
      
      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
        <span>Powered by OnRamp Money</span>
        <div className="flex items-center gap-1">
          <ExternalLink className="w-3 h-3" />
          <span>Secure Popup</span>
        </div>
      </div>
    </Card>
  );
}
