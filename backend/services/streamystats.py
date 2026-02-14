import requests
import random
import logging

from backend.config import (
    STREAMYSTATS_URL, get_streamystats_headers,
    JELLYFIN_URL, get_jellyfin_headers,
    REQUEST_TIMEOUT,
)
from backend.utils.connection import get_user_id

logger = logging.getLogger(__name__)


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

        data = response.json()
        # Response wraps list under "data" key with camelCase fields
        items = data.get("data", data if isinstance(data, list) else [])
        return [
            {
                "id": wl.get("id"),
                "name": wl.get("name", "Unnamed"),
                "description": wl.get("description"),
                "item_count": wl.get("itemCount", 0),
                "allowed_item_type": wl.get("allowedItemType"),
            }
            for wl in items
        ]
    except Exception as e:
        logger.error("Error fetching watchlists", exc_info=True)
        return []


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


def shuffle_from_watchlist(watchlist_id, count=1):
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

        selected_count = min(count, len(entries))
        selected = random.sample(entries, selected_count)

        user_id = get_user_id()
        results = []
        for entry in selected:
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

                user_data = full_item.get("UserData", {})
                played = user_data.get("Played", False)
                played_pct = user_data.get("PlayedPercentage", 0)
                if played:
                    watch_status, watch_percent = "watched", 100.0
                elif played_pct > 0:
                    watch_status, watch_percent = "partial", played_pct
                else:
                    watch_status, watch_percent = "unwatched", 0.0

                results.append({
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
                })
            else:
                # Fallback to StreamyStats data if Jellyfin fetch fails
                results.append({
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
                })

        return results
    except Exception as e:
        logger.error("Error shuffling from watchlist", exc_info=True)
        return []
