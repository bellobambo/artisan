"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import type { ReactNode } from "react";
import { useState } from "react";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: "#0f766e",
              borderRadius: 8,
              fontFamily:
                'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            },
            components: {
              Button: {
                controlHeight: 40,
                borderRadius: 8,
              },
              Card: {
                borderRadiusLG: 8,
              },
            },
          }}
        >
          {children}
        </ConfigProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
