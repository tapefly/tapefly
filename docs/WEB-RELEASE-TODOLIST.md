# TapeFly Web Release Todo

Status: 2026-11-14

## Current assessment

The Workshop core loop is playable and distinctive:

- build a physical fly from 14 part types
- wire senses, logic, memory and timing
- run deterministic physics
- inspect a tick-by-tick replay
- diagnose a failed connection
- inspect and export the NAND circuit
- publish and derive designs
- challenge another design on the same level

Current automated tests: 160/160 pass. Type checking and the production build
also pass.

The web build is ready for controlled playtests, but not yet ready for a broad
public launch without the P0 items below.

## P0: release blockers

### Reliability and operations

- [x] Fix or intentionally regenerate the 2026-10-31 lineage drift.
- [x] Make `npm test`, typecheck and production build all green in CI.
- [x] Add an application error boundary and server error logging.
- [ ] Add privacy-friendly product analytics for the Workshop funnel.
- [ ] Track these events: page view, first part placed, first successful wire,
      first flight, first failure, first corrected flight, first clear, replay,
      chip view, publish, challenge, export, TapeOut click.
- [ ] Add client error reporting with release version and route context.
- [ ] Add uptime checks for `/`, `/workshop`, `/api/v1/health` and
      `/workshop/gallery`.
- [ ] Add disk-usage and `designs.jsonl` growth alerts on the server.

Acceptance:

- CI is green.
- A forced client exception appears in the error dashboard.
- A server error includes request ID, route and release.
- We can see how many visitors reach first flight and first clear.

### Save and recovery

- [ ] Add "Continue" to the home page when a browser save exists.
- [ ] Add a visible "My designs" screen for Workshop designs and best scores.
- [ ] Add export/import of the complete Workshop save.
- [ ] Add a confirm-reset flow.
- [ ] Protect against corrupted `localStorage` data with recovery messaging.
- [ ] Add a "this progress lives in this browser" explainer before play.

Acceptance:

- A player can move progress to another browser.
- Corrupt save data does not white-screen the game.
- Clearing site data cannot happen without a warning and export option.

### Mobile, browser and accessibility

- [ ] Test Workshop on iPhone Safari and Android Chrome.
- [ ] Test wire placement and part placement with touch only.
- [ ] Test 360px, 390px, 768px, 1280px and 1920px layouts.
- [ ] Ensure all controls are at least 44px on touch devices.
- [ ] Add keyboard navigation for the part tray, canvas actions and replay.
- [ ] Verify reduced-motion mode for camera shake and slow motion.
- [ ] Add focus states and accessible names to canvas-adjacent controls.
- [ ] Test with browser zoom at 200%.

Acceptance:

- A phone user can clear the first level without a desktop.
- No controls overlap or clip at supported sizes.
- Every important action is reachable by keyboard.

### Game onboarding and core feedback

- [ ] Recruit five first-time players and record sessions.
- [ ] First level target: cleared in under two minutes with no explanation.
- [ ] After failure, at least 8/10 players can explain why it failed.
- [x] Make the selected part, valid cells and wire mode more obvious.
- [x] Add stronger physical feedback for impact, snap, sugar pickup and spider.
- [ ] Add a short "look, connect, fly" animation on the first level.
- [x] Let players inspect the exact failed tick from the verdict card in one click.
- [x] Add a final "one thing to try next" after every failed run.

Acceptance:

- Five consecutive playtesters clear level one without help.
- Most players identify a cause and make a corrective edit.
- The first ten minutes contain at least two visible "aha" moments.

### Published-design safety

- [ ] Back up `$WORKSHOP_DATA_DIR` daily.
- [ ] Add a restore procedure and test it on staging.
- [ ] Add report/hide for published names.
- [ ] Add a minimal admin moderation endpoint protected outside the public UI.
- [ ] Show publish rules clearly.
- [ ] Prevent duplicate submissions from confusing the board.
- [ ] Add pagination to the design library.
- [ ] Add sort/filter by level, time, gates, parts and recency.

Acceptance:

- A bad public name can be hidden without editing JSON by hand.
- Gallery data can be restored from a backup.
- 10,000 rows still load acceptably.

### Workshop AI API

Current API can list, fetch and publish Workshop designs, but it is not
documented enough for an external agent.

- [ ] Add `GET /api/v1/workshop` describing version, levels, parts and schemas.
- [ ] Add `GET /api/v1/workshop/levels`.
- [ ] Add `POST /api/v1/workshop/evaluate` for a design on a level.
- [ ] Return outcome, parts, gates, bits, seconds, diagnosis and replay trace ID.
- [ ] Add `POST /api/v1/workshop/submit` as the documented publish endpoint.
- [ ] Add rate-limit headers and explicit error codes.
- [ ] Add an agent quickstart with a complete curl/JavaScript example.
- [ ] Add a sample agent that designs and improves a fly automatically.

Acceptance:

- An agent can discover the schema, submit a design, receive scores and improve
  it without reading repository source.
- A human can reproduce every API result.

### Legal, trust and support

- [ ] Add Privacy Policy.
- [ ] Add Terms of Service.
- [ ] Add Cookie/Local Storage disclosure.
- [ ] Add User Content Policy for published design names.
- [ ] Add Contact/Support page.
- [ ] Add security disclosure contact.
- [ ] State clearly which features use X Layer and which never touch a wallet.
- [ ] Add a permanent public changelog.

Acceptance:

- Privacy, terms, content policy and support are reachable from every page.
- A first-time user understands what is stored locally, what is public and what
  goes on chain.

## P1: product polish

### Main-game experience

- [ ] Replace generated hero imagery with actual Workshop footage/GIF.
- [ ] Add a 20-second first-visit demo that can be skipped.
- [ ] Add chapter-complete summaries.
- [ ] Add medals and a visible next optimization target.
- [ ] Add 3-5 additional hand-authored sandbox challenges.
- [ ] Add a proper pause menu and "return to level map" confirmation.
- [ ] Add gamepad support.
- [ ] Add a settings page for sound, motion, language and control hints.
- [ ] Add autosave status feedback.
- [ ] Add a first-class "My fly" identity: name, thumbnail, parts, gates.

### Replay and debugging

- [ ] Make the diagnosis card point directly to a visible signal row.
- [ ] Show "what changed" between two runs.
- [ ] Add compare A/B designs on the same timeline.
- [ ] Add replay deep links.
- [ ] Add GIF export with a proper frame and score card.
- [ ] Add an optional slow-motion export of the failure moment.

### Community and sharing

- [ ] Add per-design Open Graph image.
- [ ] Add a share preview with name, parts, gates, time and thumbnail.
- [ ] Add challenge results and rematch links.
- [ ] Add a featured design of the day.
- [ ] Add creator attribution and derivation graph.
- [ ] Add a leaderboard for fewest parts, fewest gates and fastest time.
- [ ] Add weekly seeded challenge.

### Content and documentation

- [ ] Rewrite Docs around Workshop as the main game.
- [ ] Move Brain Brawl/Evolution/Forage to a clearly separated Lab API section.
- [ ] Add "How the NAND compiler works".
- [ ] Add "How deterministic physics works".
- [ ] Add "How to verify a published score".
- [ ] Add "How to export Verilog".
- [ ] Add a glossary for Part, Wire, Input, Output, Gate, State and Replay.

## P2: growth and ecosystem

- [ ] Add creator profiles or anonymous creator IDs.
- [ ] Add follow/favorite for designs.
- [ ] Add a level editor.
- [ ] Add user-made levels with server-side validation.
- [ ] Add seasonal competitions.
- [ ] Add an official AI challenger that cannot see future inputs.
- [ ] Add public API keys and usage tiers.
- [ ] Add embeddable challenge cards.
- [ ] Add an X Layer proof view tied to each Workshop design.
- [ ] Add localization beyond Chinese and English.
- [ ] Add accessibility audit with external testing.
- [ ] Add performance budgets and Lighthouse CI.

## Recommended 10-day sprint

### Days 1-2

- fix the lineage test
- CI green
- privacy/terms/support
- analytics and error reporting
- save export/import

### Days 3-4

- mobile touch QA
- first-level onboarding polish
- failure-to-diagnosis one-click flow
- audio and impact feedback

### Days 5-6

- Workshop API discovery/evaluate/submit
- agent quickstart
- sample agent
- API tests

### Days 7-8

- design library search/filter/pagination
- report/hide
- daily backups
- moderation runbook

### Days 9-10

- five-player playtest
- fix top three onboarding problems
- performance and accessibility pass
- public changelog and release notes

## Web release gate

Do not call the web version broadly launched until all are true:

- 148/148 tests pass.
- Typecheck and production build pass.
- Five first-time players clear level one without help.
- At least 8/10 players can explain a failure and fix it.
- Mobile touch flow works.
- Save export/import works.
- Published designs are backed up and moderatable.
- Privacy, terms and support pages exist.
- An external agent can use the Workshop API from docs alone.
- Error and funnel analytics are live.
