export function AboutSection() {
  return (
    <section className="relative py-32 px-4 z-10">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-blue-950/5 to-background pointer-events-none" style={{ zIndex: -1 }} />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-5xl md:text-6xl font-bold">
            About{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-primary to-accent">
              NebulaX
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            We're building the next-generation cryptocurrency exchange platform, engineered for speed, reliability, and security. Licensed and regulated, we serve traders worldwide with cutting-edge technology.
          </p>
        </div>

        {/* Key Stats Cards - 3 interactive cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-12">
          {/* VASP Licensed Card */}
          <div className="overflow-hidden bg-black/30 border-white/10 border rounded-2xl pt-6 pr-6 pb-6 pl-6 relative">
            <div className="pointer-events-none absolute inset-px rounded-2xl ring-1 ring-inset ring-white/10"></div>
            <div className="absolute -top-10 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl"></div>

            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="h-20 w-20 rounded-full border-2 border-blue-400/50 bg-gradient-to-b from-blue-500/20 to-blue-500/5 flex items-center justify-center shadow-[0_0_40px_-10px_rgba(59,130,246,0.6)]"
                  style={{ animation: 'pulse-glow 3s ease-in-out infinite' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="text-blue-300">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="text-center space-y-3">
              <h3 className="text-2xl font-semibold text-zinc-100">VASP Licensed</h3>
              <p className="text-sm text-zinc-400">Fully compliant with Czech Republic regulations</p>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
              @keyframes pulse-glow {
                0%, 100% { box-shadow: 0 0 40px -10px rgba(59, 130, 246, 0.6); }
                50% { box-shadow: 0 0 60px 0px rgba(59, 130, 246, 0.9); }
              }
            `}} />
          </div>

          {/* Global Reach Card */}
          <div className="overflow-hidden bg-black/30 border-white/10 border rounded-2xl pt-6 pr-6 pb-6 pl-6 relative">
            <div className="pointer-events-none absolute inset-px rounded-2xl ring-1 ring-inset ring-white/10"></div>
            <div className="absolute -top-10 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl"></div>

            {/* Orbiting Globe Animation */}
            <div className="flex justify-center mb-6">
              <div className="relative h-20 w-20">
                {/* Globe */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-16 rounded-full border-2 border-emerald-400/50 bg-gradient-to-b from-emerald-500/20 to-emerald-500/5 flex items-center justify-center"
                  style={{ animation: 'pulse-glow-emerald 3s ease-in-out infinite' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="text-emerald-300">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
                    <path d="M2 12h20"></path>
                  </svg>
                </div>
                {/* Orbiting dots */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20">
                  <div className="absolute left-1/2 top-1/2 -ml-1 -mt-1" style={{ animation: 'orbit-simple 4s linear infinite' }}>
                    <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="text-center space-y-3">
              <h3 className="text-2xl font-semibold text-zinc-100">Global Reach</h3>
              <p className="text-sm text-zinc-400">Serving customers in 100+ countries</p>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
              @keyframes pulse-glow-emerald {
                0%, 100% { box-shadow: 0 0 40px -10px rgba(16, 185, 129, 0.6); }
                50% { box-shadow: 0 0 60px 0px rgba(16, 185, 129, 0.9); }
              }
              @keyframes orbit-simple {
                from { transform: rotate(0deg) translateX(40px) rotate(0deg); }
                to { transform: rotate(360deg) translateX(40px) rotate(-360deg); }
              }
            `}} />
          </div>

          {/* Trusted by Millions Card */}
          <div className="overflow-hidden bg-black/30 border-white/10 border rounded-2xl pt-6 pr-6 pb-6 pl-6 relative">
            <div className="pointer-events-none absolute inset-px rounded-2xl ring-1 ring-inset ring-white/10"></div>
            <div className="absolute -top-10 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-purple-500/20 blur-3xl"></div>

            {/* Users Animation */}
            <div className="flex justify-center mb-6">
              <div className="relative h-20 w-20">
                {/* Center circle with count */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-16 rounded-full border-2 border-purple-400/50 bg-gradient-to-b from-purple-500/20 to-purple-500/5 flex items-center justify-center"
                  style={{ animation: 'pulse-glow-purple 3s ease-in-out infinite' }}>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-200">2M+</div>
                  </div>
                </div>
                {/* Small user icons orbiting */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20">
                  <div className="absolute left-1/2 top-1/2" style={{ animation: 'orbit-users-1 6s linear infinite' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className="text-purple-400 -ml-1.5 -mt-1.5">
                      <circle cx="12" cy="8" r="5"></circle>
                      <path d="M20 21a8 8 0 1 0-16 0"></path>
                    </svg>
                  </div>
                  <div className="absolute left-1/2 top-1/2" style={{ animation: 'orbit-users-2 6s linear infinite' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className="text-purple-400 -ml-1.5 -mt-1.5">
                      <circle cx="12" cy="8" r="5"></circle>
                      <path d="M20 21a8 8 0 1 0-16 0"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="text-center space-y-3">
              <h3 className="text-2xl font-semibold text-zinc-100">Trusted by Millions</h3>
              <p className="text-sm text-zinc-400">Over 2 million active traders worldwide</p>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
              @keyframes pulse-glow-purple {
                0%, 100% { box-shadow: 0 0 40px -10px rgba(168, 85, 247, 0.6); }
                50% { box-shadow: 0 0 60px 0px rgba(168, 85, 247, 0.9); }
              }
              @keyframes orbit-users-1 {
                from { transform: rotate(0deg) translateX(40px) rotate(0deg); }
                to { transform: rotate(360deg) translateX(40px) rotate(-360deg); }
              }
              @keyframes orbit-users-2 {
                from { transform: rotate(180deg) translateX(40px) rotate(-180deg); }
                to { transform: rotate(540deg) translateX(40px) rotate(-540deg); }
              }
            `}} />
          </div>
        </div>

        {/* Visual Cards Grid - 4 cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {/* Live Trading Charts */}
          <div className="aspect-square p-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-card/30 backdrop-blur-sm flex flex-col items-center justify-center hover:scale-105 transition-all group">
            <div className="mb-3 opacity-60">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="text-emerald-400 group-hover:scale-110 transition-transform">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
            </div>
            <span className="text-sm font-semibold text-center text-emerald-100">Live Trading Charts</span>
          </div>

          {/* Real-time Analytics */}
          <div className="aspect-square p-6 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-card/30 backdrop-blur-sm flex flex-col items-center justify-center hover:scale-105 transition-all group">
            <div className="mb-3 opacity-60">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="text-cyan-400 group-hover:scale-110 transition-transform">
                <path d="M3 3v16a2 2 0 0 0 2 2h16"></path>
                <path d="M18 17V9"></path>
                <path d="M13 17V5"></path>
                <path d="M8 17v-3"></path>
              </svg>
            </div>
            <span className="text-sm font-semibold text-center text-cyan-100">Real-time Analytics</span>
          </div>

          {/* Quantum Security */}
          <div className="aspect-square p-6 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-card/30 backdrop-blur-sm flex flex-col items-center justify-center hover:scale-105 transition-all group">
            <div className="mb-3 opacity-60">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="text-purple-400 group-hover:scale-110 transition-transform">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                <path d="m9 12 2 2 4-4"></path>
              </svg>
            </div>
            <span className="text-sm font-semibold text-center text-purple-100">Quantum Security</span>
          </div>

          {/* Global Network */}
          <div className="aspect-square p-6 rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-card/30 backdrop-blur-sm flex flex-col items-center justify-center hover:scale-105 transition-all group">
            <div className="mb-3 opacity-60">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="text-orange-400 group-hover:scale-110 transition-transform">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
                <path d="M2 12h20"></path>
              </svg>
            </div>
            <span className="text-sm font-semibold text-center text-orange-100">Global Network</span>
          </div>
        </div>

        {/* Regulatory Compliance Section */}
        <div className="mt-16">
          <h3 className="text-3xl font-bold text-center mb-12">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              Regulatory Compliance
            </span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Golden Michael s.r.o. */}
            <div className="overflow-hidden bg-black/30 border-white/10 border rounded-2xl p-6 relative text-center">
              <div className="pointer-events-none absolute inset-px rounded-2xl ring-1 ring-inset ring-white/10"></div>

              <div className="w-14 h-14 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="text-blue-400">
                  <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"></path>
                  <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"></path>
                  <path d="M12 3v6"></path>
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-zinc-100 mb-2">Golden Michael s.r.o.</h4>
              <p className="text-sm text-zinc-400 mb-1">Registered in Czech Republic</p>
              <p className="text-xs text-blue-400 font-mono">Company ID: 19536143</p>
            </div>

            {/* FAÚ Supervised */}
            <div className="overflow-hidden bg-black/30 border-white/10 border rounded-2xl p-6 relative text-center">
              <div className="pointer-events-none absolute inset-px rounded-2xl ring-1 ring-inset ring-white/10"></div>

              <div className="w-14 h-14 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="text-blue-400">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <path d="M9 15l2 2 4-4"></path>
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-zinc-100 mb-2">FAÚ Supervised</h4>
              <p className="text-sm text-zinc-400 mb-1">Financial Administration Office</p>
              <p className="text-xs text-blue-400 font-mono">VASP License #CZ-2024-001</p>
            </div>

            {/* AML/KYC Compliant */}
            <div className="overflow-hidden bg-black/30 border-white/10 border rounded-2xl p-6 relative text-center">
              <div className="pointer-events-none absolute inset-px rounded-2xl ring-1 ring-inset ring-white/10"></div>

              <div className="w-14 h-14 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="text-blue-400">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  <path d="m9 12 2 2 4-4"></path>
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-zinc-100 mb-2">AML/KYC Compliant</h4>
              <p className="text-sm text-zinc-400 mb-1">Full customer verification</p>
              <p className="text-xs text-blue-400 font-mono">Transaction monitoring</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
