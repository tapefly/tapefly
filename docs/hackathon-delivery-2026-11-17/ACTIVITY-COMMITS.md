# TapeFly Activity-Period GitHub Audit

Audit date: 2026-11-17  
Activity window used: 2026-10-16 through 2026-12-07  
Repository: <https://github.com/tapefly/tapefly>

## Finding

The public repository has strong evidence for 2026-10-24, plus automated daily lineage branches after that date. The main branch has not received the later Workshop, X Layer processor, Circuit #2, Agent API or presentation work.

This means:

- The October release can be fully audited.
- Daily lineage continuity can be audited.
- The November product development is implemented locally but does not yet have public GitHub commits on `main`.
- Judges should not be told that the November work is already publicly committed when it is not.

## Public main history

The public `main` HEAD is:

```text
625dadbd7844899e502cc1121efb1f2b34e3d999
2026-10-24
Record the BehaviorKit project thesis
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

## Local changes not publicly committed

The 2026-11-16 local release contains:

- Workshop as the main game.
- Memory, toggle and metronome parts.
- Stateful Workshop compiler and seal proof.
- Agent Workshop API.
- X Layer processor UI and preflight.
- X Layer Circuit #2 proof.
- Updated navigation and documentation.
- itch and Steam release materials.

The newer release folder has no `.git` metadata. Therefore exact commit dates for these changes cannot be reconstructed locally.

## Required publication step

Before submission:

1. Start from a clean clone of the public repository.
2. Copy the reviewed November source over it.
3. Scan for secrets and generated runtime data.
4. Create logical commits by feature and date where evidence exists.
5. Run `npm run check`.
6. Create a `v0.2.0` or later release.
7. Push `main` and the new tag.
8. Update this file with the real commit hashes.

Suggested commits:

```text
Release Workshop chapters 2 and 3 with memory and counting
Add Workshop design gallery, scoring and lineage
Unify all chain features on X Layer
Make Workshop the primary product experience
Add stateful Workshop seal proof and Agent proof API
Record X Layer processor deployment and Circuit #2 verification
Add itch.io and Steam release packages
Update hackathon submission and evidence ledger
```
