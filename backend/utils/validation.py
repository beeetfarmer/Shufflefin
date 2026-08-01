import re

# Jellyfin uses hex GUIDs, Plex uses numeric rating keys. Anything outside this
# shape must never reach an upstream URL: these values are interpolated into
# request paths, so an unchecked separator or traversal segment would let a
# caller steer the request at a different endpoint on the media server.
#
# Match against it inline at each call site rather than wrapping it in a
# helper — static analysis recognises the guard only when it is inline.
MEDIA_ID_RE = re.compile(r"^[a-f0-9A-F\-]{1,64}$|^\d{1,20}$")
