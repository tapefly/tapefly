import { build } from "esbuild";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const dist = path.join(here, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const portalLang = path.join(here, "src/portal-lang.tsx");
const nextNavigation = path.join(here, "src/next-navigation-stub.ts");
const localModule = (specifier) => {
  const base = path.join(root, specifier);
  for (const suffix of ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js"]) {
    if (existsSync(base + suffix)) return base + suffix;
  }
  return base;
};

await build({
  absWorkingDir: root,
  entryPoints: [path.join(here, "src/main.tsx")],
  outdir: dist,
  entryNames: "game",
  assetNames: "assets/[name]-[hash]",
  bundle: true,
  minify: true,
  sourcemap: false,
  target: ["chrome90", "safari15", "firefox90"],
  jsx: "automatic",
  loader: {
    ".woff": "file",
    ".woff2": "file",
    ".ttf": "file",
    ".png": "file",
    ".jpg": "file",
    ".jpeg": "file",
    ".webp": "file",
    ".svg": "file",
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  plugins: [{
    name: "tapefly-itch-portal",
    setup(buildApi) {
      buildApi.onResolve({ filter: /^@\// }, (args) => ({ path: localModule(args.path.slice(2)) }));
      buildApi.onResolve({ filter: /(^|\/)i18n\/client$/ }, () => ({ path: portalLang }));
      buildApi.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: nextNavigation }));
    },
  }],
});

await cp(path.join(here, "index.html"), path.join(dist, "index.html"));
await cp(path.join(here, "favicon.svg"), path.join(dist, "favicon.svg"));

const sizes = await import("node:fs/promises").then((fs) => fs.readdir(dist, { withFileTypes: true }));
const metadata = {
  build: "TapeFly itch.io HTML5",
  platform: "itch.io",
  verification: "Static game-only build. No site navigation, wallet, chain, publishing or telemetry routes.",
  files: sizes.map((entry) => entry.name).sort(),
};
await writeFile(path.join(dist, "build.json"), JSON.stringify(metadata, null, 2) + "\n");

console.log(`itch build written to ${dist}`);
