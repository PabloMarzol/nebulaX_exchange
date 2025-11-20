import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useOpenOrders, useCancelOrder } from '../../hooks/useMarketData';
import { formatNumber } from '../../lib/utils';
import { X } from 'lucide-react';

interface OrderManagementProps {
  symbol?: string;
}

export function OrderManagement({ symbol }: OrderManagementProps) {
  const { data: orders, isLoading } = useOpenOrders(symbol);
  const cancelOrderMutation = useCancelOrder();

  const handleCancelOrder = async (orderId: string, orderSymbol: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    try {
      await cancelOrderMutation.mutateAsync({ orderId, symbol: orderSymbol });
      alert('Order cancelled successfully!');
    } catch (error: any) {
      alert(`Failed to cancel order: ${error.message}`);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Open Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-zinc-400 py-4">Loading orders...</div>
        </CardContent>
      </Card>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Open Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-zinc-400 py-4">No open orders</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Open Orders</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-900 border-b border-zinc-800">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-400">Symbol</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-400">Side</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-400">Type</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-zinc-400">Price</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-zinc-400">Quantity</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-zinc-400">Filled</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-zinc-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const filledPercent = (parseFloat(order.filledQuantity) / parseFloat(order.quantity)) * 100;

                return (
                  <tr key={order.id} className="border-b border-zinc-800 hover:bg-zinc-900/50">
                    <td className="px-4 py-3 text-sm font-medium">{order.symbol}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          order.side === 'buy'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {order.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-300">{order.type.toUpperCase()}</td>
                    <td className="px-4 py-3 text-right text-sm font-mono">
                      {order.price ? `$${formatNumber(parseFloat(order.price), 2)}` : 'Market'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-mono">
                      {formatNumber(parseFloat(order.quantity), 4)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-sm font-mono">{formatNumber(parseFloat(order.filledQuantity), 4)}</div>
                      <div className="text-xs text-zinc-500">{filledPercent.toFixed(1)}%</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelOrder(order.orderId, order.symbol)}
                        disabled={cancelOrderMutation.isPending}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
