'use client';

import { useEffect, useState } from 'react';
import { type Address } from 'viem';
import { useAccount, usePublicClient } from 'wagmi';
import GameCanvas from '@/components/GameCanvas';
import PaywallStart from '@/components/PaywallStart';
import { BASE_CHAIN_ID, PAYWALL_ABI, PAYWALL_ADDRESS } from '@/lib/contract';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const CONTRACT_CONFIGURED = PAYWALL_ADDRESS.toLowerCase() !== ZERO_ADDRESS;

export default function Home() {
  const [paid, setPaid] = useState(false);
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: BASE_CHAIN_ID });

  useEffect(() => {
    const refreshPaidStatus = async () => {
      try {
        if (
          !CONTRACT_CONFIGURED ||
          !publicClient ||
          !isConnected ||
          !address ||
          chainId !== BASE_CHAIN_ID
        ) {
          setPaid(false);
          return;
        }
        const result = await publicClient.readContract({
          address: PAYWALL_ADDRESS as Address,
          abi: PAYWALL_ABI,
          functionName: 'hasPaid',
          args: [address as Address],
        });
        setPaid(Boolean(result));
      } catch {
        setPaid(false);
      }
    };

    void refreshPaidStatus();
  }, [publicClient, isConnected, address, chainId]);

  return paid ? <GameCanvas /> : <PaywallStart onPaid={() => setPaid(true)} />;
}
