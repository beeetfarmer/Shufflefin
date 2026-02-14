import requests
import logging

from backend.config import JELLYFIN_URL, JELLYFIN_USERNAME, get_jellyfin_headers, REQUEST_TIMEOUT

logger = logging.getLogger(__name__)

# Module-level cached user ID
_user_id: str | None = None


def check_jellyfin_connection():
    """Check connection to Jellyfin server and return (ok, error_message)."""
    try:
        response = requests.get(
            f"{JELLYFIN_URL}/System/Info", headers=get_jellyfin_headers(), timeout=REQUEST_TIMEOUT
        )
        if response.status_code == 200:
            return True, None
        elif response.status_code == 401:
            return False, "Authentication failed. Please check your API key."
        elif response.status_code == 404:
            return False, "Cannot find Jellyfin server. Please check your server URL."
        else:
            return False, f"Server error (Status code: {response.status_code})."
    except requests.exceptions.ConnectionError:
        return False, "Cannot connect to Jellyfin server. Is it running?"
    except Exception as e:
        logger.error("Jellyfin connection check failed", exc_info=True)
        return False, "Unexpected error connecting to Jellyfin."


def authenticate():
    """Authenticate with Jellyfin and get user ID (cached)."""
    global _user_id
    if _user_id:
        return _user_id

    try:
        response = requests.get(
            f"{JELLYFIN_URL}/Users", headers=get_jellyfin_headers(), timeout=REQUEST_TIMEOUT
        )
        if response.status_code != 200:
            logger.error("Failed to get users list")
            return None

        users = response.json()
        user = next((u for u in users if u.get("Name") == JELLYFIN_USERNAME), None)

        if user:
            _user_id = user.get("Id")
            return _user_id
        else:
            logger.error(f"User {JELLYFIN_USERNAME} not found")
            return None
    except Exception as e:
        logger.error("Authentication error", exc_info=True)
        return None


def get_user_id():
    """Get the cached user ID, authenticating if needed."""
    global _user_id
    if not _user_id:
        _user_id = authenticate()
    return _user_id
