# Demoji's

Demoji's is a React and Mongo-backed voting pool for AI-generated emoji ideas that do not exist yet.

The server checks proposed ideas against Unicode emoji names before generating, then checks the local submission pool for duplicates.

## Structure

- `client`: Vite, React, and Sass frontend.
- `server`: Express API, MongoDB persistence, and Fal.ai image generation.

## Local Setup

```bash
npm install
cp server/.env.example server/.env
cp client/.env.example client/.env
npm run dev:server
npm run dev:client
```

The server runs on `http://localhost:4000` by default. The client runs on Vite's default port.

For Atlas, copy the connection string from **Database > Connect > Drivers**. The host must be your real cluster host, such as `cluster0.abjpsxc.mongodb.net`, not the placeholder `cluster.mongodb.net`. Replace `<db_password>` with the password for that database user and add `/demojis` after `.net` so Mongoose uses a named database.

## Deployment

- Deploy `server` as a Render web service. Set `MONGODB_URI`, `FAL_KEY`, `CLIENT_ORIGIN`, and optional `FAL_MODEL_ID`.
- Set `FAL_TIMEOUT_MS` if image generation needs more or less than the default 120 seconds.
- Deploy `client/dist` to GitHub Pages. Set `VITE_API_URL` to the Render service URL before building.

## API

- `GET /api/health`: service health.
- `GET /api/demojis?search=&sort=popular`: list submissions.
- `GET /api/demojis/check?prompt=rollerblades`: check standard emoji and existing submissions.
- `POST /api/demojis/preview`: generate or regenerate an unsaved draft image.
- `POST /api/demojis`: submit the selected draft image to the voting pool.
- `PATCH /api/demojis/:id/vote`: vote once per browser identity.

When `FAL_KEY` is missing, the API returns a local SVG preview so the app can run during setup without calling Fal.ai.
