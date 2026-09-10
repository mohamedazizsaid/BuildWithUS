'use client';

import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { ReactNode } from 'react';

// NEXT_PUBLIC_CONVEX_URL is optional in local dev (feature at intention stage).
// Fall back to a placeholder URL so the app starts without crashing;
// Convex queries in use-collaboration.ts are already skipped when templateId is null.
const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL;

const convex = new ConvexReactClient(CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
