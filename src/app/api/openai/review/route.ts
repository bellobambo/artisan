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

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
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

function getOutputText(data: OpenAIResponse) {
  if (typeof data.output_text === "string") {
    return data.output_text;
  }

  return data.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === "output_text" && content.text)
    ?.text;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

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

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
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
            "score must be a number from 0 to 100.",
            "strengths and issues must be arrays of short strings.",
            "recommendation must be one of: approve, revise, reject.",
          ].join("\n"),
        },
      ],
      temperature: 0.2,
      max_output_tokens: 500,
      text: {
        format: {
          type: "json_schema",
          name: "bounty_review",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: [
              "score",
              "summary",
              "strengths",
              "issues",
              "recommendation",
            ],
            properties: {
              score: {
                type: "number",
                minimum: 0,
                maximum: 100,
              },
              summary: {
                type: "string",
              },
              strengths: {
                type: "array",
                items: {
                  type: "string",
                },
              },
              issues: {
                type: "array",
                items: {
                  type: "string",
                },
              },
              recommendation: {
                type: "string",
                enum: ["approve", "revise", "reject"],
              },
            },
          },
        },
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

  const data = (await response.json()) as OpenAIResponse;
  const content = getOutputText(data);

  if (typeof content !== "string") {
    return NextResponse.json(
      { error: "AI service returned an unexpected response." },
      { status: 502 },
    );
  }

  try {
    return NextResponse.json(parseReview(content));
  } catch {
    return NextResponse.json(
      { error: "AI service returned invalid JSON.", raw: content },
      { status: 502 },
    );
  }
}
