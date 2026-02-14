from fastapi import APIRouter

from backend.models import Watchlist, WatchlistShuffleRequest, MediaItem
from backend.services import streamystats

router = APIRouter()


@router.get("/streamystats/watchlists", response_model=list[Watchlist])
def list_watchlists():
    raw = streamystats.get_watchlists()
    return [Watchlist(**wl) for wl in raw]


@router.post("/streamystats/watchlists/shuffle", response_model=list[MediaItem])
def shuffle_watchlist(req: WatchlistShuffleRequest):
    raw = streamystats.shuffle_from_watchlist(
        watchlist_id=req.watchlist_id,
        count=req.count,
    )
    return [MediaItem(**item) for item in raw]
