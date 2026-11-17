"use client";

const SESSION_KEY = "tapefly.telemetry.session";

function sessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const next = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return "anonymous";
  }
}

/**
 * Privacy-friendly product telemetry. No account, email, wallet or design code
 * is sent. Events are aggregated only to improve onboarding and reliability.
 */
export function track(event: string, data: Record<string, string | number | boolean | null> = {}): void {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({
    event,
    session: sessionId(),
    route: window.location.pathname,
    data,
  });
  try {
    void fetch("/api/v1/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Analytics must never break the game.
  }
}
