export function AboutSection() {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:px-8 sm:mt-8 sm:pr-6 sm:pl-6 max-w-7xl mt-6 mr-auto ml-auto pr-4 pl-4 gap-x-4 gap-y-4 py-32 z-10 relative">
      {/* Integrations Card */}
      <div className="overflow-hidden animate-fade-in-up delay-700 bg-black/30 border-white/10 border rounded-2xl pt-6 pr-6 pb-6 pl-6 relative">
        <div className="pointer-events-none absolute inset-px rounded-2xl ring-1 ring-inset ring-white/10"></div>
        <div className="absolute -top-10 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-sky-500/20 blur-3xl"></div>

        {/* Icon Grid */}
        <div className="grid grid-cols-3 gap-3 opacity-60">
          <div
            className="aspect-square rounded-lg border border-white/10 bg-white/[0.02] flex items-center justify-center animate-pulse"
            style={{ animationDelay: '0s', animationDuration: '2s' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              className="h-5 w-5 text-sky-400/70">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            </svg>
          </div>
          <div
            className="aspect-square rounded-lg border border-white/10 bg-white/[0.02] flex items-center justify-center animate-pulse"
            style={{ animationDelay: '0.3s', animationDuration: '2s' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              className="h-5 w-5 text-sky-400/70">
              <path d="M20 7h-9"></path>
              <path d="M14 17H5"></path>
              <circle cx="17" cy="17" r="3"></circle>
              <circle cx="7" cy="7" r="3"></circle>
            </svg>
          </div>
          <div
            className="aspect-square rounded-lg border border-white/10 bg-white/[0.02] flex items-center justify-center animate-pulse"
            style={{ animationDelay: '0.6s', animationDuration: '2s' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              className="h-5 w-5 text-sky-400/70">
              <path d="M12 2v20M2 12h20"></path>
            </svg>
          </div>
        </div>

        {/* Enhanced Database Schema Visualization */}
        <div className="relative mt-6 flex items-center justify-center">
          <div className="relative h-48 w-full">
            {/* Central Hub */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div
                className="h-20 w-20 rounded-full border-2 border-sky-400/50 bg-gradient-to-b from-sky-500/20 to-sky-500/5 flex items-center justify-center shadow-[0_0_40px_-10px_rgba(56,189,248,0.6)]"
                style={{ animation: 'pulse-glow 3s ease-in-out infinite' }}
              >
                <div className="text-center">
                  <div className="text-2xl font-semibold tracking-tight text-sky-100">500+</div>
                  <div className="text-[10px] text-sky-400">APIs</div>
                </div>
              </div>
            </div>

            {/* Orbiting Nodes */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: '180px', height: '180px' }}>
              {/* Node 1 */}
              <div className="absolute left-1/2 top-1/2 -ml-5 -mt-5" style={{ animation: 'orbit-1 12s linear infinite' }}>
                <div className="h-10 w-10 rounded-lg border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="text-emerald-400">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                  </svg>
                </div>
              </div>

              {/* Node 2 */}
              <div className="absolute left-1/2 top-1/2 -ml-5 -mt-5" style={{ animation: 'orbit-2 12s linear infinite' }}>
                <div className="h-10 w-10 rounded-lg border border-cyan-500/40 bg-cyan-500/10 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="text-cyan-400">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                  </svg>
                </div>
              </div>

              {/* Node 3 */}
              <div className="absolute left-1/2 top-1/2 -ml-5 -mt-5" style={{ animation: 'orbit-3 12s linear infinite' }}>
                <div className="h-10 w-10 rounded-lg border border-violet-500/40 bg-violet-500/10 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="text-violet-400">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
              </div>

              {/* Node 4 */}
              <div className="absolute left-1/2 top-1/2 -ml-5 -mt-5" style={{ animation: 'orbit-4 12s linear infinite' }}>
                <div className="h-10 w-10 rounded-lg border border-fuchsia-500/40 bg-fuchsia-500/10 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="text-fuchsia-400">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </div>
              </div>
            </div>

            {/* Data Flow Particles */}
            <div className="data-particle" style={{ animation: 'flow-particle-1 4s ease-in-out infinite' }}></div>
            <div className="data-particle" style={{ animation: 'flow-particle-2 4s ease-in-out infinite 1s' }}></div>
            <div className="data-particle" style={{ animation: 'flow-particle-3 4s ease-in-out infinite 2s' }}></div>
            <div className="data-particle" style={{ animation: 'flow-particle-4 4s ease-in-out infinite 3s' }}></div>
          </div>
        </div>

        {/* Details */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Popular Apps</span>
            <span className="text-sky-300 transition-all" style={{ animation: 'fade-in-out 2s ease-in-out infinite' }}>120+</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">API Endpoints</span>
            <span className="text-zinc-200 transition-all" style={{ animation: 'fade-in-out 2s ease-in-out infinite 0.5s' }}>850+</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Custom Webhooks</span>
            <span className="text-emerald-400 transition-all" style={{ animation: 'fade-in-out 2s ease-in-out infinite 1s' }}>Unlimited</span>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          @keyframes orbit-1 {
            from { transform: rotate(0deg) translateX(90px) rotate(0deg); }
            to { transform: rotate(360deg) translateX(90px) rotate(-360deg); }
          }
          @keyframes orbit-2 {
            from { transform: rotate(90deg) translateX(90px) rotate(-90deg); }
            to { transform: rotate(450deg) translateX(90px) rotate(-450deg); }
          }
          @keyframes orbit-3 {
            from { transform: rotate(180deg) translateX(90px) rotate(-180deg); }
            to { transform: rotate(540deg) translateX(90px) rotate(-540deg); }
          }
          @keyframes orbit-4 {
            from { transform: rotate(270deg) translateX(90px) rotate(-270deg); }
            to { transform: rotate(630deg) translateX(90px) rotate(-630deg); }
          }
          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 40px -10px rgba(56, 189, 248, 0.6); }
            50% { box-shadow: 0 0 60px 0px rgba(56, 189, 248, 0.9); }
          }
          .data-particle {
            position: absolute;
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: rgba(56, 189, 248, 0.8);
            opacity: 0;
          }
          @keyframes flow-particle-1 {
            0% { top: 24px; left: 50%; opacity: 0; }
            25% { opacity: 1; }
            50% { top: 50%; left: 50%; opacity: 1; }
            75% { opacity: 0.5; }
            100% { top: 50%; left: calc(50% + 90px); opacity: 0; }
          }
          @keyframes flow-particle-2 {
            0% { top: 50%; left: calc(50% + 90px); opacity: 0; }
            25% { opacity: 1; }
            50% { top: 50%; left: 50%; opacity: 1; }
            75% { opacity: 0.5; }
            100% { top: calc(50% + 90px); left: 50%; opacity: 0; }
          }
          @keyframes flow-particle-3 {
            0% { top: calc(50% + 90px); left: 50%; opacity: 0; }
            25% { opacity: 1; }
            50% { top: 50%; left: 50%; opacity: 1; }
            75% { opacity: 0.5; }
            100% { top: 50%; left: calc(50% - 90px); opacity: 0; }
          }
          @keyframes flow-particle-4 {
            0% { top: 50%; left: calc(50% - 90px); opacity: 0; }
            25% { opacity: 1; }
            50% { top: 50%; left: 50%; opacity: 1; }
            75% { opacity: 0.5; }
            100% { top: 24px; left: 50%; opacity: 0; }
          }
          @keyframes fade-in-out {
            0%, 100% { opacity: 0.7; }
            50% { opacity: 1; }
          }
        `}} />
      </div>

      {/* Knowledge Card */}
      <div className="overflow-hidden animate-fade-in-up delay-800 bg-black/30 border-white/10 border rounded-2xl pt-6 pr-6 pb-6 pl-6 relative">
        <div className="pointer-events-none absolute inset-px rounded-2xl ring-1 ring-inset ring-white/10"></div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-sky-500/10 border border-sky-400/30 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="h-4 w-4 text-sky-300">
                <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"></path>
              </svg>
            </div>
            <span className="text-sm font-medium text-zinc-200">AI Assistant</span>
          </div>
          <span className="text-xs text-zinc-500">Live</span>
        </div>

        <div className="relative">
          <div className="mx-auto w-full max-w-sm">
            <div className="relative mx-auto h-40 w-full">
              {/* Stacked layers with animation */}
              <div className="animate-pulse border-white/10 border rounded-xl absolute top-6 right-0 bottom-0 left-0"
                style={{ animationDuration: '3s', animationDelay: '0s' }}></div>
              <div className="absolute inset-0 top-3 rounded-xl border border-white/10 bg-white/[0.03] animate-pulse"
                style={{ animationDuration: '3s', animationDelay: '0.2s' }}></div>
              <div className="animate-pulse border-white/10 border rounded-xl absolute top-0 right-0 bottom-0 left-0"
                style={{ animationDuration: '3s', animationDelay: '0.4s' }}></div>
              <div className="-top-2 -translate-x-1/2 animate-pulse bg-sky-400/80 w-2 h-2 rounded-full absolute left-1/2"></div>

              <div className="flex h-full z-10 relative items-center justify-center"
                style={{ animation: 'float-up 4s ease-in-out infinite' }}>
                <div className="mx-auto w-full max-w-xs rounded-lg border border-white/10 bg-black/50 px-4 py-3 backdrop-blur"
                  style={{ animation: 'scale-pulse 3s ease-in-out infinite' }}>
                  <div className="flex items-center gap-2 text-[13px] text-sky-200 mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"
                      style={{ animation: 'rotate-sparkle 4s linear infinite' }}>
                      <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"></path>
                    </svg>
                    <span className="font-medium">Best practices for CI/CD?</span>
                  </div>
                  <p className="text-[13.5px] text-zinc-300 leading-relaxed">
                    Implement automated testing, deploy frequently, monitor metrics.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats with stagger animation */}
        <div className="grid grid-cols-3 gap-2 text-center mt-40 gap-x-2 gap-y-2">
          <div
            className="rounded-lg border border-white/10 bg-white/[0.02] p-2 transition-all duration-300 hover:bg-white/[0.05] hover:scale-105"
            style={{ animation: 'fade-in-up 0.6s ease-out 0.2s both' }}>
            <div className="text-sm font-semibold text-zinc-100">2.4s</div>
            <div className="text-[10px] text-zinc-500">Avg Response</div>
          </div>
          <div
            className="rounded-lg border border-white/10 bg-white/[0.02] p-2 transition-all duration-300 hover:bg-white/[0.05] hover:scale-105"
            style={{ animation: 'fade-in-up 0.6s ease-out 0.4s both' }}>
            <div className="text-sm font-semibold text-emerald-400">98.9%</div>
            <div className="text-[10px] text-zinc-500">Accuracy</div>
          </div>
          <div
            className="rounded-lg border border-white/10 bg-white/[0.02] p-2 transition-all duration-300 hover:bg-white/[0.05] hover:scale-105"
            style={{ animation: 'fade-in-up 0.6s ease-out 0.6s both' }}>
            <div className="text-sm font-semibold text-sky-300">24/7</div>
            <div className="text-[10px] text-zinc-500">Available</div>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          @keyframes float-up {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
          @keyframes scale-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
          }
          @keyframes rotate-sparkle {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}} />
      </div>

      {/* Performance Chart */}
      <div className="overflow-hidden animate-fade-in-up delay-900 bg-black/30 border-white/10 border rounded-2xl pt-6 pr-6 pb-6 pl-6 relative">
        <div className="pointer-events-none absolute inset-px rounded-2xl ring-1 ring-inset ring-white/10"></div>

        {/* Visual Schema */}
        <div className="border-white/10 border rounded-xl pt-3 pr-3 pb-3 pl-3">
          <div className="relative h-56 rounded-lg overflow-hidden bg-gradient-to-b from-[#0b0c10] to-[#0b0c10] border border-white/5">
            {/* Animated background dots */}
            <div className="absolute left-[18%] top-[55%] h-6 w-6 rounded-full border border-white/5 opacity-70 animate-pulse"></div>
            <div className="absolute left-[60%] top-[18%] h-4 w-4 rounded-full border border-white/5 opacity-60 animate-pulse"
              style={{ animationDelay: '0.5s' }}></div>

            {/* SVG graph with animations */}
            <svg viewBox="0 0 800 400" className="absolute inset-0 w-full h-full" aria-hidden="true">
              {/* Animated connection line */}
              <line x1="260" y1="170" x2="520" y2="220" stroke="rgba(148,163,184,0.28)" strokeWidth="6"
                strokeLinecap="round" strokeDasharray="300" strokeDashoffset="300">
                <animate attributeName="stroke-dashoffset" from="300" to="0" dur="2s" fill="freeze" repeatCount="indefinite" />
              </line>

              {/* Pulsing joints on the line */}
              <circle cx="360" cy="190" r="12" fill="#0b0c10" stroke="rgba(148,163,184,0.35)" strokeWidth="4">
                <animate attributeName="r" values="12;16;12" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="395" cy="200" r="10" fill="#0b0c10" stroke="rgba(148,163,184,0.35)" strokeWidth="3">
                <animate attributeName="r" values="10;14;10" dur="2s" begin="0.3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="1;0.6;1" dur="2s" begin="0.3s" repeatCount="indefinite" />
              </circle>

              {/* Left small node with pulse */}
              <circle cx="200" cy="120" r="70" fill="#0b0c10" stroke="rgba(148,163,184,0.28)" strokeWidth="3">
                <animate attributeName="r" values="70;75;70" dur="3s" repeatCount="indefinite" />
              </circle>
              <circle cx="200" cy="120" r="60" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="1.5">
                <animate attributeName="r" values="60;65;60" dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" repeatCount="indefinite" />
              </circle>

              {/* Right large node with pulse */}
              <circle cx="570" cy="260" r="120" fill="#0b0c10" stroke="rgba(148,163,184,0.28)" strokeWidth="3">
                <animate attributeName="r" values="120;125;120" dur="3s" begin="0.5s" repeatCount="indefinite" />
              </circle>
              <circle cx="570" cy="260" r="105" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="1.5">
                <animate attributeName="r" values="105;110;105" dur="3s" begin="0.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" begin="0.5s" repeatCount="indefinite" />
              </circle>

              {/* Data flow particles */}
              <circle r="4" fill="rgba(148,163,184,0.8)">
                <animateMotion dur="3s" repeatCount="indefinite" path="M260,170 Q360,190 520,220" />
                <animate attributeName="opacity" values="0;1;1;0" dur="3s" repeatCount="indefinite" />
              </circle>
              <circle r="4" fill="rgba(148,163,184,0.8)">
                <animateMotion dur="3s" begin="1s" repeatCount="indefinite" path="M260,170 Q360,190 520,220" />
                <animate attributeName="opacity" values="0;1;1;0" dur="3s" begin="1s" repeatCount="indefinite" />
              </circle>
              <circle r="4" fill="rgba(148,163,184,0.8)">
                <animateMotion dur="3s" begin="2s" repeatCount="indefinite" path="M260,170 Q360,190 520,220" />
                <animate attributeName="opacity" values="0;1;1;0" dur="3s" begin="2s" repeatCount="indefinite" />
              </circle>
            </svg>

            {/* Icons centered inside circles with hover effect */}
            <div className="transition-transform hover:scale-110 absolute"
              style={{ left: '25%', top: '35%', transform: 'translate(-50%, -50%)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="animate-pulse w-[28px] h-[28px]"
                style={{ color: 'rgb(212, 212, 216)', width: '28px', height: '28px' }}>
                <path d="M3 3v16a2 2 0 0 0 2 2h16"></path>
                <path d="M18 17V9"></path>
                <path d="M13 17V5"></path>
                <path d="M8 17v-3"></path>
              </svg>
            </div>
            <div className="transition-transform hover:scale-110 absolute"
              style={{ left: '71.25%', top: '60%', transform: 'translate(-50%, -50%)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="animate-pulse w-[40px] h-[40px]"
                style={{ animationDelay: '0.5s', width: '40px', height: '40px', color: 'rgb(212, 212, 216)' }}>
                <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"></path>
                <path d="M20 2v4"></path>
                <path d="M22 4h-4"></path>
                <circle cx="4" cy="20" r="2"></circle>
              </svg>
            </div>
          </div>
        </div>

        {/* Copy */}
        <div className="mt-5">
          <h3 className="text-2xl tracking-tight font-semibold text-zinc-100">
            AI Strategy Consulting
          </h3>
          <p className="mt-2 text-[13.5px] leading-7 text-zinc-400">
            Get expert guidance to implement AI solutions that drive business growth
          </p>
        </div>
      </div>
    </section>
  );
}
