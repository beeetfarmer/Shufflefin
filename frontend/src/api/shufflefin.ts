import { apiFetch } from "./client";
import type {
  HealthResponse,
  Library,
  Genre,
  YearRange,
  MediaItem,
  ShuffleRequest,
  Watchlist,
  WatchlistShuffleRequest,
} from "./types";

export function getHealth(): Promise<HealthResponse> {
  return apiFetch("/health");
}

export function getLibraries(service: string): Promise<Library[]> {
  return apiFetch(`/${service}/libraries`);
}

export function getGenres(service: string, libraryId: string): Promise<Genre[]> {
  return apiFetch(`/${service}/libraries/${libraryId}/genres`);
}

export function getTags(service: string, libraryId: string): Promise<string[]> {
  return apiFetch(`/${service}/libraries/${libraryId}/tags`);
}

export function getCast(service: string, libraryId: string, search?: string): Promise<string[]> {
  const params = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiFetch(`/${service}/libraries/${libraryId}/cast${params}`);
}

export function getYears(
  service: string,
  libraryId: string,
): Promise<YearRange | null> {
  return apiFetch(`/${service}/libraries/${libraryId}/years`);
}

export function shuffle(
  service: string,
  request: ShuffleRequest,
): Promise<MediaItem[]> {
  return apiFetch(`/${service}/shuffle`, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function getWatchlists(): Promise<Watchlist[]> {
  return apiFetch("/streamystats/watchlists");
}

export function shuffleWatchlist(
  request: WatchlistShuffleRequest,
): Promise<MediaItem[]> {
  return apiFetch("/streamystats/watchlists/shuffle", {
    method: "POST",
    body: JSON.stringify(request),
  });
}
