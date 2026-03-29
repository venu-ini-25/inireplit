import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DemoStep {
  time: number;
  navigateTo?: string;
  cursorX: number;
  cursorY: number;
  callout?: string | null;
  isClick?: boolean;
}

// Positions are % of screen. Finance app sidebar:
//  x ≈ 5.1%  (center of sidebar items at ~97px / 1920)
// Key y positions (px / 1080):
//  Executive Summary ≈ 74px  → 6.9%
//  P&L               ≈ 134px → 12.4%
//  Cash Flow         ≈ 163px → 15.1%
//  Operations        ≈ 221px → 20.5%
//  Portfolio         ≈ 379px → 35.1%
//  M&A Support       ≈ 408px → 37.8%
//  Reports & Analytics ≈ 437px → 40.5%

const DEMO_STEPS: DemoStep[] = [
  // 0s – Dashboard loads, cursor idles
  { time: 0,     cursorX: 50,   cursorY: 48 },
  // Hover Monthly Revenue KPI
  { time: 2000,  cursorX: 24,   cursorY: 22,   callout: 'Real-time business performance — revenue, burn, runway, headcount' },
  // Pan to Revenue Trend chart
  { time: 5200,  cursorX: 40,   cursorY: 55,   callout: null },
  // Move toward P&L nav
  { time: 7000,  cursorX: 5.1,  cursorY: 12.4 },
  // Click P&L
  { time: 8000,  cursorX: 5.1,  cursorY: 12.4, navigateTo: '/finance/pl', isClick: true, callout: null },
  // P&L loaded – cursor over revenue/cost chart
  { time: 10000, cursorX: 38,   cursorY: 42,   callout: 'Full P&L — quarterly revenue, costs and ARR growth' },
  // Pan to gross margin chart
  { time: 13000, cursorX: 72,   cursorY: 42,   callout: null },
  // Move to Cash Flow nav
  { time: 15000, cursorX: 5.1,  cursorY: 15.1 },
  { time: 16000, cursorX: 5.1,  cursorY: 15.1, navigateTo: '/finance/cashflow', isClick: true },
  // Cash Flow loaded
  { time: 18000, cursorX: 38,   cursorY: 42,   callout: 'Cash flow trends, bridge waterfall, and operating activities' },
  { time: 21000, cursorX: 72,   cursorY: 42,   callout: null },
  // Move to Portfolio nav
  { time: 23000, cursorX: 5.1,  cursorY: 35.1 },
  { time: 24000, cursorX: 5.1,  cursorY: 35.1, navigateTo: '/portfolio', isClick: true },
  // Portfolio loaded – hover fund overview bar
  { time: 26000, cursorX: 50,   cursorY: 21,   callout: 'AUM $688.5M  ·  IRR 28.6%  ·  MOIC 2.7x  ·  8 portfolio companies' },
  // Pan to company cards
  { time: 29500, cursorX: 32,   cursorY: 55,   callout: null },
  { time: 31500, cursorX: 65,   cursorY: 55 },
  // Move to M&A nav
  { time: 33500, cursorX: 5.1,  cursorY: 37.8 },
  { time: 34500, cursorX: 5.1,  cursorY: 37.8, navigateTo: '/ma', isClick: true },
  // M&A loaded – kanban board
  { time: 36500, cursorX: 30,   cursorY: 42,   callout: 'Active M&A pipeline — $273M deal value across 5 stages' },
  { time: 39500, cursorX: 62,   cursorY: 42,   callout: null },
  // Move to Reports nav
  { time: 41500, cursorX: 5.1,  cursorY: 40.5 },
  { time: 42500, cursorX: 5.1,  cursorY: 40.5, navigateTo: '/reports', isClick: true },
  // Reports loaded – benchmark chart
  { time: 44500, cursorX: 38,   cursorY: 38,   callout: 'Investor-ready reports and industry benchmark analytics' },
  { time: 47500, cursorX: 65,   cursorY: 60,   callout: null },
  // Return to dashboard
  { time: 49500, cursorX: 5.1,  cursorY: 6.9 },
  { time: 50500, cursorX: 5.1,  cursorY: 6.9,  navigateTo: '/app', isClick: true },
  // Back on dashboard
  { time: 52500, cursorX: 50,   cursorY: 40,   callout: 'One platform. Every number. Total portfolio clarity.' },
];

const URL_LABELS: Record<string, string> = {
  '/app': 'inventninvest.com/app',
  '/finance/pl': 'inventninvest.com/finance/pl',
  '/finance/cashflow': 'inventninvest.com/finance/cashflow',
  '/portfolio': 'inventninvest.com/portfolio',
  '/ma': 'inventninvest.com/ma',
  '/reports': 'inventninvest.com/reports',
};

export function LiveDemoScene() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [cursorX, setCursorX] = useState(50);
  const [cursorY, setCursorY] = useState(48);
  const [isClicking, setIsClicking] = useState(false);
  const [callout, setCallout] = useState<string | null>(null);
  const [urlLabel, setUrlLabel] = useState('inventninvest.com/app');
  const [showLoader, setShowLoader] = useState(false);

  const navigate = (path: string) => {
    if (iframeRef.current?.contentWindow) {
      try {
        // Push state directly into the SPA router (wouter listens to popstate)
        // This avoids a full page reload and gives smooth navigation
        iframeRef.current.contentWindow.history.pushState({}, '', path);
        iframeRef.current.contentWindow.dispatchEvent(
          new PopStateEvent('popstate', { state: {} })
        );
      } catch {
        // cross-origin fallback: full navigation
        iframeRef.current.src = path;
        setShowLoader(true);
        setTimeout(() => setShowLoader(false), 1600);
      }
    }
    setUrlLabel(URL_LABELS[path] ?? path);
  };

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    DEMO_STEPS.forEach((step) => {
      const t = setTimeout(() => {
        setCursorX(step.cursorX);
        setCursorY(step.cursorY);

        if ('callout' in step) {
          setCallout(step.callout ?? null);
        }

        if (step.isClick) {
          setIsClicking(true);
          setTimeout(() => setIsClicking(false), 400);
        }

        if (step.navigateTo) {
          navigate(step.navigateTo);
        }
      }, step.time);
      timers.push(t);
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 z-10 bg-[#0c1424]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
    >
      {/* ── Browser chrome bar ───────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 h-10 bg-[#1a2332] border-b border-white/10 flex items-center px-5 gap-3 z-30 select-none">
        <div className="flex gap-1.5 shrink-0">
          <div className="w-3 h-3 rounded-full bg-red-400/90" />
          <div className="w-3 h-3 rounded-full bg-yellow-400/90" />
          <div className="w-3 h-3 rounded-full bg-green-400/90" />
        </div>
        {/* Address bar */}
        <div className="flex-1 flex justify-center">
          <motion.div
            key={urlLabel}
            className="bg-[#0d1521] border border-white/8 rounded-md px-4 py-1.5 text-xs text-slate-400 font-mono w-80 text-center"
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            🔒 {urlLabel}
          </motion.div>
        </div>
        <div className="text-xs text-slate-500 font-semibold shrink-0">iNi Finance Platform</div>
      </div>

      {/* ── Live app iframe ───────────────────────────────── */}
      <iframe
        ref={iframeRef}
        src="/app"
        className="absolute left-0 right-0 bottom-0 w-full border-0 bg-white"
        style={{ top: '40px', height: 'calc(100% - 40px)', pointerEvents: 'none' }}
        title="iNi Platform"
      />

      {/* ── Page-load shimmer (covers iframe flash) ───────── */}
      <AnimatePresence>
        {showLoader && (
          <motion.div
            key="loader"
            className="absolute left-0 right-0 bottom-0 bg-[#f8fafc] z-20 pointer-events-none"
            style={{ top: '40px' }}
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* ── Animated cursor ───────────────────────────────── */}
      <motion.div
        className="absolute z-40 pointer-events-none"
        animate={{
          left: `${cursorX}%`,
          top: `calc(40px + (100% - 40px) * ${cursorY / 100})`,
        }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 26 26"
          fill="none"
          style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.55))', transform: 'translate(-4px, -3px)' }}
        >
          <path d="M4 2L10.8 21.5L13.5 13.5L21.5 10.8L4 2Z" fill="white" stroke="#0f172a" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>

        {/* Click ripple */}
        <AnimatePresence>
          {isClicking && (
            <>
              <motion.div
                className="absolute rounded-full border-2 border-blue-500/80"
                style={{ inset: '-10px', transform: 'translate(-4px, -3px)' }}
                initial={{ scale: 0.4, opacity: 1 }}
                animate={{ scale: 2.8, opacity: 0 }}
                exit={{}}
                transition={{ duration: 0.55, ease: 'easeOut' }}
              />
              <motion.div
                className="absolute rounded-full bg-blue-400/25"
                style={{ inset: '-5px', transform: 'translate(-4px, -3px)' }}
                initial={{ scale: 0.5, opacity: 1 }}
                animate={{ scale: 1.8, opacity: 0 }}
                exit={{}}
                transition={{ duration: 0.35 }}
              />
            </>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Feature callout pill ──────────────────────────── */}
      <AnimatePresence mode="wait">
        {callout && (
          <motion.div
            key={callout}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className="bg-[#0f172a]/96 border border-blue-500/25 text-white px-8 py-4 rounded-2xl text-[15px] font-semibold backdrop-blur-lg shadow-2xl whitespace-nowrap"
              style={{ fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '-0.01em' }}
            >
              <span className="text-blue-400 mr-2.5">●</span>
              {callout}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
