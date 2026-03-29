import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene3Integrations() {
  const tools = ['QuickBooks', 'HubSpot', 'Stripe', 'Google Sheets', 'Gusto'];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center bg-transparent z-10"
      variants={sceneTransitions.morphExpand}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="text-center w-full max-w-5xl">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16"
        >
          <h2 className="text-6xl font-display font-bold text-white mb-6">Live Integrations</h2>
          <p className="text-2xl text-accent font-light">All your data synced automatically.</p>
        </motion.div>

        <div className="flex justify-center items-center gap-8 flex-wrap">
          {tools.map((tool, i) => (
            <motion.div
              key={tool}
              className="bg-bg-muted/80 backdrop-blur-xl border border-white/10 rounded-2xl px-8 py-6 shadow-2xl flex items-center gap-4"
              initial={{ opacity: 0, x: -50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.15, type: 'spring', stiffness: 400, damping: 25 }}
            >
              <div className="w-4 h-4 rounded-full bg-success shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
              <span className="text-2xl font-medium text-white">{tool}</span>
            </motion.div>
          ))}
        </div>
        
        <motion.div
          className="mt-20 flex justify-center"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.8 }}
        >
          <div className="h-1 w-64 bg-gradient-to-r from-transparent via-accent to-transparent rounded-full opacity-50" />
        </motion.div>
      </div>
    </motion.div>
  );
}
