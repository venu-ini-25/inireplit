import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video/animations';
import { useEffect, useState } from 'react';

export function Scene4Dashboard() {
  const [showCards, setShowCards] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowCards(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const kpis = [
    { label: 'Total ARR', value: '$14.2M', trend: '+12%', color: 'text-success' },
    { label: 'Revenue', value: '$28.5M', trend: '+8%', color: 'text-success' },
    { label: 'MOIC', value: '2.4x', trend: '+0.2x', color: 'text-accent' },
    { label: 'IRR', value: '34%', trend: '+2%', color: 'text-accent' },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center bg-transparent z-10 p-16"
      variants={sceneTransitions.wipe}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <motion.div 
        className="w-full h-full bg-bg-muted/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-10 flex flex-col overflow-hidden shadow-2xl relative"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
      >
        {/* Mockup Header */}
        <div className="flex justify-between items-center mb-10 pb-6 border-b border-white/10">
          <h2 className="text-3xl font-display font-bold text-white">Portfolio Overview</h2>
          <div className="flex gap-4">
            <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70">Q3 2024</div>
            <div className="px-4 py-2 rounded-lg bg-accent text-white font-medium">Export Report</div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-6 mb-10">
          {kpis.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              className="bg-white/5 border border-white/5 rounded-2xl p-6 relative overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: showCards ? 1 : 0, y: showCards ? 0 : 20 }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl -mr-10 -mt-10" />
              <p className="text-text-secondary text-lg mb-2">{kpi.label}</p>
              <h3 className="text-4xl font-display font-bold text-white mb-2">{kpi.value}</h3>
              <p className={`text-sm font-medium ${kpi.color}`}>{kpi.trend} vs last quarter</p>
            </motion.div>
          ))}
        </div>

        {/* Chart Area */}
        <motion.div 
          className="flex-1 bg-white/5 border border-white/5 rounded-2xl p-6 flex flex-col relative"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: showCards ? 1 : 0, scale: showCards ? 1 : 0.95 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-accent/10 to-transparent rounded-2xl opacity-50" />
          <h4 className="text-xl font-medium text-white mb-6 z-10">Revenue Growth Across Portfolio</h4>
          <div className="flex-1 flex items-end gap-4 z-10">
            {[40, 45, 55, 60, 50, 70, 85, 80, 95, 100].map((h, i) => (
              <motion.div 
                key={i}
                className="flex-1 bg-accent rounded-t-sm"
                initial={{ height: 0 }}
                animate={{ height: showCards ? `${h}%` : 0 }}
                transition={{ delay: 0.8 + i * 0.05, duration: 0.8, type: 'spring' }}
                style={{ opacity: 0.5 + (i * 0.05) }}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
