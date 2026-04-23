import { AnimatePresence, motion } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1Intro } from './scenes/Scene1Intro';
import { LiveDemoScene } from './scenes/LiveDemoScene';
import { Scene7Outro } from './scenes/Scene7Outro';

const SCENE_DURATIONS = {
  intro:  5000,
  demo:  196000,   // 14 narration clips, each plays fully before next page loads
  outro:   6000,
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({
    durations: SCENE_DURATIONS,
    loop: false,
  });

  return (
    <div className="w-full h-screen overflow-hidden relative bg-[#0c1424]">
      {/* Persistent ambient glow — stays across all scenes */}
      <motion.div
        className="absolute pointer-events-none z-0"
        animate={{
          opacity: currentScene === 1 ? 0 : 0.6,
          scale: currentScene === 0 ? 1.2 : 1,
        }}
        transition={{ duration: 1.5 }}
        style={{
          inset: 0,
          background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(37,99,235,0.15) 0%, transparent 70%)',
        }}
      />

      <AnimatePresence mode="wait">
        {currentScene === 0 && <Scene1Intro key="intro" />}
        {currentScene === 1 && <LiveDemoScene key="demo" />}
        {currentScene === 2 && <Scene7Outro key="outro" />}
      </AnimatePresence>
    </div>
  );
}
