type JsonRpcResponse<T> = {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

const fallbackRelayerUrl = "https://relayer.1shotapi.com/relayers";

export function getOneShotRpcUrl() {
  return (process.env.NEXT_PUBLIC_ONESHOT_RPC_URL ?? fallbackRelayerUrl).replace(
    /[=\s]+$/,
    "",
  );
}

export async function callOneShot<T>(method: string, params: unknown) {
  const response = await fetch(getOneShotRpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`1Shot HTTP ${response.status}: ${await response.text()}`);
  }

  const payload = (await response.json()) as JsonRpcResponse<T>;

  if (payload.error) {
    throw new Error(payload.error.message);
  }

  if (!("result" in payload)) {
    throw new Error("1Shot returned no result");
  }

  return payload.result as T;
}
