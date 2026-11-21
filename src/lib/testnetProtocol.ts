import "server-only";
import { Networks } from "@stellar/stellar-sdk";
import { TESTNET_RPC_URL } from "./stellar";

export async function testnetProtocol(): Promise<number | null> {
  try {
    const response = await fetch(TESTNET_RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getNetwork" }),
      signal: AbortSignal.timeout(2800),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const { result } = await response.json();
    if (
      result?.passphrase !== Networks.TESTNET ||
      !Number.isInteger(result.protocolVersion)
    )
      return null;
    return result.protocolVersion;
  } catch {
    return null;
  }
}
