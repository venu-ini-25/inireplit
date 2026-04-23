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

// ─── Audio durations (ms) used to pace the timeline ───────────────────────
// welcome=17256  pl=11616  cashflow=14760  expenses=11064  operations=11208
// product=11400  marketing=10704  sales=11664  people=10248  portfolio=14520
// ma=13752  reports=13560  services=9720  outro=11760
//
// Each page dwell = full clip duration + 1000ms buffer before cursor moves.
// Navigation hover = 600ms before click.  No clip is ever interrupted.
// ──────────────────────────────────────────────────────────────────────────

const DEMO_STEPS: DemoStep[] = [
  // ── Dashboard (welcome = 17 256 ms) ──────────────────────────
  { time: 0,       cursorX: 50,    cursorY: 48,  audioId: 'welcome' },
  { time: 2000,    cursorX: 24,    cursorY: 22,  callout: 'Executive dashboard — revenue, burn rate, runway, and headcount in real time' },
  { time: 4500,    cursorX: 40,    cursorY: 55,  callout: null },
  // clip ends at 17 256 → move cursor at 18 256
  { time: 18256,   cursorX: NAV_X, cursorY: 12.4 },

  // ── P&L (pl = 11 616 ms) ─────────────────────────────────────
  // click at 18 856; clip ends at 18 856 + 11 616 = 30 472 → next at 31 472
  { time: 18856,   cursorX: NAV_X, cursorY: 12.4, navigateTo: '/finance/pl',       isClick: true, callout: null, audioId: 'pl' },
  { time: 20856,   cursorX: 38,    cursorY: 40,   callout: 'Quarterly revenue, costs, and margin trends — across every line item' },
  { time: 25000,   cursorX: 65,    cursorY: 40,   callout: null },
  { time: 31472,   cursorX: NAV_X, cursorY: 15.1 },

  // ── Cash Flow (cashflow = 14 760 ms) ─────────────────────────
  // click at 32 072; ends at 46 832 → next at 47 832
  { time: 32072,   cursorX: NAV_X, cursorY: 15.1, navigateTo: '/finance/cashflow', isClick: true, audioId: 'cashflow' },
  { time: 34072,   cursorX: 38,    cursorY: 40,   callout: 'Monthly inflows vs outflows — with a full waterfall breakdown' },
  { time: 39000,   cursorX: 65,    cursorY: 40,   callout: null },
  { time: 47832,   cursorX: NAV_X, cursorY: 17.8 },

  // ── Expenses (expenses = 11 064 ms) ──────────────────────────
  // click at 48 432; ends at 59 496 → next at 60 496
  { time: 48432,   cursorX: NAV_X, cursorY: 17.8, navigateTo: '/finance/expenses', isClick: true, audioId: 'expenses' },
  { time: 50432,   cursorX: 38,    cursorY: 40,   callout: 'Spending by category and vendor — spot anomalies instantly' },
  { time: 54500,   cursorX: 65,    cursorY: 40,   callout: null },
  { time: 60496,   cursorX: NAV_X, cursorY: 20.5 },

  // ── Operations (operations = 11 208 ms) ──────────────────────
  // click at 61 096; ends at 72 304 → next at 73 304
  { time: 61096,   cursorX: NAV_X, cursorY: 20.5, navigateTo: '/operations',       isClick: true, audioId: 'operations' },
  { time: 63096,   cursorX: 38,    cursorY: 40,   callout: 'Delivery, efficiency, and quality KPIs — tracked against targets in real time' },
  { time: 67500,   cursorX: 65,    cursorY: 40,   callout: null },
  { time: 73304,   cursorX: NAV_X, cursorY: 23.2 },

  // ── Product (product = 11 400 ms) ────────────────────────────
  // click at 73 904; ends at 85 304 → next at 86 304
  { time: 73904,   cursorX: NAV_X, cursorY: 23.2, navigateTo: '/product',          isClick: true, audioId: 'product' },
  { time: 75904,   cursorX: 38,    cursorY: 40,   callout: 'Feature adoption, usage trends, and release velocity — all in one view' },
  { time: 80000,   cursorX: 65,    cursorY: 40,   callout: null },
  { time: 86304,   cursorX: NAV_X, cursorY: 25.9 },

  // ── Marketing (marketing = 10 704 ms) ────────────────────────
  // click at 86 904; ends at 97 608 → next at 98 608
  { time: 86904,   cursorX: NAV_X, cursorY: 25.9, navigateTo: '/marketing',        isClick: true, audioId: 'marketing' },
  { time: 88904,   cursorX: 38,    cursorY: 40,   callout: 'Lead gen, campaign performance, and cost per acquisition by channel' },
  { time: 93000,   cursorX: 65,    cursorY: 40,   callout: null },
  { time: 98608,   cursorX: NAV_X, cursorY: 28.6 },

  // ── Sales (sales = 11 664 ms) ────────────────────────────────
  // click at 99 208; ends at 110 872 → next at 111 872
  { time: 99208,   cursorX: NAV_X, cursorY: 28.6, navigateTo: '/sales',            isClick: true, audioId: 'sales' },
  { time: 101208,  cursorX: 38,    cursorY: 40,   callout: 'Pipeline, win rates, deal size, and revenue by stage and rep' },
  { time: 105500,  cursorX: 65,    cursorY: 40,   callout: null },
  { time: 111872,  cursorX: NAV_X, cursorY: 31.3 },

  // ── People (people = 10 248 ms) ──────────────────────────────
  // click at 112 472; ends at 122 720 → next at 123 720
  { time: 112472,  cursorX: NAV_X, cursorY: 31.3, navigateTo: '/people',           isClick: true, audioId: 'people' },
  { time: 114472,  cursorX: 38,    cursorY: 40,   callout: 'Headcount by department, hiring velocity, and team growth trends' },
  { time: 118500,  cursorX: 65,    cursorY: 40,   callout: null },
  { time: 123720,  cursorX: NAV_X, cursorY: 35.1 },

  // ── Portfolio (portfolio = 14 520 ms) ────────────────────────
  // click at 124 320; ends at 138 840 → next at 139 840
  { time: 124320,  cursorX: NAV_X, cursorY: 35.1, navigateTo: '/portfolio',        isClick: true, audioId: 'portfolio' },
  { time: 126320,  cursorX: 50,    cursorY: 22,   callout: 'Fund-level metrics at a glance — then drill into any portfolio company' },
  { time: 132000,  cursorX: 65,    cursorY: 55,   callout: null },
  { time: 139840,  cursorX: NAV_X, cursorY: 37.8 },

  // ── M&A (ma = 13 752 ms) ─────────────────────────────────────
  // click at 140 440; ends at 154 192 → next at 155 192
  { time: 140440,  cursorX: NAV_X, cursorY: 37.8, navigateTo: '/ma',               isClick: true, audioId: 'ma' },
  { time: 142440,  cursorX: 30,    cursorY: 42,   callout: 'Kanban pipeline — every deal tracked from sourcing through to close' },
  { time: 148000,  cursorX: 65,    cursorY: 42,   callout: null },
  { time: 155192,  cursorX: NAV_X, cursorY: 40.5 },

  // ── Reports (reports = 13 560 ms) ────────────────────────────
  // click at 155 792; ends at 169 352 → next at 170 352
  { time: 155792,  cursorX: NAV_X, cursorY: 40.5, navigateTo: '/reports',          isClick: true, audioId: 'reports' },
  { time: 157792,  cursorX: 38,    cursorY: 40,   callout: 'Peer benchmarks and investor-ready report exports in one click' },
  { time: 163500,  cursorX: 65,    cursorY: 40,   callout: null },
  { time: 170352,  cursorX: NAV_X, cursorY: 43.2 },

  // ── Professional Services (services = 9 720 ms) ───────────────
  // click at 170 952; ends at 180 672 → next at 181 672
  { time: 170952,  cursorX: NAV_X, cursorY: 43.2, navigateTo: '/services',         isClick: true, audioId: 'services' },
  { time: 172952,  cursorX: 38,    cursorY: 40,   callout: 'Active client engagements, project milestones, and revenue per engagement' },
  { time: 177000,  cursorX: 65,    cursorY: 40,   callout: null },
  { time: 181672,  cursorX: NAV_X, cursorY: 6.9 },

  // ── Back to Dashboard + outro (outro = 11 760 ms) ────────────
  // click at 182 272; outro ends at 182 272 + 11 760 = 194 032
  { time: 182272,  cursorX: NAV_X, cursorY: 6.9,  navigateTo: '/app',              isClick: true, audioId: 'outro' },
  { time: 184272,  cursorX: 50,    cursorY: 40,   callout: 'One platform. Every financial insight. Total portfolio clarity.' },
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
  const iframeRef    = useRef<HTMLIFrameElement>(null);
  const audioRef     = useRef<HTMLAudioElement | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [cursorX, setCursorX]                 = useState(50);
  const [cursorY, setCursorY]                 = useState(48);
  const [isClicking, setIsClicking]           = useState(false);
  const [callout, setCallout]                 = useState<string | null>(null);
  const [urlLabel, setUrlLabel]               = useState('inventninvest.com/app');
  const [isTransitioning, setIsTransitioning] = useState(false);

  /**
   * Play a narration clip. If a previous clip is playing, fade it out over
   * 400ms first, then start the new clip at full volume — no simultaneous
   * overlap so there's never two voices at once.
   */
  const playAudio = useCallback((id: string) => {
    const FADE_OUT_MS = 400;
    const STEPS       = 8;
    const INTERVAL    = FADE_OUT_MS / STEPS;

    if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);

    const prev = audioRef.current;

    const startClip = () => {
      const next = new Audio(`/ini-demo-video/audio/${id}.mp3`);
      next.volume = 1;
      audioRef.current = next;
      next.play().catch(() => { /* autoplay blocked — visuals still run */ });
    };

    if (prev && !prev.ended && !prev.paused) {
      // Fade the previous clip out, then start the next one
      let step = 0;
      fadeTimerRef.current = setInterval(() => {
        step++;
        prev.volume = Math.max(0, 1 - step / STEPS);
        if (step >= STEPS) {
          if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
          prev.pause();
          prev.src = '';
          startClip();
        }
      }, INTERVAL);
    } else {
      startClip();
    }
  }, []);

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

    </motion.div>
  );
}
