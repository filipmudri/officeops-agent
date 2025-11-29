import { NextRequest, NextResponse } from "next/server";
import { planner } from "@/lib/planner";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const task = body.task;

  try {
    const plan = await planner(task);
    return NextResponse.json({ plan });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}