import { useState, useMemo } from 'react';
import { ExternalLink, CreditCard, Building2 } from 'lucide-react';
import { useAccount } from 'wagmi';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Select } from '../ui/select';
import { useCreateOnRampOrder, useOnRampCurrencies, useOnRampCryptos } from '../../hooks/useSwap';

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

  // Get networks for selected crypto
  const availableNetworks = useMemo(() => {
    const crypto = cryptos.find((c) => c.symbol === cryptoCurrency);
    return crypto?.networks || [];
  }, [cryptos, cryptoCurrency]);

  // Auto-fill wallet address from connected wallet
  useState(() => {
    if (address && !walletAddress) {
      setWalletAddress(address);
    }
  });

  const handleCreateOrder = async () => {
    if (!fiatAmount || parseFloat(fiatAmount) < 10) {
      alert('Minimum amount is $10');
      return;
    }

    if (!walletAddress || !walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      alert('Please enter a valid wallet address');
      return;
    }

    try {
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

      // Redirect to OnRamp Money
      window.location.href = order.onrampUrl;
    } catch (error) {
      console.error('Failed to create order:', error);
      alert(error instanceof Error ? error.message : 'Failed to create order');
    }
  };

  return (
    <Card className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Buy Crypto with Fiat</h2>
        <p className="text-sm text-muted-foreground">
          Purchase cryptocurrency using credit/debit card or bank transfer
        </p>
      </div>

      {/* Fiat Amount */}
      <div className="space-y-2">
        <label className="text-sm font-medium">You Pay</label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="100"
            value={fiatAmount}
            onChange={(e) => setFiatAmount(e.target.value)}
            className="flex-1"
            min="10"
            max="100000"
          />
          <select
            value={fiatCurrency}
            onChange={(e) => setFiatCurrency(e.target.value)}
            className="px-4 py-2 border rounded-md bg-background"
          >
            {currencies.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-muted-foreground">
          Min: $10 • Max: $100,000
        </div>
      </div>

      {/* Crypto Currency */}
      <div className="space-y-2">
        <label className="text-sm font-medium">You Receive</label>
        <select
          value={cryptoCurrency}
          onChange={(e) => {
            setCryptoCurrency(e.target.value);
            // Reset network when crypto changes
            const newCrypto = cryptos.find((c) => c.symbol === e.target.value);
            if (newCrypto && newCrypto.networks.length > 0) {
              setNetwork(newCrypto.networks[0].code);
            }
          }}
          className="w-full px-4 py-2 border rounded-md bg-background"
        >
          {cryptos.map((crypto) => (
            <option key={crypto.symbol} value={crypto.symbol}>
              {crypto.symbol} - {crypto.name}
            </option>
          ))}
        </select>
      </div>

      {/* Network */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Network</label>
        <select
          value={network}
          onChange={(e) => setNetwork(e.target.value)}
          className="w-full px-4 py-2 border rounded-md bg-background"
        >
          {availableNetworks.map((net) => (
            <option key={net.code} value={net.code}>
              {net.name}
            </option>
          ))}
        </select>
      </div>

      {/* Wallet Address */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Receiving Wallet Address</label>
        <Input
          type="text"
          placeholder="0x..."
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          className="font-mono text-sm"
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

      {/* Phone Number (Optional) */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Phone Number (Optional)</label>
        <Input
          type="tel"
          placeholder="+1234567890"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
        <div className="text-xs text-muted-foreground">
          For SMS notifications and order tracking
        </div>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <h4 className="text-sm font-semibold mb-2 text-blue-600 dark:text-blue-400">How it works</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• You'll be redirected to OnRamp Money for payment</li>
          <li>• Complete payment using your preferred method</li>
          <li>• Crypto will be sent directly to your wallet</li>
          <li>• Track your order status in your account</li>
        </ul>
      </div>

      {/* Continue Button */}
      <Button
        onClick={handleCreateOrder}
        disabled={createOrder.isPending || !fiatAmount || !walletAddress}
        className="w-full flex items-center justify-center gap-2"
        size="lg"
      >
        {createOrder.isPending ? (
          'Creating order...'
        ) : (
          <>
            Continue to OnRamp Money
            <ExternalLink className="w-4 h-4" />
          </>
        )}
      </Button>

      {/* Footer */}
      <div className="pt-4 border-t">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Powered by OnRamp Money</span>
          <span>Secure & Trusted</span>
        </div>
      </div>
    </Card>
  );
}
