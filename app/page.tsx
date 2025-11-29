"use client";

import { useState } from "react";
import AgentLog from "./components/AgentLog";
import FileUpload from "./components/FileUpload";
import FinancialChart from "./components/FinancialChart";
import { tools } from "@/lib/tools";

export default function Home() {
  const [task, setTask] = useState("");
  const [plan, setPlan] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [logs, setLogs] = useState<{ step: string; status: "pending" | "done" | "error" }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const stepMap: Record<string, string> = {
    load_financial_data: "load_financial_data",
    clean_and_validate_data: "clean_and_validate_data",
    perform_financial_analysis: "perform_financial_analysis",
    generate_financial_charts: "generate_financial_charts",
    compile_report_document: "compile_report_document",
    review_and_finalize_report: "review_and_finalize_report",
    distribute_report: "distribute_report",
    export_report: "export_report",
  };

  const createPlan = async () => {
    setError(null);
    setPlan(null);
    setResult(null);
    setLogs([]);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task }),
      });
      const data = await res.json();
      setPlan(data.plan);
      if (data.plan.steps?.[0]?.action === "error") {
        setError(data.plan.steps[0].message);
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const runExecutor = async () => {
    if (!plan) return;
    setError(null);
    setResult({});
    setLogs([]);
    try {
      const newState: any = { uploadedFile };
      for (const step of plan.steps) {
        setLogs((prev) => [...prev, { step: step.action, status: "pending" }]);
        try {
          const toolName = stepMap[step.action] || step.action;
          if (tools[toolName]) {
            const output = await tools[toolName](newState, step.args);
            newState[step.action] = output;
          } else {
            newState[step.action] = step.args || "executed";
          }
          setLogs((prev) =>
            prev.map((l) =>
              l.step === step.action ? { ...l, status: "done" } : l
            )
          );
        } catch (e: any) {
          setLogs((prev) =>
            prev.map((l) =>
              l.step === step.action ? { ...l, status: "error" } : l
            )
          );
          console.error(`Error executing ${step.action}:`, e);
        }
      }
      setResult(newState);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const exportReport = async () => {
    if (!result) return;
    const output = await tools.export_report(result, ["pdf", "Excel"]);
    console.log("Exported:", output);
    alert(`Export completed: ${output.join(", ")}`);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">OfficeOps AI Agent</h1>

      <textarea
        value={task}
        onChange={(e) => setTask(e.target.value)}
        placeholder="Zadajte úlohu..."
        className="border p-2 w-full h-20 mb-4"
      />

      <FileUpload onFileSelect={(file) => setUploadedFile(file)} />

      <div className="flex gap-2 mb-4">
        <button
          onClick={createPlan}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
        >
          Vytvoriť plán
        </button>
        <button
          onClick={runExecutor}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
        >
          Spustiť agent
        </button>
        <button
          onClick={exportReport}
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition"
        >
          Export report
        </button>
      </div>

      {error && (
        <div className="bg-red-200 text-red-800 p-2 mb-4 rounded">
          <strong>Chyba:</strong> {error}
        </div>
      )}

      {plan && (
        <div className="mb-4">
          <h2 className="font-semibold mb-2">Plán (JSON)</h2>
          <pre className="bg-gray-100 p-2 rounded overflow-x-auto">
            <code>{JSON.stringify(plan, null, 2)}</code>
          </pre>
        </div>
      )}

      <div className="mb-4">
        <h2 className="font-semibold mb-2">Live Log</h2>
        <AgentLog logs={logs} />
      </div>

      {result && Object.keys(result).length > 0 && (
        <div className="mb-4">
          <h2 className="font-semibold mb-2">Výsledky exekúcie</h2>
          <pre className="bg-gray-200 p-2 rounded overflow-x-auto">
            <code>{JSON.stringify(result, null, 2)}</code>
          </pre>
        </div>
      )}

      {result?.excelData && result.excelData.length > 0 && (
        <div className="mb-4">
          <h2 className="font-semibold mb-2">Grafy finančnej výkonnosti</h2>
          <FinancialChart
            data={result.excelData.map((row) => ({
              revenue: row.revenue || 0,
              expenses: row.expenses || 0,
              profit: row.profit || 0,
            }))}
          />
        </div>
      )}
    </div>
  );
}