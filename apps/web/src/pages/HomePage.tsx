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
  Star,
  Wallet
} from 'lucide-react';
import { Link } from 'wouter';
import axios from 'axios';
import { AboutSection } from '@/components/landing/AboutSection';

export function HomePage() {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);

  // State for asset prices
  const [assetPrices, setAssetPrices] = useState<Record<string, string>>({});

  // Load UnicornStudio script
  useEffect(() => {
    console.log('🎨 HomePage mounted, checking UnicornStudio...');

    // Check if UnicornStudio is already loaded and initialized
    if (window.UnicornStudio && window.UnicornStudio.isInitialized) {
      console.log('✅ UnicornStudio already initialized, re-initializing for this mount');
      // Re-initialize to ensure it works after navigation
      try {
        window.UnicornStudio.init();
      } catch (e) {
        console.log('Re-init not needed or failed, already working');
      }
      return;
    }

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="unicornstudio"]');
    if (existingScript) {
      console.log('⚠️ UnicornStudio script already exists in document');
      // Try to initialize if not already done
      if (window.UnicornStudio) {
        console.log('🔄 Initializing existing UnicornStudio');
        try {
          window.UnicornStudio.init();
          window.UnicornStudio.isInitialized = true;
        } catch (e) {
          console.log('Init failed or already initialized');
        }
      }
      return;
    }

    console.log('📥 Loading UnicornStudio script...');

    // Create and load the UnicornStudio script
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.33/dist/unicornStudio.umd.js';
    script.async = true;

    script.onload = () => {
      console.log('✅ UnicornStudio script loaded successfully');
      // Initialize UnicornStudio after script loads
      if (window.UnicornStudio && !window.UnicornStudio.isInitialized) {
        console.log('🚀 Initializing UnicornStudio');
        window.UnicornStudio.init();
        window.UnicornStudio.isInitialized = true;
        console.log('✨ UnicornStudio initialized successfully');
      }
    };

    script.onerror = (error) => {
      console.error('❌ Failed to load UnicornStudio script:', error);
    };

    // Append script to document
    (document.head || document.body).appendChild(script);

    // Don't remove the script on cleanup - it can be reused
    return () => {
      console.log('🏠 HomePage unmounting, keeping UnicornStudio loaded for next visit');
    };
  }, []);

  // Fetch asset prices
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await axios.get('/api/market/prices');
        if (response.data.success) {
          setAssetPrices(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching asset prices:', error);
      }
    };

    fetchPrices();
    // Refresh prices every 30 seconds
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden">
      {/* UnicornStudio Animated Background - Fixed throughout page */}
      <div
        data-us-project="GE8mpmmCRgK6XBF57jgF"
        className="fixed w-full h-full left-0 top-0 z-0"
        style={{
          width: '100vw',
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
        }}
      />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center px-4 z-10">
        {/* Subtle Gradient Overlays for Nebula Effect - More transparent */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/10 to-background/50 pointer-events-none" style={{ zIndex: -1 }} />
        <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" style={{ zIndex: -1 }} />
        <div className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] bg-accent/8 rounded-full blur-[120px] pointer-events-none" style={{ zIndex: -1 }} />

        <div className="max-w-7xl mx-auto w-full py-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column - Branding */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              {/* Floating Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/50 bg-primary/10 backdrop-blur-sm"
              >
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary">Powered by Decentralized Technology</span>
              </motion.div>

              {/* Main Heading */}
              <div className="space-y-6">
                <h1 className="text-5xl lg:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] animate-gradient leading-none">
                  Nebula X
                </h1>
                <p className="text-3xl lg:text-5xl font-semibold text-foreground/90 leading-tight">
                  Trade Beyond<br />the Stars
                </p>
              </div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="grid grid-cols-3 gap-6 pt-8"
              >
                <div className="space-y-1">
                  <div className="text-2xl lg:text-3xl font-bold text-primary">$2.5B+</div>
                  <div className="text-xs text-muted-foreground">Volume</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl lg:text-3xl font-bold text-primary">50K+</div>
                  <div className="text-xs text-muted-foreground">Traders</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl lg:text-3xl font-bold text-primary">0.01%</div>
                  <div className="text-xs text-muted-foreground">Fees</div>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Column - Description & CTAs */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="space-y-8 lg:pl-8"
            >
              {/* Description with Glass Background */}
              <div className="p-8 rounded-2xl border border-primary/20 bg-background/40 backdrop-blur-md shadow-xl space-y-6">
                <p className="text-xl lg:text-2xl text-foreground/90 leading-relaxed">
                  Experience the future of decentralized trading with AI-powered insights,
                  lightning-fast execution, and cosmic-level security.
                </p>

                {/* Feature Highlights */}
                <div className="space-y-3 pt-4">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Advanced trading tools & real-time analytics</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Multi-chain support with instant settlements</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Bank-grade security & non-custodial trading</span>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/trading">
                  <a className="group relative px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold text-lg overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(167,139,250,0.5)] flex items-center justify-center gap-2">
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
              </div>
            </motion.div>
          </div>
        </div>

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

      {/* About Nebula X Section */}
      <AboutSection />

      {/* Core Features Section */}
      <section className="relative py-32 px-4 z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background to-background/50 pointer-events-none" style={{ zIndex: -1 }} />

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

      {/* How It Works Section */}
      <section className="relative py-32 px-4 z-10">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16 space-y-4"
          >
            <h2 className="text-5xl md:text-6xl font-bold">
              How It{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                Works
              </span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Start trading in minutes with our simple 4-step process
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                title: 'Connect Wallet',
                description: 'Link your Web3 wallet securely in one click',
                icon: Wallet
              },
              {
                step: '02',
                title: 'Deposit or Buy',
                description: 'Fund your account with crypto or use fiat on-ramp',
                icon: TrendingUp
              },
              {
                step: '03',
                title: 'Trade & Swap',
                description: 'Execute trades instantly with best-in-class rates',
                icon: Zap
              },
              {
                step: '04',
                title: 'Get AI Insights',
                description: 'Receive intelligent portfolio recommendations',
                icon: Cpu
              }
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                <div className="text-center space-y-4">
                  <div className="relative inline-block">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                      <item.icon className="w-8 h-8 text-primary" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                      {item.step}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
                {index < 3 && (
                  <div className="hidden lg:block absolute top-8 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary to-transparent" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Swap Widget Section */}
      <section className="relative py-20 px-4 z-10">
        {/* Add some emerald/green gradient for color variety */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-emerald-950/5 to-background pointer-events-none" style={{ zIndex: -1 }} />

        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative p-8 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-xl shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-accent/5 rounded-3xl" />

            <div className="relative space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-primary">
                    Quick Swap
                  </span>
                </h2>
                <p className="text-muted-foreground">Instantly swap crypto or buy with fiat</p>
              </div>

              <div className="space-y-4">
                {/* From Field */}
                <div className="p-4 rounded-xl bg-background/60 border border-emerald-500/20">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">From</span>
                    <span className="text-xs text-muted-foreground">Balance: 0.00</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="flex-1 bg-transparent text-2xl font-semibold outline-none"
                      disabled
                    />
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <span className="font-medium">ETH</span>
                    </div>
                  </div>
                </div>

                {/* Swap Icon */}
                <div className="flex justify-center">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <ArrowRight className="w-5 h-5 text-emerald-400 transform rotate-90" />
                  </div>
                </div>

                {/* To Field */}
                <div className="p-4 rounded-xl bg-background/60 border border-emerald-500/20">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">To</span>
                    <span className="text-xs text-muted-foreground">Est. receive</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="flex-1 bg-transparent text-2xl font-semibold outline-none"
                      disabled
                    />
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <span className="font-medium">USDC</span>
                    </div>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Link href="/swap">
                    <a className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-primary text-primary-foreground rounded-lg font-semibold text-center hover:opacity-90 transition-all hover:scale-105">
                      Crypto Swap
                    </a>
                  </Link>
                  <button className="px-6 py-3 border-2 border-emerald-500/50 text-foreground rounded-lg font-semibold hover:bg-emerald-500/10 transition-all hover:scale-105">
                    Buy with Fiat
                  </button>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  Powered by 0x Protocol & OnRamp.Money
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="relative py-32 px-4 z-10">
        {/* Add cyan gradient for color variety */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-cyan-950/5 to-background pointer-events-none" style={{ zIndex: -1 }} />

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
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-primary to-accent"> Stellar Tech</span>
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
      <section className="relative py-32 px-4 z-10">
        {/* Add pink/rose gradient for color variety */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-pink-950/5 to-background pointer-events-none" style={{ zIndex: -1 }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-500/10 rounded-full blur-[200px] pointer-events-none" style={{ zIndex: -1 }} />

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
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-primary to-accent"> Nebula X</span>
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

      {/* Security & Compliance Section */}
      <section className="relative py-32 px-4 z-10">
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
                Security First
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Your assets are protected by industry-leading security measures
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: 'Non-Custodial',
                description: 'You maintain full control of your private keys. Your assets, your control.'
              },
              {
                icon: Lock,
                title: 'Encrypted Storage',
                description: 'Bank-grade encryption protects your data and transactions at all times.'
              },
              {
                icon: Globe,
                title: 'KYC/AML Compliance',
                description: 'OnRamp.Money handles all regulatory compliance for fiat transactions.'
              }
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="p-8 rounded-2xl border border-primary/20 bg-card/30 backdrop-blur-sm text-center space-y-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                  <item.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Cryptocurrencies Section */}
      <section className="relative py-32 px-4 z-10">
        {/* Add orange gradient for color variety */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-orange-950/5 to-background pointer-events-none" style={{ zIndex: -1 }} />

        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16 space-y-4"
          >
            <h2 className="text-5xl md:text-6xl font-bold">
              Supported{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-primary to-accent">
                Assets & Networks
              </span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Trade across multiple blockchains with real-time prices
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {['ETH', 'BTC', 'USDC', 'USDT', 'ARB', 'OP', 'MATIC', 'BNB', 'AVAX', 'SOL', 'LINK', 'UNI'].map((token, index) => {
              const price = assetPrices[token];
              const colorClasses = [
                'border-orange-500/30 hover:border-orange-500/50 bg-gradient-to-br from-orange-500/5 to-card/30',
                'border-cyan-500/30 hover:border-cyan-500/50 bg-gradient-to-br from-cyan-500/5 to-card/30',
                'border-emerald-500/30 hover:border-emerald-500/50 bg-gradient-to-br from-emerald-500/5 to-card/30',
                'border-purple-500/30 hover:border-purple-500/50 bg-gradient-to-br from-purple-500/5 to-card/30',
                'border-pink-500/30 hover:border-pink-500/50 bg-gradient-to-br from-pink-500/5 to-card/30',
                'border-blue-500/30 hover:border-blue-500/50 bg-gradient-to-br from-blue-500/5 to-card/30',
              ];
              const colorClass = colorClasses[index % colorClasses.length];

              return (
                <motion.div
                  key={token}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`p-6 rounded-2xl border ${colorClass} backdrop-blur-sm hover:scale-105 transition-all group cursor-pointer`}
                >
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <span className="text-2xl font-bold text-foreground">
                      {token}
                    </span>
                    {price ? (
                      <div className="text-center">
                        <div className="text-lg font-semibold text-foreground/90">
                          ${parseFloat(price).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: price.includes('.') && parseFloat(price) < 1 ? 4 : 2
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">Live Price</div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Loading...</div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-12 text-center space-y-6">
            <p className="text-muted-foreground">
              Supporting Ethereum, Arbitrum, Optimism, Polygon, BSC, Avalanche, Solana and more...
            </p>
            <Link href="/markets">
              <a className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-primary text-primary-foreground rounded-lg font-semibold text-lg hover:opacity-90 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(249,115,22,0.4)]">
                View All Markets
                <ArrowRight className="w-5 h-5" />
              </a>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative py-32 px-4 z-10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16 space-y-4"
          >
            <h2 className="text-5xl md:text-6xl font-bold">
              Frequently Asked{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                Questions
              </span>
            </h2>
          </motion.div>

          <div className="space-y-6">
            {[
              {
                question: 'Which wallets are compatible with Nebula X?',
                answer: 'We support all major Web3 wallets including MetaMask, WalletConnect, Coinbase Wallet, Rainbow, and more.'
              },
              {
                question: 'Is KYC required to use Nebula X?',
                answer: 'KYC is only required when using the fiat on-ramp feature through OnRamp.Money. Crypto-to-crypto trading remains fully decentralized and non-custodial.'
              },
              {
                question: 'How do fees work?',
                answer: 'We charge a minimal 0.01% fee on trades. Swap fees depend on the 0x Protocol. Fiat on-ramp fees are handled by OnRamp.Money and vary by payment method.'
              },
              {
                question: 'Which assets and networks are supported?',
                answer: 'We support major cryptocurrencies including BTC, ETH, USDC, USDT, and more across Ethereum, Arbitrum, Optimism, Polygon, BSC, Avalanche, and Solana.'
              },
              {
                question: 'How are AI suggestions generated?',
                answer: 'Our AI analyzes your portfolio composition, market trends, risk metrics, and historical performance to provide personalized rebalancing and optimization recommendations.'
              }
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="p-6 rounded-2xl border border-primary/20 bg-card/30 backdrop-blur-sm space-y-3"
              >
                <h3 className="text-xl font-semibold text-foreground">{faq.question}</h3>
                <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-32 px-4 z-10">
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
                Join thousands of traders exploring the cryptocurrency cosmos with Nebula X
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

      {/* Footer */}
      <footer className="relative border-t border-primary/20 bg-background/50 backdrop-blur-sm z-10">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                  Nebula X
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Decentralized trading platform powered by AI and cutting-edge blockchain technology.
              </p>
            </div>

            {/* Product Column */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/trading">
                    <a className="hover:text-primary transition-colors">Trading</a>
                  </Link>
                </li>
                <li>
                  <Link href="/swap">
                    <a className="hover:text-primary transition-colors">Swap</a>
                  </Link>
                </li>
                <li>
                  <Link href="/portfolio">
                    <a className="hover:text-primary transition-colors">Portfolio</a>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources Column */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    API Reference
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Support
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal Column */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Terms & Conditions
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Disclaimer
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-primary/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 Nebula X. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
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
