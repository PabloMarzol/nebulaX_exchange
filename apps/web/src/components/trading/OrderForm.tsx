import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { usePlaceOrder } from '../../hooks/useMarketData';
import { formatNumber } from '../../lib/utils';

interface OrderFormProps {
  symbol: string;
  currentPrice?: number;
}

export function OrderForm({ symbol, currentPrice }: OrderFormProps) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [leverage, setLeverage] = useState('1');

  const placeOrderMutation = usePlaceOrder();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await placeOrderMutation.mutateAsync({
        symbol,
        side,
        type: orderType,
        price: orderType === 'limit' ? parseFloat(price) : undefined,
        quantity: parseFloat(quantity),
        leverage: parseInt(leverage),
      });

      // Reset form on success
      setPrice('');
      setQuantity('');

      alert('Order placed successfully!');
    } catch (error: any) {
      alert(`Failed to place order: ${error.message}`);
    }
  };

  const estimatedTotal = () => {
    const qty = parseFloat(quantity) || 0;
    const px = orderType === 'limit' ? (parseFloat(price) || 0) : (currentPrice || 0);
    return qty * px;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Place Order</CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs value={side} onValueChange={(value) => setSide(value as 'buy' | 'sell')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="buy" className="data-[state=active]:bg-green-600">
              Buy
            </TabsTrigger>
            <TabsTrigger value="sell" className="data-[state=active]:bg-red-600">
              Sell
            </TabsTrigger>
          </TabsList>

          <TabsContent value={side} className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Order Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Order Type</label>
                <Select value={orderType} onValueChange={(value) => setOrderType(value as 'limit' | 'market')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="limit">Limit</SelectItem>
                    <SelectItem value="market">Market</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Price */}
              {orderType === 'limit' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">
                    Price (USD)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* Market Price Display */}
              {orderType === 'market' && currentPrice && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">
                    Market Price (USD)
                  </label>
                  <div className="px-3 py-2 bg-zinc-900 rounded-md text-zinc-300 font-mono">
                    {formatNumber(currentPrice, 2)}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">
                  Quantity
                </label>
                <Input
                  type="number"
                  step="0.0001"
                  placeholder="0.0000"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>

              {/* Leverage */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">
                  Leverage
                </label>
                <Select value={leverage} onValueChange={setLeverage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 5, 10, 20, 50].map((lev) => (
                      <SelectItem key={lev} value={lev.toString()}>
                        {lev}x
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Order Summary */}
              <div className="space-y-2 p-3 bg-zinc-900/50 rounded-md">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Estimated Total</span>
                  <span className="text-zinc-300 font-mono">
                    ${formatNumber(estimatedTotal(), 2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Leverage</span>
                  <span className="text-zinc-300">{leverage}x</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Required Margin</span>
                  <span className="text-zinc-300 font-mono">
                    ${formatNumber(estimatedTotal() / parseInt(leverage), 2)}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className={`w-full ${
                  side === 'buy'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
                disabled={placeOrderMutation.isPending}
              >
                {placeOrderMutation.isPending
                  ? 'Placing Order...'
                  : `${side === 'buy' ? 'Buy' : 'Sell'} ${symbol}`}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
