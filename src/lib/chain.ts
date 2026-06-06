import { baseSepolia } from "viem/chains";

export const appChainId = Number(
  process.env.NEXT_PUBLIC_CHAIN_ID ?? String(baseSepolia.id),
);

export const appChain = baseSepolia;

export const usdcAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS as
  | `0x${string}`
  | undefined;
