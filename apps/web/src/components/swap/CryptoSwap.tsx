import { useState, useEffect, useMemo } from 'react';
import { ArrowDownUp, Info, Settings } from 'lucide-react';
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits, type Address } from 'viem';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { TokenSelector } from './TokenSelector';
import { useTokens, useSwapQuote, useRecordSwap, useUpdateSwapStatus } from '../../hooks/useSwap';

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export function CryptoSwap() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: tokens = [], isLoading: tokensLoading } = useTokens(chainId);

  const [sellToken, setSellToken] = useState<typeof tokens[0] | null>(null);
  const [buyToken, setBuyToken] = useState<typeof tokens[0] | null>(null);
  const [sellAmount, setSellAmount] = useState('');
  const [slippage, setSlippage] = useState(0.01); // 1%
  const [showSettings, setShowSettings] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);

  const recordSwap = useRecordSwap();
  const updateSwapStatus = useUpdateSwapStatus();
  const { writeContract, data: txHash, isPending: isWriting } = useWriteContract();
  const { isLoading: isTxPending, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Prepare quote params
  const quoteParams = useMemo(() => {
    if (!sellToken || !buyToken || !sellAmount || !address) return null;

    try {
      const parsedAmount = parseUnits(sellAmount, sellToken.decimals);

      return {
        sellToken: sellToken.address,
        buyToken: buyToken.address,
        sellAmount: parsedAmount.toString(),
        takerAddress: address,
        slippagePercentage: slippage,
        chainId,
      };
    } catch {
      return null;
    }
  }, [sellToken, buyToken, sellAmount, address, slippage, chainId]);

  // Fetch quote
  const { data: quote, isLoading: quoteLoading } = useSwapQuote(quoteParams, !!quoteParams);

  // Format buy amount
  const buyAmount = useMemo(() => {
    if (!quote || !buyToken) return '';
    return formatUnits(BigInt(quote.buyAmount), buyToken.decimals);
  }, [quote, buyToken]);

  // Handle token swap
  const handleSwap = () => {
    setSellToken(buyToken);
    setBuyToken(sellToken);
    setSellAmount('');
  };

  // Handle approval
  const handleApprove = async () => {
    if (!quote || !sellToken) return;

    try {
      writeContract({
        address: sellToken.address,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [quote.allowanceTarget, BigInt(quote.sellAmount)],
      });
    } catch (error) {
      console.error('Approval error:', error);
    }
  };

  // Handle execute swap
  const handleExecuteSwap = async () => {
    if (!quote || !sellToken || !buyToken || !address) return;

    try {
      // Record swap in database
      const order = await recordSwap.mutateAsync({
        sellToken: sellToken.address,
        buyToken: buyToken.address,
        sellAmount: quote.sellAmount,
        buyAmount: quote.buyAmount,
        sellTokenSymbol: sellToken.symbol,
        buyTokenSymbol: buyToken.symbol,
        chainId,
        price: quote.price,
        guaranteedPrice: quote.guaranteedPrice,
        slippage,
        status: 'pending',
      });

      // Execute transaction
      writeContract(
        {
          address: quote.to,
          abi: [],
          functionName: '',
          data: quote.data,
          value: BigInt(quote.value),
        },
        {
          onSuccess: (hash) => {
            updateSwapStatus.mutate({
              orderId: order.id,
              data: { status: 'submitted', txHash: hash },
            });
          },
          onError: (error) => {
            updateSwapStatus.mutate({
              orderId: order.id,
              data: { status: 'failed', error: error.message },
            });
          },
        }
      );
    } catch (error) {
      console.error('Swap error:', error);
    }
  };

  // Update status when transaction is confirmed
  useEffect(() => {
    if (isTxSuccess && txHash) {
      // Transaction confirmed, update status in database
      // Note: You would need to track the order ID to update it
    }
  }, [isTxSuccess, txHash]);

  // Initialize with default tokens
  useEffect(() => {
    if (tokens.length > 0 && !sellToken && !buyToken) {
      setSellToken(tokens[0]);
      if (tokens.length > 1) setBuyToken(tokens[1]);
    }
  }, [tokens, sellToken, buyToken]);

  if (!isConnected) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <p>Please connect your wallet to swap tokens</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Swap Tokens</h2>
        <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}>
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="p-4 border rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Slippage Tolerance</span>
            <div className="flex gap-2">
              {[0.001, 0.005, 0.01].map((value) => (
                <Button
                  key={value}
                  variant={slippage === value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSlippage(value)}
                >
                  {(value * 100).toFixed(1)}%
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sell Token */}
      <div className="space-y-2">
        <label className="text-sm font-medium">You Pay</label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="0.0"
            value={sellAmount}
            onChange={(e) => setSellAmount(e.target.value)}
            className="flex-1"
          />
          <TokenSelector
            tokens={tokens}
            selectedToken={sellToken}
            onSelectToken={setSellToken}
            label="Select token"
          />
        </div>
      </div>

      {/* Swap Button */}
      <div className="flex justify-center">
        <Button variant="ghost" size="sm" onClick={handleSwap} className="rounded-full">
          <ArrowDownUp className="w-4 h-4" />
        </Button>
      </div>

      {/* Buy Token */}
      <div className="space-y-2">
        <label className="text-sm font-medium">You Receive</label>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="0.0"
            value={buyAmount}
            disabled
            className="flex-1"
          />
          <TokenSelector tokens={tokens} selectedToken={buyToken} onSelectToken={setBuyToken} label="Select token" />
        </div>
      </div>

      {/* Quote Info */}
      {quote && (
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Rate</span>
            <span className="font-medium">
              1 {sellToken?.symbol} = {parseFloat(quote.price).toFixed(6)} {buyToken?.symbol}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Price Impact</span>
            <span className={`font-medium ${parseFloat(quote.estimatedPriceImpact) > 5 ? 'text-destructive' : ''}`}>
              {parseFloat(quote.estimatedPriceImpact).toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Gas Fee</span>
            <span className="font-medium">${(parseFloat(formatUnits(BigInt(quote.gasPrice) * BigInt(quote.estimatedGas), 18)) * 2000).toFixed(2)}</span>
          </div>
          {quote.sources && quote.sources.length > 0 && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Info className="w-3 h-3" />
                <span>Route</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {quote.sources.map((source, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-background rounded">
                    {source.name} ({(parseFloat(source.proportion) * 100).toFixed(0)}%)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Button */}
      {needsApproval ? (
        <Button onClick={handleApprove} disabled={isWriting} className="w-full">
          {isWriting ? 'Approving...' : `Approve ${sellToken?.symbol}`}
        </Button>
      ) : (
        <Button
          onClick={handleExecuteSwap}
          disabled={!quote || quoteLoading || isWriting || isTxPending}
          className="w-full"
        >
          {quoteLoading
            ? 'Getting quote...'
            : isWriting || isTxPending
            ? 'Swapping...'
            : isTxSuccess
            ? 'Swap successful!'
            : 'Swap'}
        </Button>
      )}

      {isTxSuccess && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-sm text-green-600 dark:text-green-400">Swap completed successfully!</p>
        </div>
      )}
    </Card>
  );
}
