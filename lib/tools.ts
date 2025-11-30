import * as XLSX from "xlsx";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type ExecutorState = Record<string, any>;

export const tools: Record<string, (state: ExecutorState, args?: any[]) => Promise<any>> = {
  // load Excel from Buffer (server receives base64 and decodes to Buffer)
  load_excel: async (state, args) => {
    // state.uploadedBuffer expected (Buffer) on server
    if (state.uploadedBuffer) {
      const workbook = XLSX.read(state.uploadedBuffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: null });
      // normalize numeric strings to numbers where possible
      const normalized = json.map((row: any) => {
        const newRow: any = {};
        for (const k of Object.keys(row)) {
          const v = row[k];
          // if numeric-like string -> convert
          if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
            newRow[k.toString().trim().toLowerCase()] = Number(v);
          } else {
            newRow[k.toString().trim().toLowerCase()] = v;
          }
        }
        return newRow;
      });
      state.excelData = normalized;
      return normalized;
    } else {
      // fallback demo data
      const demo = [
        { revenue: 1000, expenses: 400 },
        { revenue: 1200, expenses: 500 },
        { revenue: 900, expenses: 300 },
      ];
      state.excelData = demo;
      return demo;
    }
  },

  clean_and_validate_data: async (state) => {
    if (!state.excelData) throw new Error("No data to clean");
    state.excelData = state.excelData.filter((r: any) => Object.keys(r).length > 0);
    return state.excelData;
  },

  analyze_data: async (state, args) => {
    // Generic analyzer: compute revenue, expenses, profit sums and per-row profit
    if (!state.excelData) throw new Error("No data to analyze");
    const data = state.excelData;
    // ensure numeric keys are present
    const rows = data.map((r: any) => {
      const revenue = Number(r.revenue ?? r.Revenue ?? 0) || 0;
      const expenses = Number(r.expenses ?? r.Expenses ?? 0) || 0;
      return { ...r, revenue, expenses, profit: revenue - expenses };
    });
    state.excelData = rows;
    state.analysis = {
      total_revenue: rows.reduce((s: number, r: any) => s + (r.revenue || 0), 0),
      total_expenses: rows.reduce((s: number, r: any) => s + (r.expenses || 0), 0),
      total_profit: rows.reduce((s: number, r: any) => s + (r.profit || 0), 0),
      rows: rows.length,
    };
    return state.analysis;
  },

  generate_charts: async (state, args) => {
    // placeholder: we don't render server-side images here, client renders Chart.js
    state.chart = state.excelData?.length ? "chart_ready" : null;
    return state.chart;
  },

  compile_report: async (state, args) => {
    state.finalReport = {
      analysis: state.analysis ?? null,
      data: state.excelData ?? [],
      chart: state.chart ?? null,
    };
    return state.finalReport;
  },

  export_report: async (state, args) => {
    // export PDF/Excel on server and return base64 / data URI for client
    const exports: string[] = [];

    // dynamic import for safety
    if (args?.includes("pdf") && state.finalReport) {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF();
      pdf.setFontSize(12);
      pdf.text("Automated Report", 10, 10);
      // small readable summary
      pdf.text(`Total revenue: ${state.analysis?.total_revenue ?? "N/A"}`, 10, 20);
      pdf.text(`Total profit: ${state.analysis?.total_profit ?? "N/A"}`, 10, 30);
      pdf.text("Full report (JSON):", 10, 40);
      const str = JSON.stringify(state.finalReport, null, 2);
      // Add multiline text (naive)
      const lines = pdf.splitTextToSize(str, 180);
      pdf.text(lines, 10, 50);
      state.pdfDataUri = pdf.output("datauristring");
      exports.push("pdf");
    }

    if (args?.some((a: string) => a.toLowerCase() === "excel") && state.excelData?.length) {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(state.excelData);
      XLSX.utils.book_append_sheet(wb, ws, "Report");
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "buffer" }); // Buffer
      state.excelBuffer = wbout; // Buffer containing excel file
      // encode to base64 for client download
      state.excelBase64 = Buffer.from(wbout).toString("base64");
      exports.push("excel");
    }

    return exports;
  },

  distribute_report: async (state, args) => {
    // Simulate distribution: just store recipients
    state.distributed = args || [];
    return state.distributed;
  },

  // AI fallback: call OpenAI to perform arbitrary step and return its text result
  ai_fallback: async (state, args) => {
    const prompt = `
You are an assistant performing a single workflow step for an autonomous agent.
Current state (JSON): ${JSON.stringify(state, null, 2)}

Execute the requested action described by args: ${JSON.stringify(args)}

Return a JSON object only describing the result in the key "result".
Example: { "result": { "summary": "...", "notes": "..." } }
If you produce tables, return them as arrays of objects.
`;
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 1000,
    });

    const text = resp.choices?.[0]?.message?.content ?? "";
    // try parse JSON
    let cleaned = text.replace(/```json|```/gi, "").trim();
    try {
      const parsed = JSON.parse(cleaned);
      return parsed.result ?? parsed;
    } catch {
      // fallback: return raw text
      return { text: cleaned };
    }
  },
};