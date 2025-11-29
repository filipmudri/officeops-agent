import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";

export const tools = {
  load_financial_data: async (state: any, args: any[]) => {
    if (state.uploadedFile) {
      const buffer = await state.uploadedFile.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);
      state.excelData = jsonData;
      return jsonData;
    } else {
      state.excelData = [
        { revenue: 1000, expenses: 400 },
        { revenue: 1200, expenses: 500 },
        { revenue: 900, expenses: 300 },
      ];
      return state.excelData;
    }
  },

  clean_and_validate_data: async (state: any) => {
    if (!state.excelData) throw new Error("No data to clean");
    state.excelData = state.excelData.filter((row: any) => Object.keys(row).length > 0);
    return state.excelData;
  },

  perform_financial_analysis: async (state: any) => {
    state.excelData = state.excelData.map((row: any) => ({
      ...row,
      profit: (row.revenue || 0) - (row.expenses || 0),
    }));
    return state.excelData;
  },

  generate_financial_charts: async (state: any) => {
    state.chart = state.excelData?.length ? "chart_placeholder.png" : null;
    return state.chart;
  },

  compile_report_document: async (state: any) => {
    state.finalReport = { chart: state.chart, data: state.excelData };
    return state.finalReport;
  },

  review_and_finalize_report: async (state: any) => [],

  distribute_report: async (state: any, args: any[]) => {
    state.distributed = args;
    return args;
  },

  export_report: async (state: any, args: string[]) => {
    const exports: string[] = [];

    if (args.includes("pdf") && state.finalReport) {
      const pdf = new jsPDF();
      pdf.text("Finančný report", 10, 10);
      pdf.text(JSON.stringify(state.finalReport, null, 2), 10, 20);
      state.pdfReport = pdf.output("datauristring");
      exports.push("pdf");
    }

    if (args.includes("Excel") && state.excelData?.length) {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(state.excelData);
      XLSX.utils.book_append_sheet(wb, ws, "Report");
      state.excelReport = wb;
      exports.push("Excel");
    }

    return exports;
  },
};