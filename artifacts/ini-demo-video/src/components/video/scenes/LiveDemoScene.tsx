import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DemoStep {
  time: number;
  navigateTo?: string;
  cursorX: number;
  cursorY: number;
  callout?: string | null;
  isClick?: boolean;
  audioId?: string;
}

// Sidebar x ≈ 5.1% | y positions based on finance app nav layout
const DEMO_STEPS: DemoStep[] = [
  // ── Dashboard ──────────────────────────────────────────────
  { time: 0,     cursorX: 50,  cursorY: 48, audioId: 'welcome' },
  { time: 2000,  cursorX: 24,  cursorY: 22, callout: 'Live metrics — revenue, burn rate, runway, and headcount all in one view' },
  { time: 5200,  cursorX: 40,  cursorY: 55, callout: null },

  // ── P&L ────────────────────────────────────────────────────
  { time: 7000,  cursorX: 5.1, cursorY: 12.4 },
  {
    time: 8000,  cursorX: 5.1, cursorY: 12.4,
    navigateTo: '/finance/pl', isClick: true, callout: null, audioId: 'pl',
  },
  { time: 10500, cursorX: 38,  cursorY: 42, callout: 'Quarterly revenue, cost breakdown, and margin trends — all in one view' },
  { time: 13500, cursorX: 72,  cursorY: 42, callout: null },

  // ── Cash Flow ──────────────────────────────────────────────
  { time: 15500, cursorX: 5.1, cursorY: 15.1 },
  {
    time: 16500, cursorX: 5.1, cursorY: 15.1,
    navigateTo: '/finance/cashflow', isClick: true, audioId: 'cashflow',
  },
  { time: 19000, cursorX: 38,  cursorY: 42, callout: 'Monthly cash trends, waterfall bridge, and a full quarterly statement' },
  { time: 22000, cursorX: 72,  cursorY: 42, callout: null },

  // ── Portfolio ──────────────────────────────────────────────
  { time: 24000, cursorX: 5.1, cursorY: 35.1 },
  {
    time: 25000, cursorX: 5.1, cursorY: 35.1,
    navigateTo: '/portfolio', isClick: true, audioId: 'portfolio',
  },
  { time: 27500, cursorX: 50,  cursorY: 21, callout: 'Fund-level metrics at a glance — then drill into any portfolio company' },
  { time: 31000, cursorX: 32,  cursorY: 55, callout: null },
  { time: 33000, cursorX: 65,  cursorY: 55 },

  // ── M&A ────────────────────────────────────────────────────
  { time: 35000, cursorX: 5.1, cursorY: 37.8 },
  {
    time: 36000, cursorX: 5.1, cursorY: 37.8,
    navigateTo: '/ma', isClick: true, audioId: 'ma',
  },
  { time: 38500, cursorX: 30,  cursorY: 42, callout: 'Kanban pipeline — every deal tracked from sourcing through to close' },
  { time: 41500, cursorX: 62,  cursorY: 42, callout: null },

  // ── Reports ────────────────────────────────────────────────
  { time: 43500, cursorX: 5.1, cursorY: 40.5 },
  {
    time: 44500, cursorX: 5.1, cursorY: 40.5,
    navigateTo: '/reports', isClick: true, audioId: 'reports',
  },
  { time: 47000, cursorX: 38,  cursorY: 38, callout: 'Peer benchmarking and investor-ready report exports in one click' },
  { time: 50000, cursorX: 65,  cursorY: 60, callout: null },

  // ── Back to Dashboard + outro ───────────────────────────────
  { time: 52000, cursorX: 5.1, cursorY: 6.9 },
  {
    time: 53000, cursorX: 5.1, cursorY: 6.9,
    navigateTo: '/app', isClick: true, audioId: 'outro',
  },
  { time: 55500, cursorX: 50,  cursorY: 40, callout: 'One platform. Every financial insight. Total portfolio clarity.' },
];

const URL_LABELS: Record<string, string> = {
  '/app':              'inventninvest.com/app',
  '/finance/pl':       'inventninvest.com/finance/pl',
  '/finance/cashflow': 'inventninvest.com/finance/cashflow',
  '/portfolio':        'inventninvest.com/portfolio',
  '/ma':               'inventninvest.com/ma',
  '/reports':          'inventninvest.com/reports',
};

export function LiveDemoScene() {
  const iframeRef  = useRef<HTMLIFrameElement>(null);
  const audioRef   = useRef<HTMLAudioElement | null>(null);
  const [cursorX, setCursorX]           = useState(50);
  const [cursorY, setCursorY]           = useState(48);
  const [isClicking, setIsClicking]     = useState(false);
  const [callout, setCallout]           = useState<string | null>(null);
  const [urlLabel, setUrlLabel]         = useState('inventninvest.com/app');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Play a pre-generated MP3 narration track
  const playAudio = useCallback((id: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const audio = new Audio(`/ini-demo-video/audio/${id}.mp3`);
    audio.volume = 1.0;
    audio.play().catch(() => {/* autoplay blocked — user must interact first */});
    audioRef.current = audio;
  }, []);

  const navigate = useCallback((path: string) => {
    // Instant crossfade overlay to mask page loading state
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

  // Run the scripted demo timeline
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
        if (step.audioId)    playAudio(step.audioId);
      }, step.time);
      timers.push(t);
    });

    return () => {
      timers.forEach(clearTimeout);
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [navigate, playAudio]);

  return (
    <motion.div
      className="absolute inset-0 z-10 bg-[#0c1424]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
    >
      {/* ── Browser chrome bar ─────────────────────────────── */}
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

      {/* ── Live app iframe ─────────────────────────────────── */}
      <iframe
        ref={iframeRef}
        src="/app"
        className="absolute left-0 right-0 bottom-0 w-full border-0 bg-white"
        style={{ top: '40px', height: 'calc(100% - 40px)', pointerEvents: 'none' }}
        title="iNi Platform"
      />

      {/* ── Crossfade overlay on page navigation ────────────── */}
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

      {/* ── Animated cursor ─────────────────────────────────── */}
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

      {/* ── Feature callout pill ────────────────────────────── */}
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
