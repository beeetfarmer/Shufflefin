# Shufflefin

A random media picker for Jellyfin and Plex. Shufflefin helps you decide what to watch by randomly selecting movies and TV shows from your media libraries, with optional filters for genre, cast, tags, year range, and watched status.

## Features

* Shuffle random movies and TV shows from Jellyfin or Plex libraries
* Filter by genre, cast, tags, year range, and watched status
* Support for multiple picks in a single shuffle (up to 20)
* StreamyStats watchlist integration for shuffling from curated watchlists
* Server-side cast search with autocomplete
* Image proxy for media posters
* Responsive dark themed UI with customizable accent colors

## Screenshots

<table>
  <tr>
    <td><img src="Screenshots/1.png" alt="Screenshot 1" /></td>
    <td><img src="Screenshots/2.png" alt="Screenshot 2" /></td>
  </tr>
  <tr>
    <td><img src="Screenshots/3.png" alt="Screenshot 3" /></td>
    <td><img src="Screenshots/4.png" alt="Screenshot 4" /></td>
  </tr>
</table>

## Prerequisites

* Python 3.10 to 3.13
* Node.js 18 or higher
* A running Jellyfin or Plex media server

Or just Docker — see [Docker](#docker) to skip the Python and Node setup entirely.

## Installation

Clone the repository:

```
git clone https://github.com/beeetfarmer/Shufflefin.git
cd Shufflefin
```

Install Python dependencies:

```
pip install -r backend/requirements.txt
```

Install frontend dependencies:

```
cd frontend
npm install
cd ..
```

## Configuration

Copy the example environment file and fill in your values:

```
cp .env.example .env
```

Open `.env` and configure your media server connection:

```
# Jellyfin (required for Jellyfin users)
JELLYFIN_URL=http://localhost:8096
JELLYFIN_API_KEY=your-jellyfin-api-key
JELLYFIN_USERNAME=your-jellyfin-username

# Plex (required for Plex users)
PLEX_URL=http://localhost:32400
PLEX_TOKEN=your-plex-token

# StreamyStats (optional, enables watchlist shuffle)
STREAMYSTATS_URL=http://localhost:3000
STREAMYSTATS_TOKEN=your-jellyfin-user-access-token

# Optional timeout (seconds) for upstream API requests
REQUEST_TIMEOUT=15
```

You need to configure at least one media server (Jellyfin or Plex). StreamyStats is optional and adds the ability to shuffle from your watchlists.

### Getting your API keys

**Jellyfin**: Go to Dashboard > API Keys > Create a new API key. The username should match the Jellyfin user whose libraries you want to shuffle.

**Plex**: You can find your Plex token by following the instructions at https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/

**StreamyStats**: The token is your Jellyfin user access token, which can be found in your StreamyStats user settings.

## Running

Start both the backend and frontend with a single command:

```
python run.py
```

This starts:
* Backend API at http://localhost:8005
* Frontend at http://localhost:8081

Open http://localhost:8081 in your browser to start shuffling.

Alternatively, you can start them separately:

```
# Backend
python -m uvicorn backend.main:app --reload --port 8005

# Frontend (in a separate terminal)
cd frontend
npm run dev
```

## Docker

### Running the published image

The quickest way to self-host. One container serves both the API and the UI on port 8005.

```
cp .env.example .env    # fill in your Jellyfin/Plex details
docker compose up -d
```

Open http://localhost:8005.

Or without Compose:

```
docker run -d --name shufflefin -p 8005:8005 --env-file .env beeetfarmer/shufflefin:latest
```

Images are published to [Docker Hub](https://hub.docker.com/r/beeetfarmer/shufflefin) for `linux/amd64` and `linux/arm64`, tagged `latest`, `<version>`, and `sha-<commit>`.

### Developing in Docker

The dev stack runs the backend and frontend as separate containers, both hot-reloading against your working tree:

```
cp .env.example .env
docker compose -f docker-compose.dev.yml up
```

* UI at http://localhost:8081 — Vite dev server with HMR, proxying `/api` to the backend
* API at http://localhost:8005 — uvicorn with `--reload`

Edits under `backend/` restart the API; edits under `frontend/src/` hot-swap in the browser. If file changes stop triggering reloads on your host, set `VITE_USE_POLLING: "true"` in `docker-compose.dev.yml`.

### Building locally

```
docker build --target runtime -t shufflefin:local .
```

## How It Works

1. Select your media server (Jellyfin or Plex) from the header
2. Choose a library from the dropdown
3. Optionally apply filters (genre, cast, tags, year range, exclude watched)
4. Set how many picks you want
5. Hit Shuffle and watch the slot machine pick your next watch

If you have StreamyStats configured, a Watchlist mode toggle will appear, letting you shuffle from your saved watchlists instead of filtering by library.

## Tech Stack

* **Backend**: Python, FastAPI, Pydantic
* **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack React Query, Framer Motion

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).

## Thanks

* [Jellyfin](https://jellyfin.org/) for the open source media server
* [Plex](https://www.plex.tv/) for the media platform
* [StreamyStats](https://github.com/fredrikburmester/streamystats) for the statistics and watchlist platform
