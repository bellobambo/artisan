import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";

export const runtime = "nodejs";

const allowedFields = new Set([
  "status",
  "endedAt",
  "learner",
  "submission",
  "submissions",
  "aiScore",
  "aiSummary",
  "aiStrengths",
  "aiIssues",
  "aiRecommendation",
  "txHash",
  "relayTaskId",
  "relayStatus",
  "relayFeeQuote",
  "relayCalldata",
  "relayCalldatas",
  "x402ReviewTaskId",
  "x402ReviewStatus",
  "x402PaymentProof",
]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const update: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.has(key)) {
        update[key] = value;
      }
    }

    if (!Object.keys(update).length) {
      return NextResponse.json(
        { error: "No supported bounty fields provided" },
        { status: 400 },
      );
    }

    update.updatedAt = new Date().toISOString();

    const db = await getMongoDb();
    const result = await db.collection("bounties").findOneAndUpdate(
      { id },
      { $set: update },
      { projection: { _id: 0 }, returnDocument: "after" },
    );

    if (!result) {
      return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
    }

    return NextResponse.json({ bounty: result });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update bounty",
      },
      { status: 500 },
    );
  }
}
