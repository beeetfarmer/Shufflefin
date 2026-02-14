import { motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";

interface CountSelectorProps {
  value: number;
  onChange: (val: number) => void;
}

const CountSelector = ({ value, onChange }: CountSelectorProps) => {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Pick</span>
      <div className="flex items-center gap-1 glass rounded-xl px-1 py-1">
        <button
          onClick={() => onChange(Math.max(1, value - 1))}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
        >
          <Minus className="w-3 h-3" />
        </button>
        <motion.span
          key={value}
          initial={{ scale: 1.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-8 text-center text-sm font-semibold text-foreground"
        >
          {value}
        </motion.span>
        <button
          onClick={() => onChange(Math.min(20, value + 1))}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
      <span className="text-xs text-muted-foreground">items</span>
    </div>
  );
};

export default CountSelector;
