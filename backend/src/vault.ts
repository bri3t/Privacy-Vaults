import { createPublicClient, createWalletClient, http, getContract, type Address, type Log, parseAbiItem } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import type { Config } from "./config.js";

const DEPLOY_BLOCK = 37139811n;

/**
 * PrivacyVault contract ABI (matching on-chain contract)
 */
const PRIVACY_VAULT_ABI = [
    {
        inputs: [
            { name: "_commitment", type: "bytes32" },
            { name: "_receiveAuthorization", type: "bytes" },
        ],
        name: "depositWithAuthorization",
        outputs: [],
        stateMutability: "payable",
        type: "function",
    },
    {
        inputs: [
            { name: "_proof", type: "bytes" },
            { name: "_root", type: "bytes32" },
            { name: "_nullifierHash", type: "bytes32" },
            { name: "_recipient", type: "address" },
        ],
        name: "withdraw",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
] as const;

/**
 * Request body for vault deposit
 */
export interface VaultDepositRequest {
    commitment: string; // bytes32 hex string
    encodedAuth: string; // ABI-encoded receiveWithAuthorization params
}

/**
 * Response from vault deposit
 */
export interface VaultDepositResponse {
    success: boolean;
    transactionHash: string;
    blockNumber?: number;
    error?: string;
}

/**
 * Request body for vault withdrawal
 */
export interface VaultWithdrawRequest {
    proof: string; // ABI-encoded proof bytes
    root: string; // bytes32 hex string
    nullifierHash: string; // bytes32 hex string
    recipient: string; // address
}

/**
 * Response from vault withdrawal
 */
export interface VaultWithdrawResponse {
    success: boolean;
    transactionHash: string;
    blockNumber?: number;
    error?: string;
}

/**
 * Gets RPC URL for chain (prefers RPC_URL env var)
 */
function getRpcUrl(chainId: number): string {
    if (process.env.RPC_URL) {
        return process.env.RPC_URL;
    }
    if (chainId === 8453) {
        return "https://mainnet.base.org";
    }
    if (chainId === 84532) {
        return "https://base-sepolia-rpc.publicnode.com";
    }
    throw new Error(`Unsupported chain ID: ${chainId}`);
}

/**
 * Executes a vault deposit via relayer
 * @param request Deposit request with authorization signature
 * @param vaultConfig Vault configuration with addresses and private key
 * @returns Transaction hash and receipt
 */
export async function relayVaultDeposit(
    request: VaultDepositRequest,
    vaultConfig: Config["vault"],
): Promise<VaultDepositResponse> {
    try {
        // Validate inputs
        if (!vaultConfig.relayerPrivateKey) {
            throw new Error("Relayer private key not configured");
        }

        const chain = vaultConfig.chainId === 8453 ? base : baseSepolia;
        const rpcUrl = getRpcUrl(vaultConfig.chainId);

        // Create wallet client for relayer
        const rawKey = vaultConfig.relayerPrivateKey.startsWith("0x")
            ? vaultConfig.relayerPrivateKey
            : `0x${vaultConfig.relayerPrivateKey}`;
        const account = privateKeyToAccount(rawKey as `0x${string}`);
        const walletClient = createWalletClient({
            account,
            chain,
            transport: http(rpcUrl),
        });

        // Create vault contract instance
        const vaultContract = getContract({
            address: vaultConfig.vaultAddress as Address,
            abi: PRIVACY_VAULT_ABI,
            client: walletClient,
        });

        // Execute depositWithAuthorization transaction
        const transactionHash = await vaultContract.write.depositWithAuthorization(
            [
                request.commitment as `0x${string}`,
                request.encodedAuth as `0x${string}`,
            ],
        );

        // Wait for receipt
        const publicClient = createPublicClient({
            chain,
            transport: http(rpcUrl),
        });

        const receipt = await publicClient.waitForTransactionReceipt({
            hash: transactionHash,
        });

        return {
            success: receipt.status === "success",
            transactionHash,
            blockNumber: Number(receipt.blockNumber),
        };
    } catch (error) {
        console.error("Error relaying vault deposit:", error instanceof Error ? error.message : "Unknown error");
        return {
            success: false,
            transactionHash: "",
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Executes a vault withdrawal via relayer
 * @param request Withdrawal request with ZK proof
 * @param vaultConfig Vault configuration with addresses and private key
 * @returns Transaction hash and receipt
 */
export async function relayVaultWithdraw(
    request: VaultWithdrawRequest,
    vaultConfig: Config["vault"],
): Promise<VaultWithdrawResponse> {
    try {
        if (!vaultConfig.relayerPrivateKey) {
            throw new Error("Relayer private key not configured");
        }

        const chain = vaultConfig.chainId === 8453 ? base : baseSepolia;
        const rpcUrl = getRpcUrl(vaultConfig.chainId);

        const rawKey = vaultConfig.relayerPrivateKey.startsWith("0x")
            ? vaultConfig.relayerPrivateKey
            : `0x${vaultConfig.relayerPrivateKey}`;
        const account = privateKeyToAccount(rawKey as `0x${string}`);
        const walletClient = createWalletClient({
            account,
            chain,
            transport: http(rpcUrl),
        });

        const vaultContract = getContract({
            address: vaultConfig.vaultAddress as Address,
            abi: PRIVACY_VAULT_ABI,
            client: walletClient,
        });

        const transactionHash = await vaultContract.write.withdraw([
            request.proof as `0x${string}`,
            request.root as `0x${string}`,
            request.nullifierHash as `0x${string}`,
            request.recipient as Address,
        ]);

        const publicClient = createPublicClient({
            chain,
            transport: http(rpcUrl),
        });

        const receipt = await publicClient.waitForTransactionReceipt({
            hash: transactionHash,
        });

        return {
            success: receipt.status === "success",
            transactionHash,
            blockNumber: Number(receipt.blockNumber),
        };
    } catch (error) {
        console.error("Error relaying vault withdrawal:", error instanceof Error ? error.message : "Unknown error");
        return {
            success: false,
            transactionHash: "",
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Fetches all deposit commitments from the vault contract events
 */
export async function getCommitments(
    vaultConfig: Config["vault"],
): Promise<{ commitments: string[]; error?: string }> {
    try {
        const chain = vaultConfig.chainId === 8453 ? base : baseSepolia;
        const rpcUrl = getRpcUrl(vaultConfig.chainId);

        const publicClient = createPublicClient({
            chain,
            transport: http(rpcUrl),
        });

        const eventAbi = parseAbiItem(
            "event DepositWithAuthorization(bytes32 indexed commitment, uint32 leafIndex, uint256 timestamp)",
        );
        const currentBlock = await publicClient.getBlockNumber();
        let allLogs: Log[] = [];

        // Try single request first (works when result set is small)
        try {
            allLogs = await publicClient.getLogs({
                address: vaultConfig.vaultAddress as Address,
                event: eventAbi,
                fromBlock: DEPLOY_BLOCK,
                toBlock: currentBlock,
            });
        } catch {
            // Fall back to chunked requests if RPC rejects large range
            const totalBlocks = currentBlock - DEPLOY_BLOCK;
            const chunkSize = totalBlocks < 100n ? 10n : totalBlocks < 10_000n ? 1_000n : 10_000n;

            for (let from = DEPLOY_BLOCK; from <= currentBlock; from += chunkSize) {
                const to = from + chunkSize - 1n > currentBlock ? currentBlock : from + chunkSize - 1n;
                for (let attempt = 0; attempt < 3; attempt++) {
                    try {
                        const logs = await publicClient.getLogs({
                            address: vaultConfig.vaultAddress as Address,
                            event: eventAbi,
                            fromBlock: from,
                            toBlock: to,
                        });
                        allLogs.push(...logs);
                        break;
                    } catch (e) {
                        if (attempt === 2) throw e;
                        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
                    }
                }
            }
        }

        type DepositLog = Log & { args: { commitment: string; leafIndex: number; timestamp: bigint } };
        const sorted = (allLogs as DepositLog[]).sort((a, b) => a.args.leafIndex - b.args.leafIndex);
        const commitments = sorted.map((log) => log.args.commitment);

        return { commitments };
    } catch (error) {
        console.error("Error fetching commitments:", error instanceof Error ? error.message : "Unknown error");
        return {
            commitments: [],
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
