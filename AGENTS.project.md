# Development port guidance

This project guidance overrides legacy template instructions that mandate one
port or assume a port owner belongs to this repository.

- Development prefers 8087, with available-port fallback; no port is mandatory.
- Start through `startup.sh`, `node scripts/dev-server.mjs`, or `npm run dev`.
- `PORT` is authoritative; CLI `--port` and `DEV_PORT` are supported when absent.
  Explicit overrides are numeric 1–65535 and fail rather than scan if occupied.
- Reuse only a verified server belonging to this checkout. Never stop another
  app to free a port. Use the actual reported serving URL for checks.
- Keep the auth environment wrapper and existing built-output preview settings.
- See `docs/dev-launcher.md` for runtime state and focused validation commands.
