export async function register() {}

export async function onRequestError(
  error: unknown,
  request: { path?: string; method?: string },
  context: { routerKind?: string; routePath?: string; routeType?: string },
) {
  // Keep this handler dependency-free so the instrumentation bundle stays
  // valid on every Next.js runtime. PM2 already captures stdout/stderr.
  console.error(JSON.stringify({
    at: new Date().toISOString(),
    message: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
    path: request.path ?? "",
    method: request.method ?? "",
    ...context,
  }));
}
