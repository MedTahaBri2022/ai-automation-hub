
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Filter,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import jsPDF from "jspdf";


// =========================================================
// TYPES
// =========================================================

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

type DataAnalysis = {
  action?: string;
  status?: string;
  filename?: string;

  rows?: number;
  columns?: number;

  column_names?: string[];

  data_types?: Record<string, string>;

  missing_values?: Record<string, number>;

  missing_percentage?: Record<string, number>;

  numeric_statistics?: Record<
    string,
    {
      count?: number;
      mean?: number;
      min?: number;
      max?: number;
      median?: number;
      std?: number;
      sum?: number;
    }
  >;

  kpis?: Record<
    string,
    {
      total?: number;
      average?: number;
      minimum?: number;
      maximum?: number;
      median?: number;
    }
  >;

  correlations?: Record<string, unknown>;

  categorical_statistics?: Record<
    string,
    {
      unique_values?: number;
      top_values?: Record<string, number>;
    }
  >;

  preview?: Record<string, unknown>[];
};

type AnalysisResult = {
  success?: boolean;

  file?: {
    filename?: string;
    path?: string;
    size?: number;
  };

  data_analysis?: DataAnalysis;

  ai_analysis?: {
    success?: boolean;
    model?: string;
    analysis?: AIAnalysis;
  };

  error?: string;
};


// =========================================================
// HELPERS
// =========================================================

function isNumeric(value: unknown): boolean {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (
    typeof value === "string" &&
    value.trim() !== ""
  ) {
    return Number.isFinite(Number(value));
  }

  return false;
}


function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : 0;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}


// =========================================================
// PAGE
// =========================================================

export default function Home() {
  const router = useRouter();

  const [file, setFile] =
    useState<File | null>(null);

  const [result, setResult] =
    useState<AnalysisResult | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [activePage, setActivePage] =
    useState("Dashboard");

  const [selectedRegion, setSelectedRegion] =
    useState("All");

  const [selectedMetric, setSelectedMetric] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [currentPage, setCurrentPage] =
    useState(1);

  const rowsPerPage = 8;


  // =======================================================
  // DATA
  // =======================================================

  const dataAnalysis =
    result?.data_analysis;

  const aiAnalysis =
    result?.ai_analysis?.analysis;

  const preview =
    dataAnalysis?.preview ?? [];

  const columns =
    dataAnalysis?.column_names ??
    (preview.length > 0
      ? Object.keys(preview[0])
      : []);


  // =======================================================
  // NUMERIC COLUMNS
  // =======================================================

  const numericColumns = useMemo(() => {
    if (dataAnalysis?.numeric_statistics) {
      return Object.keys(
        dataAnalysis.numeric_statistics
      );
    }

    return columns.filter((column) =>
      preview.some((row) =>
        isNumeric(row[column])
      )
    );
  }, [
    dataAnalysis,
    columns,
    preview,
  ]);


  // =======================================================
  // CATEGORICAL COLUMNS
  // =======================================================

  const categoricalColumns = useMemo(() => {
    return columns.filter(
      (column) =>
        !numericColumns.includes(column)
    );
  }, [
    columns,
    numericColumns,
  ]);


  // =======================================================
  // ACTIVE METRIC
  // =======================================================

  const activeMetric =
    selectedMetric &&
    numericColumns.includes(selectedMetric)
      ? selectedMetric
      : numericColumns[0] ?? "";


  // =======================================================
  // REGIONS / CATEGORIES
  // =======================================================

  const categoryColumn =
    categoricalColumns[0] ?? "";

  const categories = useMemo(() => {
    if (!categoryColumn) {
      return [];
    }

    return Array.from(
      new Set(
        preview
          .map((row) =>
            String(
              row[categoryColumn] ?? ""
            )
          )
          .filter(Boolean)
      )
    );
  }, [
    preview,
    categoryColumn,
  ]);


  // =======================================================
  // FILTER
  // =======================================================

  const filteredPreview = useMemo(() => {
    return preview.filter((row) => {
      const matchesSearch =
        searchTerm.trim() === "" ||
        Object.values(row).some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(
              searchTerm
                .toLowerCase()
                .trim()
            )
        );

      const matchesCategory =
        selectedRegion === "All" ||
        !categoryColumn ||
        String(
          row[categoryColumn] ?? ""
        ) === selectedRegion;

      return (
        matchesSearch &&
        matchesCategory
      );
    });
  }, [
    preview,
    searchTerm,
    selectedRegion,
    categoryColumn,
  ]);


  // =======================================================
  // SORTING
  // =======================================================

  const [sortColumn, setSortColumn] =
    useState("");

  const [sortDirection, setSortDirection] =
    useState<"asc" | "desc">("asc");


  function handleSort(column: string) {
    if (sortColumn === column) {
      setSortDirection((direction) =>
        direction === "asc"
          ? "desc"
          : "asc"
      );
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }

    setCurrentPage(1);
  }


  const sortedPreview = useMemo(() => {
    const data = [...filteredPreview];

    if (!sortColumn) {
      return data;
    }

    return data.sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (
        isNumeric(aValue) &&
        isNumeric(bValue)
      ) {
        const difference =
          toNumber(aValue) -
          toNumber(bValue);

        return sortDirection === "asc"
          ? difference
          : -difference;
      }

      const comparison =
        String(aValue ?? "").localeCompare(
          String(bValue ?? "")
        );

      return sortDirection === "asc"
        ? comparison
        : -comparison;
    });
  }, [
    filteredPreview,
    sortColumn,
    sortDirection,
  ]);


  // =======================================================
  // PAGINATION
  // =======================================================

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        sortedPreview.length /
          rowsPerPage
      )
    );

  const paginatedPreview =
    sortedPreview.slice(
      (currentPage - 1) *
        rowsPerPage,
      currentPage *
        rowsPerPage
    );


  // =======================================================
  // METRICS
  // =======================================================

  const metricValues =
    activeMetric
      ? filteredPreview
          .map((row) =>
            toNumber(
              row[activeMetric]
            )
          )
          .filter((value) =>
            Number.isFinite(value)
          )
      : [];

  const filteredTotal =
    metricValues.reduce(
      (sum, value) =>
        sum + value,
      0
    );

  const filteredAverage =
    metricValues.length
      ? filteredTotal /
        metricValues.length
      : 0;

  const filteredMaximum =
    metricValues.length
      ? Math.max(
          ...metricValues
        )
      : 0;


  // =======================================================
  // CHART BY ROW
  // =======================================================

  const metricByPerson =
    filteredPreview
      .slice(0, 20)
      .map((row, index) => ({
        name:
          String(
            row[
              categoricalColumns[0]
            ] ??
              `Row ${index + 1}`
          ),
        value:
          toNumber(
            row[activeMetric]
          ),
      }));


  // =======================================================
  // CHART BY CATEGORY
  // =======================================================

  const metricByRegion =
    categoryColumn && activeMetric
      ? categories.map(
          (category) => ({
            region: category,

            value:
              filteredPreview
                .filter(
                  (row) =>
                    String(
                      row[
                        categoryColumn
                      ] ?? ""
                    ) === category
                )
                .reduce(
                  (
                    sum,
                    row
                  ) =>
                    sum +
                    toNumber(
                      row[
                        activeMetric
                      ]
                    ),
                  0
                ),
          })
        )
      : [];


  // =======================================================
  // FILE CHANGE
  // =======================================================

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile =
      event.target.files?.[0] ??
      null;

    setFile(selectedFile);
    setError("");
  }


  // =======================================================
  // ANALYZE
  // =======================================================

  async function handleAnalyze() {
    if (!file) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          "http://127.0.0.1:8000/api/v1/analysis/analyze",
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Analysis failed"
        );
      }

      setResult(data);
      setCurrentPage(1);
      setSelectedRegion("All");
      setSelectedMetric("");
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to analyze file."
      );
    } finally {
      setLoading(false);
    }
  }


  // =======================================================
  // CSV DOWNLOAD
  // =======================================================

  function downloadCSV() {
    if (!sortedPreview.length) {
      return;
    }

    const header =
      columns.join(",");

    const rows =
      sortedPreview.map((row) =>
        columns
          .map((column) => {
            const value =
              String(
                row[column] ?? ""
              );

            return `"${value.replace(
              /"/g,
              '""'
            )}"`;
          })
          .join(",")
      );

    const csv =
      [header, ...rows].join(
        "\n"
      );

    const blob =
      new Blob(
        [csv],
        {
          type:
            "text/csv;charset=utf-8;",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;

    link.download =
      "analysis_export.csv";

    link.click();

    URL.revokeObjectURL(url);
  }


  // =======================================================
  // PDF
  // =======================================================

  function downloadPDF() {
    if (!result) {
      return;
    }

    const doc =
      new jsPDF();

    let y = 20;

    doc.setFontSize(20);

    doc.text(
      "AI BUSINESS REPORT",
      20,
      y
    );

    y += 12;

    doc.setFontSize(14);

    doc.text(
      file?.name ??
        dataAnalysis?.filename ??
        "Dataset",
      20,
      y
    );

    y += 10;

    doc.setFontSize(10);

    doc.text(
      `Rows: ${
        dataAnalysis?.rows ??
        preview.length
      }`,
      20,
      y
    );

    y += 6;

    doc.text(
      `Columns: ${
        dataAnalysis?.columns ??
        columns.length
      }`,
      20,
      y
    );

    y += 12;

    doc.setFontSize(14);

    doc.text(
      "SUMMARY",
      20,
      y
    );

    y += 8;

    doc.setFontSize(10);

    const summary =
      aiAnalysis?.summary ??
      "No summary available.";

    const summaryLines =
      doc.splitTextToSize(
        summary,
        170
      );

    doc.text(
      summaryLines,
      20,
      y
    );

    y +=
      summaryLines.length *
        5 +
      10;

    doc.setFontSize(14);

    doc.text(
      "KPIs",
      20,
      y
    );

    y += 8;

    doc.setFontSize(10);

    for (
      const kpi of
        aiAnalysis?.kpis ??
        []
    ) {
      doc.text(
        `${kpi.name}: ${kpi.value}`,
        20,
        y
      );

      y += 6;

      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    }

    y += 8;

    doc.setFontSize(14);

    doc.text(
      "INSIGHTS",
      20,
      y
    );

    y += 8;

    doc.setFontSize(10);

    for (
      const insight of
        aiAnalysis?.insights ??
        []
    ) {
      const lines =
        doc.splitTextToSize(
          `- ${insight}`,
          170
        );

      doc.text(
        lines,
        20,
        y
      );

      y +=
        lines.length * 5 +
        3;

      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    }

    y += 8;

    doc.setFontSize(14);

    doc.text(
      "RECOMMENDATIONS",
      20,
      y
    );

    y += 8;

    doc.setFontSize(10);

    for (
      const recommendation of
        aiAnalysis?.recommendations ??
        []
    ) {
      const lines =
        doc.splitTextToSize(
          `- ${recommendation}`,
          170
        );

      doc.text(
        lines,
        20,
        y
      );

      y +=
        lines.length * 5 +
        3;

      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    }

    doc.save(
      "AI_Business_Report.pdf"
    );
  }


  // =======================================================
  // RENDER
  // =======================================================

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* HEADER */}

      <header className="border-b border-slate-800 bg-slate-950">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">

              <Sparkles size={20} />

            </div>

            <div>

              <h1 className="font-bold">
                AI Automation Hub
              </h1>

              <p className="text-xs text-slate-500">
                AI Business Analytics
              </p>

            </div>

          </div>


          <div className="flex items-center gap-2">

            {[
              "Dashboard",
              "Analytics",
              "Reports",
              "History",
            ].map((page) => (

              <button
                key={page}
                onClick={() => {

                  if (page === "History") {
                    router.push("/history");
                    return;
                  }

                  setActivePage(page);

                }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  activePage === page
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {page}
              </button>

            ))}


            {result && (

              <button
                onClick={downloadPDF}
                className="ml-2 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
              >

                <FileText size={16} />

                PDF

              </button>

            )}

          </div>

        </div>

      </header>


      <div
        id="report"
        className="mx-auto max-w-7xl px-6 py-8 lg:px-10"
      >

        {/* =================================================
            DASHBOARD
        ================================================= */}

        {activePage ===
          "Dashboard" && (

          <>

            <section className="mb-8">

              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">

                <div className="max-w-3xl">

                  <div className="mb-4 flex items-center gap-2 text-blue-400">

                    <Sparkles size={18} />

                    <span className="text-sm font-semibold">
                      AI-Powered Analytics
                    </span>

                  </div>

                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Turn your business data into actionable insights.
                  </h1>

                  <p className="mt-4 max-w-2xl leading-7 text-slate-400">
                    Upload your CSV or Excel data and automatically generate KPIs, visualizations and AI-powered business recommendations.
                  </p>

                </div>

              </div>

            </section>


            {/* UPLOAD */}

            <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400">

                  <Upload size={21} />

                </div>

                <div>

                  <h2 className="font-semibold">
                    Upload your data
                  </h2>

                  <p className="text-sm text-slate-500">
                    CSV, XLSX or XLS
                  </p>

                </div>

              </div>


              <div className="mt-6 flex flex-col gap-4 md:flex-row">

                <label className="flex flex-1 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-950 px-6 py-8 text-center hover:border-blue-500">

                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={
                      handleFileChange
                    }
                  />

                  <div>

                    <Upload
                      className="mx-auto mb-3 text-slate-500"
                      size={28}
                    />

                    <p className="font-medium">

                      {file
                        ? file.name
                        : "Choose a file"}

                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Click to browse
                    </p>

                  </div>

                </label>


                <button
                  onClick={
                    handleAnalyze
                  }
                  disabled={
                    !file ||
                    loading
                  }
                  className="rounded-xl bg-blue-600 px-8 py-4 font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40 md:self-center"
                >

                  {loading
                    ? "Analyzing..."
                    : "Analyze Data"}

                </button>

              </div>


              {error && (

                <div className="mt-4 rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm text-red-300">

                  {error}

                </div>

              )}

            </section>


            {/* RESULTS */}

            {result && (

              <>

                {/* METRIC SELECTOR */}

                {numericColumns.length >
                  0 && (

                  <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                      <div>

                        <h3 className="font-semibold">
                          Analysis Metric
                        </h3>

                        <p className="text-sm text-slate-500">
                          Select a numeric column
                        </p>

                      </div>

                      <select
                        value={activeMetric}
                        onChange={(event) => {

                          setSelectedMetric(
                            event.target.value
                          );

                          setCurrentPage(1);

                        }}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                      >

                        {numericColumns.map(
                          (column) => (

                            <option
                              key={column}
                              value={column}
                            >
                              {column}
                            </option>

                          )
                        )}

                      </select>

                    </div>

                  </section>

                )}


                {/* KPI */}

                <section className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

                    <p className="text-sm text-slate-500">
                      Total {activeMetric || "Value"}
                    </p>

                    <p className="mt-4 text-3xl font-bold">

                      {filteredTotal.toLocaleString(
                        undefined,
                        {
                          maximumFractionDigits: 2,
                        }
                      )}

                    </p>

                  </div>


                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

                    <p className="text-sm text-slate-500">
                      Average
                    </p>

                    <p className="mt-4 text-3xl font-bold">

                      {filteredAverage.toLocaleString(
                        undefined,
                        {
                          maximumFractionDigits: 2,
                        }
                      )}

                    </p>

                  </div>


                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

                    <p className="text-sm text-slate-500">
                      Maximum
                    </p>

                    <p className="mt-4 text-3xl font-bold">

                      {filteredMaximum.toLocaleString(
                        undefined,
                        {
                          maximumFractionDigits: 2,
                        }
                      )}

                    </p>

                  </div>


                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

                    <p className="text-sm text-slate-500">
                      Rows
                    </p>

                    <p className="mt-4 text-3xl font-bold">

                      {
                        dataAnalysis?.rows ??
                        preview.length
                      }

                    </p>

                  </div>

                </section>


                {/* CHARTS */}

                <section className="mb-8 grid gap-6 lg:grid-cols-2">

                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

                    <h3 className="mb-6 font-semibold">
                      {activeMetric || "Metric"} by Category
                    </h3>

                    <div className="h-80">

                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >

                        <BarChart
                          data={
                            metricByPerson
                          }
                        >

                          <CartesianGrid
                            strokeDasharray="3 3"
                          />

                          <XAxis
                            dataKey="name"
                          />

                          <YAxis />

                          <Tooltip />

                          <Bar
                            dataKey="value"
                            name={
                              activeMetric
                            }
                          />

                        </BarChart>

                      </ResponsiveContainer>

                    </div>

                  </div>


                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

                    <h3 className="mb-6 font-semibold">
                      {activeMetric || "Metric"} by {categoryColumn || "Category"}
                    </h3>

                    <div className="h-80">

                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >

                        <PieChart>

                          <Pie
                            data={
                              metricByRegion
                            }
                            dataKey="value"
                            nameKey="region"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label
                          >

                            {metricByRegion.map(
                              (
                                _,
                                index
                              ) => (

                                <Cell
                                  key={
                                    index
                                  }
                                />

                              )
                            )}

                          </Pie>

                          <Tooltip />

                          <Legend />

                        </PieChart>

                      </ResponsiveContainer>

                    </div>

                  </div>

                </section>


                {/* DATA EXPLORER */}

                <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">

                  <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                    <div>

                      <h3 className="font-semibold">
                        Data Explorer
                      </h3>

                      <p className="text-sm text-slate-500">
                        Search and explore your dataset.
                      </p>

                    </div>


                    <div className="flex flex-col gap-3 sm:flex-row">

                      <div className="relative">

                        <Search
                          size={17}
                          className="absolute left-3 top-3 text-slate-500"
                        />

                        <input
                          value={
                            searchTerm
                          }
                          onChange={(
                            event
                          ) => {

                            setSearchTerm(
                              event.target.value
                            );

                            setCurrentPage(
                              1
                            );

                          }}
                          placeholder="Search..."
                          className="rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500"
                        />

                      </div>


                      {categoryColumn && (

                        <div className="relative">

                          <Filter
                            size={16}
                            className="absolute left-3 top-3 text-slate-500"
                          />

                          <select
                            value={
                              selectedRegion
                            }
                            onChange={(
                              event
                            ) => {

                              setSelectedRegion(
                                event.target.value
                              );

                              setCurrentPage(
                                1
                              );

                            }}
                            className="rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-8 text-sm outline-none focus:border-blue-500"
                          >

                            <option value="All">
                              All
                            </option>

                            {categories.map(
                              (
                                category
                              ) => (

                                <option
                                  key={
                                    category
                                  }
                                  value={
                                    category
                                  }
                                >
                                  {category}
                                </option>

                              )
                            )}

                          </select>

                        </div>

                      )}

                    </div>

                  </div>


                  <div className="overflow-x-auto rounded-xl border border-slate-800">

                    <table className="w-full min-w-max text-left text-sm">

                      <thead className="bg-slate-800">

                        <tr>

                          {columns.map(
                            (
                              column
                            ) => (

                              <th
                                key={
                                  column
                                }
                                className="px-5 py-4"
                              >

                                <button
                                  onClick={() =>
                                    handleSort(
                                      column
                                    )
                                  }
                                  className="font-semibold hover:text-blue-400"
                                >

                                  {column}{" "}

                                  {sortColumn ===
                                  column
                                    ? sortDirection ===
                                      "asc"
                                      ? "↑"
                                      : "↓"
                                    : "↕"}

                                </button>

                              </th>

                            )
                          )}

                        </tr>

                      </thead>


                      <tbody>

                        {paginatedPreview.map(
                          (
                            row,
                            index
                          ) => (

                            <tr
                              key={
                                index
                              }
                              className="border-t border-slate-800 hover:bg-slate-800/50"
                            >

                              {columns.map(
                                (
                                  column
                                ) => (

                                  <td
                                    key={
                                      column
                                    }
                                    className="px-5 py-4 text-slate-300"
                                  >

                                    {String(
                                      row[
                                        column
                                      ] ??
                                        ""
                                    )}

                                  </td>

                                )
                              )}

                            </tr>

                          )
                        )}

                      </tbody>

                    </table>

                  </div>


                  <div className="mt-5 flex items-center justify-between">

                    <p className="text-sm text-slate-500">
                      {
                        sortedPreview.length
                      } rows
                    </p>


                    <div className="flex items-center gap-2">

                      <button
                        disabled={
                          currentPage <=
                          1
                        }
                        onClick={() =>
                          setCurrentPage(
                            (page) =>
                              Math.max(
                                1,
                                page - 1
                              )
                          )
                        }
                        className="rounded-lg border border-slate-700 p-2 hover:bg-slate-800 disabled:opacity-30"
                      >

                        <ChevronLeft
                          size={17}
                        />

                      </button>


                      <span className="text-sm text-slate-400">
                        {currentPage} /{" "}
                        {totalPages}
                      </span>


                      <button
                        disabled={
                          currentPage >=
                          totalPages
                        }
                        onClick={() =>
                          setCurrentPage(
                            (page) =>
                              Math.min(
                                totalPages,
                                page + 1
                              )
                          )
                        }
                        className="rounded-lg border border-slate-700 p-2 hover:bg-slate-800 disabled:opacity-30"
                      >

                        <ChevronRight
                          size={17}
                        />

                      </button>

                    </div>

                  </div>

                </section>


                {/* AI INSIGHTS */}

                {aiAnalysis && (

                  <section className="rounded-2xl border border-blue-900/50 bg-slate-900 p-8">

                    <div className="flex items-center gap-3">

                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600">

                        <Sparkles
                          size={21}
                        />

                      </div>

                      <div>

                        <h2 className="text-xl font-bold">
                          AI Business Insights
                        </h2>

                        <p className="text-sm text-slate-500">
                          Generated from your data
                        </p>

                      </div>

                    </div>


                    {aiAnalysis.summary && (

                      <div className="mt-7">

                        <h3 className="font-semibold">
                          Summary
                        </h3>

                        <p className="mt-3 leading-7 text-slate-300">
                          {
                            aiAnalysis.summary
                          }
                        </p>

                      </div>

                    )}


                    {aiAnalysis.kpis &&
                      aiAnalysis.kpis.length >
                        0 && (

                      <div className="mt-7">

                        <h3 className="font-semibold">
                          AI KPIs
                        </h3>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">

                          {aiAnalysis.kpis.map(
                            (
                              kpi,
                              index
                            ) => (

                              <div
                                key={
                                  index
                                }
                                className="rounded-xl bg-slate-950 p-5"
                              >

                                <p className="text-sm text-slate-500">
                                  {
                                    kpi.name
                                  }
                                </p>

                                <p className="mt-2 text-2xl font-bold">
                                  {
                                    kpi.value
                                  }
                                </p>

                                {kpi.description && (

                                  <p className="mt-2 text-sm text-slate-500">
                                    {
                                      kpi.description
                                    }
                                  </p>

                                )}

                              </div>

                            )
                          )}

                        </div>

                      </div>

                    )}


                    {aiAnalysis.insights &&
                      aiAnalysis.insights.length >
                        0 && (

                      <div className="mt-7">

                        <h3 className="font-semibold">
                          Key Insights
                        </h3>

                        <div className="mt-4 space-y-3">

                          {aiAnalysis.insights.map(
                            (
                              insight,
                              index
                            ) => (

                              <div
                                key={
                                  index
                                }
                                className="flex gap-3 rounded-xl bg-slate-950 p-4"
                              >

                                <CheckCircle2
                                  size={19}
                                  className="mt-0.5 shrink-0 text-emerald-400"
                                />

                                <p className="text-slate-300">
                                  {
                                    insight
                                  }
                                </p>

                              </div>

                            )
                          )}

                        </div>

                      </div>

                    )}


                    {aiAnalysis.anomalies &&
                      aiAnalysis.anomalies.length >
                        0 && (

                      <div className="mt-7">

                        <h3 className="font-semibold">
                          ⚠️ Anomalies
                        </h3>

                        <div className="mt-4 space-y-3">

                          {aiAnalysis.anomalies.map(
                            (
                              anomaly,
                              index
                            ) => (

                              <div
                                key={
                                  index
                                }
                                className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-red-300"
                              >

                                {
                                  anomaly
                                }

                              </div>

                            )
                          )}

                        </div>

                      </div>

                    )}


                    {aiAnalysis.recommendations &&
                      aiAnalysis.recommendations.length >
                        0 && (

                      <div className="mt-7">

                        <h3 className="font-semibold">
                          💡 Recommendations
                        </h3>

                        <div className="mt-4 space-y-3">

                          {aiAnalysis.recommendations.map(
                            (
                              recommendation,
                              index
                            ) => (

                              <div
                                key={
                                  index
                                }
                                className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 p-4 text-emerald-300"
                              >

                                {
                                  recommendation
                                }

                              </div>

                            )
                          )}

                        </div>

                      </div>

                    )}

                  </section>

                )}

              </>

            )}

          </>

        )}


        {/* =================================================
            ANALYTICS
        ================================================= */}

        {activePage ===
          "Analytics" && (

          <section>

            <div className="mb-8">

              <h1 className="text-3xl font-bold">
                Analytics
              </h1>

              <p className="mt-2 text-slate-500">
                Explore detailed performance metrics.
              </p>

            </div>


            {!result ? (

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center">

                <BarChart3
                  className="mx-auto text-slate-600"
                  size={48}
                />

                <h2 className="mt-5 text-xl font-semibold">
                  No analysis yet
                </h2>

                <p className="mt-2 text-slate-500">
                  Upload a dataset from the Dashboard first.
                </p>

              </div>

            ) : (

              <div className="grid gap-6 md:grid-cols-2">

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

                  <h3 className="font-semibold">
                    Dataset size
                  </h3>

                  <p className="mt-4 text-4xl font-bold">
                    {
                      dataAnalysis?.rows ??
                      0
                    }
                  </p>

                  <p className="mt-2 text-slate-500">
                    rows
                  </p>

                </div>


                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

                  <h3 className="font-semibold">
                    Variables
                  </h3>

                  <p className="mt-4 text-4xl font-bold">
                    {
                      dataAnalysis?.columns ??
                      0
                    }
                  </p>

                  <p className="mt-2 text-slate-500">
                    columns
                  </p>

                </div>


                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

                  <h3 className="font-semibold">
                    Numeric Variables
                  </h3>

                  <p className="mt-4 text-4xl font-bold">
                    {
                      numericColumns.length
                    }
                  </p>

                  <p className="mt-2 text-slate-500">
                    numeric columns
                  </p>

                </div>


                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

                  <h3 className="font-semibold">
                    Categorical Variables
                  </h3>

                  <p className="mt-4 text-4xl font-bold">
                    {
                      categoricalColumns.length
                    }
                  </p>

                  <p className="mt-2 text-slate-500">
                    categorical columns
                  </p>

                </div>

              </div>

            )}

          </section>

        )}


        {/* =================================================
            REPORTS
        ================================================= */}

        {activePage ===
          "Reports" && (

          <section>

            <div className="mb-8">

              <h1 className="text-3xl font-bold">
                Reports
              </h1>

              <p className="mt-2 text-slate-500">
                Export your business analysis.
              </p>

            </div>


            <div className="grid gap-6 md:grid-cols-2">

              <button
                onClick={
                  downloadPDF
                }
                disabled={
                  !result
                }
                className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-left transition hover:border-blue-600 disabled:opacity-40"
              >

                <FileText
                  className="text-blue-400"
                  size={32}
                />

                <h2 className="mt-5 text-xl font-semibold">
                  PDF Report
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Download a professional PDF report of your analysis.
                </p>

              </button>


              <button
                onClick={
                  downloadCSV
                }
                disabled={
                  !result
                }
                className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-left transition hover:border-emerald-600 disabled:opacity-40"
              >

                <Download
                  className="text-emerald-400"
                  size={32}
                />

                <h2 className="mt-5 text-xl font-semibold">
                  CSV Export
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Download the filtered and sorted dataset.
                </p>

              </button>

            </div>

          </section>

        )}

      </div>

    </main>
  );
}