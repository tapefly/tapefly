# TapeFly Steam submission checklist

Verified against Steamworks documentation on 2026-11-15.

## Hard blockers that require the owner

- [ ] Sign in to an existing Steam account.
- [ ] Complete Steamworks onboarding with the legal entity or individual name.
- [ ] Use a bank account whose holder name matches the onboarding name.
- [ ] Complete the tax questionnaire; non-US applicants should expect W-8BEN-style information.
- [ ] Complete identity verification.
- [ ] Pay the USD 100 Steam Direct app fee per product.
- [ ] Approve the final legal, bank, tax, pricing, and release fields.

The app fee payment and legal identity fields require the account owner. Do not enter guessed information.

## Steam rules that shape the product

- Steam does not accept applications built on blockchain technology that issue or allow exchange of cryptocurrencies or NFTs.
- TapeFly's Steam build must therefore be a self-contained game with no wallet connection, token trading, NFT ownership, or on-chain transaction flow.
- The web game and Steam game can share gameplay code, but not the blockchain-facing package or store copy.

## Official timing

- Store page and game review: usually 1–5 days after submission.
- First release: at least 21 days after paying the app fee.
- Coming Soon page: publicly visible for at least 2 weeks before release.
- Tax verification can take up to 30 days if documents are requested.

## Store page fields

- [x] English store copy drafted in `STORE-PAGE-EN.md`.
- [x] Simplified Chinese store copy drafted in `STORE-PAGE-ZH.md`.
- [x] Capsule artwork generated in `assets/`.
- [x] Five 1920x1080 screenshot slots prepared in `screenshots/`.
- [ ] Choose final price and regional pricing.
- [ ] Confirm minimum and recommended system requirements after the desktop build exists.
- [ ] Confirm supported languages in the actual build.
- [ ] Complete Steam's AI content disclosure based on the shipped build and final assets.
- [ ] Complete the content survey.
- [ ] Add company/publisher names after legal onboarding.
- [ ] Add support URL, privacy policy URL, and community details.

## Required graphical assets

- [x] Header capsule: 920x430.
- [x] Small capsule: 462x174.
- [x] Main capsule: 1232x706.
- [x] Vertical capsule: 748x896.
- [x] Page background: 1438x810.
- [x] Library capsule: 600x900.
- [x] Library hero: 3840x1240.
- [x] Library logo: 1280 wide, transparent PNG.
- [x] Shortcut icon: 256x256 PNG.
- [x] App icon: 184x184 JPG.
- [ ] Replace any artwork that does not match the final shipped visual language.

## Preview and build work remaining

- [ ] Package the web game as a Windows/macOS desktop build.
- [ ] Add an offline save path and first-run setup.
- [ ] Verify keyboard, mouse, and Steam Deck controller navigation.
- [ ] Add a Steam-safe start screen with no external navigation.
- [ ] Create a clean pre-release branch without blockchain dependencies.
- [ ] Test on Windows 10/11, macOS Apple Silicon, and Steam Deck.
- [ ] Capture final screenshots from the desktop build rather than the website.
- [ ] Re-record or re-edit the trailer without wallet, token, NFT, or chain references.

## Release scope recommendation

Start with a focused single-player build:

1. Tutorial and first three chapters.
2. Sandbox mode.
3. Local save slots.
4. Deterministic replay and inspection.
5. Controller support.
6. Achievements only after the core build is stable.

Do not block the Coming Soon page on Workshop, competitive seasons, hardware, or blockchain features.
