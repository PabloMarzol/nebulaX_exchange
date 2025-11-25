import { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Sparkles,
  Zap,
  Shield,
  TrendingUp,
  Cpu,
  Layers,
  ArrowRight,
  BarChart3,
  Lock,
  Globe,
  Rocket,
  Star
} from 'lucide-react';
import { Link } from 'wouter';

export function HomePage() {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative overflow-hidden">
      {/* UnicornStudio Animated Background - Fixed throughout page */}
      <div
        data-us-project="hk4GkXoEfSX9qZozoFL6"
        className="fixed w-full h-full left-0 top-0 -z-10"
      />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4">
        {/* Gradient Overlays for Nebula Effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background -z-10" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-[128px] -z-10" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[128px] -z-10" />

        <motion.div
          style={{ opacity, scale }}
          className="text-center max-w-5xl mx-auto space-y-8 py-20"
        >
          {/* Floating Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/50 bg-primary/10 backdrop-blur-sm"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary">Powered by Decentralized Technology</span>
          </motion.div>

          {/* Main Heading */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-6"
          >
            <h1 className="text-6xl md:text-8xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] animate-gradient">
              NebulAX
            </h1>
            <p className="text-3xl md:text-5xl font-semibold text-foreground/90">
              Trade Beyond the Stars
            </p>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Experience the future of decentralized trading with AI-powered insights,
              lightning-fast execution, and cosmic-level security
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8"
          >
            <Link href="/trading">
              <a className="group relative px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold text-lg overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(167,139,250,0.5)]">
                <span className="relative z-10 flex items-center gap-2">
                  Start Trading
                  <Rocket className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            </Link>
            <button className="px-8 py-4 border-2 border-primary/50 text-foreground rounded-lg font-semibold text-lg backdrop-blur-sm hover:bg-primary/10 transition-all hover:scale-105 hover:border-primary">
              Explore Features
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="grid grid-cols-3 gap-8 pt-16 max-w-3xl mx-auto"
          >
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-primary">$2.5B+</div>
              <div className="text-sm text-muted-foreground">Trading Volume</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-primary">50K+</div>
              <div className="text-sm text-muted-foreground">Active Traders</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-primary">0.01%</div>
              <div className="text-sm text-muted-foreground">Trading Fees</div>
            </div>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 border-2 border-primary/50 rounded-full flex justify-center pt-2"
          >
            <motion.div className="w-1.5 h-3 bg-primary rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="relative py-32 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-background to-background/50 -z-10" />

        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16 space-y-4"
          >
            <h2 className="text-5xl md:text-6xl font-bold">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                Cosmic Features
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to navigate the cryptocurrency universe
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative p-8 rounded-2xl border border-primary/20 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all hover:shadow-[0_0_30px_rgba(167,139,250,0.2)] hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative space-y-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>

                  <h3 className="text-2xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="relative py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16 space-y-4"
          >
            <h2 className="text-5xl md:text-6xl font-bold">
              Built on
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent"> Stellar Tech</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Enterprise-grade infrastructure meets cutting-edge blockchain technology
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              {techStack.map((tech, index) => (
                <motion.div
                  key={tech.name}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex items-start gap-4 p-6 rounded-xl border border-primary/20 bg-card/30 backdrop-blur-sm hover:border-primary/50 transition-all"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <tech.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold mb-2">{tech.name}</h4>
                    <p className="text-muted-foreground">{tech.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="relative aspect-square rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-accent/10 backdrop-blur-sm overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      className="w-64 h-64 border-4 border-primary/30 border-t-primary rounded-full"
                    />
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 w-64 h-64 border-4 border-accent/30 border-b-accent rounded-full"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Star className="w-20 h-20 text-primary" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="relative py-32 px-4">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[200px] -z-10" />

        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16 space-y-4"
          >
            <h2 className="text-5xl md:text-6xl font-bold">
              Why Choose
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent"> NebulAX</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative p-8 rounded-2xl border border-primary/20 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-semibold">{benefit.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-32 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative p-12 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent backdrop-blur-sm overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 opacity-20" />

            <div className="relative text-center space-y-8">
              <h2 className="text-4xl md:text-5xl font-bold">
                Ready to Launch Your Trading Journey?
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Join thousands of traders exploring the cryptocurrency cosmos with NebulAX
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                <Link href="/trading">
                  <a className="group relative px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold text-lg overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(167,139,250,0.5)]">
                    <span className="relative z-10 flex items-center gap-2">
                      Launch Trading Platform
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </a>
                </Link>
                <Link href="/swap">
                  <a className="px-8 py-4 border-2 border-primary/50 text-foreground rounded-lg font-semibold text-lg backdrop-blur-sm hover:bg-primary/10 transition-all hover:scale-105 hover:border-primary">
                    Try Swap Feature
                  </a>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* UnicornStudio Script */}
      {mounted && (
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `
              !function(){if(!window.UnicornStudio){window.UnicornStudio={isInitialized:!1};var i=document.createElement("script");i.src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.31/dist/unicornStudio.umd.js",i.onload=function(){window.UnicornStudio.isInitialized||(UnicornStudio.init(),window.UnicornStudio.isInitialized=!0)},(document.head || document.body).appendChild(i)}}();
            `
          }}
        />
      )}
    </div>
  );
}

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Execute trades at light speed with our optimized matching engine and real-time market data updates."
  },
  {
    icon: Shield,
    title: "Fort Knox Security",
    description: "Multi-layer security protocols, cold storage, and advanced encryption keep your assets safe in the cosmic void."
  },
  {
    icon: TrendingUp,
    title: "Advanced Trading",
    description: "Professional charting tools, multiple order types, and advanced trading strategies at your fingertips."
  },
  {
    icon: Cpu,
    title: "AI-Powered Insights",
    description: "Leverage artificial intelligence for market analysis, trading signals, and predictive analytics."
  },
  {
    icon: Layers,
    title: "Multi-Chain Support",
    description: "Trade across multiple blockchains seamlessly with our unified cross-chain infrastructure."
  },
  {
    icon: BarChart3,
    title: "Deep Liquidity",
    description: "Access deep liquidity pools and get the best prices with minimal slippage on every trade."
  }
];

const techStack = [
  {
    icon: Lock,
    name: "Decentralized Architecture",
    description: "Built on blockchain technology ensuring transparency, security, and true ownership of your assets."
  },
  {
    icon: Zap,
    name: "High-Performance Engine",
    description: "Process millions of transactions per second with our cutting-edge matching engine and infrastructure."
  },
  {
    icon: Globe,
    name: "Global Network",
    description: "Distributed nodes across the world ensure 99.99% uptime and lightning-fast access from anywhere."
  },
  {
    icon: Cpu,
    name: "AI & Machine Learning",
    description: "Advanced algorithms provide intelligent trading insights, risk management, and market predictions."
  }
];

const benefits = [
  {
    icon: Shield,
    title: "Non-Custodial Trading",
    description: "You maintain full control of your private keys and assets. Trade directly from your wallet without intermediaries."
  },
  {
    icon: Zap,
    title: "Instant Settlements",
    description: "No waiting periods. Blockchain-powered settlements mean your trades are confirmed in seconds, not days."
  },
  {
    icon: TrendingUp,
    title: "Competitive Fees",
    description: "Industry-leading low fees of just 0.01% per trade. No hidden costs, no surprises—just transparent pricing."
  },
  {
    icon: Star,
    title: "24/7 Support",
    description: "Our dedicated support team and AI assistant are always available to help you navigate the markets."
  }
];
