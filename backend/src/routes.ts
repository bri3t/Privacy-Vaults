import type { Request, Response } from "express";
import type { Openfort } from "@openfort/openfort-node";
import type { Config } from "./config.js";
import { decodePaymentHeader, createPaymentRequiredResponse } from "./payment.js";
import { relayVaultDeposit, relayVaultWithdraw, getCommitments, getCurrentYieldIndex, type VaultDepositRequest, type VaultWithdrawRequest } from "./vault.js";

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

function isValidAddress(value: unknown): value is string {
  return typeof value === "string" && ADDRESS_PATTERN.test(value);
}

export async function handleHealth(_req: Request, res: Response): Promise<void> {
  res.status(200).json({
    status: "ok",
    message: "x402 demo server is running",
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

export async function handleProtectedContent(
  req: Request,
  res: Response,
  paywall: Config["paywall"]
): Promise<void> {
  const paymentHeader = req.headers["x-payment"] as string | undefined;
  const transactionHash = req.headers["x-transaction-hash"] as string | undefined;

  if (!paymentHeader && !transactionHash) {
    res.status(402).json(createPaymentRequiredResponse(paywall));
    return;
  }

  if (transactionHash) {
    res.status(200).json({
      success: true,
      message: "Payment accepted via on-chain transaction! Here's your protected content.",
      transactionHash,
      content: {
        title: "Premium Content Unlocked",
        data: "This is the protected content you paid for!",
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  try {
    decodePaymentHeader(paymentHeader!);
    res.status(200).json({
      success: true,
      message: "Payment accepted! Here's your protected content.",
      content: {
        title: "Premium Content Unlocked",
        data: "This is the protected content you paid for!",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Payment validation error:", error instanceof Error ? error.message : "Unknown error");
    res.status(402).json({
      error: "Invalid payment",
      x402Version: 1,
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
    const hexPattern = /^0x[0-9a-fA-F]+$/;
    if (!hexPattern.test(body.commitment) || !hexPattern.test(body.encodedAuth)) {
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

    if (!body.proof || !body.root || !body.nullifierHash || !body.recipient || !body.yieldIndex) {
      res.status(400).json({
        error: "Missing required fields: proof, root, nullifierHash, recipient, yieldIndex",
      });
      return;
    }

    const hexPattern = /^0x[0-9a-fA-F]+$/;
    if (!hexPattern.test(body.proof) || !hexPattern.test(body.root) || !hexPattern.test(body.nullifierHash)) {
      res.status(400).json({ error: "Invalid hex format" });
      return;
    }

    // Validate field lengths
    if (body.proof.length > 100_000) {
      res.status(400).json({ error: "proof exceeds maximum length" });
      return;
    }
    if (body.root.length !== 66 || body.nullifierHash.length !== 66) {
      res.status(400).json({ error: "root and nullifierHash must be bytes32" });
      return;
    }
    if (body.recipient.length !== 42 || !hexPattern.test(body.recipient)) {
      res.status(400).json({ error: "recipient must be a valid address" });
      return;
    }

    const request: VaultWithdrawRequest = {
      proof: body.proof,
      root: body.root,
      nullifierHash: body.nullifierHash,
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
