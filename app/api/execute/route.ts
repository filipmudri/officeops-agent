import { NextRequest, NextResponse } from "next/server";
import { executor } from "@/lib/executor";

export async function POST(req: NextRequest) {
  const { plan, state } = await req.json();
  try {
    const finalState = await executor(plan, state || {});
    return NextResponse.json({ result: finalState });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
