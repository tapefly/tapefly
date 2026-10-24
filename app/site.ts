/* One place for the site's identity, so metadata, sitemap and robots agree. */

/* Where the site lives, for absolute links in share cards and the sitemap.
   Set NEXT_PUBLIC_SITE_URL to your domain; on Vercel the deployment's own URL is used until you do. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
  "http://localhost:3000";
export const SITE_NAME = "TapeFly";
export const SITE_TITLE = "TapeFly — build a fly's brain from TapeOut gates";
export const SITE_DESCRIPTION =
  "Flip a fly's instincts and they compile into a circuit of NAND gates, the same gates people tape out on TapeOut. " +
  "Race a friend, win the week. Every day replays from its date alone.";

/** Main pages first, then the corner pages linked from /proof. /me is folded into the home page. */
export const ROUTES = ["/", "/vs", "/board", "/build", "/tapeout", "/docs", "/proof", "/verify", "/lineage", "/calibrate", "/agents", "/lab", "/play"];

/** The public repository, once there is one. Left empty, the site shows the steps instead of a link. */
export const REPO_URL = "";
