import { motion } from "framer-motion";
import { List, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWatchlists } from "@/hooks/use-api";
import type { Watchlist } from "@/api/types";

interface WatchlistPickerProps {
  selectedId: number | null;
  onSelect: (id: number) => void;
}

const WatchlistPicker = ({ selectedId, onSelect }: WatchlistPickerProps) => {
  const { data: watchlists = [], isLoading } = useWatchlists(true);

  return (
    <motion.div
      initial={false}
      className="glass rounded-2xl overflow-hidden"
    >
      <div className="px-5 py-4">
        <div className="flex items-center gap-3 mb-4">
          <List className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Watchlist</span>
        </div>

        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading watchlists...</p>
        )}

        {!isLoading && watchlists.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No watchlists found in StreamyStats.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {watchlists.map((wl: Watchlist) => (
            <button
              key={wl.id}
              onClick={() => onSelect(wl.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedId === wl.id
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "bg-secondary/30 text-muted-foreground border border-transparent hover:border-border"
              }`}
            >
              <span>{wl.name}</span>
              <Badge
                variant="secondary"
                className="bg-secondary/50 text-muted-foreground border-border/30 text-xs"
              >
                <Hash className="w-3 h-3 mr-0.5" />
                {wl.item_count}
              </Badge>
              {wl.allowed_item_type && (
                <Badge
                  variant="secondary"
                  className="bg-secondary/50 text-muted-foreground border-border/30 text-xs"
                >
                  {wl.allowed_item_type}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default WatchlistPicker;
