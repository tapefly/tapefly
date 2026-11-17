# TapeFly Activity-Period GitHub Audit

Audit date: 2026-11-17  
Activity window used: 2026-10-16 through 2026-12-07  
Repository: <https://github.com/tapefly/tapefly>

## Finding and resolution

The public repository had strong evidence for 2026-10-24, plus automated daily lineage branches after that date. The later Workshop, X Layer processor, Circuit #2, Agent API and presentation work existed only in a local release snapshot during the audit.

Resolved on 2026-11-17:

- Release-content commit: `7fa96b1`
- Branch: `release/tapefly-2026-11-17`
- Default branch: `main`
- Tag: `v0.3.0`

The release-content commit was fast-forwarded to `main` and both the branch and
tag were pushed to the public repository. Later evidence-only commits may move
the branch HEAD forward.

## Public main history

The release-content commit is:

```text
7fa96b1
2026-11-17
Ship Workshop and the X Layer verifiable-brain release
```

The tagged `v0.1.0` release points to:

```text
ac4cee9d82a29dc91f203c4ee7e4993d84da542f
2026-10-24
Update GitHub actions to current runtimes
```

## Public commits on 2026-10-24

| Commit | Subject | Change scale |
|---|---|---:|
| `0ddafec` | Record the TapeFly processor on a superseded chain | 158 files, +26,195 |
| `882a053` | Historical official-brain tape-out on the TapeFly processor | 11 files, +31/-28 |
| `e7503ac` | Add historical on-chain artwork | 3 files, +47 |
| `7243718` | Polish the public TapeFly repository | 7 files, +337/-79 |
| `12caa23` | Link the public source from the site | 2 files, +8/-2 |
| `e496988` | Upgrade to Next.js 15 and clear dependency advisories | 20 files, +710/-165 |
| `9e94c49` | Remove retired project branding | 14 files, +11/-3,976 |
| `23b53d4` | Raise the public repository to release quality | 14 files, +452/-18 |
| `ac4cee9` | Update GitHub actions to current runtimes | 4 files, +9/-9 |
| `a810d22` | Add investor memo and Xccelerate submission copy | 3 files, +449 |
| `3c315c7` | Lead with founder X Layer credibility | 2 files, +34/-22 |
| `52ae1dc` | Add the TapeFly product demo | 5 files, +11/-4 |
| `bbf2d78` | Rebuild the demo with Chinese narration | 5 files, +6/-6 |
| `94b41e3` | Add concise pitch and launch post copy | 3 files, +258 |
| `625dadb` | Record the BehaviorKit project thesis | 1 file, +394 |

## Daily lineage evidence

The repository contains separate branches from 2026-10-25 through 2026-11-16. They extend the lineage ledger and season data by one day each.

| Date | Branch | Commit |
|---|---|---|
| 2026-10-25 | `lineage/2026-10-25` | `dba4b79` |
| 2026-10-26 | `lineage/2026-10-26` | `d2eb2dc` |
| 2026-10-27 | `lineage/2026-10-27` | `8982f22` |
| 2026-10-28 | `lineage/2026-10-28` | `1fbb0c2` |
| 2026-10-29 | `lineage/2026-10-29` | `84a8e5b` |
| 2026-10-30 | `lineage/2026-10-30` | `afef60f` |
| 2026-10-31 | `lineage/2026-10-31` | `3d35132` |
| 2026-11-01 | `lineage/2026-11-01` | `3757ebc` |
| 2026-11-02 | `lineage/2026-11-02` | `0623f57` |
| 2026-11-03 | `lineage/2026-11-03` | `a09ae16` |
| 2026-11-04 | `lineage/2026-11-04` | `41db0bf` |
| 2026-11-05 | `lineage/2026-11-05` | `0b3f046` |
| 2026-11-06 | `lineage/2026-11-06` | `5f4928e` |
| 2026-11-07 | `lineage/2026-11-07` | `8b52259` |
| 2026-11-08 | `lineage/2026-11-08` | `54f284b` |
| 2026-11-09 | `lineage/2026-11-09` | `bb87d71` |
| 2026-11-10 | `lineage/2026-11-10` | `d255aab` |
| 2026-11-11 | `lineage/2026-11-11` | `14456ef` |
| 2026-11-12 | `lineage/2026-11-12` | `4786d3a` |
| 2026-11-13 | `lineage/2026-11-13` | `8babad1` |
| 2026-11-14 | `lineage/2026-11-14` | `c409f29` |
| 2026-11-15 | `lineage/2026-11-15` | `e2df485` |
| 2026-11-16 | `lineage/2026-11-16` | `7390e9d` |

These are continuity evidence, not substitutes for commits containing the product features.

## November release included on main

Commit `7fa96b1` publishes:

- Workshop as the main game.
- Memory, toggle and metronome parts.
- Stateful Workshop compiler and seal proof.
- Agent Workshop API.
- X Layer processor UI and preflight.
- X Layer Circuit #2 proof.
- Updated navigation and documentation.
- itch and Steam release materials.

The commit changes 276 files, with 22,823 insertions and 654 deletions.

## Verification completed before release

The following checks passed on the published source:

```text
npm run check          PASS
tests                  160 / 160
next build             PASS
npm run verify:onchain 4,096 / 4,096 + stored bytes match
npm audit --omit=dev   0 vulnerabilities
```

The release evidence is now:

- Release-content commit: <https://github.com/tapefly/tapefly/commit/7fa96b1>
- Release branch: <https://github.com/tapefly/tapefly/tree/release/tapefly-2026-11-17>
- Tag: <https://github.com/tapefly/tapefly/releases/tag/v0.3.0>
