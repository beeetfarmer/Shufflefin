import re

import requests
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from io import BytesIO

from backend.models import ShuffleRequest, MediaItem
from backend.services import jellyfin as jf_service
from backend.services import plex as plex_service
from backend.config import JELLYFIN_URL, PLEX_URL, get_jellyfin_headers, get_plex_headers, REQUEST_TIMEOUT

# Allows hex strings (Jellyfin) and numeric IDs (Plex)
_ITEM_ID_RE = re.compile(r"^[a-f0-9A-F\-]{1,64}$|^\d{1,20}$")
_SERVICE_VALUES = {"jellyfin", "plex"}

router = APIRouter()


@router.post("/{service}/shuffle", response_model=list[MediaItem])
def shuffle(service: str, req: ShuffleRequest):
    if service not in _SERVICE_VALUES:
        raise HTTPException(status_code=400, detail="Invalid service")
    svc = jf_service if service == "jellyfin" else plex_service

    year_range = None
    if req.year_min is not None and req.year_max is not None:
        year_range = (req.year_min, req.year_max)

    raw = svc.get_random_media(
        library_id=req.library_id,
        count=req.count,
        selected_genres=req.genres or None,
        exclude_watched=req.exclude_watched,
        selected_cast=req.cast or None,
        selected_tags=req.tags or None,
        year_range=year_range,
    )

    return [MediaItem(**item) for item in raw]


@router.get("/proxy/image")
def proxy_image(
    service: str = Query(...),
    item_id: str = Query(..., max_length=64),
):
    """Proxy images from Jellyfin/Plex with proper auth headers."""
    if not _ITEM_ID_RE.match(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID")
    if service not in _SERVICE_VALUES:
        raise HTTPException(status_code=400, detail="Invalid service")

    try:
        if service == "jellyfin":
            url = f"{JELLYFIN_URL}/Items/{item_id}/Images/Primary"
            resp = requests.get(url, headers=get_jellyfin_headers(), stream=True, timeout=REQUEST_TIMEOUT)
        elif service == "plex":
            url = f"{PLEX_URL}/library/metadata/{item_id}/thumb"
            resp = requests.get(url, headers=get_plex_headers(), stream=True, timeout=REQUEST_TIMEOUT)

        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Image not found")

        content_type = resp.headers.get("Content-Type", "image/jpeg")
        return StreamingResponse(
            BytesIO(resp.content),
            media_type=content_type,
            headers={"Cache-Control": "public, max-age=86400"},
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to fetch image")
