import { useParams } from 'wouter';

export function TradingPage() {
  const params = useParams<{ symbol: string }>();
  const symbol = params?.symbol || 'BTC/USDT';

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Trading - {symbol}</h1>
      <div className="grid grid-cols-12 gap-4">
        {/* Chart area */}
        <div className="col-span-8 border rounded-lg p-4 min-h-[500px]">
          <p className="text-muted-foreground">Trading Chart Component (To be implemented)</p>
        </div>

        {/* Order book and trading panel */}
        <div className="col-span-4 space-y-4">
          <div className="border rounded-lg p-4">
            <p className="text-muted-foreground">Order Book (To be implemented)</p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-muted-foreground">Trading Panel (To be implemented)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
