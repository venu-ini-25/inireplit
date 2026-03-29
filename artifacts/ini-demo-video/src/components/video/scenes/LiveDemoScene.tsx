import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DemoStep {
  time: number;
  navigateTo?: string;
  cursorX: number;
  cursorY: number;
  callout?: string | null;
  isClick?: boolean;
  narrate?: string;
}

// Sidebar x ≈ 5.1% | y positions based on 1080px finance app layout
const DEMO_STEPS: DemoStep[] = [
  {
    time: 0,
    cursorX: 50, cursorY: 48,
    narrate: 'Welcome to iNi — one platform connecting your finance, operations, portfolio, and M&A workflows. Here is your business dashboard with live, real-time data.',
  },
  { time: 2000,  cursorX: 24,   cursorY: 22,   callout: 'Real-time business performance — revenue, burn, runway, headcount' },
  { time: 5200,  cursorX: 40,   cursorY: 55,   callout: null },
  { time: 7000,  cursorX: 5.1,  cursorY: 12.4 },
  {
    time: 8000,
    cursorX: 5.1, cursorY: 12.4,
    navigateTo: '/finance/pl',
    isClick: true,
    callout: null,
    narrate: 'Drill into Profit and Loss — quarterly revenue, costs, and ARR growth in a single view.',
  },
  { time: 10500, cursorX: 38,   cursorY: 42,   callout: 'Full P&L — quarterly revenue, costs and ARR growth' },
  { time: 13500, cursorX: 72,   cursorY: 42,   callout: null },
  { time: 15500, cursorX: 5.1,  cursorY: 15.1 },
  {
    time: 16500,
    cursorX: 5.1, cursorY: 15.1,
    navigateTo: '/finance/cashflow',
    isClick: true,
    narrate: 'Cash flow with monthly trends, waterfall bridge analysis, and operating activities broken down by quarter.',
  },
  { time: 19000, cursorX: 38,   cursorY: 42,   callout: 'Cash flow — trends, waterfall bridge, and operating activities' },
  { time: 22000, cursorX: 72,   cursorY: 42,   callout: null },
  { time: 24000, cursorX: 5.1,  cursorY: 35.1 },
  {
    time: 25000,
    cursorX: 5.1, cursorY: 35.1,
    navigateTo: '/portfolio',
    isClick: true,
    narrate: 'Your full portfolio at a glance. A-U-M of six eighty-eight million, I-R-R at twenty eight point six percent, M-O-I-C two point seven times across eight portfolio companies.',
  },
  { time: 27500, cursorX: 50,   cursorY: 21,   callout: 'AUM $688.5M  ·  IRR 28.6%  ·  MOIC 2.7x  ·  8 portfolio companies' },
  { time: 31000, cursorX: 32,   cursorY: 55,   callout: null },
  { time: 33000, cursorX: 65,   cursorY: 55 },
  { time: 35000, cursorX: 5.1,  cursorY: 37.8 },
  {
    time: 36000,
    cursorX: 5.1, cursorY: 37.8,
    navigateTo: '/ma',
    isClick: true,
    narrate: 'Active deal pipeline with two hundred and seventy three million in total deal value tracked across five stages from sourcing to close.',
  },
  { time: 38500, cursorX: 30,   cursorY: 42,   callout: 'Active M&A pipeline — $273M deal value across 5 stages' },
  { time: 41500, cursorX: 62,   cursorY: 42,   callout: null },
  { time: 43500, cursorX: 5.1,  cursorY: 40.5 },
  {
    time: 44500,
    cursorX: 5.1, cursorY: 40.5,
    navigateTo: '/reports',
    isClick: true,
    narrate: 'Generate investor-ready reports and benchmark your portfolio against industry peers on gross margin, ARR growth, burn multiple, and more.',
  },
  { time: 47000, cursorX: 38,   cursorY: 38,   callout: 'Investor-ready reports and industry benchmark analytics' },
  { time: 50000, cursorX: 65,   cursorY: 60,   callout: null },
  { time: 52000, cursorX: 5.1,  cursorY: 6.9 },
  {
    time: 53000,
    cursorX: 5.1, cursorY: 6.9,
    navigateTo: '/app',
    isClick: true,
    narrate: 'One platform. Every number. Total portfolio clarity.',
  },
  { time: 55500, cursorX: 50,   cursorY: 40,   callout: 'One platform. Every number. Total portfolio clarity.' },
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
  const [isTransitioning, setIsTransitioning] = useState(false);

  const narrate = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    // Prefer a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Alex'))
    );
    if (preferred) utterance.voice = preferred;
    window.speechSynthesis.speak(utterance);
  }, []);

  const navigate = useCallback((path: string) => {
    // Instant crossfade overlay — hides any loading state
    setIsTransitioning(true);
    setTimeout(() => setIsTransitioning(false), 650);

    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.history.pushState({}, '', path);
        iframeRef.current.contentWindow.dispatchEvent(
          new PopStateEvent('popstate', { state: {} })
        );
      } catch {
        iframeRef.current.src = path;
      }
    }
    setUrlLabel(URL_LABELS[path] ?? path);
  }, []);

  // Warm up voices on mount (browser loads them async)
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    DEMO_STEPS.forEach((step) => {
      const t = setTimeout(() => {
        setCursorX(step.cursorX);
        setCursorY(step.cursorY);

        if ('callout' in step) setCallout(step.callout ?? null);
        if (step.isClick) {
          setIsClicking(true);
          setTimeout(() => setIsClicking(false), 400);
        }
        if (step.navigateTo) navigate(step.navigateTo);
        if (step.narrate) narrate(step.narrate);
      }, step.time);
      timers.push(t);
    });

    return () => {
      timers.forEach(clearTimeout);
      window.speechSynthesis?.cancel();
    };
  }, [navigate, narrate]);

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
        <div className="flex-1 flex justify-center">
          <motion.div
            key={urlLabel}
            className="bg-[#0d1521] border border-white/8 rounded-md px-4 py-1.5 text-xs text-slate-400 font-mono w-80 text-center"
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
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

      {/* ── Instant crossfade overlay on page navigation ──── */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            key="nav-fade"
            className="absolute left-0 right-0 bottom-0 z-25 pointer-events-none"
            style={{ top: '40px', background: '#f8fafc' }}
            initial={{ opacity: 0.92 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
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
        transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
      >
        <svg
          width="26" height="26" viewBox="0 0 26 26" fill="none"
          style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.55))', transform: 'translate(-4px, -3px)' }}
        >
          <path d="M4 2L10.8 21.5L13.5 13.5L21.5 10.8L4 2Z" fill="white" stroke="#0f172a" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>

        <AnimatePresence>
          {isClicking && (
            <>
              <motion.div
                className="absolute rounded-full border-2 border-blue-500/80"
                style={{ inset: '-10px', transform: 'translate(-4px, -3px)' }}
                initial={{ scale: 0.4, opacity: 1 }}
                animate={{ scale: 2.8, opacity: 0 }}
                exit={{}}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
              <motion.div
                className="absolute rounded-full bg-blue-400/25"
                style={{ inset: '-5px', transform: 'translate(-4px, -3px)' }}
                initial={{ scale: 0.5, opacity: 1 }}
                animate={{ scale: 1.8, opacity: 0 }}
                exit={{}}
                transition={{ duration: 0.32 }}
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
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
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
