import { useState, useEffect, useMemo } from 'react';
import { ArrowDownUp, Info, Settings, ChevronDown, Loader2, AlertCircle, Wallet } from 'lucide-react';
import { useAccount, useChainId, useSignTypedData, useBalance, useSendTransaction, useWaitForTransactionReceipt, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits, type Address, erc20Abi } from 'viem';
import { mainnet, polygon, arbitrum, bsc, base, optimism } from 'viem/chains';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { TokenSelector } from './TokenSelector';
import { useTokens } from '../../hooks/useSwap';
import { swapApi } from '../../lib/api/swapApi';
import { useAuth } from '../../contexts/AuthContext';

// Chain names mapping
const CHAIN_NAMES: Record<number, string> = {
  [mainnet.id]: 'Ethereum',
  [polygon.id]: 'Polygon',
  [arbitrum.id]: 'Arbitrum',
  [bsc.id]: 'BNB Chain',
  [base.id]: 'Base',
  [optimism.id]: 'Optimism',
};

export function CryptoSwap() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { signTypedDataAsync } = useSignTypedData();
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();
  const { isAuthenticated, login } = useAuth();
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
  const [txStatus, setTxStatus] = useState<'idle' | 'signing' | 'approving' | 'submitting' | 'polling' | 'success' | 'error'>('idle');
  const [tradeHash, setTradeHash] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  // Wait for transaction receipt
  const { isLoading: isWaitingTx, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
  });

  // Effect to handle transaction success
  useEffect(() => {
    if (isTxSuccess) {
      setTxStatus('success');
      setSellAmount('');
      setQuote(null);
    }
  }, [isTxSuccess]);

  // Native token address used by 0x Protocol
  const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

  // Check if token is a native token
  const isNativeToken = (address?: string) => {
    return address?.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase();
  };

  // Get balance for sell token
  // For native tokens, pass undefined to useBalance; for ERC-20 tokens, pass the address
  const { data: sellTokenBalance } = useBalance({
    address,
    token: sellToken && !isNativeToken(sellToken.address) ? sellToken.address : undefined,
    chainId,
    query: {
      enabled: !!sellToken && !!address,
    },
  });

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

        // Check if both tokens support gasless swaps
        const bothSupportGasless = sellToken.supportsGasless !== false && buyToken.supportsGasless !== false;

        let quoteResponse;
        if (bothSupportGasless) {
          // Use gasless API for ERC-20 tokens that support gasless
          quoteResponse = await swapApi.getGaslessPrice({
            chainId,
            sellToken: sellToken.address,
            buyToken: buyToken.address,
            sellAmount: parsedAmount.toString(),
            taker: address,
            slippageBps,
          });
        } else {
          // Fall back to regular price API for native tokens or tokens that don't support gasless
          quoteResponse = await swapApi.getPrice({
            chainId,
            sellToken: sellToken.address,
            buyToken: buyToken.address,
            sellAmount: parsedAmount.toString(),
          });
        }

        setQuote(quoteResponse);
        setQuoteExpiry(Date.now() + 30000); // 30 seconds from now
      } catch (error) {
        console.error('Quote error:', error);

        // Parse error message for better user feedback
        let errorMessage = 'Failed to fetch quote';
        if (error instanceof Error) {
          if (error.message.includes('no Route matched') || error.message.includes('no liquidity')) {
            errorMessage = `No trading route available for ${sellToken.symbol}/${buyToken.symbol}. This token pair may have insufficient liquidity. Try a different token or pair.`;
          } else if (error.message.includes('INSUFFICIENT_ASSET_LIQUIDITY')) {
            errorMessage = `Insufficient liquidity for ${sellToken.symbol}. Try a smaller amount or different token.`;
          } else {
            errorMessage = error.message;
          }
        }

        setQuoteError(errorMessage);
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
    if (!quote || !buyToken || !quote.buyAmount) return '';
    try {
      return formatUnits(BigInt(quote.buyAmount), buyToken.decimals);
    } catch (error) {
      console.error('Error formatting buy amount:', error);
      return '';
    }
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

  // Handle max button - set to full balance
  const handleMaxAmount = () => {
    if (sellTokenBalance) {
      const formattedBalance = formatUnits(sellTokenBalance.value, sellToken?.decimals || 18);
      setSellAmount(formattedBalance);
    }
  };

  // Check if gasless swap is supported for current token pair
  const isGaslessSupported = useMemo(() => {
    return sellToken?.supportsGasless !== false && buyToken?.supportsGasless !== false;
  }, [sellToken, buyToken]);

  // Handle swap execution
  const handleExecuteSwap = async () => {
    console.log('handleExecuteSwap initiated');
    if (!quote || !sellToken || !buyToken || !address) {
      console.error('Missing required fields:', { quote: !!quote, sellToken: !!sellToken, buyToken: !!buyToken, address: !!address });
      return;
    }
    
    // Token is optional now as swap endpoints are public
    // if (!token) { ... }

    try {
      console.log('Starting swap execution...');
      setIsSubmitting(true);
      const parsedAmount = parseUnits(sellAmount, sellToken.decimals);

      // Gasless Flow
      if (isGaslessSupported) {
        setTxStatus('signing');

        // Get firm quote with EIP-712 data
        const firmQuote = await swapApi.getGaslessQuote(
          {
            chainId,
            sellToken: sellToken.address,
            buyToken: buyToken.address,
            sellAmount: parsedAmount.toString(),
            taker: address,
            slippageBps,
          },
          token || ''
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
          token || ''
        );
  
        setTradeHash(result.tradeHash);
        setTxStatus('polling');
  
        // Poll for status
        const pollInterval = setInterval(async () => {
          try {
            const status = await swapApi.getGaslessStatus(
              { chainId, tradeHash: result.tradeHash },
              token || ''
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
      }
      // Standard Swap Flow (Non-Gasless)
      else {
        setTxStatus('submitting');
        
        // Get firm quote for standard swap
        const firmQuote = await swapApi.getQuote(
          {
            chainId,
            sellToken: sellToken.address,
            buyToken: buyToken.address,
            sellAmount: parsedAmount.toString(),
            takerAddress: address,
            slippagePercentage: slippageBps / 10000,
          },
          token || ''
        );

        // Check allowance
        if (firmQuote.issues?.allowance) {
          setTxStatus('approving');
          const { spender } = firmQuote.issues.allowance;
          
          // Approve token
          const hash = await writeContractAsync({
            address: sellToken.address,
            abi: erc20Abi,
            functionName: 'approve',
            args: [spender as Address, parsedAmount],
          });
          
          // Wait for approval to be mined
          if (publicClient) {
            await publicClient.waitForTransactionReceipt({ hash });
          }
        }

        setTxStatus('submitting');
        
        if (!firmQuote.transaction) {
          throw new Error('No transaction data in quote');
        }

        // Send swap transaction
        console.log('Sending swap transaction...', firmQuote.transaction);
        const hash = await sendTransactionAsync({
          to: firmQuote.transaction.to as Address,
          data: firmQuote.transaction.data as `0x${string}`,
          value: BigInt(firmQuote.transaction.value),
          ...(firmQuote.transaction.gas ? { gas: BigInt(firmQuote.transaction.gas) } : {}),
          ...(firmQuote.transaction.gasPrice ? { gasPrice: BigInt(firmQuote.transaction.gasPrice) } : {}),
          chainId,
          account: address,
        });

        console.log('Swap transaction sent:', hash);
        setTxHash(hash);
        setTxStatus('polling'); // Reusing polling status for waiting for receipt
      }
    } catch (error) {
      console.error('Swap error:', error);
      
      // Check for user rejection
      const isUserRejection = (err: any) => {
        if (!err) return false;
        // Check for standard EIP-1193 rejection code
        if (err.code === 4001) return true;
        // Check for common error messages
        const message = err.message || err.toString();
        return (
          message.includes('User rejected') ||
          message.includes('User denied') ||
          message.includes('Action cancelled')
        );
      };

      if (isUserRejection(error)) {
        setTxStatus('idle');
        setQuoteError('Swap cancelled by user');
        // Clear the error after 3 seconds
        setTimeout(() => {
          setQuoteError(null);
        }, 3000);
      } else {
        setTxStatus('error');
        setQuoteError(error instanceof Error ? error.message : 'Swap failed');
      }
    } finally {
      if (txStatus !== 'polling') {
        setIsSubmitting(false);
      }
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
      {/* Network Display */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-white/80">Network:</span>
          <span className="text-sm font-semibold text-white">{CHAIN_NAMES[chainId] || `Chain ${chainId}`}</span>
        </div>
        {address && (
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-white/60" />
            <span className="text-sm text-white/60">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          </div>
        )}
      </div>

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
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-white/80">You Pay</label>
          {sellTokenBalance && sellToken && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60">
                Balance: {parseFloat(formatUnits(sellTokenBalance.value, sellToken.decimals)).toFixed(6)} {sellToken.symbol}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMaxAmount}
                className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300"
              >
                MAX
              </Button>
            </div>
          )}
        </div>
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
        {isSubmitting || (txStatus === 'polling' && !isTxSuccess) ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            {txStatus === 'signing' && 'Sign in Wallet...'}
            {txStatus === 'approving' && 'Approving Token...'}
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
