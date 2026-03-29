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
            'radial-gradient(ellipse 70% 60% at 50% 46%, rgba(37,99,235,0.25) 0%, rgba(37,99,235,0.08) 40%, transparent 70%)',
        }}
      />

      <motion.div
        className="flex flex-col items-center relative z-10"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      >
        {/* Logo — 50vw wide so it's huge on any screen */}
        <motion.img
          src="/images/ini-logo-transparent.png"
          alt="iNi Logo"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
          style={{
            width: '50vw',
            maxWidth: 960,
            minWidth: 480,
            height: 'auto',
            marginBottom: 40,
            filter:
              'drop-shadow(0 0 100px rgba(37,99,235,0.7)) drop-shadow(0 0 40px rgba(37,99,235,0.45))',
          }}
        />

        {/* Heading */}
        <motion.h1
          style={{
            fontSize: 'clamp(3rem, 5vw, 5.5rem)',
            fontWeight: 800,
            color: 'white',
            letterSpacing: '-0.03em',
            marginBottom: '0.75rem',
            lineHeight: 1,
            fontFamily: 'Space Grotesk, system-ui, sans-serif',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          Invent N Invest
        </motion.h1>

        {/* Tagline */}
        <motion.p
          style={{
            fontSize: 'clamp(1.1rem, 1.8vw, 1.75rem)',
            color: 'rgba(148,163,184,0.9)',
            fontWeight: 300,
            letterSpacing: '0.025em',
            fontFamily: 'Space Grotesk, system-ui, sans-serif',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.95 }}
        >
          Portfolio Intelligence.{' '}
          <span style={{ color: '#60a5fa', fontWeight: 500 }}>Precision Finance.</span>
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
