import type { Request, Response } from "express";
import type { Openfort } from "@openfort/openfort-node";
import type { Config } from "./config.js";
import { relayVaultDeposit, relayVaultWithdraw, relayVaultBorrow, relayVaultRepay, getLoanInfo, getFeeInfo, getCommitments, getCurrentYieldIndex, getDepositStats, type VaultDepositRequest, type VaultWithdrawRequest, type VaultBorrowRequest, type VaultRepayRequest } from "./vault.js";

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const HEX_PATTERN = /^0x[0-9a-fA-F]+$/;
const BYTES32_LENGTH = 66; // 0x + 64 hex chars

function isValidAddress(value: unknown): value is string {
  return typeof value === "string" && ADDRESS_PATTERN.test(value);
}

function isValidBytes32(value: unknown): value is string {
  return typeof value === "string" && HEX_PATTERN.test(value) && value.length === BYTES32_LENGTH;
}

export async function handleHealth(_req: Request, res: Response): Promise<void> {
  res.status(200).json({
    status: "ok",
    message: "Privacy Vaults server is running",
  });
}

/**
 * Creates an encryption session for AUTOMATIC embedded wallet recovery.
 * This endpoint is required when using automatic wallet recovery with Openfort Shield.
 *
 * @see https://www.openfort.io/docs/products/embedded-wallet/react-native/quickstart/automatic
 * @see https://github.com/openfort-xyz/openfort-backend-quickstart
 */
export async function handleShieldSession(
  _req: Request,
  res: Response,
  openfortClient: Openfort | null,
  shieldConfig: Config["openfort"]["shield"]
): Promise<void> {
  const hasShieldConfig = Boolean(
    shieldConfig.publishableKey &&
    shieldConfig.secretKey &&
    shieldConfig.encryptionShare
  );

  if (!openfortClient || !hasShieldConfig) {
    res.status(500).json({
      error: "Openfort Shield configuration is missing.",
    });
    return;
  }

  try {
    const sessionId = await openfortClient.createEncryptionSession(
      shieldConfig.publishableKey,
      shieldConfig.secretKey,
      shieldConfig.encryptionShare,
    );
    res.status(200).json({ session: sessionId });
  } catch (error) {
    console.error("Shield session error:", error instanceof Error ? error.message : "Unknown error");
    res.status(500).json({
      error: "Failed to create encryption session",
    });
  }
}

/**
 * Relays a vault deposit with EIP-3009 authorization
 * @param req Request with VaultDepositRequest body
 * @param res Response with transaction hash or error
 * @param vaultConfig Vault configuration
 */
export async function handleVaultDeposit(
  req: Request,
  res: Response,
  vaultConfig: Config["vault"]
): Promise<void> {
  try {
    const parsedBody = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (!isValidAddress(parsedBody?.vaultAddress)) {
      res.status(400).json({ error: "Missing or invalid vaultAddress" });
      return;
    }

    const body: VaultDepositRequest = {
      commitment: parsedBody?.commitment,
      encodedAuth: parsedBody?.encodedAuth,
      vaultAddress: parsedBody.vaultAddress,
    };

    // Validate required fields
    if (!body.commitment || !body.encodedAuth) {
      res.status(400).json({
        error: "Missing required fields: commitment, encodedAuth",
      });
      return;
    }

    // Validate hex format
    if (!HEX_PATTERN.test(body.commitment) || !HEX_PATTERN.test(body.encodedAuth)) {
      res.status(400).json({
        error: "Invalid hex format for commitment or encodedAuth",
      });
      return;
    }

    // Validate commitment is bytes32 (66 chars = 0x + 64 hex)
    if (body.commitment.length !== 66) {
      res.status(400).json({
        error: "commitment must be a bytes32 hex string (66 characters)",
      });
      return;
    }

    // Validate encodedAuth length (EIP-3009 auth is ~580 hex chars, cap at 2000)
    if (body.encodedAuth.length > 2000) {
      res.status(400).json({ error: "encodedAuth exceeds maximum length" });
      return;
    }

    // Execute relayer
    const result = await relayVaultDeposit(body, vaultConfig);

    if (!result.success) {
      res.status(500).json({
        error: "Failed to relay vault deposit",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Vault deposit relayed successfully",
      transactionHash: result.transactionHash,
      blockNumber: result.blockNumber,
    });
  } catch (error) {
    console.error("Vault deposit error:", error instanceof Error ? error.message : "Unknown error");
    res.status(500).json({
      error: "Internal server error",
    });
  }
}

/**
 * Relays a vault withdrawal with ZK proof
 */
export async function handleVaultWithdraw(
  req: Request,
  res: Response,
  vaultConfig: Config["vault"]
): Promise<void> {
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (!isValidAddress(body?.vaultAddress)) {
      res.status(400).json({ error: "Missing or invalid vaultAddress" });
      return;
    }

    if (!body.proof || !body.root || !body.nullifierHash || !body.collateralNullifierHash || !body.recipient || !body.yieldIndex) {
      res.status(400).json({
        error: "Missing required fields: proof, root, nullifierHash, collateralNullifierHash, recipient, yieldIndex",
      });
      return;
    }

    if (!HEX_PATTERN.test(body.proof) || !isValidBytes32(body.root) || !isValidBytes32(body.nullifierHash) || !isValidBytes32(body.collateralNullifierHash)) {
      res.status(400).json({ error: "Invalid hex format" });
      return;
    }

    if (body.proof.length > 100_000) {
      res.status(400).json({ error: "proof exceeds maximum length" });
      return;
    }
    if (!isValidAddress(body.recipient)) {
      res.status(400).json({ error: "recipient must be a valid address" });
      return;
    }

    const request: VaultWithdrawRequest = {
      proof: body.proof,
      root: body.root,
      nullifierHash: body.nullifierHash,
      collateralNullifierHash: body.collateralNullifierHash,
      recipient: body.recipient,
      yieldIndex: body.yieldIndex,
      vaultAddress: body.vaultAddress,
    };

    const result = await relayVaultWithdraw(request, vaultConfig);

    if (!result.success) {
      res.status(500).json({
        error: "Failed to relay vault withdrawal",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Vault withdrawal relayed successfully",
      transactionHash: result.transactionHash,
      blockNumber: result.blockNumber,
    });
  } catch (error) {
    console.error("Vault withdrawal error:", error instanceof Error ? error.message : "Unknown error");
    res.status(500).json({
      error: "Internal server error",
    });
  }
}

/**
 * Relays a vault borrow with ZK proof
 */
export async function handleVaultBorrow(
  req: Request,
  res: Response,
  vaultConfig: Config["vault"]
): Promise<void> {
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (!isValidAddress(body?.vaultAddress)) {
      res.status(400).json({ error: "Missing or invalid vaultAddress" });
      return;
    }

    if (!body.proof || !body.root || !body.collateralNullifierHash || !body.recipient || !body.yieldIndex || !body.borrowAmount) {
      res.status(400).json({
        error: "Missing required fields: proof, root, collateralNullifierHash, recipient, yieldIndex, borrowAmount",
      });
      return;
    }

    if (!HEX_PATTERN.test(body.proof) || !isValidBytes32(body.root) || !isValidBytes32(body.collateralNullifierHash)) {
      res.status(400).json({ error: "Invalid hex format" });
      return;
    }

    if (body.proof.length > 100_000) {
      res.status(400).json({ error: "proof exceeds maximum length" });
      return;
    }
    if (!isValidAddress(body.recipient)) {
      res.status(400).json({ error: "recipient must be a valid address" });
      return;
    }

    const request: VaultBorrowRequest = {
      proof: body.proof,
      root: body.root,
      collateralNullifierHash: body.collateralNullifierHash,
      recipient: body.recipient,
      yieldIndex: body.yieldIndex,
      borrowAmount: body.borrowAmount,
      vaultAddress: body.vaultAddress,
    };

    const result = await relayVaultBorrow(request, vaultConfig);

    if (!result.success) {
      res.status(500).json({
        error: "Failed to relay vault borrow",
        details: result.error,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Vault borrow relayed successfully",
      transactionHash: result.transactionHash,
      blockNumber: result.blockNumber,
    });
  } catch (error) {
    console.error("Vault borrow error:", error instanceof Error ? error.message : "Unknown error");
    res.status(500).json({
      error: "Internal server error",
    });
  }
}

/**
 * Relays a vault repay with EIP-3009 authorization
 */
export async function handleVaultRepay(
  req: Request,
  res: Response,
  vaultConfig: Config["vault"]
): Promise<void> {
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (!isValidAddress(body?.vaultAddress)) {
      res.status(400).json({ error: "Missing or invalid vaultAddress" });
      return;
    }

    if (!body.collateralNullifierHash || !body.encodedAuth) {
      res.status(400).json({
        error: "Missing required fields: collateralNullifierHash, encodedAuth",
      });
      return;
    }

    if (!isValidBytes32(body.collateralNullifierHash) || !HEX_PATTERN.test(body.encodedAuth)) {
      res.status(400).json({ error: "Invalid hex format" });
      return;
    }

    if (body.encodedAuth.length > 2000) {
      res.status(400).json({ error: "encodedAuth exceeds maximum length" });
      return;
    }

    const request: VaultRepayRequest = {
      collateralNullifierHash: body.collateralNullifierHash,
      encodedAuth: body.encodedAuth,
      vaultAddress: body.vaultAddress,
    };

    const result = await relayVaultRepay(request, vaultConfig);

    if (!result.success) {
      res.status(500).json({
        error: "Failed to relay vault repay",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Vault repay relayed successfully",
      transactionHash: result.transactionHash,
      blockNumber: result.blockNumber,
    });
  } catch (error) {
    console.error("Vault repay error:", error instanceof Error ? error.message : "Unknown error");
    res.status(500).json({
      error: "Internal server error",
    });
  }
}

/**
 * Returns loan info for a given collateral nullifier hash
 */
export async function handleLoanInfo(
  req: Request,
  res: Response,
  vaultConfig: Config["vault"]
): Promise<void> {
  try {
    const vaultAddress = req.query.vaultAddress;
    const collateralNullifierHash = req.query.collateralNullifierHash;

    if (!isValidAddress(vaultAddress)) {
      res.status(400).json({ error: "Missing or invalid vaultAddress query parameter" });
      return;
    }
    if (!isValidBytes32(collateralNullifierHash)) {
      res.status(400).json({ error: "Missing or invalid collateralNullifierHash query parameter" });
      return;
    }

    const result = await getLoanInfo(vaultAddress, collateralNullifierHash, vaultConfig);

    if (result.error) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.status(200).json({ debt: result.debt, fee: result.fee, repaymentAmount: result.repaymentAmount, loan: result.loan });
  } catch (error) {
    console.error("Loan info error:", error instanceof Error ? error.message : "Unknown error");
    res.status(500).json({
      error: "Internal server error",
    });
  }
}

/**
 * Returns the relayer fee configuration for a vault
 */
export async function handleFeeInfo(
  req: Request,
  res: Response,
  vaultConfig: Config["vault"]
): Promise<void> {
  try {
    const vaultAddress = req.query.vaultAddress;
    if (!isValidAddress(vaultAddress)) {
      res.status(400).json({ error: "Missing or invalid vaultAddress query parameter" });
      return;
    }

    const result = await getFeeInfo(vaultAddress, vaultConfig);

    if (result.error) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.status(200).json({ feeBps: result.feeBps, feeRecipient: result.feeRecipient });
  } catch (error) {
    console.error("Fee info error:", error instanceof Error ? error.message : "Unknown error");
    res.status(500).json({
      error: "Internal server error",
    });
  }
}

/**
 * Returns all deposit commitments sorted by leafIndex
 */
export async function handleVaultCommitments(
  req: Request,
  res: Response,
  vaultConfig: Config["vault"]
): Promise<void> {
  try {
    const vaultAddress = req.query.vaultAddress;
    if (!isValidAddress(vaultAddress)) {
      res.status(400).json({ error: "Missing or invalid vaultAddress query parameter" });
      return;
    }

    const result = await getCommitments(vaultAddress, vaultConfig);

    if (result.error) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.status(200).json({ commitments: result.commitments });
  } catch (error) {
    console.error("Vault commitments error:", error instanceof Error ? error.message : "Unknown error");
    res.status(500).json({
      error: "Internal server error",
    });
  }
}

/**
 * Returns deposit stats (leafIndex + timestamp) for the stats panel
 */
export async function handleVaultStats(
  req: Request,
  res: Response,
  vaultConfig: Config["vault"]
): Promise<void> {
  try {
    const vaultAddress = req.query.vaultAddress;
    if (!isValidAddress(vaultAddress)) {
      res.status(400).json({ error: "Missing or invalid vaultAddress query parameter" });
      return;
    }

    const result = await getDepositStats(vaultAddress, vaultConfig);

    if (result.error) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.status(200).json({ deposits: result.deposits });
  } catch (error) {
    console.error("Vault stats error:", error instanceof Error ? error.message : "Unknown error");
    res.status(500).json({
      error: "Internal server error",
    });
  }
}

/**
 * Returns the current bucketed yield index from the vault contract
 */
export async function handleYieldIndex(
  req: Request,
  res: Response,
  vaultConfig: Config["vault"]
): Promise<void> {
  try {
    const vaultAddress = req.query.vaultAddress;
    if (!isValidAddress(vaultAddress)) {
      res.status(400).json({ error: "Missing or invalid vaultAddress query parameter" });
      return;
    }

    const result = await getCurrentYieldIndex(vaultAddress, vaultConfig);

    if (result.error) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.status(200).json({ yieldIndex: result.yieldIndex });
  } catch (error) {
    console.error("Yield index error:", error instanceof Error ? error.message : "Unknown error");
    res.status(500).json({
      error: "Internal server error",
    });
  }
}

/**
 * Claims testnet USDC from Circle's faucet for Base Sepolia
 * Rate limited: 10 requests per developer account per 24 hours (Circle's limit)
 */
export async function handleFaucetClaim(
  req: Request,
  res: Response,
  vaultConfig: Config["vault"]
): Promise<void> {
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (!isValidAddress(body?.address)) {
      res.status(400).json({ success: false, error: "Invalid address" });
      return;
    }

    if (!vaultConfig.circleApiKey) {
      res.status(500).json({ success: false, error: "Faucet not configured" });
      return;
    }

    const response = await fetch("https://api.circle.com/v1/faucet/drips", {
      method: "POST",
      headers: {
        "Authorization": `Bearer TEST_API_KEY:${vaultConfig.circleApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address: body.address,
        blockchain: "BASE-SEPOLIA",
        usdc: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Circle faucet error:", data);
      res.status(response.status).json({
        success: false,
        error: data.message || "Faucet request failed",
      });
      return;
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Faucet claim error:", error instanceof Error ? error.message : "Unknown error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}
