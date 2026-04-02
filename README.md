# Sample CodeBuild Project

A zero-dependency Node.js REST API built with only the standard library. Designed to be built and tested with AWS CodeBuild.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check with uptime |
| GET | /api/items | List all items |
| POST | /api/items | Create item (JSON body: `{"name": "..."}`) |
| GET | /api/items/:id | Get item by ID |
| DELETE | /api/items/:id | Delete item by ID |

## Run Locally

```bash
node src/server.js
# Server runs on port 3000 (override with PORT env var)
```

## Run Tests

```bash
npm test
```

## AWS CodeBuild

1. Push this repo to GitHub
2. Create a CodeBuild project pointing to the repo
3. CodeBuild will use `buildspec.yml` automatically — it runs `npm test` with Node.js 20
4. No `npm install` needed since there are zero dependencies
