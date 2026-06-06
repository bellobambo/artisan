import { NextResponse } from "next/server";
import { callOneShot } from "@/lib/oneshot";

export async function POST(request: Request) {
  const { chainId, token } = (await request.json()) as {
    chainId?: number | string;
    token?: string;
  };

  if (!chainId || !token) {
    return NextResponse.json(
      { error: "chainId and token are required" },
      { status: 400 },
    );
  }

  try {
    const result = await callOneShot("relayer_getFeeData", {
      chainId: String(chainId),
      token,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch 1Shot fee",
      },
      { status: 502 },
    );
  }
}
