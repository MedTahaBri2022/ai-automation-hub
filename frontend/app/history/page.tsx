
"use client";

import { useEffect, useState } from "react";
import jsPDF from "jspdf";

type KPI = {
  name: string;
  value: string;
  description?: string;
};

type AIAnalysis = {
  summary?: string;
  kpis?: KPI[];
  insights?: string[];
  anomalies?: string[];
  recommendations?: string[];
};

type StoredAnalysis = {
  data_analysis?: {
    rows?: number;
    columns?: number;
    [key: string]: unknown;
  };
  ai_analysis?: {
    success?: boolean;
    model?: string;
    analysis?: AIAnalysis;
  };
};

type HistoryItem = {
  id: number;
  filename: string;
  rows: number | null;
  columns: number | null;
  summary: string | null;
  analysis: string | null;
  created_at: string;
};

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedReport, setSelectedReport] =
    useState<HistoryItem | null>(null);

  const [generatingPdf, setGeneratingPdf] =
    useState<number | null>(null);

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  // =========================================================
  // LOAD HISTORY
  // =========================================================

  useEffect(() => {
    async function loadHistory() {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/history"
        );

        if (!response.ok) {
          throw new Error("Failed to fetch history");
        }

        const data = await response.json();

        setHistory(data);
      } catch (err) {
        console.error(err);
        setError("Unable to load analysis history.");
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, []);

  // =========================================================
  // PARSE ANALYSIS
  // =========================================================

  function parseAnalysis(
    analysis: string | null
  ): StoredAnalysis | null {
    if (!analysis) {
      return null;
    }

    try {
      return JSON.parse(analysis);
    } catch (error) {
      console.error(
        "Unable to parse analysis:",
        error
      );

      return null;
    }
  }

  // =========================================================
  // CLEAN TEXT FOR PDF
  // =========================================================

  function cleanText(text: string): string {
    return text
      .replace(/[^\x20-\x7EÀ-ÿ]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // =========================================================
  // WRAPPED PDF TEXT
  // =========================================================

  function addWrappedText(
    doc: jsPDF,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight = 6
  ): number {
    const cleaned = cleanText(text);

    const lines = doc.splitTextToSize(
      cleaned,
      maxWidth
    );

    for (const line of lines) {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }

      doc.text(line, x, y);

      y += lineHeight;
    }

    return y;
  }

  // =========================================================
  // DELETE HISTORY
  // =========================================================

  async function deleteHistory(id: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this analysis?"
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(id);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/history/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to delete analysis"
        );
      }

      // Remove from frontend immediately
      setHistory((currentHistory) =>
        currentHistory.filter(
          (item) => item.id !== id
        )
      );

      // Close modal if deleted report was open
      if (selectedReport?.id === id) {
        setSelectedReport(null);
      }
    } catch (error) {
      console.error(
        "Delete failed:",
        error
      );

      alert(
        "Unable to delete the analysis."
      );
    } finally {
      setDeletingId(null);
    }
  }

  // =========================================================
  // DOWNLOAD PDF
  // =========================================================

  async function downloadPDF(
    item: HistoryItem
  ) {
    setGeneratingPdf(item.id);

    try {
      const parsed =
        parseAnalysis(item.analysis);

      const ai =
        parsed?.ai_analysis?.analysis;

      const kpis = ai?.kpis ?? [];
      const insights = ai?.insights ?? [];
      const anomalies = ai?.anomalies ?? [];
      const recommendations =
        ai?.recommendations ?? [];

      const doc = new jsPDF();

      const pageWidth =
        doc.internal.pageSize.getWidth();

      const pageHeight =
        doc.internal.pageSize.getHeight();

      const margin = 20;

      const contentWidth =
        pageWidth - margin * 2;

      let y = 20;

      // --------------------------------------------------
      // HEADER
      // --------------------------------------------------

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(22);

      doc.text(
        "AI BUSINESS REPORT",
        margin,
        y
      );

      y += 12;

      doc.setFontSize(16);

      doc.text(
        cleanText(item.filename),
        margin,
        y
      );

      y += 9;

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(10);

      doc.text(
        `Date: ${new Date(
          item.created_at
        ).toLocaleString()}`,
        margin,
        y
      );

      y += 6;

      doc.text(
        `Rows: ${
          item.rows ?? "-"
        }    Columns: ${
          item.columns ?? "-"
        }`,
        margin,
        y
      );

      y += 12;

      // --------------------------------------------------
      // SUMMARY
      // --------------------------------------------------

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(14);

      doc.text(
        "SUMMARY",
        margin,
        y
      );

      y += 8;

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(10);

      y = addWrappedText(
        doc,
        ai?.summary ||
          item.summary ||
          "No summary available.",
        margin,
        y,
        contentWidth
      );

      y += 8;

      // --------------------------------------------------
      // KPIs
      // --------------------------------------------------

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(14);

      doc.text(
        "KEY PERFORMANCE INDICATORS",
        margin,
        y
      );

      y += 8;

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(10);

      if (kpis.length === 0) {
        y = addWrappedText(
          doc,
          "No KPIs available.",
          margin,
          y,
          contentWidth
        );
      } else {
        for (const kpi of kpis) {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }

          doc.setFont(
            "helvetica",
            "bold"
          );

          doc.text(
            cleanText(kpi.name),
            margin,
            y
          );

          doc.setFont(
            "helvetica",
            "normal"
          );

          doc.text(
            `: ${cleanText(kpi.value)}`,
            margin + 45,
            y
          );

          y += 6;

          if (kpi.description) {
            y = addWrappedText(
              doc,
              kpi.description,
              margin + 5,
              y,
              contentWidth - 5,
              5
            );

            y += 2;
          }
        }
      }

      y += 8;

      // --------------------------------------------------
      // INSIGHTS
      // --------------------------------------------------

      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(14);

      doc.text(
        "KEY INSIGHTS",
        margin,
        y
      );

      y += 8;

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(10);

      if (insights.length === 0) {
        y = addWrappedText(
          doc,
          "No insights available.",
          margin,
          y,
          contentWidth
        );
      } else {
        insights.forEach(
          (insight, index) => {
            y = addWrappedText(
              doc,
              `${index + 1}. ${insight}`,
              margin,
              y,
              contentWidth
            );

            y += 2;
          }
        );
      }

      y += 8;

      // --------------------------------------------------
      // ANOMALIES
      // --------------------------------------------------

      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(14);

      doc.text(
        "ANOMALIES",
        margin,
        y
      );

      y += 8;

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(10);

      if (anomalies.length === 0) {
        y = addWrappedText(
          doc,
          "No anomalies detected.",
          margin,
          y,
          contentWidth
        );
      } else {
        anomalies.forEach(
          (anomaly, index) => {
            y = addWrappedText(
              doc,
              `${index + 1}. ${anomaly}`,
              margin,
              y,
              contentWidth
            );

            y += 2;
          }
        );
      }

      y += 8;

      // --------------------------------------------------
      // RECOMMENDATIONS
      // --------------------------------------------------

      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(14);

      doc.text(
        "RECOMMENDATIONS",
        margin,
        y
      );

      y += 8;

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(10);

      if (
        recommendations.length === 0
      ) {
        y = addWrappedText(
          doc,
          "No recommendations available.",
          margin,
          y,
          contentWidth
        );
      } else {
        recommendations.forEach(
          (
            recommendation,
            index
          ) => {
            y = addWrappedText(
              doc,
              `${index + 1}. ${recommendation}`,
              margin,
              y,
              contentWidth
            );

            y += 2;
          }
        );
      }

      // --------------------------------------------------
      // PAGE NUMBERS
      // --------------------------------------------------

      const totalPages =
        doc.getNumberOfPages();

      for (
        let page = 1;
        page <= totalPages;
        page++
      ) {
        doc.setPage(page);

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(8);

        doc.text(
          `AI Automation Hub - Page ${page} of ${totalPages}`,
          margin,
          pageHeight - 10
        );
      }

      // --------------------------------------------------
      // DOWNLOAD
      // --------------------------------------------------

      const safeFilename =
        item.filename
          .replace(/\.[^/.]+$/, "")
          .replace(
            /[^a-zA-Z0-9-_]/g,
            "_"
          );

      doc.save(
        `${safeFilename}_AI_Report.pdf`
      );
    } catch (error) {
      console.error(
        "PDF generation failed:",
        error
      );

      alert(
        "Unable to generate the PDF report."
      );
    } finally {
      setGeneratingPdf(null);
    }
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}

        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Analysis History
          </h1>

          <p className="text-slate-400 mt-2">
            View your previous AI business analyses.
          </p>
        </div>

        {/* LOADING */}

        {loading && (
          <div className="text-slate-400">
            Loading history...
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        )}

        {/* EMPTY */}

        {!loading &&
          !error &&
          history.length === 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">

              <h2 className="text-xl font-semibold">
                No analyses yet
              </h2>

              <p className="text-slate-400 mt-2">
                Upload a CSV or Excel file and analyze it
                to create your first report.
              </p>

            </div>
          )}

        {/* TABLE */}

        {!loading &&
          !error &&
          history.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">

              <div className="overflow-x-auto">

                <table className="w-full text-left">

                  <thead className="border-b border-slate-800 bg-slate-950">

                    <tr>

                      <th className="px-6 py-4">
                        File
                      </th>

                      <th className="px-6 py-4">
                        Rows
                      </th>

                      <th className="px-6 py-4">
                        Columns
                      </th>

                      <th className="px-6 py-4 min-w-[350px]">
                        Summary
                      </th>

                      <th className="px-6 py-4">
                        Date
                      </th>

                      <th className="px-6 py-4">
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {history.map(
                      (item) => (
                        <tr
                          key={item.id}
                          className="border-b border-slate-800 hover:bg-slate-800/50"
                        >

                          <td className="px-6 py-4 font-medium">
                            {item.filename}
                          </td>

                          <td className="px-6 py-4 text-slate-300">
                            {item.rows ?? "-"}
                          </td>

                          <td className="px-6 py-4 text-slate-300">
                            {item.columns ?? "-"}
                          </td>

                          <td className="px-6 py-4 max-w-lg text-slate-300">
                            {item.summary ||
                              "No summary available"}
                          </td>

                          <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                            {new Date(
                              item.created_at
                            ).toLocaleString()}
                          </td>

                          <td className="px-6 py-4">

                            <div className="flex gap-2">

                              {/* VIEW */}

                              <button
                                onClick={() =>
                                  setSelectedReport(
                                    item
                                  )
                                }
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition"
                              >
                                View Report
                              </button>

                              {/* PDF */}

                              <button
                                onClick={() =>
                                  downloadPDF(
                                    item
                                  )
                                }
                                disabled={
                                  generatingPdf ===
                                  item.id
                                }
                                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 transition"
                              >
                                {generatingPdf ===
                                item.id
                                  ? "Generating..."
                                  : "Download PDF"}
                              </button>

                              {/* DELETE */}

                              <button
                                onClick={() =>
                                  deleteHistory(
                                    item.id
                                  )
                                }
                                disabled={
                                  deletingId ===
                                  item.id
                                }
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50 transition"
                              >
                                {deletingId ===
                                item.id
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>

                            </div>

                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>

            </div>
          )}

        {/* REPORT MODAL */}

        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">

            <div className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">

              {/* CLOSE */}

              <button
                onClick={() =>
                  setSelectedReport(null)
                }
                className="absolute right-6 top-6 rounded-lg px-3 py-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>

              {(() => {
                const parsed =
                  parseAnalysis(
                    selectedReport.analysis
                  );

                const ai =
                  parsed?.ai_analysis
                    ?.analysis;

                const kpis =
                  ai?.kpis ?? [];

                const insights =
                  ai?.insights ?? [];

                const anomalies =
                  ai?.anomalies ?? [];

                const recommendations =
                  ai?.recommendations ??
                  [];

                return (
                  <div>

                    {/* REPORT HEADER */}

                    <div className="mb-8 pr-12">

                      <p className="text-sm font-medium text-blue-400">
                        AI BUSINESS REPORT
                      </p>

                      <h2 className="mt-2 text-3xl font-bold">
                        {selectedReport.filename}
                      </h2>

                      <p className="mt-2 text-slate-400">
                        {selectedReport.rows ?? "-"}{" "}
                        rows ·{" "}
                        {selectedReport.columns ?? "-"}{" "}
                        columns
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {new Date(
                          selectedReport.created_at
                        ).toLocaleString()}
                      </p>

                    </div>

                    {/* SUMMARY */}

                    <section className="mb-8">

                      <h3 className="mb-3 text-xl font-semibold">
                        Summary
                      </h3>

                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 leading-7 text-slate-300">
                        {ai?.summary ||
                          selectedReport.summary ||
                          "No summary available."}
                      </div>

                    </section>

                    {/* KPIs */}

                    <section className="mb-8">

                      <h3 className="mb-4 text-xl font-semibold">
                        📊 KPIs
                      </h3>

                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                        {kpis.length > 0 ? (
                          kpis.map(
                            (
                              kpi,
                              index
                            ) => (
                              <div
                                key={`${kpi.name}-${index}`}
                                className="rounded-xl border border-slate-800 bg-slate-950 p-5"
                              >

                                <p className="text-sm text-slate-400">
                                  {kpi.name}
                                </p>

                                <p className="mt-2 text-2xl font-bold">
                                  {kpi.value}
                                </p>

                                {kpi.description && (
                                  <p className="mt-2 text-sm text-slate-500">
                                    {kpi.description}
                                  </p>
                                )}

                              </div>
                            )
                          )
                        ) : (
                          <p className="text-slate-400">
                            No KPIs available.
                          </p>
                        )}

                      </div>

                    </section>

                    {/* INSIGHTS */}

                    <section className="mb-8">

                      <h3 className="mb-4 text-xl font-semibold">
                        💡 Key Insights
                      </h3>

                      <div className="space-y-3">

                        {insights.length > 0 ? (
                          insights.map(
                            (
                              insight,
                              index
                            ) => (
                              <div
                                key={index}
                                className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-slate-300"
                              >
                                {insight}
                              </div>
                            )
                          )
                        ) : (
                          <p className="text-slate-400">
                            No insights available.
                          </p>
                        )}

                      </div>

                    </section>

                    {/* ANOMALIES */}

                    <section className="mb-8">

                      <h3 className="mb-4 text-xl font-semibold">
                        ⚠️ Anomalies
                      </h3>

                      <div className="space-y-3">

                        {anomalies.length > 0 ? (
                          anomalies.map(
                            (
                              anomaly,
                              index
                            ) => (
                              <div
                                key={index}
                                className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 text-slate-300"
                              >
                                {anomaly}
                              </div>
                            )
                          )
                        ) : (
                          <p className="text-slate-400">
                            No anomalies detected.
                          </p>
                        )}

                      </div>

                    </section>

                    {/* RECOMMENDATIONS */}

                    <section>

                      <h3 className="mb-4 text-xl font-semibold">
                        🎯 Recommendations
                      </h3>

                      <div className="space-y-3">

                        {recommendations.length > 0 ? (
                          recommendations.map(
                            (
                              recommendation,
                              index
                            ) => (
                              <div
                                key={index}
                                className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-slate-300"
                              >
                                {recommendation}
                              </div>
                            )
                          )
                        ) : (
                          <p className="text-slate-400">
                            No recommendations available.
                          </p>
                        )}

                      </div>

                    </section>

                  </div>
                );
              })()}

            </div>

          </div>
        )}

      </div>
    </main>
  );
}