import type { Request, Response } from "express";
import type { Openfort } from "@openfort/openfort-node";
import type { Config } from "./config.js";
import { decodePaymentHeader, createPaymentRequiredResponse } from "./payment.js";
import { relayVaultDeposit, relayVaultWithdraw, getCommitments, type VaultDepositRequest, type VaultWithdrawRequest } from "./vault.js";

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
    console.error("Shield session error:", error);
    res.status(500).json({
      error: "Failed to create encryption session",
      details: error instanceof Error ? error.message : "Unknown error",
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
    console.log("Transaction hash received:", transactionHash);
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
    const paymentData = decodePaymentHeader(paymentHeader!);
    console.log("Payment received:", paymentData);
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
    console.error("Payment validation error:", error);
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
    const body: VaultDepositRequest = {
      commitment: parsedBody?.commitment,
      encodedAuth: parsedBody?.encodedAuth,
    };

    // Validate required fields
    if (!body.commitment || !body.encodedAuth) {
      res.status(400).json({
        error: "Missing required fields: commitment, encodedAuth",
        receivedKeys: Object.keys(parsedBody ?? {}),
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

    // Execute relayer
    const result = await relayVaultDeposit(body, vaultConfig);

    if (!result.success) {
      res.status(500).json({
        error: "Failed to relay vault deposit",
        details: result.error,
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
    console.error("Vault deposit error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
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

    if (!body.proof || !body.root || !body.nullifierHash || !body.recipient) {
      res.status(400).json({
        error: "Missing required fields: proof, root, nullifierHash, recipient",
      });
      return;
    }

    const hexPattern = /^0x[0-9a-fA-F]+$/;
    if (!hexPattern.test(body.proof) || !hexPattern.test(body.root) || !hexPattern.test(body.nullifierHash)) {
      res.status(400).json({ error: "Invalid hex format" });
      return;
    }

    const request: VaultWithdrawRequest = {
      proof: body.proof,
      root: body.root,
      nullifierHash: body.nullifierHash,
      recipient: body.recipient,
    };

    const result = await relayVaultWithdraw(request, vaultConfig);

    if (!result.success) {
      res.status(500).json({
        error: "Failed to relay vault withdrawal",
        details: result.error,
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
    console.error("Vault withdrawal error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Returns all deposit commitments sorted by leafIndex
 */
export async function handleVaultCommitments(
  _req: Request,
  res: Response,
  vaultConfig: Config["vault"]
): Promise<void> {
  try {
    const result = await getCommitments(vaultConfig);

    if (result.error) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.status(200).json({ commitments: result.commitments });
  } catch (error) {
    console.error("Vault commitments error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
