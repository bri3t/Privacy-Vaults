import {useCallback ,useState, useEffect } from 'react'
import {  formatUnits, Address } from 'viem'

const ERC20_BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

export type BalanceClient = {
  chain?: { id?: number | null } | null;
  readContract: (args: {
    address: `0x${string}`;
    abi: typeof ERC20_BALANCE_ABI;
    functionName: "balanceOf";
    args: [Address];
  }) => Promise<bigint | string | number>;
};

const BALANCE_REFRESH_INTERVAL_MS = 3000;

export function useUsdcBalance(publicClient: any, owner: Address, usdcAddress?: Address) {
  const [formattedBalance, setFormattedBalance] = useState("");
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);

  const refreshBalance = useCallback(
    async (isManual = false) => {
      if (!owner) {
        setFormattedBalance("");
        if (isManual) {
          setIsRefreshingBalance(false);
        }
        return;
      }

      if (isManual) {
        setIsRefreshingBalance(true);
      }

      try {
        const balance = await getUSDCBalance(publicClient as BalanceClient, owner, usdcAddress);
        setFormattedBalance(formatUnits(balance, 6));
      } catch (error) {
        console.error("Failed to check USDC balance", error);
      } finally {
        if (isManual) {
          setIsRefreshingBalance(false);
        }
      }
    },
    [owner, publicClient, usdcAddress],
  );

  useEffect(() => {
    if (!owner) {
      setFormattedBalance("");
      return;
    }

    void refreshBalance();
  }, [owner, refreshBalance]);

  useEffect(() => {
    if (!owner) {
      return;
    }

    const intervalId = setInterval(() => {
      void refreshBalance();
    }, BALANCE_REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [owner,  refreshBalance, BALANCE_REFRESH_INTERVAL_MS]);

  return {
    formattedBalance,
    isRefreshingBalance,
    refreshBalance,
  };
}

export async function getUSDCBalance(client: BalanceClient, owner: Address, tokenAddress?: Address): Promise<bigint> {
  try {
    if (!tokenAddress) {
      return 0n;
    }

    const balance = await client.readContract({
      address: tokenAddress,
      abi: ERC20_BALANCE_ABI,
      functionName: "balanceOf",
      args: [owner],
    });

    return toBigInt(balance);
  } catch (error) {
    console.error("Failed to fetch USDC balance", error);
    return 0n;
  }
}


function toBigInt(balance: bigint | string | number): bigint {
  if (typeof balance === "bigint") {
    return balance;
  }
  if (typeof balance === "number") {
    return BigInt(balance);
  }
  return BigInt(balance);
}
