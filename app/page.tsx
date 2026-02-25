'use client';

import { useCallback, useEffect, useState } from 'react';
import GameCanvas from '@/components/GameCanvas';
import PaywallStart from '@/components/PaywallStart';

const STORAGE_KEY = 'shooter_paid_v1';

export default function Home() {
  const [isPaid, setIsPaid] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setIsPaid(false);
        return;
      }
      const parsed = JSON.parse(raw) as { paid?: boolean } | null;
      setIsPaid(Boolean(parsed?.paid));
    } catch {
      setIsPaid(false);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  const clearPayment = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setIsPaid(false);
  }, []);

  if (!isHydrated) return null;

  return isPaid
    ? <GameCanvas onExit={clearPayment} />
    : <PaywallStart onPaid={() => setIsPaid(true)} onReset={clearPayment} />;
}
