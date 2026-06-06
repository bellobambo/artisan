import { NextResponse } from "next/server";
import { callOneShot } from "@/lib/oneshot";

export async function POST(request: Request) {
  const { taskId, logs = false } = (await request.json()) as {
    taskId?: string;
    logs?: boolean;
  };

  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  try {
    const result = await callOneShot("relayer_getStatus", {
      id: taskId,
      logs,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch 1Shot relay status",
      },
      { status: 502 },
    );
  }
}
