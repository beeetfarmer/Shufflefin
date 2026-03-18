from fastapi import APIRouter, HTTPException, Path

from backend.models import (
    Watchlist,
    WatchlistShuffleRequest,
    MediaItem,
    WatchlistCreateRequest,
    WatchlistAddItemRequest,
    WatchlistAddItemResponse,
)
from backend.services import streamystats

router = APIRouter()


@router.get("/streamystats/watchlists", response_model=list[Watchlist])
def list_watchlists():
    raw = streamystats.get_watchlists()
    return [Watchlist(**wl) for wl in raw]


@router.post("/streamystats/watchlists", response_model=Watchlist, status_code=201)
def create_watchlist(req: WatchlistCreateRequest):
    try:
        raw = streamystats.create_watchlist(name=req.name, description=req.description)
    except streamystats.StreamyStatsRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    return Watchlist(**raw)


@router.post(
    "/streamystats/watchlists/{watchlist_id}/items",
    response_model=WatchlistAddItemResponse,
)
def add_watchlist_item(
    req: WatchlistAddItemRequest,
    watchlist_id: int = Path(..., ge=1),
):
    try:
        streamystats.add_item_to_watchlist(
            watchlist_id=watchlist_id,
            item_id=req.item_id,
        )
    except streamystats.StreamyStatsRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    return WatchlistAddItemResponse(success=True)


@router.post("/streamystats/watchlists/shuffle", response_model=list[MediaItem])
def shuffle_watchlist(req: WatchlistShuffleRequest):
    raw = streamystats.shuffle_from_watchlist(
        watchlist_id=req.watchlist_id,
        count=req.count,
        exclude_watched=req.exclude_watched,
    )
    return [MediaItem(**item) for item in raw]
