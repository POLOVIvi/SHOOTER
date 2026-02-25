# SHOOTER

Next.js mini game with a simple transaction paywall on Base Mainnet.

## Prerequisites

- Node.js 18+
- npm
- injected wallet extension (MetaMask or any EIP-1193 wallet)

## Environment Variables

```bash
NEXT_TELEMETRY_DISABLED=1
```

## Paywall Flow

On `START`, the app:

1. Connects injected wallet.
2. Switches to Base Mainnet (`chainId 8453`) if needed.
3. Sends EOA transfer to `0x62f2df490e0b72e0d3b3d1c6c65f5c49f56d66e2`.
4. Waits for receipt.
5. Opens the game only when `receipt.status === "success"`.

Payment flag is stored in localStorage as `shooter_paid_v1`.  
Use `Reset (dev)` to clear this flag.

## Run

```bash
npm install
npm run dev
```
