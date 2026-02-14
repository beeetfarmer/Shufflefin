import re

from fastapi import APIRouter, HTTPException, Query

from backend.models import Genre, YearRange
from backend.services import jellyfin as jf_service
from backend.services import plex as plex_service

router = APIRouter()

_SERVICE_VALUES = {"jellyfin", "plex"}
_LIBRARY_ID_RE = re.compile(r"^[a-f0-9A-F\-]{1,64}$|^\d{1,20}$")


def _get_service(service: str):
    if service not in _SERVICE_VALUES:
        raise HTTPException(status_code=400, detail="Invalid service")
    return jf_service if service == "jellyfin" else plex_service


def _validate_library_id(library_id: str):
    if not _LIBRARY_ID_RE.match(library_id):
        raise HTTPException(status_code=400, detail="Invalid library ID")


@router.get("/{service}/libraries/{library_id}/genres", response_model=list[Genre])
def get_genres(service: str, library_id: str):
    _validate_library_id(library_id)
    svc = _get_service(service)
    raw = svc.get_genres(library_id)
    return [
        Genre(id=str(g.get("Id", "")), title=g.get("Name", "")) for g in raw
    ]


@router.get("/{service}/libraries/{library_id}/tags", response_model=list[str])
def get_tags(service: str, library_id: str):
    _validate_library_id(library_id)
    svc = _get_service(service)
    return svc.get_tags(library_id)


@router.get("/{service}/libraries/{library_id}/cast", response_model=list[str])
def get_cast(
    service: str,
    library_id: str,
    search: str = Query(default=None, max_length=100),
):
    _validate_library_id(library_id)
    svc = _get_service(service)
    return svc.get_cast_members(library_id, search=search)


@router.get("/{service}/libraries/{library_id}/years", response_model=YearRange | None)
def get_years(service: str, library_id: str):
    _validate_library_id(library_id)
    svc = _get_service(service)
    result = svc.get_available_years(library_id)
    if result:
        return YearRange(min=result[0], max=result[1])
    return None
