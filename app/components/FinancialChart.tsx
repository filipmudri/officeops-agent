"use client";

import { Chart, registerables } from "chart.js";
import { useEffect, useRef } from "react";

Chart.register(...registerables);

interface DataRow {
  revenue: number;
  expenses: number;
  profit: number;
}

interface FinancialChartProps {
  data: DataRow[];
}

export default function FinancialChart({ data }: FinancialChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const labels = data.map((_, i) => `Row ${i + 1}`);
    const chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Revenue",
            data: data.map((d) => d.revenue),
            backgroundColor: "rgba(54, 162, 235, 0.6)",
          },
          {
            label: "Expenses",
            data: data.map((d) => d.expenses),
            backgroundColor: "rgba(255, 99, 132, 0.6)",
          },
          {
            label: "Profit",
            data: data.map((d) => d.profit),
            backgroundColor: "rgba(75, 192, 192, 0.6)",
          },
        ],
      },
      options: { responsive: true, plugins: { legend: { position: "top" } } },
    });

    return () => chart.destroy();
  }, [data]);

  return <canvas ref={canvasRef} />;
}