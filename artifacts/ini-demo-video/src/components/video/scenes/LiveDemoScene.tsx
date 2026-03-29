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

/**
 * Sidebar x ≈ 5.1% of 1920px viewport
 * cursorY maps into iframe area: top = 40px + (1040px * y/100)
 *
 * Known sidebar y positions (calibrated):
 *   Executive Summary : 6.9%
 *   P&L              : 12.4%
 *   Cash Flow        : 15.1%
 *   Expenses         : ~17.8%
 *   Operations       : ~20.5%
 *   Product          : ~23.2%
 *   Marketing        : ~25.9%
 *   Sales            : ~28.6%
 *   People           : ~31.3%
 *   Portfolio        : 35.1%
 *   M&A              : 37.8%
 *   Reports          : 40.5%
 *   Professional Svc : ~43.2%
 */

const NAV_X = 5.1;

const DEMO_STEPS: DemoStep[] = [
  // ── Dashboard ────────────────────────────────────────────────
  { time: 0,     cursorX: 50,    cursorY: 48,   audioId: 'welcome' },
  { time: 2000,  cursorX: 24,    cursorY: 22,   callout: 'Executive dashboard — revenue, burn rate, runway, and headcount in real time' },
  { time: 4500,  cursorX: 40,    cursorY: 55,   callout: null },

  // ── P&L ──────────────────────────────────────────────────────
  { time: 5200,  cursorX: NAV_X, cursorY: 12.4 },
  { time: 5800,  cursorX: NAV_X, cursorY: 12.4, navigateTo: '/finance/pl',       isClick: true, callout: null, audioId: 'pl' },
  { time: 7800,  cursorX: 38,    cursorY: 40,   callout: 'Quarterly revenue, costs, and margin trends — across every line item' },
  { time: 10500, cursorX: 65,    cursorY: 40,   callout: null },

  // ── Cash Flow ─────────────────────────────────────────────────
  { time: 11200, cursorX: NAV_X, cursorY: 15.1 },
  { time: 11800, cursorX: NAV_X, cursorY: 15.1, navigateTo: '/finance/cashflow', isClick: true, audioId: 'cashflow' },
  { time: 13800, cursorX: 38,    cursorY: 40,   callout: 'Monthly inflows vs outflows — with a full waterfall breakdown' },
  { time: 16200, cursorX: 65,    cursorY: 40,   callout: null },

  // ── Expenses ─────────────────────────────────────────────────
  { time: 16800, cursorX: NAV_X, cursorY: 17.8 },
  { time: 17400, cursorX: NAV_X, cursorY: 17.8, navigateTo: '/finance/expenses', isClick: true, audioId: 'expenses' },
  { time: 19400, cursorX: 38,    cursorY: 40,   callout: 'Spending by category and vendor — spot anomalies instantly' },
  { time: 21800, cursorX: 65,    cursorY: 40,   callout: null },

  // ── Operations ───────────────────────────────────────────────
  { time: 22400, cursorX: NAV_X, cursorY: 20.5 },
  { time: 23000, cursorX: NAV_X, cursorY: 20.5, navigateTo: '/operations',       isClick: true, audioId: 'operations' },
  { time: 25000, cursorX: 38,    cursorY: 40,   callout: 'Delivery, efficiency, and quality KPIs — tracked against targets in real time' },
  { time: 27500, cursorX: 65,    cursorY: 40,   callout: null },

  // ── Product ──────────────────────────────────────────────────
  { time: 28000, cursorX: NAV_X, cursorY: 23.2 },
  { time: 28600, cursorX: NAV_X, cursorY: 23.2, navigateTo: '/product',          isClick: true, audioId: 'product' },
  { time: 30600, cursorX: 38,    cursorY: 40,   callout: 'Feature adoption, usage trends, and release velocity — all in one view' },
  { time: 33200, cursorX: 65,    cursorY: 40,   callout: null },

  // ── Marketing ────────────────────────────────────────────────
  { time: 33600, cursorX: NAV_X, cursorY: 25.9 },
  { time: 34200, cursorX: NAV_X, cursorY: 25.9, navigateTo: '/marketing',        isClick: true, audioId: 'marketing' },
  { time: 36200, cursorX: 38,    cursorY: 40,   callout: 'Lead gen, campaign performance, and cost per acquisition by channel' },
  { time: 38600, cursorX: 65,    cursorY: 40,   callout: null },

  // ── Sales ────────────────────────────────────────────────────
  { time: 39200, cursorX: NAV_X, cursorY: 28.6 },
  { time: 39800, cursorX: NAV_X, cursorY: 28.6, navigateTo: '/sales',            isClick: true, audioId: 'sales' },
  { time: 41800, cursorX: 38,    cursorY: 40,   callout: 'Pipeline, win rates, deal size, and revenue by stage and rep' },
  { time: 44200, cursorX: 65,    cursorY: 40,   callout: null },

  // ── People ───────────────────────────────────────────────────
  { time: 44800, cursorX: NAV_X, cursorY: 31.3 },
  { time: 45400, cursorX: NAV_X, cursorY: 31.3, navigateTo: '/people',           isClick: true, audioId: 'people' },
  { time: 47400, cursorX: 38,    cursorY: 40,   callout: 'Headcount by department, hiring velocity, and team growth trends' },
  { time: 49800, cursorX: 65,    cursorY: 40,   callout: null },

  // ── Portfolio ────────────────────────────────────────────────
  { time: 50400, cursorX: NAV_X, cursorY: 35.1 },
  { time: 51000, cursorX: NAV_X, cursorY: 35.1, navigateTo: '/portfolio',        isClick: true, audioId: 'portfolio' },
  { time: 53000, cursorX: 50,    cursorY: 22,   callout: 'Fund-level metrics at a glance — then drill into any portfolio company' },
  { time: 55500, cursorX: 65,    cursorY: 55,   callout: null },

  // ── M&A ──────────────────────────────────────────────────────
  { time: 56200, cursorX: NAV_X, cursorY: 37.8 },
  { time: 56800, cursorX: NAV_X, cursorY: 37.8, navigateTo: '/ma',               isClick: true, audioId: 'ma' },
  { time: 58800, cursorX: 30,    cursorY: 42,   callout: 'Kanban pipeline — every deal tracked from sourcing through to close' },
  { time: 61200, cursorX: 65,    cursorY: 42,   callout: null },

  // ── Reports ──────────────────────────────────────────────────
  { time: 61800, cursorX: NAV_X, cursorY: 40.5 },
  { time: 62400, cursorX: NAV_X, cursorY: 40.5, navigateTo: '/reports',          isClick: true, audioId: 'reports' },
  { time: 64400, cursorX: 38,    cursorY: 40,   callout: 'Peer benchmarks and investor-ready report exports in one click' },
  { time: 66600, cursorX: 65,    cursorY: 40,   callout: null },

  // ── Professional Services ────────────────────────────────────
  { time: 67200, cursorX: NAV_X, cursorY: 43.2 },
  { time: 67800, cursorX: NAV_X, cursorY: 43.2, navigateTo: '/services',         isClick: true, audioId: 'services' },
  { time: 69800, cursorX: 38,    cursorY: 40,   callout: 'Active client engagements, project milestones, and revenue per engagement' },
  { time: 72200, cursorX: 65,    cursorY: 40,   callout: null },

  // ── Back to Dashboard + outro ────────────────────────────────
  { time: 72800, cursorX: NAV_X, cursorY: 6.9 },
  { time: 73400, cursorX: NAV_X, cursorY: 6.9,  navigateTo: '/app',              isClick: true, audioId: 'outro' },
  { time: 75400, cursorX: 50,    cursorY: 40,   callout: 'One platform. Every financial insight. Total portfolio clarity.' },
];

const URL_LABELS: Record<string, string> = {
  '/app':              'inventninvest.com/app',
  '/finance/pl':       'inventninvest.com/finance/pl',
  '/finance/cashflow': 'inventninvest.com/finance/cashflow',
  '/finance/expenses': 'inventninvest.com/finance/expenses',
  '/operations':       'inventninvest.com/operations',
  '/product':          'inventninvest.com/product',
  '/marketing':        'inventninvest.com/marketing',
  '/sales':            'inventninvest.com/sales',
  '/people':           'inventninvest.com/people',
  '/portfolio':        'inventninvest.com/portfolio',
  '/ma':               'inventninvest.com/ma',
  '/reports':          'inventninvest.com/reports',
  '/services':         'inventninvest.com/services',
};

export function LiveDemoScene() {
  const iframeRef      = useRef<HTMLIFrameElement>(null);
  const audioRef       = useRef<HTMLAudioElement | null>(null);
  const fadeTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingAudioId = useRef<string | null>(null);   // audio blocked by autoplay policy
  const audioUnlocked  = useRef(false);

  const [cursorX, setCursorX]                 = useState(50);
  const [cursorY, setCursorY]                 = useState(48);
  const [isClicking, setIsClicking]           = useState(false);
  const [callout, setCallout]                 = useState<string | null>(null);
  const [urlLabel, setUrlLabel]               = useState('inventninvest.com/app');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showAudioBadge, setShowAudioBadge]   = useState(false);

  /** Play a narration MP3 with smooth 700ms crossfade */
  const playAudio = useCallback((id: string) => {
    pendingAudioId.current = id;

    const FADE_MS  = 700;
    const STEPS    = 14;
    const INTERVAL = FADE_MS / STEPS;

    if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);

    const prev = audioRef.current;
    const next = new Audio(`/ini-demo-video/audio/${id}.mp3`);
    next.volume = 0;

    next.play()
      .then(() => {
        audioUnlocked.current  = true;
        pendingAudioId.current = null;
        setShowAudioBadge(false);
        let step = 0;
        fadeTimerRef.current = setInterval(() => {
          step++;
          const t = step / STEPS;
          if (prev && !prev.ended && !prev.paused) prev.volume = Math.max(0, 1 - t);
          next.volume = Math.min(1, t);
          if (step >= STEPS) {
            if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
            if (prev) { prev.pause(); prev.src = ''; }
            next.volume = 1;
          }
        }, INTERVAL);
      })
      .catch(() => {
        // Autoplay was blocked — show badge and wait for any interaction
        setShowAudioBadge(true);
      });

    audioRef.current = next;
  }, []);

  /** Called by the first user interaction anywhere — replays the pending clip */
  const unlockAndPlay = useCallback(() => {
    if (audioUnlocked.current) return;
    audioUnlocked.current = true;
    setShowAudioBadge(false);
    if (pendingAudioId.current) {
      playAudio(pendingAudioId.current);
    }
  }, [playAudio]);

  // Listen for the very first interaction anywhere on the page
  useEffect(() => {
    const events = ['click', 'keydown', 'touchstart', 'pointerdown'] as const;
    const handler = () => {
      unlockAndPlay();
      events.forEach(e => document.removeEventListener(e, handler));
    };
    events.forEach(e => document.addEventListener(e, handler, { once: true }));
    return () => events.forEach(e => document.removeEventListener(e, handler));
  }, [unlockAndPlay]);

  const navigate = useCallback((path: string) => {
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

  // Run the full scripted timeline — always auto-starts visually
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
      if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
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
            className="bg-[#0d1521] border border-white/8 rounded-md px-4 py-1.5 text-xs text-slate-400 font-mono w-96 text-center"
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
            className="absolute left-0 right-0 bottom-0 pointer-events-none"
            style={{ top: '40px', background: '#f8fafc', zIndex: 25 }}
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* ── Animated cursor ─────────────────────────────────── */}
      <motion.div
        className="absolute pointer-events-none"
        style={{ zIndex: 40 }}
        animate={{
          left: `${cursorX}%`,
          top: `calc(40px + (100% - 40px) * ${cursorY / 100})`,
        }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
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
            className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none"
            style={{ zIndex: 50 }}
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

      {/* ── Audio unlock badge (appears only if browser blocked autoplay) ── */}
      <AnimatePresence>
        {showAudioBadge && (
          <motion.button
            key="audio-badge"
            onClick={unlockAndPlay}
            className="absolute top-14 right-5 z-50 flex items-center gap-2 cursor-pointer"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: [0.6, 1, 0.6], y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 2, repeat: Infinity }, y: { duration: 0.4 } }}
            style={{
              background: 'rgba(15,23,42,0.85)',
              border: '1px solid rgba(96,165,250,0.3)',
              borderRadius: 999,
              padding: '6px 14px',
              color: '#94a3b8',
              fontSize: '0.72rem',
              fontFamily: 'Space Grotesk, sans-serif',
              backdropFilter: 'blur(8px)',
            }}
          >
            🔊 <span>Click anywhere to enable audio</span>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
