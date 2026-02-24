# SHOOTER (Base Mini App)

Next.js (App Router) mini game with an on-chain paywall on Base Mainnet.

## Prerequisites

- Node.js 18+
- npm

## Environment Variables

For app runtime only:

```bash
NEXT_PUBLIC_ONCHAINKIT_API_KEY=
NEXT_TELEMETRY_DISABLED=1
```

For contract deploy, use the prompt flow below (no private key in files).

## Smart Contract

- Contract: `contracts/ShooterPaywall.sol`
- Network: Base Mainnet (`chainId 8453`)

### Compile

```bash
npm run contract:compile
```

### Deploy to Base Mainnet (recommended)

```bash
npm run contract:deploy:prompt
```

This command:
- asks for `BASE_RPC_URL` (default: `https://mainnet.base.org`)
- asks for `DEPLOYER_PRIVATE_KEY` with hidden input (not echoed)
- optionally asks for `BASESCAN_API_KEY`
- passes values only to the deploy process (not written to `.env.local`)
- deploys `ShooterPaywall`
- prints tx hash + address + BaseScan links
- updates `lib/contract.ts` (`PAYWALL_ADDRESS`) automatically

### Verify (optional)

If `BASESCAN_API_KEY` is provided in the prompt, verification runs automatically.
You can also run:

```bash
npm run contract:verify:base -- <DEPLOYED_ADDRESS> "0x62f2df490e0b72e0d3b3d1c6c65f5c49f56d66e2" "10000000000000"
```

## Quick Deploy Steps

1) Run:

```bash
npm run contract:compile
npm run contract:deploy:prompt
```

2) Confirm `PAYWALL_ADDRESS` in `lib/contract.ts` was updated.

Security:
- deploy private key is never saved to project files by the prompt script
- `.env.local`, `.env`, and `.env.*` are ignored by git
- never commit secrets

## Run App

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.
