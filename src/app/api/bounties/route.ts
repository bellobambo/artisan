import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";

export const runtime = "nodejs";

type BountyStatus = "Open" | "Reviewing" | "Ready" | "Paid" | "Ended";
type PayoutMode = "Even Split" | "Ranked Positions";

type BountySubmission = {
  id: string;
  learner: string;
  link: string;
  submittedAt: string;
  aiScore?: number;
  aiSummary?: string;
  aiStrengths?: string[];
  aiIssues?: string[];
  aiRecommendation?: "Approve" | "Revise" | "Reject";
  rank?: number;
};

type BountyDocument = {
  id: string;
  title: string;
  description: string;
  community: string;
  resources?: string;
  reward: number;
  token: "USDC";
  status: BountyStatus;
  creator?: string;
  deadlineAt: string;
  reviewPeriodDays: number;
  participantLimit: number;
  payoutMode: PayoutMode;
  positionRewards?: number[];
  endedAt?: string;
  submissions: BountySubmission[];
  createdAt: string;
  updatedAt: string;
};

type CreateBountyBody = {
  title?: string;
  description?: string;
  community?: string;
  resources?: string;
  reward?: number;
  creator?: string;
  deadlineAt?: string;
  reviewPeriodDays?: number;
  participantLimit?: number;
  payoutMode?: PayoutMode;
  positionRewards?: number[];
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function createBountyId() {
  return `BNT-${Date.now().toString(36).toUpperCase()}`;
}

function normalizeBountyDocument(bounty: Partial<BountyDocument>): BountyDocument {
  const now = new Date().toISOString();

  return {
    id: bounty.id ?? createBountyId(),
    title: bounty.title ?? "Untitled bounty",
    description: bounty.description ?? "",
    community: bounty.community ?? "Community",
    resources: bounty.resources,
    reward: Number(bounty.reward ?? 0),
    token: "USDC",
    status: bounty.status ?? "Open",
    creator: bounty.creator,
    deadlineAt: bounty.deadlineAt ?? now,
    reviewPeriodDays: Number(bounty.reviewPeriodDays ?? 1),
    participantLimit: Number(bounty.participantLimit ?? 1),
    payoutMode: bounty.payoutMode ?? "Even Split",
    positionRewards: Array.isArray(bounty.positionRewards)
      ? bounty.positionRewards
      : [],
    endedAt: bounty.endedAt,
    submissions: Array.isArray(bounty.submissions) ? bounty.submissions : [],
    createdAt: bounty.createdAt ?? now,
    updatedAt: bounty.updatedAt ?? now,
  };
}

export async function GET() {
  try {
    const db = await getMongoDb();
    const bounties = await db
      .collection<BountyDocument>("bounties")
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ bounties: bounties.map(normalizeBountyDocument) });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load bounties",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateBountyBody;
    const title = cleanText(body.title);
    const description = cleanText(body.description);
    const community = cleanText(body.community);
    const deadlineAt = cleanText(body.deadlineAt);
    const resources = cleanText(body.resources);
    const reward = Number(body.reward);
    const reviewPeriodDays = Number(body.reviewPeriodDays);
    const participantLimit = Number(body.participantLimit);

    if (!title || !description || !community || !deadlineAt) {
      return NextResponse.json(
        { error: "title, description, community, and deadlineAt are required" },
        { status: 400 },
      );
    }

    if (!Number.isFinite(reward) || reward <= 0) {
      return NextResponse.json(
        { error: "reward must be a positive number" },
        { status: 400 },
      );
    }

    if (!Number.isFinite(reviewPeriodDays) || reviewPeriodDays <= 0) {
      return NextResponse.json(
        { error: "reviewPeriodDays must be a positive number" },
        { status: 400 },
      );
    }

    if (!Number.isFinite(participantLimit) || participantLimit <= 0) {
      return NextResponse.json(
        { error: "participantLimit must be a positive number" },
        { status: 400 },
      );
    }

    const payoutMode =
      body.payoutMode === "Ranked Positions" ? "Ranked Positions" : "Even Split";
    const positionRewards =
      payoutMode === "Ranked Positions"
        ? (body.positionRewards ?? []).filter(
            (amount) => Number.isFinite(amount) && amount > 0,
          )
        : [];
    const now = new Date().toISOString();
    const bounty: BountyDocument = {
      id: createBountyId(),
      title,
      description,
      community,
      resources: resources || undefined,
      reward,
      token: "USDC",
      status: "Open",
      creator: cleanText(body.creator) || undefined,
      deadlineAt: new Date(deadlineAt).toISOString(),
      reviewPeriodDays,
      participantLimit,
      payoutMode: positionRewards.length ? payoutMode : "Even Split",
      positionRewards,
      submissions: [],
      createdAt: now,
      updatedAt: now,
    };

    const db = await getMongoDb();
    await db.collection<BountyDocument>("bounties").insertOne(bounty);

    return NextResponse.json({ bounty }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create bounty",
      },
      { status: 500 },
    );
  }
}
