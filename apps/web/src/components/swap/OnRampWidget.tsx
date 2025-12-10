import { useState, useMemo, useEffect } from 'react';
import { ExternalLink, CreditCard, Building2, Loader2, ArrowRight, Clock, CheckCircle, Shield, ShoppingCart, PartyPopper } from 'lucide-react';
import { useAccount } from 'wagmi';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { useCreateOnRampOrder, useOnRampCurrencies, useOnRampCryptos, useOnRampQuote, useOnRampOrder } from '../../hooks/useSwap';

// --- Sub-components (kept in same file for simplicity) ---

function PaymentInstructions({ 
  depositAddress, 
  endTime, 
  fiatAmount, 
  fiatCurrency, 
  paymentMethod 
}: { 
  depositAddress: string; 
  endTime: Date; 
  fiatAmount: number; 
  fiatCurrency: string; 
  paymentMethod: number;
}) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeLeft('Expired');
        clearInterval(timer);
      } else {
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  return (
    <div className="space-y-4">
      <div className="p-4 bg-muted rounded-lg border border-border">
        <h3 className="text-sm font-semibold mb-2">Payment Instructions</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground uppercase">Deposit Address</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 p-2 bg-background border rounded text-xs font-mono break-all">
                {depositAddress}
              </code>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigator.clipboard.writeText(depositAddress)}
              >
                Copy
              </Button>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div>
              <label className="text-xs text-muted-foreground uppercase">Amount to Send</label>
              <div className="font-bold text-lg">
                {fiatAmount} {fiatCurrency}
              </div>
            </div>
            
            <div className="text-right">
               <label className="text-xs text-muted-foreground uppercase">Time Remaining</label>
               <div className="flex items-center gap-1 justify-end text-yellow-600 font-mono">
                 <Clock className="w-4 h-4" />
                 {timeLeft}
               </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded text-center">
        Please make the transfer of exactly <b>{fiatAmount} {fiatCurrency}</b> to the address above via {paymentMethod === 1 ? 'Instant Transfer (UPI/Card)' : 'Bank Transfer'}.
      </div>
    </div>
  );
}

function OrderStatusTracker({ orderId, onKycRequired }: { orderId: string, onKycRequired: (url: string) => void }) {
  const { data: order, isLoading, refetch } = useOnRampOrder(orderId);

  // Poll for status
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [refetch]);

  // Check for KYC requirement or Status changes
  useEffect(() => {
    if (order) {
      const anyOrder = order as any; // Cast to access extra fields if types are strict
      // Check detailedStatus or root properties depending on API
      // Our modified route puts merged `providerStatus` and `kycNeeded` on root or detailedStatus.
      // Let's check both or look at the response structure we built in swap.routes.ts
      // In swap.routes.ts: order = { ...order, ...liveStatus ... }
      
      if (anyOrder.kycNeeded === 1 || anyOrder.kycNeeded === true) { // API usually uses 1/0
         // Trigger KYC flow
         if (anyOrder.onrampUrl) {
             onKycRequired(anyOrder.onrampUrl);
         }
      }
    }
  }, [order, onKycRequired]);

  if (isLoading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  if (!order) return null;

  const status = (order as any).providerStatus || order.status; // Use live status if available
  const statusNum = typeof status === 'number' ? status : -99; 
  
  // Status Mapping (approximate based on docs)
  // 0: Created/Waiting Payment
  // 1: Reference Claimed
  // 2: Deposit Secured
  // 3: Buying Crypto
  // 4: Completed
  // -3: Cancelled
  
  let label = 'Processing';
  let icon = Loader2;
  let color = 'text-blue-500';

  if (status === 'completed' || statusNum === 4 || statusNum === 15) {
      label = 'Completed';
      icon = PartyPopper;
      color = 'text-green-500';
  } else if (status === 'failed' || statusNum < 0) {
      label = 'Failed / Cancelled';
      icon = Shield; // or AlertCircle
      color = 'text-red-500';
  } else if (statusNum === 0) {
      label = 'Waiting for Payment';
      icon = Clock;
      color = 'text-yellow-500';
  } else if (statusNum === 1) {
      label = 'Payment Reference Claimed';
      icon = CheckCircle;
      color = 'text-blue-500';
  } else if (statusNum === 2) {
      label = 'Deposit Secured';
      icon = Shield;
      color = 'text-green-500';
  } else if (statusNum === 3) {
      label = 'Purchasing Crypto';
      icon = ShoppingCart;
      color = 'text-blue-500';
  }

  // If KYC needed, override status display?
  if ((order as any).kycNeeded === 1) {
      label = "Identity Verification Required";
      icon = Shield;
      color = "text-orange-500";
  }

  const StatusIcon = icon;

  return (
    <div className="p-4 border rounded-lg flex items-center gap-3">
        <div className={`p-2 rounded-full bg-muted ${color}`}>
            <StatusIcon className="w-5 h-5" />
        </div>
        <div className="flex-1">
            <div className="font-medium">{label}</div>
            <div className="text-xs text-muted-foreground">Order ID: {orderId}</div>
            {(order as any).txHash && (
                <div className="text-xs text-green-600 mt-1 truncate max-w-[200px]">
                    Tx: {(order as any).txHash}
                </div>
            )}
        </div>
    </div>
  );
}

// --- Main Widget ---

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

  // Local state for active order tracking
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeOrderData, setActiveOrderData] = useState<any | null>(null);
  const [showKycModal, setShowKycModal] = useState(false);
  const [kycUrl, setKycUrl] = useState('');

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

      // Instead of redirecting, set active state to show instructions
      setActiveOrderId(order.id);
      setActiveOrderData(order); // Contains depositAddress, endTime, etc. provided by backend logic

    } catch (error) {
      console.error('Failed to create order:', error);
      alert(error instanceof Error ? error.message : 'Failed to create order');
    }
  };

  const handleKycRequired = (url: string) => {
      setKycUrl(url);
      setShowKycModal(true);
  };

  const resetFlow = () => {
      setActiveOrderId(null);
      setActiveOrderData(null);
      setShowKycModal(false);
      setKycUrl('');
  };

  if (activeOrderId && activeOrderData) {
      return (
          <Card className="p-6 space-y-6">
              <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">Complete Payment</h2>
                  <Button variant="ghost" size="sm" onClick={resetFlow}>New Order</Button>
              </div>

              {/* Status Tracker */}
              <OrderStatusTracker orderId={activeOrderId} onKycRequired={handleKycRequired} />

              {/* KYC Modal / Alert */}
              {showKycModal && (
                  <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                      <h3 className="font-semibold text-orange-800 mb-2">Identity Verification Required</h3>
                      <p className="text-sm text-orange-700 mb-3">
                          To process this transaction, one-time KYC verification is required.
                      </p>
                      <Button 
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                        onClick={() => {
                            // Open KYC URL in popup
                            const width = 500;
                            const height = 700;
                            const left = window.screen.width / 2 - width / 2;
                            const top = window.screen.height / 2 - height / 2;
                            window.open(kycUrl, 'OnRampKYC', `width=${width},height=${height},left=${left},top=${top}`);
                        }}
                      >
                          Verify Identity Now <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                  </div>
              )}

              {/* Payment Instructions (Only if not completed and address available) */}
              {activeOrderData.depositAddress ? (
                  <PaymentInstructions
                    depositAddress={activeOrderData.depositAddress}
                    endTime={new Date(activeOrderData.endTime)}
                    fiatAmount={activeOrderData.fiatAmount}
                    fiatCurrency={activeOrderData.fiatCurrency}
                    paymentMethod={activeOrderData.paymentMethod}
                  />
              ) : activeOrderData.onrampUrl ? (
                  <div className="text-center space-y-4 p-6 bg-muted/30 rounded-lg">
                      <p className="text-muted-foreground">
                          Please complete your payment on the secure OnRamp Money page.
                      </p>
                      <Button
                          size="lg"
                          className="w-full"
                          onClick={() => window.location.href = activeOrderData.onrampUrl}
                      >
                          Continue to Payment <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                  </div>
              ) : null}
          </Card>
      );
  }

  return (
    <Card className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Buy Crypto</h2>
        <p className="text-sm text-muted-foreground">
          Purchase cryptocurrency directly (Low Fee)
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
              Instant
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
          <span>Whitelabel Integration</span>
        </div>
      </div>
    </Card>
  );
}
