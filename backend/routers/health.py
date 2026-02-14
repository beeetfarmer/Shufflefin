from fastapi import APIRouter

from backend.models import HealthResponse
from backend.utils.connection import check_jellyfin_connection
from backend.utils.plex_connection import check_plex_connection
from backend.services.streamystats import check_connection as check_streamystats_connection

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health_check():
    errors = {}

    jellyfin_ok, jellyfin_err = check_jellyfin_connection()
    if jellyfin_err:
        errors["jellyfin"] = jellyfin_err

    plex_ok, plex_err = check_plex_connection()
    if plex_err:
        errors["plex"] = plex_err

    streamystats_ok, streamystats_err = check_streamystats_connection()
    if streamystats_err:
        errors["streamystats"] = streamystats_err

    return HealthResponse(
        jellyfin=jellyfin_ok,
        plex=plex_ok,
        streamystats=streamystats_ok,
        errors=errors,
    )
