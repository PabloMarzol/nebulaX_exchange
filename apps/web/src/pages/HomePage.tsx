export function HomePage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to NebulAX Exchange</h1>
        <p className="text-xl text-muted-foreground">
          Decentralized Cryptocurrency Trading Platform
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <div className="p-6 border rounded-lg">
          <h3 className="text-xl font-semibold mb-2">Trade</h3>
          <p className="text-muted-foreground">
            Trade cryptocurrencies with advanced charting and order types
          </p>
        </div>

        <div className="p-6 border rounded-lg">
          <h3 className="text-xl font-semibold mb-2">Swap</h3>
          <p className="text-muted-foreground">
            Swap tokens across multiple chains with the best rates
          </p>
        </div>

        <div className="p-6 border rounded-lg">
          <h3 className="text-xl font-semibold mb-2">AI Assistant</h3>
          <p className="text-muted-foreground">
            Get AI-powered trading insights and market analysis
          </p>
        </div>
      </div>
    </div>
  );
}
