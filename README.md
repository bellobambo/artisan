# Artisan

Artisan is a SkillBounty Board for learning communities. Admins post small tasks, learners submit proof of work, Venice AI reviews the submission, and approved rewards are paid from a MetaMask Smart Account through 1Shot gas abstraction.

## MVP Flow

```txt
Create bounty
-> Learner submits work
-> Venice AI scores and summarizes the submission
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
- Venice AI API key from Venice.
- 1Shot relayer RPC/config from the 1Shot docs.
- A public RPC URL for your selected network.
- MongoDB Atlas or local MongoDB if you want persistent bounty data.

Copy `.env.example` to `.env.local` and fill the values you have:

```bash
cp .env.example .env.local
```

## Current State

The current app is a local interactive prototype:

- Bounty creation works in client state.
- Learner submission works in client state.
- Venice review calls the Venice API through `/api/venice/review`.
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

## Current Sponsor Flow

```txt
Connect MetaMask
-> Request Smart Permission
   - Fetches 1Shot relayer capabilities.
   - Uses the returned targetAddress as the execution-permission target.
   - Requests an ERC-20 USDC allowance permission through MetaMask Advanced Permissions.
-> Submit learner work
-> Run Venice review
-> Prepare 1Shot payout
   - Fetches 1Shot fee data.
   - Encodes USDC.transfer(learner, reward).
   - Stores permission context, delegation manager, fee quote, and calldata for relay submission.
-> Submit to 1Shot
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
- Venice AI: https://docs.venice.ai/overview/about-venice
