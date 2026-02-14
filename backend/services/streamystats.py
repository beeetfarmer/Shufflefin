import requests
import random
import logging

from backend.config import STREAMYSTATS_URL, get_streamystats_headers, REQUEST_TIMEOUT

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

        results = []
        for entry in selected:
            # Each entry has an "item" sub-object with Jellyfin metadata
            item = entry.get("item", entry)
            jellyfin_id = item.get("id", entry.get("itemId", ""))
            results.append({
                "id": str(jellyfin_id),
                "title": item.get("name", "Unknown Title"),
                "synopsis": item.get("overview", "No overview available."),
                "rating": item.get("communityRating"),
                "genres": item.get("genres", []),
                "cast": [],
                "tags": [],
                "year": item.get("productionYear"),
                "poster": f"/api/proxy/image?service=jellyfin&item_id={jellyfin_id}",
                "watch_status": "unwatched",
                "watch_percent": 0,
                "service": "jellyfin",
            })

        return results
    except Exception as e:
        logger.error("Error shuffling from watchlist", exc_info=True)
        return []
