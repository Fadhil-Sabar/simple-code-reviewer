/**
 * HTTP server entrypoint.
 */

import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { loadConfig } from "./lib/config";

export function main(): void {
  const config = loadConfig();
  const app = createApp(config);

  const server = serve(
    {
      fetch: app.fetch,
      port: config.port,
    },
    (info) => {
      console.log(`[api] Smart Code Reviewer API listening on :${info.port}`);
    },
  );

  const shutdown = (signal: string) => {
    console.log(`[api] received ${signal}, shutting down`);
    server.close(() => process.exit(0));
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

main();
