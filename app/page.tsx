"use client";

import { useState } from "react";
import AgentLog from "./components/AgentLog";
import FileUpload from "./components/FileUpload";
import FinancialChart from "./components/FinancialChart";

export default function Home() {
  const [task, setTask] = useState("");
  const [plan, setPlan] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [logs, setLogs] = useState<{ step: string; status: string; message?: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [running, setRunning] = useState(false);

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
      if (data.error) {
        setError(data.error);
        return;
      }
      setPlan(data.plan);
    } catch (e: any) {
      setError(e.message ?? String(e));
    }
  };

  // helper: convert file to base64
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string; // data:*/*;base64,AAAA...
        // drop prefix
        const base64 = result.split(",")[1];
        res(base64);
      };
      reader.onerror = (err) => rej(err);
      reader.readAsDataURL(file);
    });

  const runExecutor = async () => {
    if (!plan) {
      setError("Create a plan first");
      return;
    }
    setError(null);
    setResult(null);
    setLogs([]);
    setRunning(true);

    try {
      let fileBase64: string | undefined = undefined;
      if (uploadedFile) {
        fileBase64 = await fileToBase64(uploadedFile);
      }

      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, fileBase64 }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data.result);
        // Compose logs in order from server (server pushed pending + done entries)
        if (Array.isArray(data.logs)) {
          setLogs(data.logs);
        } else {
          setLogs([]);
        }
      }
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">OfficeOps — General Agent</h1>

      <textarea
        value={task}
        onChange={(e) => setTask(e.target.value)}
        placeholder="Describe what you want. e.g. 'Create a quarterly finance report from the uploaded Excel and export PDF & Excel and email it to team.'"
        className="border p-2 w-full h-24 mb-4"
      />

      <FileUpload onFileSelect={(f) => setUploadedFile(f)} />

      <div className="flex gap-2 mb-4">
        <button onClick={createPlan} className="bg-blue-600 text-white px-4 py-2 rounded">
          Create plan
        </button>
        <button onClick={runExecutor} disabled={running} className="bg-green-600 text-white px-4 py-2 rounded">
          {running ? "Running..." : "Run agent"}
        </button>
      </div>

      {error && <div className="bg-red-200 text-red-800 p-2 mb-4 rounded">{error}</div>}

      {plan && (
        <div className="mb-4">
          <h2 className="font-semibold mb-2">Plan (JSON)</h2>
          <pre className="bg-gray-100 p-2 rounded overflow-x-auto">
            <code>{JSON.stringify(plan, null, 2)}</code>
          </pre>
        </div>
      )}

      <div className="mb-4">
        <h2 className="font-semibold mb-2">Execution Log</h2>
        <AgentLog logs={logs as any} />
      </div>

      {result && Object.keys(result).length > 0 && (
        <div className="mb-4">
          <h2 className="font-semibold mb-2">Result</h2>
          <pre className="bg-gray-200 p-2 rounded overflow-x-auto">
            <code>{JSON.stringify(result, null, 2)}</code>
          </pre>
        </div>
      )}

      {result?.excelData && result.excelData.length > 0 && (
        <div className="mb-4">
          <h2 className="font-semibold mb-2">Charts</h2>
          <FinancialChart
            data={result.excelData.map((row: any) => ({
              revenue: Number(row.revenue ?? row.Revenue ?? 0),
              expenses: Number(row.expenses ?? row.Expenses ?? 0),
              profit: Number(row.profit ?? (row.revenue ?? 0) - (row.expenses ?? 0)),
            }))}
          />
        </div>
      )}
    </div>
  );
}