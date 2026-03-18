import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shuffle, AlertCircle, Library, List, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AnimatedBackground from "@/components/AnimatedBackground";
import ServiceToggle from "@/components/ServiceToggle";
import FilterPanel, { defaultFilters, type Filters } from "@/components/FilterPanel";
import CountSelector from "@/components/CountSelector";
import ShuffleRoulette from "@/components/ShuffleRoulette";
import MediaCard from "@/components/MediaCard";
import ThemeControls from "@/components/ThemeControls";
import WatchlistPicker from "@/components/WatchlistPicker";
import AddToWatchlistDialog from "@/components/AddToWatchlistDialog";
import { useHealth, useShuffle, useWatchlistShuffle } from "@/hooks/use-api";
import type { MediaItem } from "@/api/types";

type ShuffleMode = "library" | "watchlist";

const Index = () => {
  const [service, setService] = useState<"jellyfin" | "plex">("jellyfin");
  const [shuffleMode, setShuffleMode] = useState<ShuffleMode>("library");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [shuffleCount, setShuffleCount] = useState(3);
  const [watchlistExcludeWatched, setWatchlistExcludeWatched] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<number | null>(null);
  const [results, setResults] = useState<MediaItem[]>([]);
  const [hasShuffled, setHasShuffled] = useState(false);
  const [spinComplete, setSpinComplete] = useState(false);

  const { toast } = useToast();
  const { data: health, isLoading: healthLoading } = useHealth();
  const shuffleMutation = useShuffle();
  const watchlistShuffleMutation = useWatchlistShuffle();

  const noServiceConfigured = health && !health.jellyfin && !health.plex;
  const streamystatsAvailable = health?.streamystats ?? false;

  // Auto-select first available service
  useEffect(() => {
    if (health) {
      if (!health.jellyfin && health.plex) {
        setService("plex");
      }
    }
  }, [health]);

  // Reset filters when service changes
  const handleServiceChange = useCallback((newService: "jellyfin" | "plex") => {
    setService(newService);
    setFilters(defaultFilters);
    setResults([]);
    setHasShuffled(false);
    setSpinComplete(false);
  }, []);

  const handleModeChange = useCallback((mode: ShuffleMode) => {
    setShuffleMode(mode);
    setResults([]);
    setHasShuffled(false);
    setSpinComplete(false);
  }, []);

  const handleShuffle = useCallback(async (): Promise<MediaItem[]> => {
    setSpinComplete(false);

    if (shuffleMode === "watchlist") {
      if (selectedWatchlistId === null) {
        toast({ title: "Select a watchlist", description: "Pick a watchlist first.", variant: "destructive" });
        return [];
      }

      const result = await watchlistShuffleMutation.mutateAsync({
        watchlist_id: selectedWatchlistId,
        count: shuffleCount,
        exclude_watched: watchlistExcludeWatched,
      });

      setResults(result);
      setHasShuffled(true);

      if (result.length === 0) {
        toast({ title: "No results", description: "The watchlist appears to be empty." });
      }

      return result;
    }

    // Library mode
    if (!filters.libraryId) {
      toast({ title: "Select a library", description: "Pick a library from the Filters panel first.", variant: "destructive" });
      return [];
    }

    const result = await shuffleMutation.mutateAsync({
      service,
      request: {
        library_id: filters.libraryId,
        count: shuffleCount,
        genres: filters.selectedGenres.length > 0 ? filters.selectedGenres : undefined,
        exclude_watched: filters.excludeWatched,
        cast: filters.selectedCast.length > 0 ? filters.selectedCast : undefined,
        tags: filters.selectedTags.length > 0 ? filters.selectedTags : undefined,
        year_min: filters.yearMin ?? undefined,
        year_max: filters.yearMax ?? undefined,
      },
    });

    setResults(result);
    setHasShuffled(true);

    if (result.length === 0) {
      toast({ title: "No results", description: "No items matched your filters. Try adjusting them." });
    }

    return result;
  }, [shuffleMode, selectedWatchlistId, service, filters, shuffleCount, watchlistExcludeWatched, shuffleMutation, watchlistShuffleMutation, toast]);

  const isShuffling = shuffleMutation.isPending || watchlistShuffleMutation.isPending;

  const availableServices = health
    ? { jellyfin: health.jellyfin, plex: health.plex }
    : undefined;

  return (
    <div className="min-h-screen cinema-bg relative">
      <AnimatedBackground />
      <div className="relative z-10">
        {/* Floating top bar: branding left, theme controls right */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between px-6 py-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center glow-border">
              <Shuffle className="w-5 h-5 text-primary" />
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
        </motion.div>

        <main className="max-w-4xl mx-auto px-4 py-8">
          {/* No service configured message */}
          {noServiceConfigured && !streamystatsAvailable && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">No media server configured</h2>
              <p className="text-muted-foreground text-sm max-w-md">
                To get started, configure at least one media server (Jellyfin or Plex) in your <code className="text-primary">.env</code> file and restart the backend.
              </p>
            </motion.div>
          )}

          {/* Main content - only show if at least one service or streamystats is available */}
          {(!noServiceConfigured || streamystatsAvailable) && !healthLoading && (
            <>
              {/* Top controls */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6"
              >
                <div className="flex items-center gap-3">
                  {shuffleMode === "library" && (
                    <ServiceToggle
                      value={service}
                      onChange={handleServiceChange}
                      availableServices={availableServices}
                    />
                  )}

                  {/* Shuffle mode toggle - only show when StreamyStats is configured */}
                  {streamystatsAvailable && (
                    <div className="flex items-center gap-2 p-1 rounded-xl bg-secondary/50 border border-border/50">
                      <button
                        onClick={() => handleModeChange("library")}
                        className="relative px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                      >
                        {shuffleMode === "library" && (
                          <motion.div
                            layoutId="mode-bg"
                            className="absolute inset-0 rounded-lg bg-primary/15 border border-primary/30 glow-border"
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          />
                        )}
                        <span className={`relative z-10 flex items-center gap-1.5 ${
                          shuffleMode === "library" ? "text-primary" : "text-muted-foreground"
                        }`}>
                          <Library className="w-3.5 h-3.5" />
                          Library
                        </span>
                      </button>
                      <button
                        onClick={() => handleModeChange("watchlist")}
                        className="relative px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                      >
                        {shuffleMode === "watchlist" && (
                          <motion.div
                            layoutId="mode-bg"
                            className="absolute inset-0 rounded-lg bg-primary/15 border border-primary/30 glow-border"
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          />
                        )}
                        <span className={`relative z-10 flex items-center gap-1.5 ${
                          shuffleMode === "watchlist" ? "text-primary" : "text-muted-foreground"
                        }`}>
                          <List className="w-3.5 h-3.5" />
                          Watchlist
                        </span>
                      </button>
                    </div>
                  )}
                </div>
                <CountSelector value={shuffleCount} onChange={setShuffleCount} />
              </motion.div>

              {/* Filters (library mode) or WatchlistPicker (watchlist mode) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-8"
              >
                {shuffleMode === "library" ? (
                  <FilterPanel
                    isOpen={filtersOpen}
                    onToggle={() => setFiltersOpen(!filtersOpen)}
                    service={service}
                    filters={filters}
                    onFiltersChange={(newFilters) => {
                      if (newFilters.libraryId !== filters.libraryId) {
                        setResults([]);
                        setHasShuffled(false);
                        setSpinComplete(false);
                      }
                      setFilters(newFilters);
                    }}
                    onReset={() => {
                      setResults([]);
                      setHasShuffled(false);
                      setSpinComplete(false);
                    }}
                  />
                ) : (
                  <div className="space-y-3">
                    <WatchlistPicker
                      selectedId={selectedWatchlistId}
                      onSelect={(id) => {
                        setSelectedWatchlistId(id);
                        setResults([]);
                        setHasShuffled(false);
                        setSpinComplete(false);
                      }}
                    />
                    <div className="glass rounded-xl p-3">
                      <button
                        onClick={() => {
                          setWatchlistExcludeWatched((prev) => !prev);
                          setResults([]);
                          setHasShuffled(false);
                          setSpinComplete(false);
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          watchlistExcludeWatched
                            ? "bg-primary/15 text-primary border border-primary/30"
                            : "bg-secondary/30 text-muted-foreground border border-transparent hover:border-border"
                        }`}
                      >
                        {watchlistExcludeWatched ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        Exclude watched
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Shuffle zone */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col items-center mb-12"
              >
                <ShuffleRoulette
                  onShuffle={handleShuffle}
                  isLoading={isShuffling}
                  previousResults={results}
                  onSpinComplete={() => setSpinComplete(true)}
                />

                {/* Top pick info card */}
                {hasShuffled && spinComplete && results.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="w-full max-w-2xl mt-6"
                  >
                    <MediaCard
                      item={results[0]}
                      index={0}
                      action={
                        streamystatsAvailable && shuffleMode === "library" ? (
                          <AddToWatchlistDialog
                            item={results[0]}
                            triggerClassName="w-auto h-8 px-3 text-xs"
                          />
                        ) : undefined
                      }
                    />
                  </motion.div>
                )}
              </motion.div>

              {/* Results */}
              <AnimatePresence mode="wait">
                {hasShuffled && spinComplete && results.length > 1 && (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <motion.h2
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-lg font-semibold text-foreground flex items-center gap-2"
                    >
                      <span className="text-gradient">
                        Other {results.length - 1} pick{results.length - 1 !== 1 ? "s" : ""}
                      </span>
                    </motion.h2>

                    <div className="space-y-3">
                      <AnimatePresence>
                        {results.slice(1).map((item, i) => (
                          <MediaCard
                            key={`${item.id}-${i}`}
                            item={item}
                            index={i}
                            action={
                              streamystatsAvailable && shuffleMode === "library" ? (
                                <AddToWatchlistDialog
                                  item={item}
                                  triggerClassName="w-auto h-8 px-3 text-xs"
                                />
                              ) : undefined
                            }
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Empty state */}
              {!hasShuffled && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-center py-12"
                >
                  <p className="text-muted-foreground text-sm">
                    Hit <span className="text-primary font-medium">Shuffle</span> to discover something to watch
                  </p>
                </motion.div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;
