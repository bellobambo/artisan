# Artisan

Artisan is a task board for learning communities. Organizers create tasks, learners submit proof of work, Organizers pay a little fee to access AI-supported review through an x402-style 402 Payment Required flow, and approved rewards are paid from a MetaMask Smart Account through 1Shot gas abstraction.

## MVP Flow

```txt
Create bounty
-> Learner submits work
-> Organizer starts AI-supported review (Platform Displays 402 Payment Required before running the AI Review)
-> MetaMask Advanced Permission authorizes the x402 review payment
-> 1Shot relays the ERC-7710 payment transaction
-> Our Dedicated AI scores and summarizes the submission
-> Admin approves the payout
-> MetaMask Smart Account executes the USDC transfer
-> 1Shot relays the ERC-7710 transaction
-> Bounty stores the transaction hash
```

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## What You Need To Set Up

- MetaMask browser extension with a funded test wallet.
- Base Sepolia as the selected 1Shot-compatible test network.
- Test USDC or another supported ERC-20 for demo rewards.
- OpenAI API key.
- 1Shot relayer RPC/config from the 1Shot docs.
- x402 seller wallet address to receive paid AI review fees.
- A public RPC URL for your selected network.
- MongoDB Atlas or local MongoDB if you want persistent bounty data.

Copy `.env.example` to `.env.local` and fill the values you have:

```bash
cp .env.example .env.local
```

For the x402 review demo, set:

```bash
NEXT_PUBLIC_X402_SELLER_ADDRESS=0xYourSellerWallet
NEXT_PUBLIC_X402_REVIEW_PRICE_USDC=0.01
```

## Current State

The current app is a local interactive prototype:

- Bounty creation works in client state.
- Learner submission works in client state.
- OpenAI review calls the OpenAI Responses API through `/api/openai/review`.
- `/api/openai/review` is x402-gated: the first request returns `402 Payment Required`, then the client pays the review fee and retries with an `X-Payment` proof.
- MetaMask wallet connection works through wagmi.
- Advanced Permissions request uses `@metamask/smart-accounts-kit` and requests a capped ERC-20 USDC allowance permission.
- 1Shot capability discovery and fee quote calls are wired through `/api/oneshot/capabilities` and `/api/oneshot/fee`.
- Payout preparation encodes the approved `USDC.transfer(learner, reward)` call and stores the relayer preparation state locally.
- `relayer_send7710Transaction` is wired through `/api/oneshot/send-7710`.
- `relayer_getStatus` is wired through `/api/oneshot/status`.

Next implementation steps:

1. Add MongoDB persistence for bounties, resources, submissions, reviews, and payouts.
2. Add MongoDB persistence for the returned 1Shot task ID, status, and final transaction hash.
3. Replace manual relay status checking with automatic polling or a webhook endpoint.

## How Payments Work

Artisan uses MetaMask Advanced Permissions, x402-style review payments, ERC-7710 delegated execution, and the 1Shot API together:

- **MetaMask Advanced Permissions**: the admin connects MetaMask and grants a capped USDC allowance permission to the 1Shot relayer target. The app stores the returned permission context locally so later review payments and bounty payouts can be executed from the admin's MetaMask Smart Account without asking for a new signature every time.
- **x402 review payment**: `/api/openai/review` is protected by a payment step. If the admin has not paid, the endpoint returns `402 Payment Required` with the USDC amount and seller wallet. The client pays that fee, stores an `X-Payment` proof like `oneshot:<taskId>`, then retries the OpenAI review request with that proof.
- **ERC-7710 / 7715 execution**: MetaMask returns the permission context using Advanced Permissions, and the app sends that context plus encoded ERC-20 calls to `/api/oneshot/send-7710`. The server decodes the delegation context and submits the transaction bundle through `relayer_send7710Transaction`.
- **1Shot API**: the app uses 1Shot to discover supported relayer capabilities, quote fees, submit delegated transaction bundles, and check task status. For payouts, the single `Initiate payout via 1Shot` button first prepares the USDC transfer calldata and fee quote, then immediately submits the prepared bundle to 1Shot. The returned task ID, relay status, and onchain transaction hash are saved on the bounty and shown in the drawer.

## Current Sponsor Flow

```txt
Connect MetaMask
-> Request Smart Permission
   - Fetches 1Shot relayer capabilities.
   - Uses the returned targetAddress as the execution-permission target.
   - Requests an ERC-20 USDC allowance permission through MetaMask Advanced Permissions.
-> Submit learner work
-> Run paid x402 OpenAI review
   - Calls `/api/openai/review`.
   - Receives `402 Payment Required` with the AI review price and seller address.
   - Encodes a USDC payment to `NEXT_PUBLIC_X402_SELLER_ADDRESS`.
   - Sends the payment through `relayer_send7710Transaction`.
   - Retries `/api/openai/review` with `X-Payment: oneshot:<taskId>`.
-> Prepare 1Shot payout
   - Fetches 1Shot fee data.
   - Encodes the selected USDC.transfer(learner, reward) calls.
   - Stores permission context, delegation manager, fee quote, and calldata for relay submission.
-> Initiate payout via 1Shot
   - Decodes MetaMask's permission context into the delegation array expected by 1Shot.
   - Calls relayer_send7710Transaction.
   - Stores the returned task ID.
-> Check relay status
   - Calls relayer_getStatus.
   - Stores the confirmed transaction hash when status is terminal.
```

MetaMask docs note that Advanced Permissions use ERC-7715 and require the MetaMask user to be upgraded to a MetaMask Smart Account. The guide currently lists MetaMask Flask 13.5.0+ as a prerequisite for Advanced Permissions.

## MongoDB Shape

Use one `bounties` collection to start:

```ts
type BountyDocument = {
  title: string;
  community: string;
  resources?: string;
  rewardAmount: number;
  rewardToken: "USDC";
  status: "open" | "submitted" | "reviewed" | "paying" | "paid" | "failed";
  creatorAddress?: string;
  learnerAddress?: string;
  submissionUrl?: string;
  aiScore?: number;
  aiSummary?: string;
  aiRecommendation?: "approve" | "revise" | "reject";
  txHash?: string;
  relayerTaskId?: string;
  createdAt: Date;
  updatedAt: Date;
};
```

Install MongoDB later with:

```bash
npm install mongodb
```

## Sponsor Docs

- MetaMask Smart Accounts Kit: https://docs.metamask.io/smart-accounts-kit/
- Delegation execution: https://docs.metamask.io/smart-accounts-kit/guides/delegation/execute-on-smart-accounts-behalf/
- Advanced Permissions: https://docs.metamask.io/smart-accounts-kit/guides/advanced-permissions/execute-on-metamask-users-behalf/
- 1Shot gas sponsorship: https://1shotapi.com/docs/quickstarts/gas-sponsorship-eip7710
- OpenAI Responses API: https://platform.openai.com/docs/api-reference/responses
- OpenAI structured outputs: https://platform.openai.com/docs/guides/structured-outputs
