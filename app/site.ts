/* One place for the site's identity, so metadata, sitemap and robots agree. */

/* Where the site lives, for absolute links in share cards and the sitemap.
   Set NEXT_PUBLIC_SITE_URL to your domain; on Vercel the deployment's own URL is used until you do. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
  "http://localhost:3000";
export const SITE_NAME = "TapeFly";
export const SITE_TITLE = "TapeFly — build a robot fly with a real NAND brain";
export const SITE_DESCRIPTION =
  "TapeFly Workshop: assemble a robot fly, wire its senses into a NAND brain, and let it solve physics levels on its own. " +
  "Free to play, no wallet needed.";

/** Public product pages first, then the developer pages linked from the footer and navigation. */
export const ROUTES = [
  "/", "/workshop", "/workshop/gallery",
  "/brawl", "/evo", "/forage", "/vs", "/board", "/build", "/lab", "/play",
  "/tapeout", "/docs", "/docs/workshop", "/proof", "/verify", "/lineage", "/calibrate", "/agents",
  "/privacy", "/terms", "/support", "/changelog",
];

/** The public repository, once there is one. Left empty, the site shows the steps instead of a link. */
export const REPO_URL = "";
