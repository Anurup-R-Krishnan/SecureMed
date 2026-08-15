# SecureMed frontend

Next.js interface for the SecureMed research and demonstration platform.

## Setup

```bash
cp .env.example .env.local
bun install
bun run dev
```

Open `http://localhost:3000`. Set `NEXT_PUBLIC_API_URL` for browser requests and `BACKEND_URL` for the server-side API proxy.

## Checks

```bash
bun run test
bunx tsc --noEmit
bun run lint
bun run build
```

See the [repository README](../README.md) for the backend setup, architecture, and clinical safety limitations.
