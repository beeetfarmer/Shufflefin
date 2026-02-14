import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useRef } from "react";
import { Shuffle, Sparkles, Film } from "lucide-react";
import type { MediaItem } from "@/api/types";

interface SpinItem {
  title: string;
  year: number | null;
  poster: string | null;
}

const PLACEHOLDER_TITLES = [
  "What will it be?",
  "Something great...",
  "A hidden gem?",
  "Your next favourite",
  "Rolling the dice...",
  "The suspense...",
];

interface ShuffleRouletteProps {
  onShuffle: () => Promise<MediaItem[]>;
  isLoading: boolean;
  previousResults: MediaItem[];
  onSpinComplete?: () => void;
}

const ShuffleRoulette = ({ onShuffle, isLoading, previousResults, onSpinComplete }: ShuffleRouletteProps) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const spinItems: SpinItem[] =
    previousResults.length > 0
      ? previousResults.map((r) => ({ title: r.title, year: r.year, poster: r.poster }))
      : PLACEHOLDER_TITLES.map((t) => ({ title: t, year: null, poster: null }));

  const startShuffle = useCallback(async () => {
    if (isSpinning || isLoading) return;
    setIsSpinning(true);
    setShowResult(false);

    let currentIdx = 0;
    let iterations = 0;
    const maxIterations = 25 + Math.floor(Math.random() * 10);

    const spin = () => {
      currentIdx = (currentIdx + 1) % spinItems.length;
      setSelectedIndex(currentIdx);
      iterations++;

      if (iterations >= maxIterations) {
        return;
      }

      const speed = 60 + Math.pow(iterations / maxIterations, 2) * 300;
      intervalRef.current = setTimeout(spin, speed);
    };

    spin();

    try {
      await onShuffle();
      await new Promise<void>((resolve) => {
        const check = () => {
          if (iterations >= maxIterations) {
            resolve();
          } else {
            setTimeout(check, 50);
          }
        };
        check();
      });
      setSelectedIndex(0);
      setIsSpinning(false);
      setShowResult(true);
      onSpinComplete?.();
    } catch {
      if (intervalRef.current) clearTimeout(intervalRef.current);
      setIsSpinning(false);
    }
  }, [isSpinning, isLoading, onShuffle, spinItems.length]);

  const currentItem = spinItems[selectedIndex % spinItems.length];
  const hasPosters = previousResults.length > 0;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Slot machine display */}
      <motion.div
        className="relative w-48 h-64 rounded-2xl overflow-hidden glass glow-border"
        animate={isSpinning ? { scale: [1, 1.02, 1] } : {}}
        transition={{ repeat: Infinity, duration: 0.3 }}
      >
        <AnimatePresence mode="popLayout">
          <motion.div
            key={isSpinning ? selectedIndex : `result-${selectedIndex}`}
            initial={{ y: -80, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.8 }}
            transition={{ duration: isSpinning ? 0.08 : 0.4, ease: "easeOut" }}
            className="absolute inset-0"
          >
            {currentItem.poster ? (
              <img
                src={currentItem.poster}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/10 via-secondary/50 to-primary/5 flex flex-col items-center justify-center gap-3">
                <Film className={`w-10 h-10 text-primary/40 ${isSpinning ? "animate-pulse" : ""}`} />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-background/40" />
            <div className="absolute bottom-3 left-3 right-3">
              <p className={`text-sm font-semibold truncate ${hasPosters ? "text-foreground" : "text-muted-foreground"}`}>
                {currentItem.title}
              </p>
              {currentItem.year && (
                <p className="text-xs text-muted-foreground">
                  {currentItem.year}
                </p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Scanline effect while spinning */}
        {isSpinning && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5" />
            <motion.div
              className="absolute left-0 right-0 h-px bg-primary/40"
              animate={{ top: ["0%", "100%"] }}
              transition={{ repeat: Infinity, duration: 0.5, ease: "linear" }}
            />
          </div>
        )}

        {/* Glow effect on result */}
        {showResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1 }}
            className="absolute inset-0 border-2 border-primary rounded-2xl pointer-events-none"
            style={{ boxShadow: "inset 0 0 30px hsl(var(--primary) / 0.3), 0 0 30px hsl(var(--primary) / 0.2)" }}
          />
        )}
      </motion.div>

      {/* Shuffle button */}
      <motion.button
        onClick={startShuffle}
        disabled={isSpinning || isLoading}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`relative flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-primary-foreground transition-all duration-300 ${
          isSpinning || isLoading
            ? "bg-muted cursor-not-allowed"
            : "bg-primary hover:brightness-110 animate-pulse-glow"
        }`}
        style={!(isSpinning || isLoading) ? { background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--glow-secondary)))" } : undefined}
      >
        {isSpinning || isLoading ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.6, ease: "linear" }}
            >
              <Shuffle className="w-5 h-5" />
            </motion.div>
            <span>Shuffling...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            <span>Shuffle!</span>
          </>
        )}
      </motion.button>
    </div>
  );
};

export default ShuffleRoulette;
