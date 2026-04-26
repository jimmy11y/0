'use client';

import { useTheme } from 'next-themes';

export function WelcomeScreen({ onSelectPrompt }: { onSelectPrompt: (prompt: string) => void }) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 sm:px-6 py-6 sm:py-12">
      <div className="mb-4 sm:mb-6 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600">
        <span className="text-sm sm:text-base font-bold text-white">01</span>
      </div>
      <h1 className={`mb-1.5 sm:mb-2 text-xl sm:text-2xl font-semibold tracking-tight text-center ${isLight ? 'text-black/85' : 'text-white'}`}>
        How can I help you today?
      </h1>
      <p className={`text-xs sm:text-sm text-center ${isLight ? 'text-black/40' : 'text-white/40'}`}>
        Ask me anything to get started
      </p>
    </div>
  );
}
