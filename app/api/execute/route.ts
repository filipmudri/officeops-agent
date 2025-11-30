import { NextRequest, NextResponse } from "next/server";
import { tools } from "@/lib/tools";

/**
 * Body expected:
 * {
 *   plan: { steps: [...] },
 *   fileBase64?: string (optional: base64 of uploaded file)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const plan = body.plan;
    const fileBase64 = body.fileBase64; // optional

    const state: any = {};
    if (fileBase64) {
      state.uploadedBuffer = Buffer.from(fileBase64, "base64");
    }

    const logs: { step: string; status: "pending" | "done" | "error"; message?: string }[] = [];

    if (!plan?.steps || !Array.isArray(plan.steps)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Map common aliases to our tool names (extendable)
    const stepMap: Record<string, string> = {
      load_financial_data: "load_excel",
      read_excel: "load_excel",
      clean_and_validate_data: "clean_and_validate_data",
      clean_and_process_data: "clean_and_validate_data",
      perform_financial_analysis: "analyze_data",
      analyze_data: "analyze_data",
      generate_financial_charts: "generate_charts",
      generate_charts: "generate_charts",
      compile_report_document: "compile_report",
      compile_report: "compile_report",
      export_report: "export_report",
      distribute_report: "distribute_report",
      send_report_email: "distribute_report",
    };

    for (const step of plan.steps) {
      const action = step.action;
      logs.push({ step: action, status: "pending" });
      try {
        const toolName = stepMap[action] || action;
        let output;
        if (tools[toolName]) {
          output = await tools[toolName](state, step.args);
        } else {
          // call ai fallback
          output = await tools.ai_fallback(state, step.args);
        }
        // store by original action name so UI sees the plan->result mapping
        state[action] = output;
        // mark done
        logs.push({ step: action, status: "done" });
      } catch (err: any) {
        logs.push({ step: action, status: "error", message: err.message ?? String(err) });
        // continue with next steps (resilient)
      }
    }

    return NextResponse.json({ result: state, logs });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}