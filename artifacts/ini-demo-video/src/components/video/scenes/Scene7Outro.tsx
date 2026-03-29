import { motion } from 'framer-motion';

export function Scene7Outro() {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center bg-[#0c1424] z-10 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      {/* Radial glow — slightly stronger than intro for dramatic close */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 75% 65% at 50% 46%, rgba(37,99,235,0.3) 0%, rgba(37,99,235,0.1) 40%, transparent 70%)',
        }}
      />

      <motion.div
        className="flex flex-col items-center relative z-10"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      >
        <motion.img
          src="/images/ini-logo-transparent.png"
          alt="iNi Logo"
          style={{
            width: '50vw',
            maxWidth: 960,
            minWidth: 480,
            height: 'auto',
            marginBottom: 44,
            filter:
              'drop-shadow(0 0 120px rgba(37,99,235,0.8)) drop-shadow(0 0 50px rgba(37,99,235,0.5))',
          }}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        />

        <motion.h1
          style={{
            fontSize: 'clamp(3rem, 5vw, 5.5rem)',
            fontWeight: 800,
            color: 'white',
            letterSpacing: '-0.03em',
            marginBottom: '1.5rem',
            lineHeight: 1,
            fontFamily: 'Space Grotesk, system-ui, sans-serif',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          Invent N Invest
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          style={{
            padding: '12px 32px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 999,
            backdropFilter: 'blur(8px)',
          }}
        >
          <p style={{
            fontFamily: 'JetBrains Mono, Space Grotesk, monospace',
            fontSize: '1.4rem',
            color: '#60a5fa',
            letterSpacing: '0.06em',
          }}>
            inventninvest.com
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
