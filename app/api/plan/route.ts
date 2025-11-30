import { NextRequest, NextResponse } from "next/server";
import { planner } from "@/lib/planner";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const task = body.task ?? "";
    const plan = await planner(task);
    return NextResponse.json({ plan });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}