import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/api/shufflefin";
import type {
  ShuffleRequest,
  WatchlistShuffleRequest,
  WatchlistCreateRequest,
  WatchlistAddItemRequest,
} from "@/api/types";

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: api.getHealth,
    staleTime: 30_000,
  });
}

export function useLibraries(service: string | null) {
  return useQuery({
    queryKey: ["libraries", service],
    queryFn: () => api.getLibraries(service!),
    enabled: !!service,
  });
}

export function useGenres(service: string | null, libraryId: string | null) {
  return useQuery({
    queryKey: ["genres", service, libraryId],
    queryFn: () => api.getGenres(service!, libraryId!),
    enabled: !!service && !!libraryId,
  });
}

export function useTags(service: string | null, libraryId: string | null) {
  return useQuery({
    queryKey: ["tags", service, libraryId],
    queryFn: () => api.getTags(service!, libraryId!),
    enabled: !!service && !!libraryId,
  });
}

export function useCast(service: string | null, libraryId: string | null, search?: string) {
  return useQuery({
    queryKey: ["cast", service, libraryId, search],
    queryFn: () => api.getCast(service!, libraryId!, search || undefined),
    enabled: !!service && !!libraryId && (!!search && search.length >= 2),
  });
}

export function useYears(service: string | null, libraryId: string | null) {
  return useQuery({
    queryKey: ["years", service, libraryId],
    queryFn: () => api.getYears(service!, libraryId!),
    enabled: !!service && !!libraryId,
  });
}

export function useShuffle() {
  return useMutation({
    mutationFn: ({
      service,
      request,
    }: {
      service: string;
      request: ShuffleRequest;
    }) => api.shuffle(service, request),
  });
}

export function useWatchlists(enabled: boolean) {
  return useQuery({
    queryKey: ["watchlists"],
    queryFn: api.getWatchlists,
    enabled,
  });
}

export function useWatchlistShuffle() {
  return useMutation({
    mutationFn: (request: WatchlistShuffleRequest) =>
      api.shuffleWatchlist(request),
  });
}

export function useCreateWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: WatchlistCreateRequest) =>
      api.createWatchlist(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] });
    },
  });
}

export function useAddWatchlistItem() {
  return useMutation({
    mutationFn: ({
      watchlistId,
      request,
    }: {
      watchlistId: number;
      request: WatchlistAddItemRequest;
    }) => api.addItemToWatchlist(watchlistId, request),
  });
}
