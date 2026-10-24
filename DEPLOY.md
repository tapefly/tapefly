# Deploying TapeFly

TapeFly is a plain Next.js 14 app. It has no database, no accounts and no secrets: every page is
computed from the date and from files committed in this repository.

## Run it on your machine

Requires Node.js 20 or newer (CI uses 22).

```
npm ci
npm run dev            # http://localhost:3000, for trying it out
```

For a production server on your own machine:

```
npm run build
npm start              # http://localhost:3000; set PORT=8080 to change the port
```

`npm run check` runs everything CI runs: typecheck, tests, the ledger and board checks, the
TapeOut bytes check and the build.

## Deploy to Vercel

1. Push this repository to GitHub, then import it at vercel.com/new (framework: Next.js; no
   build settings to change). Or, without GitHub: `npx vercel` from this folder, then
   `npx vercel --prod`.
2. Optional: set `NEXT_PUBLIC_SITE_URL` to your domain (for example `https://tapefly.example`)
   in the project's environment variables. Share cards and the sitemap use it. Until it is set,
   Vercel's own URL for the deployment is used.

## What keeps itself current

- **The lineage.** Each day's flies descend from the day before's champion. The committed
  ledger (`sim/lineage.json`) is the record; any day after its last row is computed by the
  server from that row, exactly as the daily workflow would, so a deployment with no daily job
  stays correct. Nothing is computed beyond tomorrow (UTC).
- **The daily workflow** (`.github/workflows/lineage.yml`) still commits the ledger and any
  finished season to the repository each day. It needs the repository on GitHub with Actions
  enabled. Without it the site still works; seasons simply are not frozen into
  `challengers/seasons.json` until someone runs `npm run lineage && npm run board` and commits.

## Environment variables

| Name | Needed | What it does |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | optional | The public address, used for share cards and the sitemap |
| `PORT` | optional | Port for `npm start` (default 3000) |

There are no keys. The tape-out step uses the owner's own wallet, outside this app; no private
key ever belongs in this repository or its environment.
