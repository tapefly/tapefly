# itch.io upload checklist — TapeFly Workshop

Everything below is copy-paste. Do it in this order; do not publish until step 9.

## 0. Before you start

- Upload package: `itch/TapeFly-itch-20261116.zip` (do not rebuild, do not add `public/`)
- Store copy: `itch/STORE-PAGE.md`
- Screenshots: **must be re-shot from the itch build** (see "Asset status")
- itch account: log in first, or create one at https://itch.io/register

## 1. Create the project

https://itch.io/game/new

| Field | Value |
| --- | --- |
| Title | `TapeFly Workshop` |
| Project URL | `tapefly-workshop` |
| Classification | Game |
| Kind of project | HTML |
| Release status | In development |
| Pricing | No payments (optionally enable donations later) |

## 2. Upload the build

- Uploads → `Upload files` → pick `TapeFly-itch-20261116.zip`
- Tick **"This file will be played in the browser"**
- Embed options: `Click to launch` (or `Fullscreen`)
- Viewport: `1600 x 900`, enable **Fullscreen button**, enable **Mobile friendly: off** until mobile QA passes

## 3. Description

Paste the "About this game" + "Features" + "Controls" sections from `STORE-PAGE.md`, in that order.
First line of the page (before the fold) must say it is a free prototype.

## 4. Genre and tags

- Genre: `Simulation`
- Tags: `building`, `automation`, `physics`, `puzzle`, `singleplayer`, `artificial-intelligence`, `experimental`, `html5`

## 5. Cover image

`store/cover.png` is 630×500 but the title is cropped at the top edge. Re-export before upload,
or ship without a cover for the draft.

## 6. Screenshots

Order matters: the first shot is the thumbnail in browse lists.

1. Level select / chapter map
2. A half-built fly on the board (wires visible)
3. Mid-flight, spider + sugar + trail on screen
4. Chip view (NAND gates) over the same design
5. Timeline / diagnosis after a failed run

## 7. Visibility

`Draft` → then `Restricted` (URL only) for the first 10 external testers → only then `Public`.

## 8. Do not

- Do not link to the wallet, TapeOut, X Layer or any token page.
- Do not reuse `store/screenshots/*.png` as-is (see below).
- Do not enable comments on day one; use the itch community board or Discord instead.

## 9. Pre-publish checks

- [ ] Opens in a private window with no console errors
- [ ] Level 1 can be completed in under 2 minutes with mouse only
- [ ] Save persists after reload
- [ ] Fullscreen button works
- [ ] No external network requests (check DevTools Network)
- [ ] Page contains no crypto or NFT wording

## Asset status

All six screenshots and the cover were re-shot on 2026-11-16 from the itch build itself
(English UI, 1600 × 900, no website nav, no wallet or chain pages). Upload order is listed
in `STORE-PAGE.md`.

Rebuild path if the game changes:

1. `node itch/build.mjs`
2. serve `itch/dist` locally
3. re-shoot the six views, downscale to 1600 × 900
4. re-zip `itch/dist` → `TapeFly-itch-20261116.zip`
