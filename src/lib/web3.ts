import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";

// Manual Chain Definition for Monad Testnet
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.monad.xyz/"],
    },
  },
  testnet: true,
});

// Wagmi + RainbowKit Config
export const config = getDefaultConfig({
  appName: "PULSE",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: [monadTestnet],
  ssr: true,
});

// Dummy creator address for MVP (used for exclusive content payments)
export const DUMMY_CREATOR_ADDRESS = "0x000000000000000000000000000000000000dEaD" as const;
