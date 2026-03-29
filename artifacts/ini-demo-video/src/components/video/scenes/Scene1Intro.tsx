import { motion } from 'framer-motion';

export function Scene1Intro() {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-10 overflow-hidden"
      style={{ background: '#93b6fa' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Subtle white bloom in center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 65% 55% at 50% 44%, rgba(255,255,255,0.25) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-0">
        {/* "Welcome to" */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
          style={{
            fontFamily: 'Space Grotesk, system-ui, sans-serif',
            fontSize: 'clamp(1.1rem, 2vw, 1.6rem)',
            fontWeight: 500,
            color: 'rgba(30,58,138,0.85)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: '1.2rem',
          }}
        >
          Welcome to
        </motion.p>

        {/* Logo */}
        <motion.img
          src="/images/ini-logo-transparent.png"
          alt="iNi Logo"
          initial={{ opacity: 0, scale: 0.78, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: '68vw',
            maxWidth: 1200,
            minWidth: 560,
            height: 'auto',
            marginBottom: '2.4rem',
            filter:
              'drop-shadow(0 6px 32px rgba(30,58,138,0.4)) drop-shadow(0 2px 8px rgba(30,58,138,0.25))',
          }}
        />

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 1.0 }}
          style={{
            fontSize: 'clamp(1.1rem, 1.7vw, 1.75rem)',
            color: 'rgba(30,58,138,0.75)',
            fontWeight: 400,
            letterSpacing: '0.025em',
            fontFamily: 'Space Grotesk, system-ui, sans-serif',
          }}
        >
          Portfolio Intelligence.{' '}
          <span style={{ color: '#1e3a8a', fontWeight: 600 }}>Precision Finance.</span>
        </motion.p>
      </div>
    </motion.div>
  );
}
