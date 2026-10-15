'use client';

/**
 * QueryClientProvider wrapper for Next.js App Router.
 *
 * WHY A SEPARATE FILE?
 * layout.tsx is a Server Component by default in the App Router. QueryClientProvider
 * needs to run on the client (it holds React state). Extracting it to a 'use client'
 * boundary lets layout.tsx stay a Server Component while still wrapping the whole
 * app in the query context — the recommended pattern from the TanStack docs.
 *
 * WHY TANSTACK QUERY?
 * Native fetch + useEffect has three silent failure modes:
 *   1. Race conditions: two in-flight requests, whichever resolves last wins —
 *      even if it's the stale one.
 *   2. No deduplication: if three components each call useEffect to fetch /api/products,
 *      three HTTP requests go out. TanStack sends one and shares the result.
 *   3. Stale data: after a POST/PUT the list doesn't refresh unless you manually
 *      trigger a re-fetch. TanStack's invalidateQueries() handles this declaratively.
 *
 * STALE TIME:
 * 30 seconds means cached data is shown instantly while a background refetch happens
 * silently. The user never sees a loading spinner for data they've seen recently.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  // useState ensures each browser session gets its own QueryClient instance —
  // never a singleton shared across server renders (which would leak data between users).
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is considered fresh for 30 s; no refetch during this window.
            staleTime: 30 * 1000,
            // Keep unused data in cache for 5 min (so back-navigation is instant).
            gcTime: 5 * 60 * 1000,
            // Don't hammer the server on transient errors; exponential back-off
            // already built into TanStack — retry 3x before showing an error.
            retry: 3,
            // Refetch when the user switches back to the tab — always shows fresh data.
            refetchOnWindowFocus: true,
          },
          mutations: {
            // Surface mutation errors to the UI by default.
            throwOnError: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools panel — visible only in development builds, tree-shaken in production */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
