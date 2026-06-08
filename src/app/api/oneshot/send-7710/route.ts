import { decodeDelegations } from "@metamask/delegation-core";
import { NextResponse } from "next/server";
import { toHex } from "viem";
import { callOneShot } from "@/lib/oneshot";

type Send7710Request = {
  chainId?: number | string;
  permissionContext?: `0x${string}`;
  target?: `0x${string}`;
  data?: `0x${string}`;
  executions?: Array<{
    target?: `0x${string}`;
    data?: `0x${string}`;
    value?: `0x${string}`;
  }>;
  context?: string;
  destinationUrl?: string;
};

function jsonSafe(value: unknown) {
  return JSON.parse(
    JSON.stringify(value, (_, nestedValue) => {
      if (typeof nestedValue === "bigint") {
        return toHex(nestedValue);
      }

      return nestedValue;
    }),
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as Send7710Request;
  const executions =
    body.executions?.map((execution) => ({
      target: execution.target,
      value: execution.value ?? "0x0",
      data: execution.data,
    })) ??
    (body.target && body.data
      ? [
          {
            target: body.target,
            value: "0x0",
            data: body.data,
          },
        ]
      : []);

  if (
    !body.chainId ||
    !body.permissionContext ||
    !executions.length ||
    executions.some((execution) => !execution.target || !execution.data)
  ) {
    return NextResponse.json(
      {
        error:
          "chainId, permissionContext, and at least one execution target/data are required",
      },
      { status: 400 },
    );
  }

  try {
    const decodedPermissionContext = decodeDelegations(body.permissionContext);

    const params = {
      chainId: String(body.chainId),
      transactions: [
        {
          permissionContext: jsonSafe(decodedPermissionContext),
          executions,
        },
      ],
      ...(body.context ? { context: body.context } : {}),
      ...(body.destinationUrl ? { destinationUrl: body.destinationUrl } : {}),
    };

    const taskId = await callOneShot<string>(
      "relayer_send7710Transaction",
      params,
    );

    return NextResponse.json({ taskId, params });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit 1Shot 7710 transaction",
      },
      { status: 502 },
    );
  }
}
