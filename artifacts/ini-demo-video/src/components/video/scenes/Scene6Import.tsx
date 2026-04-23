import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video/animations';
import { useEffect, useState } from 'react';

export function Scene6Import() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 1000), // Drag
      setTimeout(() => setStep(2), 2000), // Map
      setTimeout(() => setStep(3), 3500), // Complete
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center bg-transparent z-10"
      variants={sceneTransitions.slideUp}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="w-full max-w-4xl text-center">
        <motion.h2 
          className="text-5xl font-display font-bold text-white mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          Bulk Data Import in Seconds
        </motion.h2>

        <div className="bg-bg-muted/50 border border-white/10 rounded-3xl p-12 backdrop-blur-xl relative overflow-hidden h-[400px] flex items-center justify-center">
          {/* Step 0/1: Drag & Drop */}
          <motion.div 
            className="absolute inset-0 flex flex-col items-center justify-center bg-white/5 border-2 border-dashed border-white/20 rounded-2xl m-8"
            animate={{ opacity: step < 2 ? 1 : 0, scale: step < 2 ? 1 : 1.1 }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-2xl text-white font-medium mb-2">Drag & Drop CSV / Excel</p>
            <p className="text-text-secondary">or click to browse</p>

            {/* Simulating a dragged file */}
            <motion.div
              className="absolute top-1/2 left-1/2 -ml-32 -mt-10 bg-white shadow-2xl rounded-lg p-4 flex items-center gap-3 w-64 border border-gray-200"
              initial={{ x: -300, y: -200, opacity: 0, rotate: -15 }}
              animate={{ 
                x: step >= 1 ? 0 : -300, 
                y: step >= 1 ? 0 : -200, 
                opacity: step >= 1 ? 1 : 0,
                rotate: step >= 1 ? 0 : -15 
              }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <div className="w-10 h-10 bg-green-100 rounded flex items-center justify-center text-green-600 font-bold">XLSX</div>
              <div>
                <p className="text-gray-900 font-medium text-sm">Financials_Q3.xlsx</p>
                <p className="text-gray-500 text-xs">2.4 MB</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Step 2: Mapping */}
          <motion.div 
            className="absolute inset-0 flex flex-col items-center justify-center p-12 bg-bg-muted"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: step === 2 ? 1 : 0, x: step === 2 ? 0 : (step > 2 ? -100 : 100) }}
            transition={{ duration: 0.6 }}
          >
             <h3 className="text-2xl text-white font-medium mb-8">Map Columns</h3>
             <div className="w-full max-w-2xl bg-white/5 rounded-xl border border-white/10 p-6">
                <div className="flex justify-between border-b border-white/10 pb-4 mb-4 text-text-secondary">
                  <span>File Column</span>
                  <span>iNi Data Field</span>
                </div>
                {[1,2,3].map((_, i) => (
                  <div key={i} className="flex justify-between items-center mb-4">
                    <div className="bg-white/10 px-4 py-2 rounded text-white text-sm">Revenue_Total</div>
                    <div className="text-accent">→</div>
                    <div className="bg-accent/20 border border-accent text-accent px-4 py-2 rounded text-sm font-medium">ARR</div>
                  </div>
                ))}
             </div>
          </motion.div>

          {/* Step 3: Complete */}
          <motion.div 
            className="absolute inset-0 flex flex-col items-center justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: step >= 3 ? 1 : 0, scale: step >= 3 ? 1 : 0.8 }}
            transition={{ duration: 0.6, type: 'spring' }}
          >
             <div className="w-32 h-32 rounded-full bg-success/20 flex items-center justify-center mb-6">
               <motion.svg 
                 className="w-16 h-16 text-success" 
                 fill="none" 
                 viewBox="0 0 24 24" 
                 stroke="currentColor"
                 initial={{ pathLength: 0 }}
                 animate={{ pathLength: step >= 3 ? 1 : 0 }}
                 transition={{ duration: 0.8, delay: 0.2 }}
               >
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
               </motion.svg>
             </div>
             <h3 className="text-4xl text-white font-bold mb-2">Import Successful</h3>
             <p className="text-xl text-success">14,203 rows processed instantly.</p>
          </motion.div>

        </div>
      </div>
    </motion.div>
  );
}
