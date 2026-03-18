import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Star, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MediaItem } from "@/api/types";

interface MediaCardProps {
  item: MediaItem;
  index: number;
  action?: React.ReactNode;
}

const MediaCard = ({ item, index, action }: MediaCardProps) => {
  const [expanded, setExpanded] = useState(false);

  const watchStatusColors = {
    unwatched: "bg-primary/20 text-primary",
    watched: "bg-emerald-500/20 text-emerald-400",
    partial: "bg-amber-500/20 text-amber-400",
  };

  const watchStatusLabel = {
    unwatched: "Unwatched",
    watched: "Watched",
    partial: `${Math.round(item.watch_percent)}% watched`,
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl overflow-hidden group hover:glow-border transition-shadow duration-500"
    >
      <div className="flex gap-0">
        {/* Poster */}
        <div className="relative w-32 sm:w-40 flex-shrink-0">
          <div className="aspect-[2/3] bg-secondary/50 overflow-hidden">
            {item.poster ? (
              <img
                src={item.poster}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                No poster
              </div>
            )}
          </div>
          {/* Service indicator */}
          <div className="absolute top-2 left-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              item.service === "jellyfin" ? "bg-purple-500/80" : "bg-orange-500/80"
            }`}>
              {item.service === "jellyfin" ? "J" : "P"}
            </div>
          </div>
          {/* Watch progress bar */}
          {item.watch_status === "partial" && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary/80">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${item.watch_percent}%` }}
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">{item.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                {item.year && <span className="text-xs text-muted-foreground">{item.year}</span>}
              </div>
            </div>
            {/* Rating */}
            {item.rating != null && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <Star className="w-4 h-4 text-primary fill-primary" />
                <span className="text-sm font-semibold text-foreground">{item.rating}</span>
              </div>
            )}
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            <Badge variant="outline" className={`text-xs ${watchStatusColors[item.watch_status]} border-0`}>
              <Eye className="w-3 h-3 mr-1" />
              {watchStatusLabel[item.watch_status]}
            </Badge>
            {item.genres.slice(0, 3).map((genre) => (
              <Badge key={genre} variant="outline" className="text-xs bg-secondary/50 text-secondary-foreground border-border/30">
                {genre}
              </Badge>
            ))}
          </div>

          {/* Cast */}
          {item.cast.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground truncate">
                {item.cast.slice(0, 4).join(" · ")}
              </p>
            </div>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.tags.map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/70">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-auto pt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Less" : "Synopsis"}
          </button>

          {action && <div className="pt-2 flex justify-end">{action}</div>}
        </div>
      </div>

      {/* Expandable synopsis */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-border/20 pt-3">
              <p className="text-sm text-muted-foreground leading-relaxed">{item.synopsis}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MediaCard;
