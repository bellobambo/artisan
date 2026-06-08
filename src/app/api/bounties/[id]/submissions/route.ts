import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";

export const runtime = "nodejs";

type BountySubmission = {
  id: string;
  learner: string;
  link: string;
  submittedAt: string;
};

type BountyDocument = {
  id: string;
  learner?: string;
  submission?: string;
  submissions?: BountySubmission[];
  participantLimit?: number;
  status?: string;
  updatedAt?: string;
};

type CreateSubmissionBody = {
  learner?: string;
  submission?: string;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as CreateSubmissionBody;
    const learner = cleanText(body.learner);
    const submission = cleanText(body.submission);

    if (!learner || !submission) {
      return NextResponse.json(
        { error: "learner and submission are required" },
        { status: 400 },
      );
    }

    const db = await getMongoDb();
    const collection = db.collection<BountyDocument>("bounties");
    const bounty = await collection.findOne(
      { id },
      { projection: { _id: 0, submissions: 1, participantLimit: 1 } },
    );

    if (!bounty) {
      return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
    }

    const currentSubmissions = Array.isArray(bounty.submissions)
      ? bounty.submissions
      : [];
    const participantLimit = Number(bounty.participantLimit ?? 1);

    if (currentSubmissions.length >= participantLimit) {
      return NextResponse.json(
        { error: "This bounty has reached its participant limit" },
        { status: 409 },
      );
    }

    const nextSubmission: BountySubmission = {
      id: `SUB-${id}-${currentSubmissions.length + 1}`,
      learner,
      link: submission,
      submittedAt: new Date().toISOString(),
    };
    const updatedAt = new Date().toISOString();

    await collection.updateOne(
      { id },
      {
        $set: {
          learner,
          submission,
          status: "Reviewing",
          updatedAt,
        },
        $push: {
          submissions: nextSubmission,
        },
      },
    );

    return NextResponse.json(
      {
        submission: nextSubmission,
        bounty: {
          id,
          learner,
          submission,
          status: "Reviewing",
          updatedAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create submission",
      },
      { status: 500 },
    );
  }
}
