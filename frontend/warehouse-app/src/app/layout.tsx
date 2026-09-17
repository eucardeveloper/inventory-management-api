import type { Metadata } from "next";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Warehouse Management System",
  description: "Spring Boot · AOP · Domain Events · Role-Based Access",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        {/*
          Providers is a 'use client' boundary that injects:
          - TanStack QueryClientProvider (server-state caching, deduplication, invalidation)
          - ReactQueryDevtools (dev-only, tree-shaken in prod)

          layout.tsx itself stays a Server Component — only the wrapper crosses
          the client boundary, which is the recommended Next.js App Router pattern.
        */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
