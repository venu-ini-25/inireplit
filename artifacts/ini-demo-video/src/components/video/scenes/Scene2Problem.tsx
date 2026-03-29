import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video/animations';
import { useEffect, useState } from 'react';

export function Scene2Problem() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 500),
      setTimeout(() => setStep(2), 1500),
      setTimeout(() => setStep(3), 2500),
      setTimeout(() => setStep(4), 3500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center bg-transparent z-10"
      variants={sceneTransitions.perspectiveFlip}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="max-w-6xl w-full px-12">
        <motion.h2 
          className="text-5xl font-display font-bold text-white mb-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          The Problem with Portfolio Management
        </motion.h2>

        <div className="grid grid-cols-3 gap-8">
          <motion.div
            className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md"
            initial={{ opacity: 0, y: 30, rotateX: 20 }}
            animate={{ opacity: step >= 1 ? 1 : 0, y: step >= 1 ? 0 : 30, rotateX: step >= 1 ? 0 : 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
              <span className="text-red-400 text-xl font-bold">1</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Scattered Data</h3>
            <p className="text-text-secondary text-lg">Financials in spreadsheets, cap tables in PDFs, metrics in emails.</p>
          </motion.div>

          <motion.div
            className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md"
            initial={{ opacity: 0, y: 30, rotateX: 20 }}
            animate={{ opacity: step >= 2 ? 1 : 0, y: step >= 2 ? 0 : 30, rotateX: step >= 2 ? 0 : 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center mb-6">
              <span className="text-warning text-xl font-bold">2</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">5 Different Tools</h3>
            <p className="text-text-secondary text-lg">Constant context switching. Fragmented systems that don't talk to each other.</p>
          </motion.div>

          <motion.div
            className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md"
            initial={{ opacity: 0, y: 30, rotateX: 20 }}
            animate={{ opacity: step >= 3 ? 1 : 0, y: step >= 3 ? 0 : 30, rotateX: step >= 3 ? 0 : 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mb-6">
              <span className="text-accent text-xl font-bold">3</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">No Single Source</h3>
            <p className="text-text-secondary text-lg">Struggling to find the truth across conflicting datasets and reports.</p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
