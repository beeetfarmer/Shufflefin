export interface Library {
  id: string;
  title: string;
  collection_type: string;
}

export interface Genre {
  id: string;
  title: string;
}

export interface YearRange {
  min: number;
  max: number;
}

export interface MediaItem {
  id: string;
  title: string;
  synopsis: string;
  rating: number | null;
  genres: string[];
  cast: string[];
  tags: string[];
  year: number | null;
  poster: string | null;
  watch_status: "unwatched" | "watched" | "partial";
  watch_percent: number;
  service: "jellyfin" | "plex";
}

export interface ShuffleRequest {
  library_id: string;
  count: number;
  genres?: string[];
  exclude_watched?: boolean;
  cast?: string[];
  tags?: string[];
  year_min?: number;
  year_max?: number;
}

export interface Watchlist {
  id: number;
  name: string;
  description: string | null;
  item_count: number;
  allowed_item_type: string | null;
}

export interface WatchlistShuffleRequest {
  watchlist_id: number;
  count: number;
  exclude_watched?: boolean;
}

export interface WatchlistCreateRequest {
  name: string;
  description?: string;
}

export interface WatchlistAddItemRequest {
  item_id: string;
}

export interface WatchlistAddItemResponse {
  success: boolean;
}

export interface HealthResponse {
  jellyfin: boolean;
  plex: boolean;
  streamystats: boolean;
  errors: Record<string, string>;
}
