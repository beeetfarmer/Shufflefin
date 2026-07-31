# syntax=docker/dockerfile:1

# ---- Stage 1: build the frontend ----
FROM node:22-alpine AS frontend-build

WORKDIR /build

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


# ---- Stage 2: python dependencies (also the base for the dev container) ----
FROM python:3.14-slim AS python-deps

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

RUN python -m venv /opt/venv

COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install -r /tmp/requirements.txt

WORKDIR /app


# ---- Stage 3: runtime ----
FROM python:3.14-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    STATIC_DIR=/app/static \
    PORT=8005

RUN useradd --system --create-home --uid 10001 shufflefin

COPY --from=python-deps /opt/venv /opt/venv

WORKDIR /app
COPY backend/ ./backend/
COPY --from=frontend-build /build/dist ./static

USER shufflefin

EXPOSE 8005

# Hits the static index rather than /api/health: the health endpoint calls out
# to Jellyfin/Plex and can take as long as REQUEST_TIMEOUT to answer.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import sys,urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8005/', timeout=4).status == 200 else 1)"

CMD ["sh", "-c", "exec uvicorn backend.main:app --host 0.0.0.0 --port ${PORT}"]
