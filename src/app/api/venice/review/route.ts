import { NextResponse } from "next/server";

type ReviewRequest = {
  title?: string;
  community?: string;
  resources?: string;
  reward?: number;
  learner?: string;
  submission?: string;
};

type VeniceMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const fallbackBaseUrl = "https://api.venice.ai/api/v1";

function normalizeRecommendation(value: unknown) {
  const recommendation = String(value ?? "").toLowerCase();

  if (recommendation.includes("reject")) {
    return "Reject";
  }

  if (recommendation.includes("revise")) {
    return "Revise";
  }

  return "Approve";
}

function parseReview(content: string) {
  const parsed = JSON.parse(content) as {
    score?: number;
    summary?: string;
    strengths?: string[];
    issues?: string[];
    recommendation?: string;
  };

  return {
    score: Math.max(0, Math.min(100, Number(parsed.score ?? 0))),
    summary: String(parsed.summary ?? "No summary returned."),
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    recommendation: normalizeRecommendation(parsed.recommendation),
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.VENICE_API_KEY;
  const baseUrl = process.env.VENICE_BASE_URL ?? fallbackBaseUrl;
  const model = process.env.VENICE_MODEL ?? "llama-3.3-70b";

  if (!apiKey) {
    return NextResponse.json(
      { error: "VENICE_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as ReviewRequest;

  if (!body.title || !body.submission) {
    return NextResponse.json(
      { error: "Bounty title and submission are required." },
      { status: 400 },
    );
  }

  const messages: VeniceMessage[] = [
    {
      role: "system",
      content:
        "You review learning-community bounty submissions. Be strict but constructive. Return only valid JSON.",
    },
    {
      role: "user",
      content: [
        `Bounty title: ${body.title}`,
        `Community: ${body.community ?? "Unknown"}`,
        `Resources: ${body.resources ?? "None provided"}`,
        `Reward: ${body.reward ?? "Unknown"} USDC`,
        `Learner wallet: ${body.learner ?? "Unknown"}`,
        `Submission: ${body.submission}`,
        "",
        "Return JSON with these keys: score, summary, strengths, issues, recommendation.",
        "recommendation must be one of: approve, revise, reject.",
      ].join("\n"),
    },
  ];

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_completion_tokens: 500,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    return NextResponse.json(
      { error: "Venice review failed.", details: errorText },
      { status: response.status },
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    return NextResponse.json(
      { error: "Venice returned an unexpected response." },
      { status: 502 },
    );
  }

  try {
    return NextResponse.json(parseReview(content));
  } catch {
    return NextResponse.json(
      { error: "Venice returned invalid JSON.", raw: content },
      { status: 502 },
    );
  }
}
