import type { Request, Response } from "express";
import type { Openfort } from "@openfort/openfort-node";
import type { Config } from "./config.js";
import { decodePaymentHeader, createPaymentRequiredResponse } from "./payment.js";
import { relayVaultDeposit, relayVaultWithdraw, type VaultDepositRequest, type VaultWithdrawRequest } from "./vault.js";

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
    const authorization = parsedBody?.authorization ?? parsedBody?.payload?.authorization ?? parsedBody;
    const body = {
      commitment: parsedBody?.commitment ?? parsedBody?.payload?.commitment,
      from: authorization?.from ?? parsedBody?.from,
      to: authorization?.to ?? parsedBody?.to,
      value: authorization?.value ?? parsedBody?.value,
      validAfter: authorization?.validAfter ?? parsedBody?.validAfter,
      validBefore: authorization?.validBefore ?? parsedBody?.validBefore,
      nonce: authorization?.nonce ?? parsedBody?.nonce,
      v: authorization?.v ?? parsedBody?.v,
      r: authorization?.r ?? parsedBody?.r,
      s: authorization?.s ?? parsedBody?.s,
    } as VaultDepositRequest;

    // Validate required fields
    if (
      !body.commitment ||
      !body.from ||
      body.v === undefined ||
      body.v === null ||
      !body.r ||
      !body.s
    ) {
      res.status(400).json({
        error: "Missing required fields: commitment, from, v, r, s",
        receivedKeys: Object.keys(parsedBody ?? {}),
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

    if (!body.pA || !body.pB || !body.pC || !body.root || !body.nullifierHash || !body.recipient) {
      res.status(400).json({
        error: "Missing required fields: pA, pB, pC, root, nullifierHash, recipient",
      });
      return;
    }

    const request: VaultWithdrawRequest = {
      pA: body.pA,
      pB: body.pB,
      pC: body.pC,
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
