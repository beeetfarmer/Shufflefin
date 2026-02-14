import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# Request timeout for all upstream HTTP calls (seconds)
REQUEST_TIMEOUT = 15

# Jellyfin configuration
JELLYFIN_URL = os.getenv("JELLYFIN_URL", "http://localhost:8096")
JELLYFIN_API_KEY = os.getenv("JELLYFIN_API_KEY")
JELLYFIN_USERNAME = os.getenv("JELLYFIN_USERNAME")

# Plex configuration
PLEX_URL = os.getenv("PLEX_URL", "http://localhost:32400")
PLEX_TOKEN = os.getenv("PLEX_TOKEN")

# StreamyStats configuration
STREAMYSTATS_URL = os.getenv("STREAMYSTATS_URL", "")
STREAMYSTATS_TOKEN = os.getenv("STREAMYSTATS_TOKEN", "")


def get_jellyfin_headers():
    return {
        "X-MediaBrowser-Token": JELLYFIN_API_KEY,
        "Content-Type": "application/json",
    }


def get_plex_headers():
    return {
        "X-Plex-Token": PLEX_TOKEN,
        "Accept": "application/json",
    }


def get_streamystats_headers():
    return {
        "Authorization": f'MediaBrowser Token="{STREAMYSTATS_TOKEN}"',
        "Content-Type": "application/json",
    }
