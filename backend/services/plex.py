import requests
import random
import logging

from backend.config import PLEX_URL, get_plex_headers, REQUEST_TIMEOUT

logger = logging.getLogger(__name__)


def _check_plex_watched_status(item_detail):
    """Determine if a Plex item is watched."""
    if item_detail.get("type") == "movie":
        if item_detail.get("viewCount", 0) > 0:
            return True
    elif item_detail.get("type") == "show":
        if (
            item_detail.get("viewedLeafCount", 0) > 0
            and item_detail.get("viewedLeafCount") == item_detail.get("leafCount")
        ):
            return True
        if item_detail.get("viewCount", 0) > 0:
            return True
    elif item_detail.get("type") == "episode":
        if item_detail.get("viewCount", 0) > 0:
            return True

    if "lastViewedAt" in item_detail:
        return True

    return False


def _compute_watch_status(item_detail) -> tuple[str, float]:
    """Return (watch_status, watch_percent) from Plex item detail."""
    played = _check_plex_watched_status(item_detail)
    viewed_progress = 0.0

    if item_detail.get("viewOffset", 0) > 0 and item_detail.get("duration", 0) > 0:
        viewed_progress = (
            item_detail.get("viewOffset") / item_detail.get("duration")
        ) * 100

    if played and viewed_progress == 0:
        return "watched", 100.0
    elif viewed_progress > 0 and not played:
        return "partial", viewed_progress
    elif played:
        return "watched", 100.0
    return "unwatched", 0.0


def get_libraries():
    """Get all libraries from Plex."""
    try:
        response = requests.get(
            f"{PLEX_URL}/library/sections", headers=get_plex_headers(), timeout=REQUEST_TIMEOUT,
        )
        if response.status_code == 200:
            data = response.json()
            libraries = data.get("MediaContainer", {}).get("Directory", [])
            return [
                {
                    "Name": lib.get("title"),
                    "ItemId": lib.get("key"),
                    "CollectionType": lib.get("type"),
                }
                for lib in libraries
                if lib.get("type") in ["movie", "show"]
            ]
        else:
            logger.error(f"Error fetching Plex libraries: {response.status_code}")
            return None
    except Exception as e:
        logger.error("Error fetching Plex libraries", exc_info=True)
        return None


def get_genres(library_id):
    """Get genres for a specific Plex library."""
    try:
        url = f"{PLEX_URL}/library/sections/{library_id}/genre"
        response = requests.get(url, headers=get_plex_headers(), timeout=REQUEST_TIMEOUT)
        if response.status_code == 200:
            data = response.json()
            genres = data.get("MediaContainer", {}).get("Directory", [])
            return [
                {
                    "Name": genre.get("title"),
                    "Id": genre.get("key").split("/")[-1],
                }
                for genre in genres
            ]
        return []
    except Exception as e:
        logger.error("Error fetching Plex genres", exc_info=True)
        return []


def get_cast_members(library_id, search=None):
    """Get all cast members from a Plex library."""
    try:
        url = f"{PLEX_URL}/library/sections/{library_id}/actor"
        response = requests.get(url, headers=get_plex_headers(), timeout=REQUEST_TIMEOUT)
        if response.status_code != 200:
            return []

        data = response.json()
        actors = data.get("MediaContainer", {}).get("Directory", [])
        return sorted([actor.get("title") for actor in actors if actor.get("title")])
    except Exception as e:
        logger.error("Error fetching Plex cast members", exc_info=True)
        return []


def get_tags(library_id):
    """Get labels for items in a Plex library."""
    try:
        url = f"{PLEX_URL}/library/sections/{library_id}/label"
        response = requests.get(url, headers=get_plex_headers(), timeout=REQUEST_TIMEOUT)

        if response.status_code != 200 or not response.json().get(
            "MediaContainer", {}
        ).get("Directory"):
            url = f"{PLEX_URL}/library/sections/{library_id}/collection"
            response = requests.get(url, headers=get_plex_headers(), timeout=REQUEST_TIMEOUT)

        if response.status_code != 200:
            return []

        data = response.json()
        tags = data.get("MediaContainer", {}).get("Directory", [])
        return sorted([tag.get("title") for tag in tags if tag.get("title")])
    except Exception as e:
        logger.error("Error fetching Plex labels", exc_info=True)
        return []


def get_available_years(library_id):
    """Get min/max years from Plex library items."""
    try:
        url = f"{PLEX_URL}/library/sections/{library_id}/all"
        response = requests.get(url, headers=get_plex_headers(), timeout=REQUEST_TIMEOUT)
        if response.status_code != 200:
            return None

        data = response.json()
        items = data.get("MediaContainer", {}).get("Metadata", [])

        years = [int(item.get("year")) for item in items if item.get("year")]

        if years:
            return min(years), max(years)
        return None
    except Exception as e:
        logger.error("Error fetching Plex years", exc_info=True)
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
    """Get random media items from Plex based on filters."""
    try:
        endpoint = "unwatched" if exclude_watched else "all"
        url = f"{PLEX_URL}/library/sections/{library_id}/{endpoint}"
        params = {}

        if selected_genres and len(selected_genres) > 0:
            for genre_id in selected_genres:
                params["genre"] = genre_id

        if year_range:
            start_year, end_year = year_range
            params["year>>"] = str(int(start_year) - 1)
            params["year<<"] = str(int(end_year) + 1)

        if selected_cast and len(selected_cast) == 1:
            actor_name = selected_cast[0]
            actor_url = f"{PLEX_URL}/library/sections/{library_id}/actor"
            actor_response = requests.get(actor_url, headers=get_plex_headers(), timeout=REQUEST_TIMEOUT)
            if actor_response.status_code == 200:
                actors = (
                    actor_response.json()
                    .get("MediaContainer", {})
                    .get("Directory", [])
                )
                for actor in actors:
                    if actor.get("title") == actor_name:
                        actor_id = actor.get("key", "").split("/")[-1]
                        params["actor"] = actor_id
                        break

        response = requests.get(url, headers=get_plex_headers(), params=params, timeout=REQUEST_TIMEOUT)
        if response.status_code != 200:
            logger.error(f"Failed to fetch Plex media items: {response.status_code}")
            return []

        data = response.json()
        items = data.get("MediaContainer", {}).get("Metadata", [])

        if not items:
            return []

        # Deduplicate by ratingKey
        seen_ids = set()
        unique_items = []
        for item in items:
            item_id = item.get("ratingKey")
            if item_id and item_id not in seen_ids:
                seen_ids.add(item_id)
                unique_items.append(item)
        items = unique_items

        filtered_items = items

        # Filter by cast if specified (for multiple actors)
        if selected_cast and len(selected_cast) > 1:
            cast_filtered_items = []
            for item in filtered_items:
                item_id = item.get("ratingKey")
                item_url = f"{PLEX_URL}/library/metadata/{item_id}"
                item_response = requests.get(item_url, headers=get_plex_headers(), timeout=REQUEST_TIMEOUT)

                if item_response.status_code == 200:
                    item_data = item_response.json()
                    item_detail = item_data.get("MediaContainer", {}).get(
                        "Metadata", [{}]
                    )[0]

                    cast_list = []
                    roles = item_detail.get("Role", [])
                    if roles:
                        for role in roles:
                            if isinstance(role, dict) and role.get("tag"):
                                cast_list.append(role.get("tag"))

                    if all(
                        cast_member in cast_list for cast_member in selected_cast
                    ):
                        cast_filtered_items.append(item)

            filtered_items = cast_filtered_items

        # Filter by tags (labels) if specified
        if selected_tags and len(selected_tags) > 0:
            tag_filtered_items = []
            for item in filtered_items:
                item_id = item.get("ratingKey")
                item_url = f"{PLEX_URL}/library/metadata/{item_id}"
                item_response = requests.get(item_url, headers=get_plex_headers(), timeout=REQUEST_TIMEOUT)

                if item_response.status_code == 200:
                    item_data = item_response.json()
                    item_detail = item_data.get("MediaContainer", {}).get(
                        "Metadata", [{}]
                    )[0]

                    tag_list = []
                    labels = item_detail.get("Label", [])
                    if labels:
                        for label in labels:
                            if isinstance(label, dict) and label.get("tag"):
                                tag_list.append(label.get("tag"))

                    if not tag_list:
                        collections = item_detail.get("Collection", [])
                        if collections:
                            for collection in collections:
                                if isinstance(collection, dict) and collection.get(
                                    "tag"
                                ):
                                    tag_list.append(collection.get("tag"))

                    if any(tag in tag_list for tag in selected_tags):
                        tag_filtered_items.append(item)

            filtered_items = tag_filtered_items

        if not filtered_items:
            return []

        selected_count = min(count, len(filtered_items))
        selected_items = random.sample(filtered_items, selected_count)

        processed_items = []
        for item in selected_items:
            item_id = item.get("ratingKey")
            item_url = f"{PLEX_URL}/library/metadata/{item_id}"
            item_response = requests.get(item_url, headers=get_plex_headers(), timeout=REQUEST_TIMEOUT)

            if item_response.status_code == 200:
                item_data = item_response.json()
                item_detail = item_data.get("MediaContainer", {}).get(
                    "Metadata", [{}]
                )[0]

                # Extract cast
                cast_list = []
                roles = item_detail.get("Role", [])
                if roles:
                    for role in roles:
                        if isinstance(role, dict) and role.get("tag"):
                            cast_list.append(role.get("tag"))
                cast_list = cast_list[:4]

                # Extract genres
                genres = []
                genre_items = item_detail.get("Genre", [])
                if genre_items:
                    for genre in genre_items:
                        if isinstance(genre, dict) and genre.get("tag"):
                            genres.append(genre.get("tag"))

                # Extract tags
                tags = []
                label_items = item_detail.get("Label", [])
                if label_items:
                    for label in label_items:
                        if isinstance(label, dict) and label.get("tag"):
                            tags.append(label.get("tag"))

                if not tags:
                    collection_items = item_detail.get("Collection", [])
                    if collection_items:
                        for collection in collection_items:
                            if isinstance(collection, dict) and collection.get("tag"):
                                tags.append(collection.get("tag"))

                watch_status, watch_percent = _compute_watch_status(item_detail)

                # Extract rating
                rating = None
                if item_detail.get("audienceRating"):
                    rating = item_detail.get("audienceRating")
                elif item_detail.get("rating"):
                    rating = item_detail.get("rating")
                elif item_detail.get("userRating"):
                    rating = item_detail.get("userRating")

                processed_items.append(
                    {
                        "id": str(item_id),
                        "title": item_detail.get("title", "Unknown Title"),
                        "synopsis": item_detail.get(
                            "summary", "No overview available."
                        ),
                        "rating": rating,
                        "genres": genres,
                        "cast": cast_list,
                        "tags": tags,
                        "year": item_detail.get("year"),
                        "poster": f"/api/proxy/image?service=plex&item_id={item_id}",
                        "watch_status": watch_status,
                        "watch_percent": watch_percent,
                        "service": "plex",
                    }
                )

        return processed_items
    except Exception as e:
        logger.error("Error fetching Plex media", exc_info=True)
        return []
