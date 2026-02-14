def filter_watched_content(items):
    """Filter out watched content (Jellyfin format)."""
    return [
        item
        for item in items
        if not item.get("UserData", {}).get("Played", False)
        and item.get("UserData", {}).get("PlayedPercentage", 0) < 90
    ]


def filter_by_cast(items, cast_members):
    """Filter items by cast members (all must match)."""
    if not cast_members:
        return items

    filtered_items = []
    for item in items:
        cast_list = [
            person.get("Name")
            for person in item.get("People", [])
            if person.get("Type") == "Actor"
        ]
        if all(cast_member in cast_list for cast_member in cast_members):
            filtered_items.append(item)
    return filtered_items


def filter_by_tags(items, tags):
    """Filter items by tags (all must match)."""
    if not tags:
        return items

    filtered_items = []
    for item in items:
        item_tags = item.get("Tags", [])
        if all(tag in item_tags for tag in tags):
            filtered_items.append(item)
    return filtered_items


def filter_cast_members(search_term, cast_list):
    """Filter cast members based on search term."""
    if not search_term:
        return []

    search_term = search_term.lower()
    return [cast for cast in cast_list if search_term in cast.lower()]
