import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene5Pages() {
  const pages = [
    'Overview', 'Pipeline', 'P&L', 'Cash Flow', 
    'Headcount', 'Fundraising', 'Cap Table', 'KPIs', 
    'Metrics', 'Benchmarks', 'Risk', 'Documents', 'Reports'
  ];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center bg-transparent z-10"
      variants={sceneTransitions.splitHorizontal}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="max-w-7xl w-full text-center px-12">
        <motion.h2 
          className="text-6xl font-display font-bold text-white mb-8"
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        >
          14 Purpose-Built Workspaces
        </motion.h2>
        
        <motion.p
          className="text-2xl text-text-secondary mb-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          Everything a firm needs. Nothing it doesn't.
        </motion.p>

        <div className="flex flex-wrap justify-center gap-4">
          {pages.map((page, i) => (
            <motion.div
              key={page}
              className="bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-sm rounded-full px-6 py-3"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ 
                delay: 0.5 + (i * 0.05), 
                type: 'spring', 
                stiffness: 300, 
                damping: 20 
              }}
            >
              <span className="text-white text-xl tracking-wide">{page}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
