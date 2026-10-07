import { DEV_IDENTITY_ROUTE, projectIdentity, recordDevPort } from "./dev-ports.mjs";

// configureServer is dev-only: neither identity nor runtime files are exposed
// by the production build or by the built-output preview.
export function installDevIdentity(server) {
  const identity = projectIdentity(server.config.root);
  const record = () => {
    const address = server.httpServer?.address();
    if (address && typeof address === "object") recordDevPort(server.config.root, address.port);
  };
  if (server.httpServer?.listening) record();
  else server.httpServer?.once("listening", record);
  server.middlewares.use((req, res, next) => {
    if ((req.url ?? "").split("?", 1)[0] !== DEV_IDENTITY_ROUTE || req.method !== "GET") {
      next();
      return;
    }
    const address = server.httpServer?.address();
    if (!address || typeof address !== "object") {
      res.statusCode = 503;
      res.end();
      return;
    }
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("cache-control", "no-store");
    res.end(JSON.stringify({ identity, port: address.port }));
  });
}
