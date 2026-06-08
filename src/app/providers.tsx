"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import type { ReactNode } from "react";
import { useState } from "react";
import { Toaster } from "react-hot-toast";
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
              colorPrimary: "#443199",
              colorInfo: "#443199",
              colorLink: "#443199",
              colorBgBase: "#dddddd",
              colorBgContainer: "#eeeeee",
              colorBgElevated: "#eeeeee",
              colorBorder: "#443199",
              colorTextBase: "#555555",
              colorTextLightSolid: "#555555",
              borderRadius: 8,
              fontFamily:
                'var(--font-montserrat), Montserrat, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            },
            components: {
              Button: {
                controlHeight: 42,
                borderRadius: 8,
                primaryShadow: "0 8px 18px rgba(68, 49, 153, 0.32)",
              },
              Card: {
                borderRadiusLG: 8,
                headerBg: "#eeeeee",
              },
              Progress: {
                defaultColor: "#443199",
              },
              Tag: {
                borderRadiusSM: 6,
              },
            },
          }}
        >
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3200,
              style: {
                background: "#eeeeee",
                border: "1px solid #443199",
                color: "#555555",
                fontFamily:
                  'var(--font-montserrat), Montserrat, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                fontWeight: 600,
              },
              success: {
                iconTheme: {
                  primary: "#443199",
                  secondary: "#eeeeee",
                },
              },
              error: {
                iconTheme: {
                  primary: "#443199",
                  secondary: "#eeeeee",
                },
              },
            }}
          />
        </ConfigProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
