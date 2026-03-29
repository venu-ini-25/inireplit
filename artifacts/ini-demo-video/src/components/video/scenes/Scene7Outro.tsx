import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene7Outro() {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center bg-transparent z-10"
      variants={sceneTransitions.zoomThrough}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="absolute inset-0 bg-accent/10 opacity-50 blur-3xl rounded-full scale-150" />
      
      <motion.div
        className="relative z-10 flex flex-col items-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
      >
        <div className="w-32 h-32 mb-8 relative rounded-2xl overflow-hidden flex items-center justify-center">
          <img src="/images/ini-logo-transparent.png" alt="iNi Logo" className="w-full h-full object-contain drop-shadow-[0_0_60px_rgba(37,99,235,0.6)]" />
        </div>
        
        <h1 className="text-8xl font-display font-bold text-white tracking-tighter mb-6 drop-shadow-2xl">
          Invent N Invest
        </h1>
        
        <motion.div
          className="px-8 py-4 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          <p className="text-2xl text-accent font-mono tracking-wider">
            inventninvest.com
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
