import { motion } from "framer-motion";
import { Shuffle } from "lucide-react";
import ThemeControls from "./ThemeControls";

const Header = () => {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-between px-6 py-4 glass border-b border-border/30"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center glow-border">
            <Shuffle className="w-5 h-5 text-primary" />
          </div>
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-gradient">Shuffle</span>
            <span className="text-foreground">fin</span>
          </h1>
          <p className="text-xs text-muted-foreground">Random media picker</p>
        </div>
      </div>

      <ThemeControls />
    </motion.header>
  );
};

export default Header;
