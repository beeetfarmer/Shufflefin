import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useRef, useEffect } from "react";
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

// Fewer tiles than this and the reel does not read as motion.
const MIN_REEL = 5;
const SPIN_MS = 60;
const MIN_SPINS = 16;
const DECEL_STEPS = 10;

const toSpinItems = (items: MediaItem[]): SpinItem[] =>
  items.map((r) => ({ title: r.title, year: r.year, poster: r.poster }));

const placeholderItems = (): SpinItem[] =>
  PLACEHOLDER_TITLES.map((t) => ({ title: t, year: null, poster: null }));

const padReel = (items: SpinItem[], filler: SpinItem[]): SpinItem[] =>
  items.length >= MIN_REEL ? items : [...items, ...filler].slice(0, MIN_REEL);

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
  // Snapshot of the tiles being cycled. Held in state rather than derived from
  // previousResults so that results arriving mid-spin cannot swap the reel out
  // from under the animation.
  const [reel, setReel] = useState<SpinItem[] | null>(null);
  const spinningRef = useRef(false);
  const cancelledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Drop the snapshot when the results are cleared from outside (filter change),
  // so the idle tile falls back to placeholders instead of a stale poster.
  useEffect(() => {
    if (!spinningRef.current) setReel(null);
  }, [previousResults]);

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      timerRef.current = setTimeout(resolve, ms);
    });

  const startShuffle = useCallback(async () => {
    if (spinningRef.current || isLoading) return;

    const spinReel = padReel(
      previousResults.length > 0 ? toSpinItems(previousResults) : placeholderItems(),
      placeholderItems(),
    );

    spinningRef.current = true;
    setIsSpinning(true);
    setShowResult(false);
    setReel(spinReel);
    setSelectedIndex(0);

    let fetched: MediaItem[] = [];
    let failed = false;
    let settled = false;
    const request = onShuffle()
      .then((r) => {
        fetched = r;
      })
      .catch(() => {
        failed = true;
      })
      .finally(() => {
        settled = true;
      });

    const stop = () => {
      spinningRef.current = false;
      setIsSpinning(false);
    };

    // Phase 1 — steady blur that keeps running until the request lands, so the
    // reel never freezes on a tile while waiting on the network.
    let idx = 0;
    let spins = 0;
    while (!cancelledRef.current && (!settled || spins < MIN_SPINS)) {
      idx = (idx + 1) % spinReel.length;
      setSelectedIndex(idx);
      spins++;
      await sleep(SPIN_MS);
    }

    await request;
    if (cancelledRef.current) return;

    if (failed) {
      stop();
      return;
    }

    if (fetched.length === 0) {
      stop();
      onSpinComplete?.();
      return;
    }

    // Phase 2 — swap in the new picks and decelerate across them, so the reel
    // visibly walks onto the winner instead of snapping to it.
    const landingReel = padReel(toSpinItems(fetched), spinReel);
    setReel(landingReel);

    for (let step = DECEL_STEPS; step >= 1; step--) {
      if (cancelledRef.current) return;
      setSelectedIndex(((-step % landingReel.length) + landingReel.length) % landingReel.length);
      await sleep(SPIN_MS + Math.pow((DECEL_STEPS - step + 1) / DECEL_STEPS, 2) * 260);
    }
    if (cancelledRef.current) return;

    setSelectedIndex(0);
    stop();
    setShowResult(true);
    onSpinComplete?.();
  }, [isLoading, onShuffle, onSpinComplete, previousResults]);

  const idleReel = previousResults.length > 0 ? toSpinItems(previousResults) : placeholderItems();
  const displayReel = reel ?? idleReel;
  const currentItem = displayReel[selectedIndex % displayReel.length] ?? displayReel[0];
  const hasPosters = Boolean(currentItem?.poster);

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
