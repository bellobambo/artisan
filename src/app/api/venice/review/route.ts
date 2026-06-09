import { NextResponse } from "next/server";

type ReviewRequest = {
  title?: string;
  community?: string;
  resources?: string;
  reward?: number;
  learner?: string;
  submission?: string;
  x402PaymentProof?: string;
};

type VeniceResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

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

function parseStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item)).filter(Boolean);
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
    strengths: parseStringArray(parsed.strengths),
    issues: parseStringArray(parsed.issues),
    recommendation: normalizeRecommendation(parsed.recommendation),
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.VENICE_API_KEY;
  const model = process.env.VENICE_MODEL ?? "venice-uncensored";

  if (!apiKey) {
    return NextResponse.json(
      { error: "AI service is not configured." },
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

  const paymentProof =
    body.x402PaymentProof ?? request.headers.get("x-payment") ?? undefined;

  if (!paymentProof) {
    return NextResponse.json(
      {
        error: "x402 payment required before AI review.",
        x402: {
          resource: "artisan.ai-review",
          amount: process.env.NEXT_PUBLIC_X402_REVIEW_PRICE_USDC ?? "0.01",
          asset: "USDC",
          chainId: process.env.NEXT_PUBLIC_CHAIN_ID ?? "84532",
          payTo: process.env.NEXT_PUBLIC_X402_SELLER_ADDRESS,
          protocol: "x402",
          settlement: "ERC-7710 via 1Shot",
        },
      },
      {
        status: 402,
        headers: {
          "X-402-Resource": "artisan.ai-review",
          "X-402-Protocol": "x402",
        },
      },
    );
  }

  const response = await fetch("https://api.venice.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You review learning-community bounty submissions. Be strict but constructive. Return ONLY valid JSON.",
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
            "score must be a number from 0 to 100.",
            "strengths and issues must be arrays of short strings.",
            "recommendation must be one of: approve, revise, reject.",
            "Ensure the output is parsable JSON without markdown formatting.",
          ].join("\n"),
        },
      ],
      temperature: 0.2,
      venice_parameters: {
        include_venice_system_prompt: false,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    return NextResponse.json(
      { error: "AI review failed.", details: errorText },
      { status: response.status },
    );
  }

  const data = (await response.json()) as VeniceResponse;
  const content = data.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    return NextResponse.json(
      { error: "AI service returned an unexpected response." },
      { status: 502 },
    );
  }

  try {
    // Attempt to strip markdown if the model included it
    const jsonContent = content.replace(/```json\n?|\n?```/g, "").trim();
    return NextResponse.json(parseReview(jsonContent));
  } catch {
    return NextResponse.json(
      { error: "AI service returned invalid JSON.", raw: content },
      { status: 502 },
    );
  }
}
