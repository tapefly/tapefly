# X Layer processor and tape-out runbook

Date: 2026-11-14

## Evidence boundary

Only the current X Layer processor, circuit and transaction below are used as
deployment evidence. No earlier deployment is part of the public proof.

## Current X Layer factory

- chain ID: `196`
- factory: `0x1f09daefa827f02cbb40967cc91b259763760761`
- current implementation: `0x336e9f0f4c3fee7c8c803377e4dea00293f4ae2a`
- processor count at `75,861,014`: `418`
- deploy fee: `10,000,000` BEM base units
- BEM token: `0x60e62efa9405d6873c5deabd4e6cc91c25363952`
- BEM decimals: `8`
- actual processor creation fee: **0.1 BEM**

The factory no longer charges the deploy fee in native OKB. Calling
`createCPU` requires an ERC-20 allowance from the creator to the factory.

## Operator wallet status

The operator wallet is:

`0x3f665386b41fa15c5cccee983050a236e6a10108`

Read-only X Layer balances on 2026-11-14:

- OKB: approximately `0.004641878208761452`
- BEM: `0.10598672`
- BEM allowance to factory: `0`

The wallet now has enough BEM and OKB. The only remaining chain-state blocker
is the BEM approval.

## Completed deployment

The real `createCPU` transaction succeeded on X Layer:

- transaction: `0x13791b6c62ffc6acba3d31e94d4f2012f64323fd4c8ba7dd6390248f2e8cbf62`
- block: `75874205`
- receipt status: success
- gas used: `846,853`
- processor count after creation: `419`
- processor: `0xdE64a1584D6389D27318239DC5d6f58b0AeD52A3`
- transistors: `0xbdf03F98CA1d348e80d8f24cd8bf5720C94c504A`

Read-back from the deployed processor:

- name: `TapeFly`
- NAND price: raw `1,000,000,000,000` BEM units (`10,000 BEM` per NAND)
- supply cap: `1,000,000`
- tape-out fee: `0.0013 OKB`
- protocol fee: `1,000,000` wei
- circuits taped out: `0`

The operator wallet held approximately `0.00598672` BEM after creation.

After acquiring BEM, the official 50-gate brain was taped out on X Layer
through the lowest-cost external test processor:

- processor: `0x99081e1D0CE916Cd5b2c53e769DFC3B000BFE9A4`
- circuit: `#2`
- transaction: `0xa7ad0fd9b85e3290fbfe7d78dfba5c0ccc177d1723b3a9f6f18a1a87c937d5cd`
- stored bytes: match
- exhaustive eval: `4,096 / 4,096` answers match

## Critical pricing issue in the first TapeFly processor

The X Layer transistor contract's `mint(uint256,uint256)` is **non-payable** and
charges BEM through `transferFrom`. `mintPrice` is therefore a BEM-denominated
raw amount, not an OKB amount.

The first TapeFly processor was created with:

- `mintPrice = 1,000,000,000,000`
- BEM decimals: `8`
- resulting NAND price: `10,000 BEM` per NAND
- protocol fee: `0.01 BEM` per mint transaction
- 50-NAND official brain: `500,000.01 BEM`

The user's wallet holds approximately `0.00598672 BEM`, so a normal tape-out
cannot proceed. The factory and transistor contract expose no price setter;
the first processor cannot be repaired in place.

The web panel now reads and displays the real BEM balance, allowance and
purchase cost, sends `mint` with zero native value, and asks for an approval to
the transistor contract before spending BEM. It blocks the purchase instead of
letting the wallet fail with `ERC20InsufficientAllowance`.

A replacement TapeFly processor should be created with the price interpreted
as BEM. For example, `0.001 BEM` per NAND requires a raw `mintPrice` of
`100,000`. The operator needs at least `0.1 BEM` for the factory fee and should
account for the transistor contract's `0.01 BEM` protocol fee per mint
transaction.

## Fork verification before creation

A local Anvil fork of X Layer was used to impersonate a BEM holder. No mainnet
transaction was sent.

The following sequence succeeded on the fork:

1. `BEM.approve(factory, 10_000_000)`
2. `factory.createCPU(...)`

Observed gas for `createCPU` from the actual operator wallet: `842,053`.

At the fork gas price, gas cost was about `0.0000122 OKB`.

The local fork predicted these child contracts, and the real transaction
emitted the same addresses:

- processor: `0xdE64a1584D6389D27318239DC5d6f58b0AeD52A3`
- transistors: `0xbdf03F98CA1d348e80d8f24cd8bf5720C94c504A`

The transaction, event and read-back above are the final proof.

Read-back from the fork before the real transaction:

- processor name: `TapeFly`
- transistor contract: `0xbdf03F98CA1d348e80d8f24cd8bf5720C94c504A`
- tape-out fee: `0.0013 OKB`
- NAND price: raw `1,000,000,000,000` BEM units (`10,000 BEM` per NAND)
- supply cap: `1,000,000`
- creator: `0x3f665386b41fa15c5cccee983050a236e6a10108`
- protocol fee: `1,000,000` wei

## Deployed processor parameters

- name: `TapeFly`
- symbol: `FLY`
- supply cap: `1,000,000` raw units
- NAND price: raw `1,000,000,000,000` BEM units (`10,000 BEM` per NAND)
- story: describes TapeFly as an independent X Layer project

The factory accepted this raw value, but the transistor contract interprets the
same integer as BEM units. The resulting `10,000 BEM` per NAND makes the first
TapeFly processor unusable for normal players.

## Executed transaction sequence

These calls were reviewed and signed by the operator on 2026-11-14.

### Transaction 1: approve BEM

Call:

```text
BEM.approve(0x1f09daefa827f02cbb40967cc91b259763760761, 10000000)
```

This approves exactly `0.1 BEM`.

### Transaction 2: create the processor

Call:

```text
factory.createCPU(
  "TapeFly",
  "FLY",
  "<TapeFly story>",
  1000000,
  1000000000000
)
```

Native value: `0`.

After confirmation:

1. read `CPUCreated` from the receipt;
2. store the emitted processor and transistor addresses;
3. read `name`, `transistors`, `TAPEOUT_FEE`, `mintPrice`, `protocolFee`,
   `minted` and `supplyCap`;
4. add the processor to `config/tapeout.json`;
5. add a preset in `OFFICIAL_PROCESSORS` only after the read-back succeeds.

## First tape-out

For the current Workshop product, tape out `door3` first:

- profile: `WORKSHOP-7x6/1`
- NAND: `23`
- inputs: `7`
- outputs: `6`
- exposed state bits: `4`
- exhaustive local checks: `128 / 128`
- bytes: `161`
- SHA-256: `3da820cc456b3757eefec1e8727286e42f1e448251507635baef6dd069ca52ff`
- tape-out fee: `0.0013 OKB`

Then:

1. mint `23` NAND;
2. call `tapeout(bytes, 7, 6)`;
3. read the stored bytes back and compare;
4. call `eval` for all `128` combinations;
5. publish processor, circuit ID, transaction and verification result.

The official 50-gate `12 → 3` brain can then be taped out as the second circuit:

- NAND: `50`
- exhaustive checks: `4,096`
- bytes: `350`

## Stop conditions

- BEM balance below `0.1 BEM`
- allowance below `10,000,000`
- `createCPU` simulation fails
- emitted addresses do not have code
- processor read-back does not match the factory event
- stored bytes or exhaustive eval do not match
