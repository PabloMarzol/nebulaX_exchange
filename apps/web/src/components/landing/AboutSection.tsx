import { motion } from 'framer-motion';
import { Users, Globe, Shield, FileCheck, Building2, CheckCircle } from 'lucide-react';

export function AboutSection() {
  return (
    <section className="relative py-32 px-4 z-10">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-blue-950/5 to-background pointer-events-none" style={{ zIndex: -1 }} />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16 space-y-4"
        >
          <h2 className="text-5xl md:text-6xl font-bold">
            About{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-primary to-accent">
              Nebula X
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            We're building the next-generation cryptocurrency exchange platform, engineered for speed, reliability, and security. Licensed and regulated, we serve traders worldwide with cutting-edge technology.
          </p>
        </motion.div>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {[
            {
              icon: Shield,
              title: 'VASP Licensed',
              description: 'Fully compliant with Czech Republic regulations',
              color: 'text-blue-400'
            },
            {
              icon: Globe,
              title: 'Global Reach',
              description: 'Serving customers in 100+ countries',
              color: 'text-emerald-400'
            },
            {
              icon: Users,
              title: 'Trusted by Millions',
              description: 'Over 2 million active traders worldwide',
              color: 'text-purple-400'
            }
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative p-8 rounded-2xl border border-primary/20 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm text-center space-y-4 group hover:border-primary/40 transition-all"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
              <h3 className="text-2xl font-semibold">{stat.title}</h3>
              <p className="text-muted-foreground">{stat.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Visual Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {[
            { title: 'Live Trading Charts', color: 'from-green-500/20 to-emerald-500/20', border: 'border-green-500/30' },
            { title: 'Real-time Analytics', color: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30' },
            { title: 'Quantum Security', color: 'from-purple-500/20 to-pink-500/20', border: 'border-purple-500/30' },
            { title: 'Global Network', color: 'from-orange-500/20 to-red-500/20', border: 'border-orange-500/30' }
          ].map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`aspect-square p-6 rounded-2xl border ${card.border} bg-gradient-to-br ${card.color} backdrop-blur-sm flex items-center justify-center hover:scale-105 transition-all`}
            >
              <span className="text-sm font-semibold text-center">{card.title}</span>
            </motion.div>
          ))}
        </div>

        {/* Regulatory Compliance */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mt-16"
        >
          <h3 className="text-3xl font-bold text-center mb-12">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              Regulatory Compliance
            </span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Building2,
                title: 'Golden Michael s.r.o.',
                description: 'Registered in Czech Republic',
                detail: 'Company ID: 19536143'
              },
              {
                icon: FileCheck,
                title: 'FAÚ Supervised',
                description: 'Financial Administration Office',
                detail: 'VASP License #CZ-2024-001'
              },
              {
                icon: CheckCircle,
                title: 'AML/KYC Compliant',
                description: 'Full customer verification',
                detail: 'Transaction monitoring'
              }
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="p-6 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-950/30 to-background/50 backdrop-blur-sm text-center space-y-3"
              >
                <div className="w-14 h-14 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto">
                  <item.icon className="w-7 h-7 text-blue-400" />
                </div>
                <h4 className="text-xl font-semibold">{item.title}</h4>
                <p className="text-muted-foreground text-sm">{item.description}</p>
                <p className="text-xs text-blue-400 font-mono">{item.detail}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
