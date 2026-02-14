from pydantic import BaseModel, Field
from typing import Optional


class Library(BaseModel):
    id: str
    title: str
    collection_type: str


class Genre(BaseModel):
    id: str
    title: str


class YearRange(BaseModel):
    min: int
    max: int


class MediaItem(BaseModel):
    id: str
    title: str
    synopsis: str
    rating: Optional[float] = None
    genres: list[str] = []
    cast: list[str] = []
    tags: list[str] = []
    year: Optional[int] = None
    poster: Optional[str] = None
    watch_status: str = "unwatched"
    watch_percent: float = 0
    service: str = "jellyfin"


class ShuffleRequest(BaseModel):
    library_id: str = Field(..., max_length=64)
    count: int = Field(3, ge=1, le=20)
    genres: list[str] = Field(default=[], max_length=50)
    exclude_watched: bool = False
    cast: list[str] = Field(default=[], max_length=20)
    tags: list[str] = Field(default=[], max_length=50)
    year_min: Optional[int] = Field(None, ge=1800, le=2100)
    year_max: Optional[int] = Field(None, ge=1800, le=2100)


class Watchlist(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    item_count: int = 0
    allowed_item_type: Optional[str] = None


class WatchlistShuffleRequest(BaseModel):
    watchlist_id: int = Field(..., ge=1)
    count: int = Field(1, ge=1, le=20)


class HealthResponse(BaseModel):
    jellyfin: bool = False
    plex: bool = False
    streamystats: bool = False
    errors: dict[str, str] = {}
