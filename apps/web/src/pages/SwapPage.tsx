import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { Repeat, Coins, History, Sparkles, TrendingUp, Shield } from 'lucide-react';
import { CryptoSwap } from '../components/swap/CryptoSwap';
import { OnRampWidget } from '../components/swap/OnRampWidget';
import { AnimatedBackground } from '../components/swap/AnimatedBackground';
import { useSwapHistory, useOnRampOrders } from '../hooks/useSwap';
import { Card } from '../components/ui/card';
import { formatDistanceToNow } from 'date-fns';

export function SwapPage() {
  const [activeTab, setActiveTab] = useState('crypto');
  const { data: swapHistory = [] } = useSwapHistory(5);
  const { data: onrampOrders = [] } = useOnRampOrders(5);

  return (
    <>
      <AnimatedBackground />

      <div className="container mx-auto px-4 py-8 max-w-7xl relative">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Powered by 0x Protocol & OnRamp Money</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Swap Tokens
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Trade tokens instantly across multiple chains or buy crypto with fiat currency
          </p>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 max-w-3xl mx-auto">
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
              <div className="flex items-center gap-2 justify-center mb-2">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                <span className="text-2xl font-bold">6</span>
              </div>
              <p className="text-sm text-muted-foreground">Supported Chains</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
              <div className="flex items-center gap-2 justify-center mb-2">
                <Coins className="w-5 h-5 text-blue-400" />
                <span className="text-2xl font-bold">9</span>
              </div>
              <p className="text-sm text-muted-foreground">Fiat Currencies</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20">
              <div className="flex items-center gap-2 justify-center mb-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                <span className="text-2xl font-bold">Gasless</span>
              </div>
              <p className="text-sm text-muted-foreground">Swap Options</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Swap Interface */}
          <div className="lg:col-span-2">
            <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
              <Tabs.List className="flex gap-2 p-1 rounded-xl bg-muted/50 backdrop-blur-sm border border-border/50 mb-6">
                <Tabs.Trigger
                  value="crypto"
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=inactive]:hover:bg-muted"
                >
                  <Repeat className="w-4 h-4" />
                  <span className="font-semibold">Crypto Swap</span>
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="fiat"
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=inactive]:hover:bg-muted"
                >
                  <Coins className="w-4 h-4" />
                  <span className="font-semibold">Buy with Fiat</span>
                </Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="crypto" className="focus:outline-none">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur opacity-20" />
                  <div className="relative">
                    <CryptoSwap />
                  </div>
                </div>
              </Tabs.Content>

              <Tabs.Content value="fiat" className="focus:outline-none">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-20" />
                  <div className="relative">
                    <OnRampWidget />
                  </div>
                </div>
              </Tabs.Content>
            </Tabs.Root>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Swaps */}
            {activeTab === 'crypto' && swapHistory.length > 0 && (
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl blur" />
                <Card className="relative backdrop-blur-sm bg-background/80 border-border/50 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <History className="w-4 h-4 text-purple-400" />
                    </div>
                    <h3 className="font-semibold">Recent Swaps</h3>
                  </div>
                  <div className="space-y-3">
                    {swapHistory.map((swap) => (
                      <div
                        key={swap.id}
                        className="p-3 border border-border/50 rounded-lg hover:bg-accent/50 transition-all hover:border-primary/30 backdrop-blur-sm"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">
                            {swap.sellTokenSymbol} → {swap.buyTokenSymbol}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              swap.status === 'confirmed'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : swap.status === 'failed'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            }`}
                          >
                            {swap.status}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(swap.createdAt), { addSuffix: true })}
                        </div>
                        {swap.txHash && (
                          <a
                            href={`https://etherscan.io/tx/${swap.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors"
                          >
                            View on Explorer →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* Recent OnRamp Orders */}
            {activeTab === 'fiat' && onrampOrders.length > 0 && (
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl blur" />
                <Card className="relative backdrop-blur-sm bg-background/80 border-border/50 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <History className="w-4 h-4 text-blue-400" />
                    </div>
                    <h3 className="font-semibold">Recent Orders</h3>
                  </div>
                  <div className="space-y-3">
                    {onrampOrders.map((order) => (
                      <div
                        key={order.id}
                        className="p-3 border border-border/50 rounded-lg hover:bg-accent/50 transition-all hover:border-primary/30 backdrop-blur-sm"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">
                            {order.fiatAmount} {order.fiatCurrency}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              order.status === 'completed'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : order.status === 'failed'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {order.cryptoCurrency} • {order.network}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* Info Card */}
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-cyan-500/20 rounded-2xl blur" />
              <Card className="relative backdrop-blur-sm bg-background/80 border-border/50 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">
                    {activeTab === 'crypto' ? 'Crypto Swap Features' : 'Fiat Onramp Features'}
                  </h3>
                </div>
                <ul className="space-y-3">
                  {activeTab === 'crypto' ? (
                    <>
                      <li className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5" />
                        <span className="text-muted-foreground">Powered by 0x Protocol aggregation</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                        <span className="text-muted-foreground">Best prices across 50+ DEXes</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5" />
                        <span className="text-muted-foreground">Gasless swaps on supported chains</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5" />
                        <span className="text-muted-foreground">Multi-chain support (6 networks)</span>
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                        <span className="text-muted-foreground">Powered by OnRamp Money</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5" />
                        <span className="text-muted-foreground">9+ fiat currencies supported</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                        <span className="text-muted-foreground">Instant UPI & bank transfers</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5" />
                        <span className="text-muted-foreground">Crypto sent to your wallet</span>
                      </li>
                    </>
                  )}
                </ul>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
