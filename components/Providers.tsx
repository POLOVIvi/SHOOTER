'use client';

import { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';

// Lazy-init to avoid SSR access to browser APIs
let _wagmiConfig: ReturnType<typeof createConfig> | null = null;
function getWagmiConfig() {
  if (!_wagmiConfig) {
    _wagmiConfig = createConfig({
      chains: [base],
      connectors: [
        coinbaseWallet({ appName: 'SHOOTER', preference: 'smartWalletOnly' }),
      ],
      transports: { [base.id]: http() },
    });
  }
  return _wagmiConfig;
}

export { getWagmiConfig };

// OnchainKitProvider will be added here once a valid API key is configured.
// import { OnchainKitProvider } from '@coinbase/onchainkit';
//
// Wrap {inner} with:
//   <OnchainKitProvider chain={base} apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}>
//     {inner}
//   </OnchainKitProvider>

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [config] = useState(getWagmiConfig);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
