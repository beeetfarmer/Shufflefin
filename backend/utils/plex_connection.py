import logging

import requests

from backend.config import PLEX_URL, get_plex_headers, REQUEST_TIMEOUT

logger = logging.getLogger(__name__)


def check_plex_connection():
    """Check connection to Plex server and return (ok, error_message)."""
    try:
        response = requests.get(f"{PLEX_URL}/", headers=get_plex_headers(), timeout=REQUEST_TIMEOUT)
        if response.status_code == 200:
            return True, None
        elif response.status_code == 401:
            return False, "Authentication failed. Please check your Plex token."
        elif response.status_code == 404:
            return False, "Cannot find Plex server. Please check your server URL."
        else:
            return False, f"Plex server error (Status code: {response.status_code})."
    except requests.exceptions.ConnectionError:
        return False, "Cannot connect to Plex server. Is it running?"
    except Exception:
        logger.error("Plex connection check failed", exc_info=True)
        return False, "Unexpected error connecting to Plex."
