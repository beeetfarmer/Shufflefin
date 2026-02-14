import requests
import random
import logging

from backend.config import JELLYFIN_URL, get_jellyfin_headers, REQUEST_TIMEOUT
from backend.utils.connection import get_user_id
from backend.utils.filters import filter_by_cast, filter_by_tags, filter_watched_content

logger = logging.getLogger(__name__)


def _compute_watch_status(user_data: dict) -> tuple[str, float]:
    """Return (watch_status, watch_percent) from Jellyfin UserData."""
    played = user_data.get("Played", False)
    played_percentage = user_data.get("PlayedPercentage", 0)
    if played:
        return "watched", 100.0
    elif played_percentage > 0:
        return "partial", played_percentage
    return "unwatched", 0.0


def get_libraries():
    """Get all media libraries from Jellyfin."""
    try:
        response = requests.get(
            f"{JELLYFIN_URL}/Library/VirtualFolders",
            headers=get_jellyfin_headers(), timeout=REQUEST_TIMEOUT,
        )
        if response.status_code == 200:
            libraries = response.json()
            return [
                lib
                for lib in libraries
                if lib.get("CollectionType") in ["movies", "tvshows"]
            ]
        else:
            logger.error(f"Error fetching libraries: {response.status_code}")
            return None
    except Exception as e:
        logger.error("Error fetching libraries", exc_info=True)
        return None


def get_genres(library_id):
    """Get genres for a specific library."""
    try:
        response = requests.get(
            f"{JELLYFIN_URL}/Genres",
            headers=get_jellyfin_headers(),
            params={"parentId": library_id, "recursive": True},
            timeout=REQUEST_TIMEOUT,
        )
        if response.status_code == 200:
            return response.json().get("Items", [])
        return []
    except Exception as e:
        logger.error("Error fetching genres", exc_info=True)
        return []


def get_cast_members(library_id, search=None):
    """Get cast members using the Persons API. Supports optional search term."""
    try:
        params = {
            "parentId": library_id,
            "personTypes": "Actor",
            "recursive": True,
            "sortBy": "SortName",
        }
        if search:
            params["searchTerm"] = search
            params["limit"] = 20
        else:
            params["limit"] = 500

        response = requests.get(
            f"{JELLYFIN_URL}/Persons",
            headers=get_jellyfin_headers(),
            params=params,
            timeout=REQUEST_TIMEOUT,
        )
        if response.status_code != 200:
            return []

        items = response.json().get("Items", [])
        return [p.get("Name") for p in items if p.get("Name")]
    except Exception as e:
        logger.error("Error fetching cast members", exc_info=True)
        return []


def get_tags(library_id):
    """Get tags using the Tags endpoint (faster than fetching all items)."""
    try:
        response = requests.get(
            f"{JELLYFIN_URL}/Tags",
            headers=get_jellyfin_headers(),
            params={
                "parentId": library_id,
                "recursive": True,
            },
            timeout=REQUEST_TIMEOUT,
        )
        if response.status_code == 200:
            items = response.json().get("Items", [])
            return sorted([t.get("Name") for t in items if t.get("Name")])

        # Fallback: fetch from items directly
        user_id = get_user_id()
        if not user_id:
            return []

        response = requests.get(
            f"{JELLYFIN_URL}/Users/{user_id}/Items",
            headers=get_jellyfin_headers(),
            params={
                "parentId": library_id,
                "recursive": True,
                "includeItemTypes": "Movie,Series",
                "fields": "Tags",
                "enableUserData": True,
            },
            timeout=REQUEST_TIMEOUT,
        )

        if response.status_code != 200:
            return []

        items = response.json().get("Items", [])
        tag_set = set()
        for item in items:
            if "Tags" in item and item["Tags"]:
                tag_set.update(tag for tag in item["Tags"] if tag)

        return sorted(tag_set)
    except Exception as e:
        logger.error("Error fetching tags", exc_info=True)
        return []


def get_available_years(library_id):
    """Get min/max years from library items."""
    try:
        response = requests.get(
            f"{JELLYFIN_URL}/Years",
            headers=get_jellyfin_headers(),
            params={
                "parentId": library_id,
                "recursive": True,
            },
            timeout=REQUEST_TIMEOUT,
        )
        if response.status_code == 200:
            items = response.json().get("Items", [])
            years = sorted(int(y.get("Name")) for y in items if y.get("Name", "").isdigit())
            if years:
                return min(years), max(years)

        # Fallback
        user_id = get_user_id()
        if not user_id:
            return None

        response = requests.get(
            f"{JELLYFIN_URL}/Users/{user_id}/Items",
            headers=get_jellyfin_headers(),
            params={
                "parentId": library_id,
                "recursive": True,
                "includeItemTypes": "Movie,Series",
                "fields": "ProductionYear",
                "limit": 1,
                "sortBy": "ProductionYear",
                "sortOrder": "Ascending",
            },
            timeout=REQUEST_TIMEOUT,
        )
        if response.status_code != 200:
            return None
        items_asc = response.json().get("Items", [])

        response = requests.get(
            f"{JELLYFIN_URL}/Users/{user_id}/Items",
            headers=get_jellyfin_headers(),
            params={
                "parentId": library_id,
                "recursive": True,
                "includeItemTypes": "Movie,Series",
                "fields": "ProductionYear",
                "limit": 1,
                "sortBy": "ProductionYear",
                "sortOrder": "Descending",
            },
            timeout=REQUEST_TIMEOUT,
        )
        if response.status_code != 200:
            return None
        items_desc = response.json().get("Items", [])

        if items_asc and items_desc:
            min_year = items_asc[0].get("ProductionYear")
            max_year = items_desc[0].get("ProductionYear")
            if min_year and max_year:
                return min_year, max_year

        return None
    except Exception as e:
        logger.error("Error fetching years", exc_info=True)
        return None


def get_random_media(
    library_id,
    count,
    selected_genres=None,
    exclude_watched=False,
    selected_cast=None,
    selected_tags=None,
    year_range=None,
):
    """Get random media items based on filters."""
    try:
        user_id = get_user_id()
        if not user_id:
            return []

        # When we need client-side filtering (multi-cast, tags), fetch more.
        # Otherwise let the server do all the work and limit results.
        needs_client_filter = (
            (selected_cast and len(selected_cast) > 1)
            or selected_tags
        )

        params = {
            "parentId": library_id,
            "recursive": True,
            "includeItemTypes": "Movie,Series",
            "fields": "Overview,CommunityRating,ProductionYear,Genres,People,UserData,Tags",
            "enableImages": True,
            "enableUserData": True,
            "sortBy": "Random",
        }

        if not needs_client_filter:
            # Server can handle everything - just fetch what we need
            params["limit"] = count * 3  # small buffer for watched filtering

        if selected_genres:
            params["genreIds"] = ",".join(selected_genres)

        if exclude_watched:
            params["IsPlayed"] = "false"
            params["Filters"] = "IsNotPlayed"

        if selected_cast and len(selected_cast) == 1:
            params["Person"] = selected_cast[0]

        if year_range:
            start_year, end_year = year_range
            params["years"] = ",".join(str(y) for y in range(start_year, end_year + 1))

        if selected_tags and len(selected_tags) == 1:
            params["tags"] = selected_tags[0]

        response = requests.get(
            f"{JELLYFIN_URL}/Users/{user_id}/Items",
            headers=get_jellyfin_headers(),
            params=params,
            timeout=REQUEST_TIMEOUT,
        )

        if response.status_code != 200:
            logger.error(f"Failed to fetch media items: {response.status_code}")
            return []

        items = response.json().get("Items", [])
        if not items:
            return []

        # Deduplicate by item ID (recursive queries can return duplicates)
        seen_ids = set()
        unique_items = []
        for item in items:
            item_id = item.get("Id")
            if item_id and item_id not in seen_ids:
                seen_ids.add(item_id)
                unique_items.append(item)
        items = unique_items

        if exclude_watched:
            items = filter_watched_content(items)
            if not items:
                return []

        if selected_cast and len(selected_cast) > 1:
            items = filter_by_cast(items, selected_cast)
            if not items:
                return []

        if selected_tags and len(selected_tags) > 1:
            items = filter_by_tags(items, selected_tags)
            if not items:
                return []

        selected_count = min(count, len(items))
        selected_items = random.sample(items, selected_count)

        processed_items = []
        for item in selected_items:
            cast = [
                person.get("Name")
                for person in item.get("People", [])
                if person.get("Type") == "Actor"
            ][:4]

            user_data = item.get("UserData", {})
            watch_status, watch_percent = _compute_watch_status(user_data)

            processed_items.append(
                {
                    "id": item.get("Id", ""),
                    "title": item.get("Name", "Unknown Title"),
                    "synopsis": item.get("Overview", "No overview available."),
                    "rating": item.get("CommunityRating"),
                    "genres": item.get("Genres", []),
                    "cast": cast,
                    "tags": item.get("Tags", []),
                    "year": item.get("ProductionYear"),
                    "poster": f"/api/proxy/image?service=jellyfin&item_id={item.get('Id')}",
                    "watch_status": watch_status,
                    "watch_percent": watch_percent,
                    "service": "jellyfin",
                }
            )

        return processed_items
    except Exception as e:
        logger.error("Error fetching random media", exc_info=True)
        return []
