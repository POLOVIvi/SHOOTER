'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { type Address } from 'viem';
import {
  useAccount,
  useConnect,
  useSwitchChain,
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { BASE_CHAIN_ID, PAYWALL_ABI, PAYWALL_ADDRESS } from '@/lib/contract';

const BASESCAN_TX_URL = 'https://basescan.org/tx/';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const CONTRACT_CONFIGURED = PAYWALL_ADDRESS.toLowerCase() !== ZERO_ADDRESS;

type TxHash = `0x${string}`;

type PaywallStartProps = {
  onPaid: () => void;
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

export default function PaywallStart({ onPaid }: PaywallStartProps) {
  const { address, isConnected, chainId } = useAccount();
  const { connectAsync, connectors, isPending: isConnectPending } = useConnect();
  const { switchChainAsync, isPending: isSwitchPending } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: BASE_CHAIN_ID });
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

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

  const checkPaidOnChain = useCallback(
    async (walletAddress: Address) => {
      if (!publicClient || !CONTRACT_CONFIGURED) return false;
      return publicClient.readContract({
        address: PAYWALL_ADDRESS as Address,
        abi: PAYWALL_ABI,
        functionName: 'hasPaid',
        args: [walletAddress],
      });
    },
    [publicClient],
  );

  const isBusy = useMemo(
    () => isConnectPending || isSwitchPending || isWritePending || isWaitingConfirmation,
    [isConnectPending, isSwitchPending, isWritePending, isWaitingConfirmation],
  );

  useEffect(() => {
    if (!receipt) return;

    const finalizePayment = async () => {
      if (receipt.status !== 'success') {
        setStatus(null);
        setErrorText('Transaction failed onchain (receipt is not success).');
        return;
      }
      if (!address) {
        setStatus(null);
        setErrorText('Wallet is not connected after confirmation.');
        return;
      }
      const paid = await checkPaidOnChain(address);
      if (paid) {
        onPaid();
        return;
      }
      setStatus(null);
      setErrorText('Payment tx confirmed, but access flag is still false onchain.');
    };

    void finalizePayment();
  }, [receipt, address, checkPaidOnChain, onPaid]);

  useEffect(() => {
    if (!isReceiptError) return;
    setStatus(null);
    setErrorText(toReadableError(receiptError));
  }, [isReceiptError, receiptError]);

  const startFlow = useCallback(async () => {
    setErrorText(null);
    setTxHash(null);

    if (!CONTRACT_CONFIGURED) {
      setStatus(null);
      setErrorText('Paywall contract is not configured. Set PAYWALL_ADDRESS in lib/contract.ts');
      return;
    }

    try {
      let currentChainId = chainId;
      let currentAddress = address as Address | undefined;

      if (!isConnected) {
        setStatus('Connecting...');
        const connector = connectors[0];
        if (!connector) {
          throw new Error('No wallet connector available.');
        }
        const connected = await connectAsync({ connector });
        currentChainId = connected.chainId;
        currentAddress = connected.accounts[0] as Address | undefined;
      }

      if (currentChainId !== BASE_CHAIN_ID) {
        setStatus('Switching network...');
        await switchChainAsync({ chainId: BASE_CHAIN_ID });
      }

      if (!currentAddress) {
        throw new Error('Wallet address is missing.');
      }

      setStatus('Checking access...');
      const alreadyPaid = await checkPaidOnChain(currentAddress);
      if (alreadyPaid) {
        onPaid();
        return;
      }

      if (!publicClient) {
        throw new Error('Public client for Base is unavailable.');
      }

      const priceWei = await publicClient.readContract({
        address: PAYWALL_ADDRESS as Address,
        abi: PAYWALL_ABI,
        functionName: 'priceWei',
      });

      setStatus('Sending transaction...');
      const hash = await writeContractAsync({
        address: PAYWALL_ADDRESS as Address,
        abi: PAYWALL_ABI,
        functionName: 'pay',
        value: priceWei,
        chainId: BASE_CHAIN_ID,
      });
      setTxHash(hash);
      setStatus('Waiting confirmation...');
    } catch (error) {
      setStatus(null);
      setErrorText(toReadableError(error));
    }
  }, [
    chainId,
    address,
    isConnected,
    connectors,
    connectAsync,
    switchChainAsync,
    publicClient,
    checkPaidOnChain,
    writeContractAsync,
    onPaid,
  ]);

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
      </div>
    </div>
  );
}
