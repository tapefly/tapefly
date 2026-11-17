# TapeFly DeWEB proof page

This folder is a static, self-contained proof page prepared for an X Layer
DeWEB/TapeKit site container.

Current status: **pre-tape-out proof only**.

It contains no JavaScript, network calls, analytics, remote fonts, CDN assets
or external resource references. That makes it eligible for TapeKit's static
"100% on-chain" scan once it is published.

Do not publish it as the TapeFly game. The real Workshop depends on Next.js API
routes, mutable design storage and server-side re-runs. A DeWEB container can
host this proof page, but not the current application as-is.

Before publishing:

1. Tape out a real Workshop brain on X Layer.
2. Read the stored bytes back and compare them with the local proof.
3. Evaluate every input on chain and compare every output.
4. Add the processor, circuit ID and transaction hash to this page.
5. Change the status only after all checks pass.
6. Publish the folder through HashPort/TapeKit and run the gateway status page.

The page currently records the `door3` proof:

- profile `WORKSHOP-7x6/1`
- 23 NAND gates
- 7 inputs, 6 outputs, 4 state bits
- 128 exhaustive input words
- 161 TapeOut bytes
- SHA-256 `3da820cc456b3757eefec1e8727286e42f1e448251507635baef6dd069ca52ff`
