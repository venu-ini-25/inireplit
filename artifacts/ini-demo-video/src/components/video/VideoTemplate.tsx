import { AnimatePresence, motion } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';

import { Scene1Intro } from './scenes/Scene1Intro';
import { Scene2Problem } from './scenes/Scene2Problem';
import { Scene3Integrations } from './scenes/Scene3Integrations';
import { Scene4Dashboard } from './scenes/Scene4Dashboard';
import { Scene5Pages } from './scenes/Scene5Pages';
import { Scene6Import } from './scenes/Scene6Import';
import { Scene7Outro } from './scenes/Scene7Outro';

const SCENE_DURATIONS = {
  intro: 5000,
  problem: 6000,
  integrations: 5000,
  dashboard: 7000,
  pages: 6000,
  import: 6000,
  outro: 6000,
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({
    durations: SCENE_DURATIONS,
    loop: true
  });

  return (
    <div
      className="w-full h-screen overflow-hidden relative"
      style={{ backgroundColor: 'var(--color-bg-dark)' }}
    >
      {/* Background Layers that persist */}
      <div className="absolute inset-0 z-0 bg-grid-pattern opacity-20" />
      
      {/* Dynamic Background Image based on scene */}
      <motion.div 
        className="absolute inset-0 z-0 bg-cover bg-center mix-blend-overlay opacity-30"
        animate={{
          backgroundImage: 
            currentScene <= 1 ? 'url(/images/bg-main.png)' :
            currentScene === 3 || currentScene === 4 ? 'url(/images/bg-dashboard.png)' :
            'url(/images/bg-data.png)',
          scale: 1 + (currentScene * 0.05), // Slow zoom across scenes
        }}
        transition={{ duration: 2 }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary/80 via-transparent to-accent/20" />

      {/* Floating abstract persistent shapes */}
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full bg-accent/10 blur-[100px] z-0"
        animate={{
          x: currentScene % 2 === 0 ? '10vw' : '50vw',
          y: currentScene % 3 === 0 ? '-10vh' : '20vh',
          scale: currentScene === 3 ? 1.5 : 1,
        }}
        transition={{ duration: 3, ease: 'easeInOut' }}
      />

      <AnimatePresence mode="wait">
        {currentScene === 0 && <Scene1Intro key="intro" />}
        {currentScene === 1 && <Scene2Problem key="problem" />}
        {currentScene === 2 && <Scene3Integrations key="integrations" />}
        {currentScene === 3 && <Scene4Dashboard key="dashboard" />}
        {currentScene === 4 && <Scene5Pages key="pages" />}
        {currentScene === 5 && <Scene6Import key="import" />}
        {currentScene === 6 && <Scene7Outro key="outro" />}
      </AnimatePresence>
    </div>
  );
}
