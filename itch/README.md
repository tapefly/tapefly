# TapeFly itch.io build

This build is intentionally separate from the public TapeFly website.

## What it includes

- The 21 Workshop levels and sandbox
- Build, wiring, flight, replay, diagnosis and chip view
- Local save, save import/export, sound and Chinese/English toggle
- Touch and mouse input on the build board
- Bundled fonts and assets

## What it excludes

- Website navigation and footer
- Wallet connection and chain recording
- Server publishing and seal checks
- Telemetry requests
- Promotional videos and unrelated public assets

## Build

```bash
node itch/build.mjs
```

## Upload to itch.io

Create an HTML project and upload a zip whose root contains `index.html`, `game.js`, `game.css` and `assets/`.

Recommended itch settings:

- Kind of project: HTML
- Embed: click to launch, or fullscreen
- Mobile friendly: yes, but mark desktop recommended until external mobile playtesting passes
- Visibility: Draft first, then Restricted or Public
- Pricing: Free demo, optionally enable donations

The build is designed to work without a server. Do not add the full `public/` directory from the website to this package.
