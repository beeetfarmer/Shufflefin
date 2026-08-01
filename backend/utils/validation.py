import re

# Jellyfin uses hex GUIDs, Plex uses numeric rating keys. Anything outside this
# shape must never reach an upstream URL: these values are interpolated into
# request paths, so an unchecked separator or traversal segment would let a
# caller steer the request at a different endpoint on the media server.
MEDIA_ID_RE = re.compile(r"^[a-f0-9A-F\-]{1,64}$|^\d{1,20}$")


def is_media_id(value) -> bool:
    """True when the value is safe to interpolate into an upstream URL path."""
    return isinstance(value, str) and bool(MEDIA_ID_RE.match(value))
