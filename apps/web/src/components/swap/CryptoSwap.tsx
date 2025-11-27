import { useState, useEffect, useMemo } from 'react';
import { ArrowDownUp, Info, Settings, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { useAccount, useChainId, useSignTypedData } from 'wagmi';
import { parseUnits, formatUnits, type Address } from 'viem';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { TokenSelector } from './TokenSelector';
import { useTokens } from '../../hooks/useSwap';
import { swapApi } from '../../lib/api/swapApi';
import { useAuth } from '../../contexts/AuthContext';

export function CryptoSwap() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { signTypedDataAsync } = useSignTypedData();
  const { isAuthenticated } = useAuth();
  const token = isAuthenticated ? localStorage.getItem('auth_token') : null;

  const { data: tokens = [], isLoading: tokensLoading } = useTokens(chainId);

  // Token selection
  const [sellToken, setSellToken] = useState<typeof tokens[0] | null>(null);
  const [buyToken, setBuyToken] = useState<typeof tokens[0] | null>(null);

  // Amount inputs
  const [sellAmount, setSellAmount] = useState('');
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);

  // Quote state
  const [quote, setQuote] = useState<any>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteExpiry, setQuoteExpiry] = useState<number | null>(null);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [slippageBps, setSlippageBps] = useState(100); // 1% = 100 bps

  // Transaction state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txStatus, setTxStatus] = useState<'idle' | 'signing' | 'submitting' | 'polling' | 'success' | 'error'>('idle');
  const [tradeHash, setTradeHash] = useState<string | null>(null);

  // Initialize with default tokens
  useEffect(() => {
    if (tokens.length > 0 && !sellToken && !buyToken) {
      setSellToken(tokens[0]);
      if (tokens.length > 1) setBuyToken(tokens[1]);
    }
  }, [tokens, sellToken, buyToken]);

  // Fetch quote when amount or tokens change
  useEffect(() => {
    const fetchQuote = async () => {
      if (!sellToken || !buyToken || !sellAmount || parseFloat(sellAmount) <= 0) {
        setQuote(null);
        return;
      }

      try {
        setIsFetchingQuote(true);
        setQuoteError(null);

        const parsedAmount = parseUnits(sellAmount, sellToken.decimals);

        const quoteResponse = await swapApi.getGaslessPrice({
          chainId,
          sellToken: sellToken.address,
          buyToken: buyToken.address,
          sellAmount: parsedAmount.toString(),
          taker: address,
          slippageBps,
        });

        setQuote(quoteResponse);
        setQuoteExpiry(Date.now() + 30000); // 30 seconds from now
      } catch (error) {
        console.error('Quote error:', error);
        setQuoteError(error instanceof Error ? error.message : 'Failed to fetch quote');
        setQuote(null);
      } finally {
        setIsFetchingQuote(false);
      }
    };

    // Debounce quote fetching
    const timer = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timer);
  }, [sellToken, buyToken, sellAmount, chainId, address, slippageBps]);

  // Format buy amount from quote
  const buyAmount = useMemo(() => {
    if (!quote || !buyToken) return '';
    return formatUnits(BigInt(quote.buyAmount), buyToken.decimals);
  }, [quote, buyToken]);

  // Handle token swap
  const handleSwapTokens = () => {
    const tempSell = sellToken;
    const tempBuy = buyToken;
    setSellToken(tempBuy);
    setBuyToken(tempSell);
    setSellAmount('');
    setQuote(null);
  };

  // Handle swap execution with gasless flow
  const handleExecuteSwap = async () => {
    if (!quote || !sellToken || !buyToken || !address || !token) return;

    try {
      setIsSubmitting(true);
      setTxStatus('signing');

      // Get firm quote with EIP-712 data
      const parsedAmount = parseUnits(sellAmount, sellToken.decimals);
      const firmQuote = await swapApi.getGaslessQuote(
        {
          chainId,
          sellToken: sellToken.address,
          buyToken: buyToken.address,
          sellAmount: parsedAmount.toString(),
          taker: address,
          slippageBps,
        },
        token
      );

      // Sign approval if needed
      let approvalSignature = null;
      if (firmQuote.approval) {
        const approvalSig = await signTypedDataAsync({
          domain: firmQuote.approval.eip712.domain,
          types: firmQuote.approval.eip712.types,
          primaryType: firmQuote.approval.eip712.primaryType,
          message: firmQuote.approval.eip712.message,
        });

        // Split signature
        const r = approvalSig.slice(0, 66);
        const s = '0x' + approvalSig.slice(66, 130);
        const v = parseInt(approvalSig.slice(130, 132), 16);

        approvalSignature = {
          type: firmQuote.approval.type,
          hash: firmQuote.approval.hash,
          eip712: firmQuote.approval.eip712,
          signature: { v, r, s, signatureType: 2 },
        };
      }

      // Sign trade
      const tradeSig = await signTypedDataAsync({
        domain: firmQuote.trade.eip712.domain,
        types: firmQuote.trade.eip712.types,
        primaryType: firmQuote.trade.eip712.primaryType,
        message: firmQuote.trade.eip712.message,
      });

      // Split trade signature
      const tradeR = tradeSig.slice(0, 66);
      const tradeS = '0x' + tradeSig.slice(66, 130);
      const tradeV = parseInt(tradeSig.slice(130, 132), 16);

      const tradeSignature = {
        type: firmQuote.trade.type,
        hash: firmQuote.trade.hash,
        eip712: firmQuote.trade.eip712,
        signature: { v: tradeV, r: tradeR, s: tradeS, signatureType: 2 },
      };

      // Submit to 0x
      setTxStatus('submitting');
      const result = await swapApi.submitGaslessSwap(
        {
          chainId,
          ...(approvalSignature && { approval: approvalSignature }),
          trade: tradeSignature,
        },
        token
      );

      setTradeHash(result.tradeHash);
      setTxStatus('polling');

      // Poll for status
      const pollInterval = setInterval(async () => {
        try {
          const status = await swapApi.getGaslessStatus(
            { chainId, tradeHash: result.tradeHash },
            token
          );

          if (status.status === 'confirmed') {
            setTxStatus('success');
            clearInterval(pollInterval);
            // Reset form
            setSellAmount('');
            setQuote(null);
          } else if (status.status === 'succeeded') {
            // Wait for confirmation
            console.log('Transaction succeeded, waiting for confirmation...');
          }
        } catch (error) {
          console.error('Status polling error:', error);
        }
      }, 3000);

      // Stop polling after 5 minutes
      setTimeout(() => clearInterval(pollInterval), 300000);
    } catch (error) {
      console.error('Swap error:', error);
      setTxStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate time remaining for quote
  const timeRemaining = useMemo(() => {
    if (!quoteExpiry) return null;
    const remaining = Math.max(0, Math.floor((quoteExpiry - Date.now()) / 1000));
    return remaining;
  }, [quoteExpiry]);

  // Auto-refresh quote when expired
  useEffect(() => {
    if (timeRemaining === 0 && quote) {
      // Quote expired, trigger refresh
      setSellAmount((prev) => prev); // Trigger re-fetch
    }
  }, [timeRemaining, quote]);

  if (!isConnected) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 mb-4">
          <AlertCircle className="w-4 h-4 text-yellow-400" />
          <span className="text-sm text-white/80">Wallet Not Connected</span>
        </div>
        <p className="text-white/60">Please connect your wallet to start swapping</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Settings */}
      {showSettings && (
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <h3 className="font-semibold text-white text-sm">Swap Settings</h3>
          <div className="space-y-2">
            <label className="text-xs text-white/60">Slippage Tolerance</label>
            <div className="flex gap-2">
              {[30, 50, 100].map((bps) => (
                <Button
                  key={bps}
                  variant={slippageBps === bps ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSlippageBps(bps)}
                  className="flex-1"
                >
                  {(bps / 100).toFixed(1)}%
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sell Token */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-white/80">You Pay</label>
        <div className="relative">
          <Input
            type="number"
            placeholder="0.0"
            value={sellAmount}
            onChange={(e) => setSellAmount(e.target.value)}
            className="h-16 text-2xl font-semibold bg-white/5 border-white/10 text-white pr-32"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {sellToken && (
              <TokenSelector
                tokens={tokens}
                selectedToken={sellToken}
                onSelectToken={setSellToken}
                label="Select token"
              />
            )}
          </div>
        </div>
      </div>

      {/* Swap Button */}
      <div className="flex justify-center -my-2">
        <button
          onClick={handleSwapTokens}
          className="p-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 transition-all"
        >
          <ArrowDownUp className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Buy Token */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-white/80">You Receive</label>
        <div className="relative">
          <Input
            type="text"
            placeholder="0.0"
            value={isFetchingQuote ? 'Fetching...' : buyAmount}
            disabled
            className="h-16 text-2xl font-semibold bg-white/5 border-white/10 text-white pr-32"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {buyToken && (
              <TokenSelector
                tokens={tokens}
                selectedToken={buyToken}
                onSelectToken={setBuyToken}
                label="Select token"
              />
            )}
          </div>
        </div>
      </div>

      {/* Quote Info */}
      {quote && (
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Rate</span>
            <span className="text-white font-medium">
              1 {sellToken?.symbol} ≈ {(parseFloat(buyAmount) / parseFloat(sellAmount || '1')).toFixed(6)}{' '}
              {buyToken?.symbol}
            </span>
          </div>
          {quote.fees?.gasFee && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Gas Fee</span>
              <span className="text-white font-medium">
                ~${(parseFloat(quote.fees.gasFee.amount) / 1e6).toFixed(2)}
              </span>
            </div>
          )}
          {timeRemaining !== null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Quote Expires In</span>
              <span className={`font-medium ${timeRemaining < 10 ? 'text-orange-400' : 'text-white'}`}>
                {timeRemaining}s
              </span>
            </div>
          )}
          {quote.route?.fills && quote.route.fills.length > 0 && (
            <div className="pt-2 border-t border-white/10">
              <div className="flex items-center gap-1 text-xs text-white/60 mb-2">
                <Info className="w-3 h-3" />
                <span>Route</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {quote.route.fills.map((fill: any, i: number) => (
                  <span key={i} className="text-xs px-2 py-1 bg-white/5 rounded-lg text-white/80">
                    {fill.source} ({(parseFloat(fill.proportionBps) / 100).toFixed(0)}%)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {quoteError && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">{quoteError}</p>
        </div>
      )}

      {/* Action Button */}
      <Button
        onClick={handleExecuteSwap}
        disabled={!quote || isFetchingQuote || isSubmitting || !sellAmount || parseFloat(sellAmount) <= 0}
        className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 hover:opacity-90 transition-opacity"
      >
        {isSubmitting ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            {txStatus === 'signing' && 'Sign in Wallet...'}
            {txStatus === 'submitting' && 'Submitting Swap...'}
            {txStatus === 'polling' && 'Confirming Transaction...'}
          </div>
        ) : isFetchingQuote ? (
          'Fetching Quote...'
        ) : txStatus === 'success' ? (
          '✓ Swap Successful!'
        ) : (
          'Swap'
        )}
      </Button>

      {/* Transaction Success */}
      {txStatus === 'success' && tradeHash && (
        <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20">
          <p className="text-sm text-green-400 font-medium mb-2">✓ Swap completed successfully!</p>
          <p className="text-xs text-white/60 break-all">Trade Hash: {tradeHash}</p>
        </div>
      )}

      {/* Settings Toggle */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="w-full flex items-center justify-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
      >
        <Settings className="w-4 h-4" />
        {showSettings ? 'Hide Settings' : 'Advanced Settings'}
      </button>
    </div>
  );
}
