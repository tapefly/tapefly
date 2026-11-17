# TapeFly Steam package

This folder is the working package for the TapeFly Steam store page and submission.

## Current status

- Steamworks page reached; account login is the only owner-side blocker for creating the product entry.
- Store copy is drafted in English and Simplified Chinese.
- Capsule and client artwork is generated at the dimensions required by the current Steamworks documentation.
- A Steam-safe trailer edit and five verified 1920x1080 screenshots are included.

## Regenerate artwork

```bash
node steam/build-assets.mjs
```

## Submission sequence

1. Sign in at https://partner.steamgames.com/
2. Complete Steamworks onboarding.
3. Pay the USD 100 app fee.
4. Create TapeFly as an application.
5. Upload the store copy and artwork from this folder.
6. Publish the page in Coming Soon mode.
7. Build and test the desktop game shell.
8. Submit the build, page, pricing, and content survey for review.

## Important

The Steam edition must not include blockchain, wallet, token, or NFT features. Steam's onboarding documentation explicitly prohibits applications that issue or exchange cryptocurrencies or NFTs.
