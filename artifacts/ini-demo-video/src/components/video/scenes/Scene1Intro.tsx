import { motion } from 'framer-motion';

export function Scene1Intro() {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center bg-[#0c1424] z-10 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 46%, rgba(37,99,235,0.28) 0%, rgba(37,99,235,0.08) 45%, transparent 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-0">
        {/* "Welcome to" — appears first */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
          style={{
            fontFamily: 'Space Grotesk, system-ui, sans-serif',
            fontSize: 'clamp(1.1rem, 2vw, 1.6rem)',
            fontWeight: 300,
            color: 'rgba(148,163,184,0.85)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: '1.2rem',
          }}
        >
          Welcome to
        </motion.p>

        {/* Logo — scales in after the welcome text */}
        <motion.img
          src="/images/ini-logo-transparent.png"
          alt="iNi Logo"
          initial={{ opacity: 0, scale: 0.75, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: '68vw',
            maxWidth: 1200,
            minWidth: 560,
            height: 'auto',
            marginBottom: '2.4rem',
            filter:
              'brightness(1.6) drop-shadow(0 0 140px rgba(37,99,235,0.95)) drop-shadow(0 0 60px rgba(96,165,250,0.8)) drop-shadow(0 0 20px rgba(255,255,255,0.4))',
          }}
        />

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 1.0 }}
          style={{
            fontSize: 'clamp(1.1rem, 1.7vw, 1.75rem)',
            color: 'rgba(148,163,184,0.9)',
            fontWeight: 300,
            letterSpacing: '0.025em',
            fontFamily: 'Space Grotesk, system-ui, sans-serif',
          }}
        >
          Portfolio Intelligence.{' '}
          <span style={{ color: '#60a5fa', fontWeight: 500 }}>Precision Finance.</span>
        </motion.p>
      </div>
    </motion.div>
  );
}
