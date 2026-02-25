'use client';

import { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { ensureRandomUuidPolyfill } from '@/lib/safeUuid';

// Lazy-init to avoid SSR access to browser APIs
let _wagmiConfig: ReturnType<typeof createConfig> | null = null;

function getWagmiConfig() {
  if (!_wagmiConfig) {
    ensureRandomUuidPolyfill();

    _wagmiConfig = createConfig({
      chains: [base],
      connectors: [injected()],
      transports: { [base.id]: http() },
      storage: null,
    });
  }
  return _wagmiConfig;
}

export { getWagmiConfig };

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [config] = useState(getWagmiConfig);

  return (
    <WagmiProvider config={config} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
