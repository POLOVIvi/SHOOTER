'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseEther } from 'viem';
import { useAccount, useConnect, useSendTransaction, useSwitchChain, useWaitForTransactionReceipt } from 'wagmi';

const BASE_CHAIN_ID = 8453;
const PAYMENT_TO = '0x62f2df490e0b72e0d3b3d1c6c65f5c49f56d66e2';
const PAYMENT_VALUE = parseEther('0.00001');
const BASESCAN_TX_URL = 'https://basescan.org/tx/';
const STORAGE_KEY = 'shooter_paid_v1';

type TxHash = `0x${string}`;

type PaywallStartProps = {
  onPaid: () => void;
  onReset: () => void;
};

function toReadableError(error: unknown): string {
  if (!(error instanceof Error)) return 'Unknown error. Please try again.';
  const message = error.message || 'Unknown error. Please try again.';
  if (/rejected|denied|cancel/i.test(message)) {
    return 'Request was rejected in wallet.';
  }
  if (/insufficient funds/i.test(message)) {
    return 'Insufficient funds to pay for this transaction.';
  }
  if (/chain|network/i.test(message)) {
    return 'Wrong network. Please switch wallet to Base Mainnet.';
  }
  return message;
}

export default function PaywallStart({ onPaid, onReset }: PaywallStartProps) {
  const { isConnected, chainId } = useAccount();
  const { connectAsync, connectors, isPending: isConnectPending } = useConnect();
  const { switchChainAsync, isPending: isSwitchPending } = useSwitchChain();
  const { sendTransactionAsync, isPending: isSendPending } = useSendTransaction();

  const [status, setStatus] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<TxHash | null>(null);

  const {
    data: receipt,
    isLoading: isWaitingConfirmation,
    isError: isReceiptError,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    chainId: BASE_CHAIN_ID,
    hash: txHash ?? undefined,
    query: { enabled: Boolean(txHash) },
  });

  const isBusy = useMemo(
    () => isConnectPending || isSwitchPending || isSendPending || isWaitingConfirmation,
    [isConnectPending, isSwitchPending, isSendPending, isWaitingConfirmation],
  );

  useEffect(() => {
    if (!receipt) return;

    if (receipt.status !== 'success') {
      setStatus(null);
      setErrorText('Transaction failed onchain (receipt is not success).');
      return;
    }

    if (txHash) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          paid: true,
          txHash,
        }),
      );
    }
    setStatus('Payment confirmed.');
    onPaid();
  }, [receipt, onPaid, txHash]);

  useEffect(() => {
    if (!isReceiptError) return;
    setStatus(null);
    setErrorText(toReadableError(receiptError));
  }, [isReceiptError, receiptError]);

  const continueFlow = useCallback(async (currentChainId: number) => {
    if (currentChainId !== BASE_CHAIN_ID) {
      setStatus('Switching network...');
      await switchChainAsync({ chainId: BASE_CHAIN_ID });
    }

    setStatus('Sending transaction...');
    const hash = await sendTransactionAsync({
      to: PAYMENT_TO,
      value: PAYMENT_VALUE,
      chainId: BASE_CHAIN_ID,
    });
    setTxHash(hash);
    setStatus('Waiting confirmation...');
  }, [switchChainAsync, sendTransactionAsync]);

  const startFlow = useCallback(async () => {
    setErrorText(null);
    setTxHash(null);
    setStatus(null);

    try {
      let currentChainId = chainId ?? 0;

      if (!isConnected) {
        setStatus('Connecting...');
        const injectedConnector = connectors.find((connector) => connector.id === 'injected');
        if (!injectedConnector) {
          throw new Error('Injected wallet is not available.');
        }
        const connected = await connectAsync({ connector: injectedConnector });
        currentChainId = connected.chainId;
      }

      await continueFlow(currentChainId);
    } catch (error) {
      setStatus(null);
      setErrorText(toReadableError(error));
    }
  }, [isConnected, chainId, connectors, connectAsync, continueFlow]);

  const resetPayment = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setStatus(null);
    setErrorText(null);
    setTxHash(null);
    onReset();
  }, [onReset]);

  return (
    <div className="start-overlay">
      <div className="start-card">
        <h1>SHOOTER</h1>
        <p className="subtitle">To play you must confirm an on-chain Base transaction</p>

        {status && <p className="tx-status">{status}</p>}
        {errorText && <p className="tx-error">{errorText}</p>}

        {txHash && (
          <p className="tx-hash">
            Tx:{' '}
            <a href={`${BASESCAN_TX_URL}${txHash}`} target="_blank" rel="noreferrer">
              {txHash}
            </a>
          </p>
        )}

        <button className="btn btn-primary" onClick={startFlow} disabled={isBusy}>
          {isBusy ? 'Processing...' : 'START'}
        </button>
        <button className="btn" onClick={resetPayment} disabled={isBusy}>
          Reset (dev)
        </button>
      </div>
    </div>
  );
}
