import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene1Intro() {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center bg-[#0c1424] z-10"
      variants={sceneTransitions.clipCircle}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(37,99,235,0.18) 0%, transparent 70%)' }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        className="flex flex-col items-center relative z-10"
      >
        <div className="w-72 h-72 mb-8 relative flex items-center justify-center">
          <img src="/images/ini-logo-transparent.png" alt="iNi Logo" className="w-full h-full object-contain drop-shadow-[0_0_60px_rgba(37,99,235,0.6)]" />
        </div>
        
        <motion.h1 
          className="text-7xl font-display font-bold text-white tracking-tight mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          Invent N Invest
        </motion.h1>
        
        <motion.p
          className="text-3xl text-text-secondary font-body font-light tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
        >
          Portfolio Intelligence. <span className="text-accent font-medium">Precision Finance.</span>
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
