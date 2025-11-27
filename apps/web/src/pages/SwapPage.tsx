import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { Repeat, Coins, History, Sparkles, TrendingUp, Shield, ArrowRight, Wallet } from 'lucide-react';
import { useAccount } from 'wagmi';
import { CryptoSwap } from '../components/swap/CryptoSwap';
import { OnRampWidget } from '../components/swap/OnRampWidget';
import { AnimatedBackground } from '../components/swap/AnimatedBackground';
import { useSwapHistory, useOnRampOrders } from '../hooks/useSwap';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { formatDistanceToNow } from 'date-fns';

export function SwapPage() {
  const [activeTab, setActiveTab] = useState('crypto');
  const { data: swapHistory = [] } = useSwapHistory(5);
  const { data: onrampOrders = [] } = useOnRampOrders(5);
  const { address, isConnected } = useAccount();

  const handleConnect = () => {
    // Open Web3Modal - using the global modal
    if (window.w3mModal) {
      window.w3mModal.open();
    } else {
      // Fallback: trigger web component
      const button = document.querySelector('w3m-button');
      if (button) {
        (button as HTMLElement).click();
      }
    }
  };

  return (
    <>
      <AnimatedBackground />

      <div className="relative z-10 min-h-screen">
        {/* Wallet Connect Button - Fixed Top Right */}
        <div className="fixed top-6 right-6 z-50">
          {isConnected ? (
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-white hidden sm:inline">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
              <button
                onClick={handleConnect}
                className="p-2 hover:bg-white/10 rounded-lg transition-all"
              >
                <Wallet className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <Button
              onClick={handleConnect}
              className="bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 hover:opacity-90 text-white font-semibold px-6 py-3 rounded-2xl shadow-2xl"
            >
              <Wallet className="w-5 h-5 mr-2" />
              Connect Wallet
            </Button>
          )}
        </div>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          {/* Top Badge and Title */}
          <div className="text-center mb-12 opacity-0 animate-[fadeInUp_0.8s_ease-out_0.2s_forwards]">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 mb-6">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-white/80">Powered by 0x Protocol & OnRamp Money</span>
            </div>

            <h1 className="text-6xl md:text-7xl font-bold tracking-tight mb-4">
              <span className="block text-white">Swap Tokens</span>
              <span className="block bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Like a Pro
              </span>
            </h1>

            <p className="text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
              Access professional trading tools, best prices across 50+ DEXes, and instant fiat-to-crypto conversion
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto mb-16 opacity-0 animate-[fadeInUp_0.8s_ease-out_0.4s_forwards]">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">$24B+</div>
              <div className="text-sm text-white/60">24h Volume</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">6</div>
              <div className="text-sm text-white/60">Supported Chains</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">200+</div>
              <div className="text-sm text-white/60">Trading Pairs</div>
            </div>
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left Sidebar - Features */}
            <div className="lg:col-span-3 space-y-6 opacity-0 animate-[slideInLeft_0.8s_ease-out_0.5s_forwards]">
              <div className="glass-card p-6 rounded-3xl border border-white/10 backdrop-blur-xl bg-white/5 hover:bg-white/10 transition-all duration-500 group">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Best Prices</h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  Aggregated liquidity from 50+ DEXes ensures you always get the best rate
                </p>
              </div>

              <div className="glass-card p-6 rounded-3xl border border-white/10 backdrop-blur-xl bg-white/5 hover:bg-white/10 transition-all duration-500 group">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Gasless Swaps</h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  Save on transaction fees with gasless approval on supported chains
                </p>
              </div>

              <div className="glass-card p-6 rounded-3xl border border-white/10 backdrop-blur-xl bg-white/5 hover:bg-white/10 transition-all duration-500 group">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Secure Trading</h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  Non-custodial swaps - you always maintain control of your assets
                </p>
              </div>
            </div>

            {/* Center - Main Swap Card */}
            <div className="lg:col-span-6 opacity-0 animate-[fadeInUp_0.8s_ease-out_0.6s_forwards]">
              <div className="relative animate-[float_6s_ease-in-out_infinite]">
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-3xl blur-xl opacity-30"></div>

                {/* Main Card */}
                <div className="relative glass-card rounded-3xl backdrop-blur-xl border border-white/20 bg-white/5 shadow-2xl overflow-hidden">
                  {/* Card Header */}
                  <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h2 className="text-2xl font-bold text-white">Quick Swap</h2>
                        <p className="text-sm text-white/60">Instant crypto exchange</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="p-3 hover:bg-white/10 rounded-2xl transition-colors duration-300">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/60">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                            <path d="M3 3v5h5"></path>
                            <path d="M12 7v5l4 2"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
                    <div className="px-6 pt-6">
                      <Tabs.List className="flex gap-2 p-1 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                        <Tabs.Trigger
                          value="crypto"
                          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=inactive]:text-white/60 data-[state=inactive]:hover:bg-white/5"
                        >
                          <Repeat className="w-4 h-4" />
                          <span className="font-semibold">Crypto Swap</span>
                        </Tabs.Trigger>
                        <Tabs.Trigger
                          value="fiat"
                          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=inactive]:text-white/60 data-[state=inactive]:hover:bg-white/5"
                        >
                          <Coins className="w-4 h-4" />
                          <span className="font-semibold">Buy with Fiat</span>
                        </Tabs.Trigger>
                      </Tabs.List>
                    </div>

                    <Tabs.Content value="crypto" className="focus:outline-none p-6">
                      <CryptoSwap />
                    </Tabs.Content>

                    <Tabs.Content value="fiat" className="focus:outline-none p-6">
                      <OnRampWidget />
                    </Tabs.Content>
                  </Tabs.Root>
                </div>
              </div>
            </div>

            {/* Right Sidebar - Market Data & History */}
            <div className="lg:col-span-3 space-y-6 opacity-0 animate-[slideInRight_0.8s_ease-out_0.7s_forwards]">

              {/* Live Markets */}
              <div className="glass-card rounded-3xl p-6 backdrop-blur-xl border border-white/10 bg-white/5">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">Live Markets</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-white/60">Real-time</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 hover:bg-white/5 rounded-2xl transition-all duration-300 cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <span className="text-sm font-bold text-white">₿</span>
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">BTC/USD</p>
                        <p className="text-xs text-white/60">Bitcoin</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-white text-sm">$44,084</p>
                      <p className="text-xs text-green-400 flex items-center gap-1 justify-end">
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m18 15-6-6-6 6"></path>
                        </svg>
                        +2.45%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 hover:bg-white/5 rounded-2xl transition-all duration-300 cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <span className="text-sm font-bold text-white">Ξ</span>
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">ETH/USD</p>
                        <p className="text-xs text-white/60">Ethereum</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-white text-sm">$1,616</p>
                      <p className="text-xs text-red-400 flex items-center gap-1 justify-end">
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m6 9 6 6 6-6"></path>
                        </svg>
                        -1.23%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 hover:bg-white/5 rounded-2xl transition-all duration-300 cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <span className="text-sm font-bold text-white">◎</span>
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">SOL/USD</p>
                        <p className="text-xs text-white/60">Solana</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-white text-sm">$99.24</p>
                      <p className="text-xs text-green-400 flex items-center gap-1 justify-end">
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m18 15-6-6-6 6"></path>
                        </svg>
                        +5.67%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              {activeTab === 'crypto' && swapHistory.length > 0 && (
                <div className="glass-card rounded-3xl p-6 backdrop-blur-xl border border-white/10 bg-white/5">
                  <div className="flex items-center gap-2 mb-6">
                    <History className="w-5 h-5 text-white/60" />
                    <h3 className="text-lg font-semibold text-white">Recent Swaps</h3>
                  </div>
                  <div className="space-y-3">
                    {swapHistory.slice(0, 3).map((swap) => (
                      <div
                        key={swap.id}
                        className="p-3 border border-white/10 rounded-2xl hover:bg-white/5 transition-all duration-300 cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-white">
                            {swap.sellTokenSymbol} → {swap.buyTokenSymbol}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              swap.status === 'confirmed'
                                ? 'bg-green-500/20 text-green-400'
                                : swap.status === 'failed'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}
                          >
                            {swap.status}
                          </span>
                        </div>
                        <div className="text-xs text-white/60">
                          {formatDistanceToNow(new Date(swap.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'fiat' && onrampOrders.length > 0 && (
                <div className="glass-card rounded-3xl p-6 backdrop-blur-xl border border-white/10 bg-white/5">
                  <div className="flex items-center gap-2 mb-6">
                    <History className="w-5 h-5 text-white/60" />
                    <h3 className="text-lg font-semibold text-white">Recent Orders</h3>
                  </div>
                  <div className="space-y-3">
                    {onrampOrders.slice(0, 3).map((order) => (
                      <div
                        key={order.id}
                        className="p-3 border border-white/10 rounded-2xl hover:bg-white/5 transition-all duration-300 cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-white">
                            {order.fiatAmount} {order.fiatCurrency}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              order.status === 'completed'
                                ? 'bg-green-500/20 text-green-400'
                                : order.status === 'failed'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <div className="text-xs text-white/60">
                          {order.cryptoCurrency} • {order.network}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 opacity-0 animate-[fadeInUp_0.8s_ease-out_0.8s_forwards]">
            <div className="glass-card p-8 rounded-3xl backdrop-blur-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-500 group cursor-pointer">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <path d="M16 7h6v6"></path>
                  <path d="m22 7-8.5 8.5-5-5L2 17"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3 tracking-tight">Advanced Analytics</h3>
              <p className="text-white/60 leading-relaxed mb-6 text-sm">
                Professional-grade charts and market insights to make informed trading decisions
              </p>
              <div className="flex items-center gap-2 text-white font-medium hover:text-indigo-300 transition-colors duration-300 text-sm">
                Learn more <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            <div className="glass-card p-8 rounded-3xl backdrop-blur-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-500 group cursor-pointer">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3 tracking-tight">Multi-Chain Trading</h3>
              <p className="text-white/60 leading-relaxed mb-6 text-sm">
                Swap across 6 different chains with the best prices from aggregated liquidity
              </p>
              <div className="flex items-center gap-2 text-white font-medium hover:text-blue-300 transition-colors duration-300 text-sm">
                Learn more <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            <div className="glass-card p-8 rounded-3xl backdrop-blur-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-500 group cursor-pointer">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3 tracking-tight">Institutional Security</h3>
              <p className="text-white/60 leading-relaxed mb-6 text-sm">
                Non-custodial swaps with audited smart contracts and insurance coverage
              </p>
              <div className="flex items-center gap-2 text-white font-medium hover:text-orange-300 transition-colors duration-300 text-sm">
                Learn more <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(30px); filter: blur(10px); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0px); }
        }
        @keyframes slideInLeft {
          0% { opacity: 0; transform: translateX(-30px); filter: blur(5px); }
          100% { opacity: 1; transform: translateX(0); filter: blur(0px); }
        }
        @keyframes slideInRight {
          0% { opacity: 0; transform: translateX(30px); filter: blur(5px); }
          100% { opacity: 1; transform: translateX(0); filter: blur(0px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </>
  );
}
