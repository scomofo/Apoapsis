# Development launcher

Development prefers port 8087; it is a default, not a required port.
`startup.sh` resolves its own repository directory and starts `npm run dev`
in the background. On Windows, use `node scripts/dev-server.mjs` for the same
background startup, or `npm run dev` for a foreground server. Both npm and
Vite `.cmd` shims use the Windows-only shell option in the environment wrapper.

Port selection is shared by startup and direct `npm run dev`:

1. Explicit `PORT`, then CLI `--port`, then `DEV_PORT`. Overrides must contain
   digits representing an integer from 1 to 65535. An occupied explicit port
   fails clearly; it never silently moves to another port.
2. Without an override, reuse a healthy saved server belonging to this project,
   then a healthy project server on the preferred port.
3. Otherwise, scan TCP availability from the preferred port through 50 ports
   above it. Non-HTTP listeners also count as occupied.

The dev-only identity endpoint verifies a token tied to the real repository
path. A generic HTTP 200 or stale PID is insufficient for reuse. Runtime state
is gitignored under `.grok/`. `.grok/dev-port` is written only after Vite binds,
or after verified reuse. Reuse refreshes stale saved-port data.

Vite receives `--strictPort` after selection, so a bind race produces an error
instead of silently changing the serving port. Inspect `.grok/dev.log` if a
background child fails to initialize. Ordinary build and preview commands
continue through the existing auth-environment wrapper.

On Linux, startup also stops this repository's own QA preview. It never stops an unrelated port owner.

## Focused verification

```sh
node --test scripts/dev-ports.test.mjs scripts/dev-launch.test.mjs
node --test scripts/with-app-env.test.mjs scripts/preview.test.mjs
```

The first command uses Node-only fixtures: real TCP/HTTP listeners, startup,
npm and the environment wrapper, with a small server standing in for Vite.
The `Dev launcher` workflow runs these checks on Linux and native Windows,
including a real `.cmd` fixture and a repository path containing spaces.
These checks do not certify the complete application build or curriculum.
