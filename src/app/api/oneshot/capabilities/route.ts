import { NextResponse } from "next/server";
import { callOneShot } from "@/lib/oneshot";

export async function POST(request: Request) {
  const { chainId } = (await request.json()) as { chainId?: number | string };

  if (!chainId) {
    return NextResponse.json({ error: "chainId is required" }, { status: 400 });
  }

  try {
    const result = await callOneShot<Record<string, unknown>>("relayer_getCapabilities", [
      String(chainId),
    ]);

    return NextResponse.json(result[String(chainId)] ?? result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch 1Shot capabilities",
      },
      { status: 502 },
    );
  }
}
