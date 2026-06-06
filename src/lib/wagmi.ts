"use client";

import { createConfig, http, injected } from "wagmi";
import { baseSepolia } from "wagmi/chains";

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [injected({ target: "metaMask" })],
  transports: {
    [baseSepolia.id]: http(rpcUrl),
  },
});
