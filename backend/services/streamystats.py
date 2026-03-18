import requests
import random
import logging
from typing import Any

from backend.config import (
    STREAMYSTATS_URL, get_streamystats_headers,
    JELLYFIN_URL, get_jellyfin_headers,
    REQUEST_TIMEOUT,
)
from backend.utils.connection import get_user_id

logger = logging.getLogger(__name__)


class StreamyStatsRequestError(Exception):
    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def _extract_data(payload: Any):
    if isinstance(payload, dict):
        return payload.get("data", payload)
    return payload


def _extract_error_message(response: requests.Response, fallback: str) -> str:
    try:
        payload = response.json()
        if isinstance(payload, dict):
            if isinstance(payload.get("error"), str) and payload["error"].strip():
                return payload["error"].strip()
            if isinstance(payload.get("detail"), str) and payload["detail"].strip():
                return payload["detail"].strip()
    except Exception:
        pass

    try:
        text = response.text.strip()
        if text:
            return text
    except Exception:
        pass

    return fallback


def _normalize_watchlist(wl: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": wl.get("id"),
        "name": wl.get("name", "Unnamed"),
        "description": wl.get("description"),
        "item_count": wl.get("itemCount", 0),
        "allowed_item_type": wl.get("allowedItemType"),
    }


def check_connection():
    """Check connection to StreamyStats and return (ok, error_message)."""
    if not STREAMYSTATS_URL:
        return False, "STREAMYSTATS_URL not configured."
    try:
        response = requests.get(
            f"{STREAMYSTATS_URL}/api/watchlists",
            headers=get_streamystats_headers(), timeout=REQUEST_TIMEOUT,
        )
        if response.status_code == 200:
            return True, None
        elif response.status_code == 401:
            return False, "Authentication failed. Check your STREAMYSTATS_TOKEN."
        else:
            return False, f"Server error (Status code: {response.status_code})."
    except requests.exceptions.ConnectionError:
        return False, "Cannot connect to StreamyStats. Is it running?"
    except Exception:
        logger.error("StreamyStats connection check failed", exc_info=True)
        return False, "Unexpected error connecting to StreamyStats."


def get_watchlists():
    """Get all watchlists from StreamyStats."""
    try:
        response = requests.get(
            f"{STREAMYSTATS_URL}/api/watchlists",
            headers=get_streamystats_headers(), timeout=REQUEST_TIMEOUT,
        )
        if response.status_code != 200:
            logger.error(f"Error fetching watchlists: {response.status_code}")
            return []

        payload = response.json()
        # Response wraps list under "data" key with camelCase fields
        items = _extract_data(payload)
        if not isinstance(items, list):
            return []

        return [_normalize_watchlist(wl) for wl in items if isinstance(wl, dict)]
    except Exception:
        logger.error("Error fetching watchlists", exc_info=True)
        return []


def create_watchlist(name: str, description: str | None = None):
    """Create a StreamyStats watchlist and return normalized watchlist data."""
    payload: dict[str, Any] = {"name": name.strip()}
    if description and description.strip():
        payload["description"] = description.strip()

    try:
        response = requests.post(
            f"{STREAMYSTATS_URL}/api/watchlists",
            headers=get_streamystats_headers(),
            json=payload,
            timeout=REQUEST_TIMEOUT,
        )
    except requests.exceptions.ConnectionError as exc:
        raise StreamyStatsRequestError(
            503,
            "Cannot connect to StreamyStats. Is it running?",
        ) from exc
    except Exception as exc:
        logger.error("Error creating StreamyStats watchlist", exc_info=True)
        raise StreamyStatsRequestError(
            502,
            "Unexpected error creating StreamyStats watchlist.",
        ) from exc

    if response.status_code not in (200, 201):
        raise StreamyStatsRequestError(
            response.status_code,
            _extract_error_message(response, "Failed to create StreamyStats watchlist."),
        )

    try:
        raw = _extract_data(response.json())
    except Exception as exc:
        raise StreamyStatsRequestError(
            502,
            "StreamyStats returned an invalid response while creating watchlist.",
        ) from exc

    if not isinstance(raw, dict):
        raise StreamyStatsRequestError(
            502,
            "StreamyStats returned an unexpected watchlist payload.",
        )

    return _normalize_watchlist(raw)


def add_item_to_watchlist(watchlist_id: int, item_id: str):
    """Add an item to a StreamyStats watchlist."""
    payload = {"itemId": item_id.strip()}
    try:
        response = requests.post(
            f"{STREAMYSTATS_URL}/api/watchlists/{watchlist_id}/items",
            headers=get_streamystats_headers(),
            json=payload,
            timeout=REQUEST_TIMEOUT,
        )
    except requests.exceptions.ConnectionError as exc:
        raise StreamyStatsRequestError(
            503,
            "Cannot connect to StreamyStats. Is it running?",
        ) from exc
    except Exception as exc:
        logger.error("Error adding item to StreamyStats watchlist", exc_info=True)
        raise StreamyStatsRequestError(
            502,
            "Unexpected error adding item to StreamyStats watchlist.",
        ) from exc

    if response.status_code not in (200, 201):
        raise StreamyStatsRequestError(
            response.status_code,
            _extract_error_message(response, "Failed to add item to StreamyStats watchlist."),
        )


def _fetch_jellyfin_item(item_id, user_id):
    """Fetch full item details from Jellyfin for enriched metadata."""
    if not user_id or not JELLYFIN_URL:
        return None
    try:
        url = f"{JELLYFIN_URL}/Users/{user_id}/Items/{item_id}"
        response = requests.get(
            url,
            headers=get_jellyfin_headers(),
            params={"fields": "Overview,Genres,People,Tags,CommunityRating,ProductionYear,UserData"},
            timeout=REQUEST_TIMEOUT,
        )
        if response.status_code == 200:
            return response.json()
        return None
    except Exception:
        logger.error("Error fetching Jellyfin item for watchlist enrichment", exc_info=True)
        return None


def _compute_watch_status(user_data: dict[str, Any]):
    played = user_data.get("Played", False)
    played_pct = user_data.get("PlayedPercentage", 0)
    if played:
        return "watched", 100.0
    if played_pct > 0:
        return "partial", played_pct
    return "unwatched", 0.0


def _build_media_item_from_watchlist_entry(entry: dict[str, Any], user_id: str | None):
    ss_item = entry.get("item", entry)
    jellyfin_id = ss_item.get("id", entry.get("itemId", ""))

    # For episodes, use the series ID for richer metadata
    effective_id = ss_item.get("seriesId") or jellyfin_id

    # Fetch full details from Jellyfin
    full_item = _fetch_jellyfin_item(effective_id, user_id)

    if full_item:
        cast = [
            p.get("Name")
            for p in full_item.get("People", [])
            if p.get("Type") == "Actor"
        ][:4]

        watch_status, watch_percent = _compute_watch_status(
            full_item.get("UserData", {}),
        )

        return {
            "id": str(effective_id),
            "title": full_item.get("Name", "Unknown Title"),
            "synopsis": full_item.get("Overview", "No overview available."),
            "rating": full_item.get("CommunityRating"),
            "genres": full_item.get("Genres", []),
            "cast": cast,
            "tags": full_item.get("Tags", []),
            "year": full_item.get("ProductionYear"),
            "poster": f"/api/proxy/image?service=jellyfin&item_id={effective_id}",
            "watch_status": watch_status,
            "watch_percent": watch_percent,
            "service": "jellyfin",
        }

    # Fallback to StreamyStats data if Jellyfin fetch fails
    return {
        "id": str(jellyfin_id),
        "title": ss_item.get("name", "Unknown Title"),
        "synopsis": "No overview available.",
        "rating": ss_item.get("communityRating"),
        "genres": ss_item.get("genres", []),
        "cast": [],
        "tags": [],
        "year": ss_item.get("productionYear"),
        "poster": f"/api/proxy/image?service=jellyfin&item_id={jellyfin_id}",
        "watch_status": "unwatched",
        "watch_percent": 0,
        "service": "jellyfin",
    }


def shuffle_from_watchlist(watchlist_id, count=1, exclude_watched=False):
    """Pick random items from a StreamyStats watchlist and return MediaItem dicts."""
    try:
        response = requests.get(
            f"{STREAMYSTATS_URL}/api/watchlists/{watchlist_id}",
            headers=get_streamystats_headers(), timeout=REQUEST_TIMEOUT,
        )
        if response.status_code != 200:
            logger.error(f"Error fetching watchlist {watchlist_id}: {response.status_code}")
            return []

        data = response.json()
        # Response is {data: {items: [{item: {...}}, ...]}}
        watchlist_data = data.get("data", data)
        entries = watchlist_data.get("items", [])
        if not entries:
            return []

        user_id = get_user_id()
        selected_count = min(count, len(entries))
        selected = random.sample(entries, selected_count)
        if exclude_watched:
            selected = entries[:]
            random.shuffle(selected)

        results = []
        for entry in selected:
            media_item = _build_media_item_from_watchlist_entry(entry, user_id)
            if exclude_watched and media_item.get("watch_status") == "watched":
                continue

            results.append(media_item)
            if len(results) >= selected_count:
                break

        return results
    except Exception:
        logger.error("Error shuffling from watchlist", exc_info=True)
        return []
