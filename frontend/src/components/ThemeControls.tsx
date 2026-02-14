import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Palette } from "lucide-react";
import { useTheme, ACCENT_COLORS } from "./ThemeProvider";

const ThemeControls = () => {
  const { accentIndex, setAccentIndex } = useTheme();
  const [showPalette, setShowPalette] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {/* Accent color picker */}
      <div className="relative">
        <button
          onClick={() => setShowPalette(!showPalette)}
          className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-secondary/50 transition-colors border border-border/50"
          title="Accent color"
        >
          <Palette className="w-4 h-4 text-muted-foreground" />
        </button>

        <AnimatePresence>
          {showPalette && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 p-3 glass rounded-xl z-50 min-w-[180px]"
            >
              <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Accent</p>
              <div className="grid grid-cols-3 gap-2">
                {ACCENT_COLORS.map((color, i) => (
                  <button
                    key={color.name}
                    onClick={() => {
                      setAccentIndex(i);
                      setShowPalette(false);
                    }}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all ${
                      accentIndex === i ? "bg-secondary/80 ring-1 ring-primary/40" : "hover:bg-secondary/40"
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-full border-2 transition-transform"
                      style={{
                        backgroundColor: color.preview,
                        borderColor: accentIndex === i ? color.preview : "transparent",
                        transform: accentIndex === i ? "scale(1.15)" : "scale(1)",
                      }}
                    />
                    <span className="text-[10px] text-muted-foreground">{color.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ThemeControls;
