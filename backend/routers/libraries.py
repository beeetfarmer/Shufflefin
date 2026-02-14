from fastapi import APIRouter, HTTPException

from backend.models import Library
from backend.services import jellyfin as jf_service
from backend.services import plex as plex_service

router = APIRouter()


def _normalize_jellyfin_libs(raw_libs) -> list[Library]:
    result = []
    for lib in raw_libs:
        # Jellyfin VirtualFolders have ItemId and Name
        result.append(
            Library(
                id=lib.get("ItemId", ""),
                title=lib.get("Name", ""),
                collection_type=lib.get("CollectionType", ""),
            )
        )
    return result


def _normalize_plex_libs(raw_libs) -> list[Library]:
    result = []
    for lib in raw_libs:
        result.append(
            Library(
                id=str(lib.get("ItemId", "")),
                title=lib.get("Name", ""),
                collection_type=lib.get("CollectionType", ""),
            )
        )
    return result


_SERVICE_VALUES = {"jellyfin", "plex"}


@router.get("/{service}/libraries", response_model=list[Library])
def get_libraries(service: str):
    if service not in _SERVICE_VALUES:
        raise HTTPException(status_code=400, detail="Invalid service")

    raw = jf_service.get_libraries() if service == "jellyfin" else plex_service.get_libraries()

    if raw is None:
        raise HTTPException(status_code=502, detail="Failed to connect to media server")

    if service == "jellyfin":
        return _normalize_jellyfin_libs(raw)
    return _normalize_plex_libs(raw)
