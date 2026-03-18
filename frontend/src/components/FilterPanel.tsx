import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import {
  ChevronDown,
  Eye,
  EyeOff,
  Calendar,
  Tag,
  Users,
  SlidersHorizontal,
  X,
  Film,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLibraries, useGenres, useTags, useCast, useYears } from "@/hooks/use-api";
import type { Library, Genre } from "@/api/types";

export interface Filters {
  libraryId: string | null;
  excludeWatched: boolean;
  selectedGenres: string[];
  selectedTags: string[];
  selectedCast: string[];
  yearMin: number | null;
  yearMax: number | null;
}

export const defaultFilters: Filters = {
  libraryId: null,
  excludeWatched: false,
  selectedGenres: [],
  selectedTags: [],
  selectedCast: [],
  yearMin: null,
  yearMax: null,
};

interface FilterPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  service: string;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onReset?: () => void;
}

interface SearchableMultiSelectProps {
  icon: React.ReactNode;
  label: string;
  placeholder: string;
  items: { id: string; label: string }[];
  selected: string[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}

const SearchableMultiSelect = ({
  icon,
  label,
  placeholder,
  items,
  selected,
  onAdd,
  onRemove,
}: SearchableMultiSelectProps) => {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return [];
    const term = search.toLowerCase();
    return items
      .filter(
        (item) =>
          item.label.toLowerCase().includes(term) && !selected.includes(item.id)
      )
      .slice(0, 10);
  }, [search, items, selected]);

  const selectedLabels = useMemo(() => {
    const map = new Map(items.map((i) => [i.id, i.label]));
    return selected.map((id) => ({ id, label: map.get(id) ?? id }));
  }, [selected, items]);

  const handleAdd = (id: string) => {
    onAdd(id);
    setSearch("");
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        {icon} {label}
      </label>
      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedLabels.map(({ id, label: displayLabel }) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/15 text-primary border border-primary/30"
            >
              {displayLabel}
              <button onClick={() => onRemove(id)} className="hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 bg-secondary/30 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
        />
        {filtered.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => handleAdd(item.id)}
                className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const FilterPanel = ({ isOpen, onToggle, service, filters, onFiltersChange, onReset }: FilterPanelProps) => {
  const [castSearch, setCastSearch] = useState("");

  const { data: libraries = [] } = useLibraries(service);
  const { data: genres = [] } = useGenres(service, filters.libraryId);
  const { data: tags = [] } = useTags(service, filters.libraryId);
  const { data: castResults = [] } = useCast(service, filters.libraryId, castSearch);
  const { data: yearRange } = useYears(service, filters.libraryId);

  const filteredCast = useMemo(() => {
    if (!castSearch || castSearch.length < 2) return [];
    return castResults
      .filter((c) => !filters.selectedCast.includes(c))
      .slice(0, 10);
  }, [castSearch, castResults, filters.selectedCast]);

  const genreItems = useMemo(
    () => genres.map((g: Genre) => ({ id: g.id, label: g.title })),
    [genres]
  );

  const tagItems = useMemo(
    () => tags.map((t: string) => ({ id: t, label: t })),
    [tags]
  );

  const update = (partial: Partial<Filters>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  const addGenre = (id: string) => {
    if (!filters.selectedGenres.includes(id)) {
      update({ selectedGenres: [...filters.selectedGenres, id] });
    }
  };

  const removeGenre = (id: string) => {
    update({ selectedGenres: filters.selectedGenres.filter((g) => g !== id) });
  };

  const addTag = (id: string) => {
    if (!filters.selectedTags.includes(id)) {
      update({ selectedTags: [...filters.selectedTags, id] });
    }
  };

  const removeTag = (id: string) => {
    update({ selectedTags: filters.selectedTags.filter((t) => t !== id) });
  };

  const addCast = (name: string) => {
    if (!filters.selectedCast.includes(name)) {
      update({ selectedCast: [...filters.selectedCast, name] });
    }
    setCastSearch("");
  };

  const removeCast = (name: string) => {
    update({ selectedCast: filters.selectedCast.filter((c) => c !== name) });
  };

  const activeCount =
    filters.selectedGenres.length +
    filters.selectedTags.length +
    filters.selectedCast.length +
    (filters.excludeWatched ? 1 : 0) +
    (filters.yearMin !== null ? 1 : 0) +
    (filters.yearMax !== null ? 1 : 0);

  const handleReset = () => {
    onFiltersChange({ ...defaultFilters, libraryId: filters.libraryId });
    onReset?.();
  };

  return (
    <motion.div initial={false} className="glass rounded-2xl">
      <div className="flex items-center">
        <button
          onClick={onToggle}
          className="flex-1 flex items-center justify-between px-5 py-4 hover:bg-secondary/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">Filters</span>
            {activeCount > 0 && (
              <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/30 text-xs">
                {activeCount} active
              </Badge>
            )}
          </div>
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        </button>
        {activeCount > 0 && (
          <button
            onClick={handleReset}
            className="px-4 py-2 mr-3 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all flex items-center gap-1.5"
            title="Reset filters"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-visible"
          >
            <div className="px-5 pb-5 space-y-5 border-t border-border/30 pt-4">
              {/* Library selector */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Library</label>
                <div className="flex flex-wrap gap-2">
                  {libraries.map((lib: Library) => (
                    <button
                      key={lib.id}
                      onClick={() =>
                        update({
                          libraryId: lib.id,
                          selectedGenres: [],
                          selectedTags: [],
                          selectedCast: [],
                          yearMin: null,
                          yearMax: null,
                        })
                      }
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        filters.libraryId === lib.id
                          ? "bg-primary/15 text-primary border border-primary/30"
                          : "bg-secondary/30 text-muted-foreground border border-transparent hover:border-border"
                      }`}
                    >
                      {lib.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exclude watched */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Watch Status</label>
                <button
                  onClick={() => update({ excludeWatched: !filters.excludeWatched })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    filters.excludeWatched
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-secondary/30 text-muted-foreground border border-transparent hover:border-border"
                  }`}
                >
                  {filters.excludeWatched ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  Exclude watched
                </button>
              </div>

              {/* Genres - searchable */}
              <SearchableMultiSelect
                icon={<Film className="w-3 h-3" />}
                label="Genres"
                placeholder="Search genres..."
                items={genreItems}
                selected={filters.selectedGenres}
                onAdd={addGenre}
                onRemove={removeGenre}
              />

              {/* Cast search */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-3 h-3" /> Cast / Actor
                </label>
                {filters.selectedCast.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {filters.selectedCast.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/15 text-primary border border-primary/30"
                      >
                        {name}
                        <button onClick={() => removeCast(name)} className="hover:text-foreground">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <input
                    type="text"
                    value={castSearch}
                    onChange={(e) => setCastSearch(e.target.value)}
                    placeholder="Search by actor name..."
                    className="w-full px-4 py-2.5 bg-secondary/30 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                  {filteredCast.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                      {filteredCast.map((name) => (
                        <button
                          key={name}
                          onClick={() => addCast(name)}
                          className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 transition-colors"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Tags - searchable */}
              <SearchableMultiSelect
                icon={<Tag className="w-3 h-3" />}
                label="Tags"
                placeholder="Search tags..."
                items={tagItems}
                selected={filters.selectedTags}
                onAdd={addTag}
                onRemove={removeTag}
              />

              {/* Year range */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> Year Range
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={filters.yearMin ?? yearRange?.min ?? ""}
                    onChange={(e) => update({ yearMin: e.target.value ? +e.target.value : null })}
                    placeholder={yearRange?.min?.toString() ?? "Min"}
                    className="w-24 px-3 py-2 bg-secondary/30 border border-border/50 rounded-lg text-sm text-foreground text-center focus:outline-none focus:border-primary/50 transition-all"
                  />
                  <span className="text-muted-foreground text-sm">to</span>
                  <input
                    type="number"
                    value={filters.yearMax ?? yearRange?.max ?? ""}
                    onChange={(e) => update({ yearMax: e.target.value ? +e.target.value : null })}
                    placeholder={yearRange?.max?.toString() ?? "Max"}
                    className="w-24 px-3 py-2 bg-secondary/30 border border-border/50 rounded-lg text-sm text-foreground text-center focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default FilterPanel;
