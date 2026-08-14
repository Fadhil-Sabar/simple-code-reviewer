# Smart Code Reviewer

AI-assisted pre-review tool for developers. It performs an early, practical
code review (Readability, Structure, Maintainability) before a human review,
using an OpenAI-compatible LLM API.

This repo currently contains the **backend** (`apps/api`). The SvelteKit
frontend from the PRD is planned as `apps/web`.

## Tech Stack

| Layer    | Tech                    |
| -------- | ----------------------- |
| Runtime  | Bun                     |
| API      | Hono                    |
| LLM      | OpenAI-compatible API   |
| Validation | zod                  |

## Project Structure

```text
.
├── PRD.md
├── package.json          # Bun workspace root
└── apps/
    └── api/              # Hono + Bun backend
        ├── src/
        │   ├── index.ts        # public exports
        │   ├── server.ts       # HTTP entrypoint
        │   ├── app.ts          # Hono app, CORS, error handling
        │   ├── routes/
        │   │   └── review.ts   # POST /api/review
        │   └── lib/
        │       ├── config.ts   # env config
        │       ├── errors.ts   # typed API errors
        │       ├── llm.ts      # OpenAI-compatible client (timeout + retries)
        │       ├── prompt.ts   # structured review prompt
        │       ├── review.ts   # orchestration + JSON validation
        │       └── types.ts    # domain types
        └── test/              # unit + integration tests
```

## Setup

```bash
bun install
cp apps/api/.env.example apps/api/.env
```

Then fill in `apps/api/.env`:

```env
LLM_API_KEY=your-key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
```

The API key is only ever used on the backend. It is never exposed to the
frontend and `.env` is git-ignored.

## Run

```bash
bun run dev:api        # from the repo root
# or
bun run --cwd apps/api dev
```

Server listens on `PORT` (default `3000`).

## API

### `GET /health`

Health check.

### `POST /api/review`

Request:

```json
{
  "code": "function a(d) { return d; }"
}
```

Response:

```json
{
  "score": 7,
  "readability": [
    { "issue": "Variable naming is too generic", "suggestion": "Use a descriptive name." }
  ],
  "structure": [],
  "maintainability": [],
  "positiveNote": "The function has a clear responsibility."
}
```

Errors are returned as:

```json
{ "error": { "message": "...", "type": "ValidationError" } }
```

| Status | Condition                                        |
| ------ | ------------------------------------------------ |
| 400    | Empty, invalid, or too-long code (max 20,000 chars) |
| 401    | LLM API key missing or rejected                  |
| 429    | LLM rate limit reached                           |
| 502    | LLM returned an error or an invalid response     |
| 504    | LLM request timed out                            |

## Configuration

| Variable          | Default | Description                          |
| ----------------- | ------- | ------------------------------------ |
| `LLM_API_KEY`     | (required) | Provider API key                  |
| `LLM_BASE_URL`    | (required) | OpenAI-compatible base URL        |
| `LLM_MODEL`       | (required) | Model name                        |
| `LLM_TIMEOUT_MS`  | `30000` | Per-request timeout                |
| `LLM_MAX_RETRIES` | `2`     | Retries on 5xx / rate limits       |
| `MAX_CODE_LENGTH` | `20000` | Max snippet length in characters   |
| `PORT`            | `3000`  | HTTP port                          |

## Tests

```bash
bun test --cwd apps/api
bun run --cwd apps/api typecheck
```
