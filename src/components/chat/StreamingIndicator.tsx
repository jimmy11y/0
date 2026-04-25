import { motion } from 'framer-motion';

interface StreamingIndicatorProps {
  theme?: 'dark' | 'light';
}

export default function StreamingIndicator({ theme = 'dark' }: StreamingIndicatorProps) {
  const isDark = theme === 'dark';

  return (
    <div className="flex items-center gap-3 mt-3">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={`w-2 h-2 rounded-full ${isDark ? 'bg-white/40' : 'bg-[#1a1a1a]/30'}`}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.4, 0.9, 0.4],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      <span className={`text-[10px] tracking-wider uppercase ${isDark ? 'text-white/25' : 'text-[#1a1a1a]/30'}`}>
        Generating response
      </span>
    </div>
  );
}
