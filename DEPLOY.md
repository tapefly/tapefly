# Deploying TapeFly

TapeFly is a plain Next.js app. It has no database, no accounts and no required secrets: every
page is computed from the date and from files committed in this repository.

## Run it on your machine

Requires Node.js 22, matching CI and production.

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

## Production server

The public deployment at [tapefly.xyz](https://tapefly.xyz) runs as one Node process behind a
reverse proxy with HTTPS. Do not use cluster mode: the app must remain a single process.

```bash
npm ci
npm run check
npm run build
NEXT_PUBLIC_SITE_URL=https://tapefly.xyz PORT=3000 npm start
```

Use a process manager such as PM2 in `fork` mode to keep the single process alive. A typical
reverse proxy should:

- terminate HTTPS;
- preserve the original client address in `X-Real-IP`;
- limit request bodies to `1m`;
- proxy to the one local Node process.

The site can also run on any Node 22 host that satisfies the same constraints. Vercel is
supported as an alternate host but is not the production deployment.

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
| `NEXT_PUBLIC_SITE_URL` | recommended in production | Public address used by share cards and the sitemap |
| `PORT` | optional | Port for `npm start` (default 3000) |

No private key belongs in this repository or its environment. The tape-out step uses the
owner's own wallet outside the app. The optional daily anchor workflow reads a dedicated
`ANCHOR_PRIVATE_KEY` from GitHub Actions secrets; without it, the workflow still advances the
ledger and skips the transaction.
