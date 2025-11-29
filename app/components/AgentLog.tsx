"use client";

interface LogEntry {
  step: string;
  status: "pending" | "done" | "error";
}

interface AgentLogProps {
  logs: LogEntry[];
}

export default function AgentLog({ logs }: AgentLogProps) {
  return (
    <ul className="list-disc pl-5">
      {logs.map((log, idx) => (
        <li key={idx} className={log.status === "error" ? "text-red-600" : ""}>
          {log.step}: {log.status}
        </li>
      ))}
    </ul>
  );
}