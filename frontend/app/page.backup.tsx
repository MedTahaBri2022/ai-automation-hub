
"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

type AIKPI = {
  name: string;
  value: string;
  description?: string;
};

type AIAnalysisContent = {
  summary?: string;
  kpis?: AIKPI[];
  insights?: string[];
  anomalies?: string[];
  recommendations?: string[];
};

type AIAnalysis = {
  success?: boolean;
  model?: string;
  analysis?: AIAnalysisContent;
  error?: string;
};

type DataKPI = {
  total?: number;
  average?: number;
  minimum?: number;
  maximum?: number;
  median?: number;
};

type DataAnalysis = {
  rows?: number;
  columns?: number;
  kpis?: Record<string, DataKPI>;
  preview?: Record<string, unknown>[];
};

type AnalysisResult = {
  success?: boolean;
  data_analysis?: DataAnalysis;
  ai_analysis?: AIAnalysis;
  error?: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] =
    useState<AnalysisResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedRegion, setSelectedRegion] =
    useState("All");

  const [selectedMetric, setSelectedMetric] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [currentPage, setCurrentPage] =
    useState(1);

  const [sortColumn, setSortColumn] =
    useState("");

  const [sortDirection, setSortDirection] =
    useState<"asc" | "desc">("asc");

  const rowsPerPage = 10;

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile =
      event.target.files?.[0];

    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);
    setError("");
    setSelectedRegion("All");
    setSelectedMetric("");
    setSearchTerm("");
    setCurrentPage(1);
    setSortColumn("");
    setSortDirection("asc");
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError("Please select a file.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setSelectedRegion("All");
    setSelectedMetric("");
    setSearchTerm("");
    setCurrentPage(1);
    setSortColumn("");
    setSortDirection("asc");

    try {
      const formData = new FormData();

      formData.append("file", file);

      const response = await fetch(
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
            data?.error ||
            "Analysis failed"
        );
      }

      setResult(data);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch"
      );
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!sortedPreview.length) {
      setError("No data available to export.");
      return;
    }

    const columns =
      Object.keys(sortedPreview[0]);

    const escapeCSV = (
      value: unknown
    ) => {
      const text =
        String(value ?? "");

      if (
        text.includes(",") ||
        text.includes('"') ||
        text.includes("\n")
      ) {
        return `"${text.replace(
          /"/g,
          '""'
        )}"`;
      }

      return text;
    };

    const header = columns
      .map(escapeCSV)
      .join(",");

    const rows =
      sortedPreview.map((row) =>
        columns
          .map((column) =>
            escapeCSV(
              row[column]
            )
          )
          .join(",")
      );

    const csv = [
      header,
      ...rows,
    ].join("\n");

    const blob = new Blob(
      [csv],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      "ai-business-data.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const downloadPDF = async () => {
    const report =
      document.getElementById(
        "report"
      );

    if (!report) {
      setError(
        "Report element not found."
      );
      return;
    }

    try {
      setError("");

      const canvas =
        await html2canvas(report, {
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#020617",
          logging: false,

          onclone: (
            clonedDocument
          ) => {
            const elements =
              clonedDocument.querySelectorAll(
                "*"
              );

            elements.forEach(
              (element) => {
                const htmlElement =
                  element as HTMLElement;

                const computed =
                  clonedDocument.defaultView?.getComputedStyle(
                    htmlElement
                  );

                if (!computed) return;

                if (
                  computed.color.includes(
                    "lab("
                  ) ||
                  computed.color.includes(
                    "oklab("
                  )
                ) {
                  htmlElement.style.color =
                    "#ffffff";
                }

                if (
                  computed.backgroundColor.includes(
                    "lab("
                  ) ||
                  computed.backgroundColor.includes(
                    "oklab("
                  )
                ) {
                  htmlElement.style.backgroundColor =
                    "#020617";
                }

                if (
                  computed.borderColor.includes(
                    "lab("
                  ) ||
                  computed.borderColor.includes(
                    "oklab("
                  )
                ) {
                  htmlElement.style.borderColor =
                    "#334155";
                }
              }
            );
          },
        });

      const imgData =
        canvas.toDataURL(
          "image/jpeg",
          0.9
        );

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 8;

      const contentWidth =
        pageWidth - margin * 2;

      const imageHeight =
        (canvas.height *
          contentWidth) /
        canvas.width;

      const usableHeight =
        pageHeight - margin * 2;

      let heightLeft =
        imageHeight;

      let position = margin;

      pdf.addImage(
        imgData,
        "JPEG",
        margin,
        position,
        contentWidth,
        imageHeight
      );

      heightLeft -=
        usableHeight;

      while (heightLeft > 0) {
        position =
          margin -
          (imageHeight -
            heightLeft);

        pdf.addPage();

        pdf.addImage(
          imgData,
          "JPEG",
          margin,
          position,
          contentWidth,
          imageHeight
        );

        heightLeft -=
          usableHeight;
      }

      pdf.save(
        "ai-business-report.pdf"
      );
    } catch (err) {
      console.error(
        "PDF generation error:",
        err
      );

      setError(
        `PDF generation failed: ${
          err instanceof Error
            ? err.message
            : "Unknown error"
        }`
      );
    }
  };

  const dataAnalysis =
    result?.data_analysis;

  const aiAnalysis =
    result?.ai_analysis?.analysis;

  const preview =
    dataAnalysis?.preview || [];

  const numericColumns =
    useMemo(() => {
      if (!preview.length) {
        return [];
      }

      return Object.keys(
        preview[0]
      ).filter((column) => {
        const values =
          preview
            .map(
              (row) =>
                row[column]
            )
            .filter(
              (value) =>
                typeof value ===
                  "number" &&
                !Number.isNaN(
                  value
                )
            );

        return values.length > 0;
      });
    }, [preview]);

  const activeMetric =
    selectedMetric &&
    numericColumns.includes(
      selectedMetric
    )
      ? selectedMetric
      : numericColumns[0] ||
        "";

  const regions = useMemo(() => {
    return Array.from(
      new Set(
        preview.map((row) =>
          String(
            row.region ??
              row.Region ??
              "Unknown"
          )
        )
      )
    );
  }, [preview]);

  const filteredPreview =
    useMemo(() => {
      if (
        selectedRegion ===
        "All"
      ) {
        return preview;
      }

      return preview.filter(
        (row) => {
          const region =
            String(
              row.region ??
                row.Region ??
                "Unknown"
            );

          return (
            region ===
            selectedRegion
          );
        }
      );
    }, [
      preview,
      selectedRegion,
    ]);

  const searchedPreview =
    useMemo(() => {
      if (
        !searchTerm.trim()
      ) {
        return filteredPreview;
      }

      const term =
        searchTerm.toLowerCase();

      return filteredPreview.filter(
        (row) =>
          Object.values(row).some(
            (value) =>
              String(value)
                .toLowerCase()
                .includes(term)
          )
      );
    }, [
      filteredPreview,
      searchTerm,
    ]);

  const sortedPreview =
    useMemo(() => {
      if (!sortColumn) {
        return searchedPreview;
      }

      return [
        ...searchedPreview,
      ].sort((a, b) => {
        const valueA =
          a[sortColumn];

        const valueB =
          b[sortColumn];

        if (
          valueA === null ||
          valueA === undefined
        ) {
          return 1;
        }

        if (
          valueB === null ||
          valueB === undefined
        ) {
          return -1;
        }

        const numberA =
          Number(valueA);

        const numberB =
          Number(valueB);

        const bothNumbers =
          !Number.isNaN(
            numberA
          ) &&
          !Number.isNaN(
            numberB
          ) &&
          String(valueA).trim() !==
            "" &&
          String(valueB).trim() !==
            "";

        let comparison = 0;

        if (bothNumbers) {
          comparison =
            numberA - numberB;
        } else {
          comparison =
            String(valueA).localeCompare(
              String(valueB),
              undefined,
              {
                numeric: true,
                sensitivity:
                  "base",
              }
            );
        }

        return sortDirection ===
          "asc"
          ? comparison
          : -comparison;
      });
    }, [
      searchedPreview,
      sortColumn,
      sortDirection,
    ]);

  const handleSort = (
    column: string
  ) => {
    if (
      sortColumn ===
      column
    ) {
      setSortDirection(
        (direction) =>
          direction ===
          "asc"
            ? "desc"
            : "asc"
      );
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }

    setCurrentPage(1);
  };

  const getSortIcon = (
    column: string
  ) => {
    if (
      sortColumn !==
      column
    ) {
      return "↕";
    }

    return sortDirection ===
      "asc"
      ? "↑"
      : "↓";
  };

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        sortedPreview.length /
          rowsPerPage
      )
    );

  const safeCurrentPage =
    Math.min(
      currentPage,
      totalPages
    );

  const paginatedPreview =
    sortedPreview.slice(
      (safeCurrentPage - 1) *
        rowsPerPage,
      safeCurrentPage *
        rowsPerPage
    );

  const metricValues =
    filteredPreview
      .map((row) => {
        const value =
          row[activeMetric];

        return typeof value ===
          "number"
          ? value
          : Number(value);
      })
      .filter(
        (value) =>
          !Number.isNaN(value)
      );

  const filteredTotal =
    metricValues.reduce(
      (sum, value) =>
        sum + value,
      0
    );

  const filteredAverage =
    metricValues.length > 0
      ? filteredTotal /
        metricValues.length
      : 0;

  const filteredMaximum =
    metricValues.length > 0
      ? Math.max(
          ...metricValues
        )
      : 0;

  const filteredMinimum =
    metricValues.length > 0
      ? Math.min(
          ...metricValues
        )
      : 0;

  const metricByPerson =
    filteredPreview
      .map((row) => ({
        name: String(
          row.name ??
            row.Name ??
            row.customer ??
            row.Customer ??
            "Unknown"
        ),

        value: Number(
          row[activeMetric] ?? 0
        ),
      }))
      .filter(
        (item) =>
          !Number.isNaN(
            item.value
          )
      );

  const regionMap: Record<
    string,
    number
  > = {};

  filteredPreview.forEach(
    (row) => {
      const region =
        String(
          row.region ??
            row.Region ??
            "Unknown"
        );

      const value =
        Number(
          row[activeMetric] ?? 0
        );

      if (
        !Number.isNaN(value)
      ) {
        regionMap[region] =
          (regionMap[region] ||
            0) + value;
      }
    }
  );

  const metricByRegion =
    Object.entries(
      regionMap
    ).map(
      ([region, value]) => ({
        region,
        value,
      })
    );

  const tableColumns =
    preview.length > 0
      ? Object.keys(
          preview[0]
        )
      : [];

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <div
        id="report"
        className="mx-auto max-w-7xl px-6 py-10"
      >

        <header className="mb-10">

          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">

            <div>

              <h1 className="text-4xl font-bold">
                AI Automation Hub
              </h1>

              <p className="mt-2 text-slate-400">
                AI-powered business data analysis
              </p>

            </div>

            {result && (

              <div className="flex flex-wrap gap-3">

                <button
                  onClick={
                    downloadCSV
                  }
                  className="rounded-lg bg-emerald-600 px-5 py-3 font-semibold hover:bg-emerald-500"
                >
                  📥 Download CSV
                </button>

                <button
                  onClick={
                    downloadPDF
                  }
                  className="rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500"
                >
                  📄 Download PDF
                </button>

              </div>

            )}

          </div>

        </header>


        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8">

          <h2 className="text-2xl font-semibold">
            Analyze your data
          </h2>

          <p className="mt-2 text-slate-400">
            Upload a CSV or Excel file to generate business insights.
          </p>

          <div className="mt-6 rounded-xl border-2 border-dashed border-slate-700 p-10 text-center">

            <input
              id="file"
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={
                handleFileChange
              }
            />

            <label
              htmlFor="file"
              className="cursor-pointer rounded-lg bg-blue-600 px-6 py-3 font-medium hover:bg-blue-500"
            >
              Choose CSV / XLSX
            </label>

            {file && (

              <p className="mt-5 text-sm text-slate-300">
                Selected:{" "}
                {file.name}
              </p>

            )}

          </div>

          <button
            onClick={
              handleAnalyze
            }
            disabled={
              !file || loading
            }
            className="mt-6 rounded-lg bg-emerald-600 px-6 py-3 font-semibold hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading
              ? "Analyzing..."
              : "Analyze Data"}
          </button>

          {error && (

            <div className="mt-6 rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
              <strong>
                Error:
              </strong>{" "}
              {error}
            </div>

          )}

        </section>


        {result && (

          <>

            <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">

              <div className="grid gap-6 md:grid-cols-2">

                <div>

                  <label
                    htmlFor="region-filter"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Region
                  </label>

                  <select
                    id="region-filter"
                    value={
                      selectedRegion
                    }
                    onChange={(
                      event
                    ) => {
                      setSelectedRegion(
                        event.target
                          .value
                      );

                      setCurrentPage(
                        1
                      );
                    }}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
                  >

                    <option value="All">
                      All Regions
                    </option>

                    {regions.map(
                      (region) => (

                        <option
                          key={region}
                          value={region}
                        >
                          {region}
                        </option>

                      )
                    )}

                  </select>

                </div>


                <div>

                  <label
                    htmlFor="metric-filter"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Metric
                  </label>

                  <select
                    id="metric-filter"
                    value={
                      activeMetric
                    }
                    onChange={(
                      event
                    ) => {
                      setSelectedMetric(
                        event.target
                          .value
                      );

                      setCurrentPage(
                        1
                      );
                    }}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
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

              </div>

            </section>


            <section className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

                <p className="text-sm text-slate-400">
                  Total{" "}
                  {activeMetric}
                </p>

                <p className="mt-3 text-3xl font-bold">
                  {filteredTotal.toLocaleString(
                    undefined,
                    {
                      maximumFractionDigits: 2,
                    }
                  )}
                </p>

              </div>


              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

                <p className="text-sm text-slate-400">
                  Average{" "}
                  {activeMetric}
                </p>

                <p className="mt-3 text-3xl font-bold">
                  {filteredAverage.toLocaleString(
                    undefined,
                    {
                      maximumFractionDigits: 2,
                    }
                  )}
                </p>

              </div>


              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

                <p className="text-sm text-slate-400">
                  Maximum
                </p>

                <p className="mt-3 text-3xl font-bold">
                  {filteredMaximum.toLocaleString(
                    undefined,
                    {
                      maximumFractionDigits: 2,
                    }
                  )}
                </p>

              </div>


              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

                <p className="text-sm text-slate-400">
                  Minimum
                </p>

                <p className="mt-3 text-3xl font-bold">
                  {filteredMinimum.toLocaleString(
                    undefined,
                    {
                      maximumFractionDigits: 2,
                    }
                  )}
                </p>

              </div>

            </section>


            <section className="mt-8 grid gap-6 sm:grid-cols-2">

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

                <p className="text-sm text-slate-400">
                  Rows
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {
                    filteredPreview.length
                  }
                </p>

              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

                <p className="text-sm text-slate-400">
                  Columns
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {
                    dataAnalysis?.columns ??
                    0
                  }
                </p>

              </div>

            </section>


            <section className="mt-8 grid gap-8 lg:grid-cols-2">

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

                <h2 className="mb-6 text-xl font-semibold">
                  {activeMetric} by Person
                </h2>

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

                <h2 className="mb-6 text-xl font-semibold">
                  {activeMetric} by Region
                </h2>

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
                          (_, index) => (

                            <Cell
                              key={`cell-${index}`}
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


            <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">

              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                <div>

                  <h2 className="text-2xl font-semibold">
                    Data Explorer
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Search, sort and explore your data.
                  </p>

                </div>

                <input
                  type="text"
                  value={
                    searchTerm
                  }
                  onChange={(
                    event
                  ) => {
                    setSearchTerm(
                      event.target
                        .value
                    );

                    setCurrentPage(
                      1
                    );
                  }}
                  placeholder="🔎 Search data..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500 md:w-80"
                />

              </div>


              <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800">

                <table className="w-full min-w-max text-left text-sm">

                  <thead className="bg-slate-800 text-slate-300">

                    <tr>

                      {tableColumns.map(
                        (column) => (

                          <th
                            key={
                              column
                            }
                            className="whitespace-nowrap px-5 py-4"
                          >

                            <button
                              type="button"
                              onClick={() =>
                                handleSort(
                                  column
                                )
                              }
                              className="flex items-center gap-2 font-semibold hover:text-white"
                            >

                              <span>
                                {
                                  column
                                }
                              </span>

                              <span className="text-slate-500">
                                {
                                  getSortIcon(
                                    column
                                  )
                                }
                              </span>

                            </button>

                          </th>

                        )
                      )}

                    </tr>

                  </thead>


                  <tbody>

                    {paginatedPreview.length >
                    0 ? (

                      paginatedPreview.map(
                        (
                          row,
                          rowIndex
                        ) => (

                          <tr
                            key={
                              rowIndex
                            }
                            className="border-t border-slate-800 hover:bg-slate-800/60"
                          >

                            {tableColumns.map(
                              (
                                column
                              ) => (

                                <td
                                  key={
                                    column
                                  }
                                  className="whitespace-nowrap px-5 py-4 text-slate-300"
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
                      )

                    ) : (

                      <tr>

                        <td
                          colSpan={
                            Math.max(
                              tableColumns.length,
                              1
                            )
                          }
                          className="px-5 py-10 text-center text-slate-500"
                        >
                          No data found.
                        </td>

                      </tr>

                    )}

                  </tbody>

                </table>

              </div>


              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <p className="text-sm text-slate-400">

                  Showing{" "}

                  {sortedPreview.length >
                  0
                    ? (safeCurrentPage -
                        1) *
                        rowsPerPage +
                      1
                    : 0}

                  {" - "}

                  {Math.min(
                    safeCurrentPage *
                      rowsPerPage,
                    sortedPreview.length
                  )}

                  {" of "}

                  {
                    sortedPreview.length
                  }{" "}
                  rows

                </p>


                <div className="flex items-center gap-2">

                  <button
                    disabled={
                      safeCurrentPage <=
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
                    className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ← Previous
                  </button>


                  <span className="px-3 text-sm text-slate-400">
                    Page{" "}
                    {
                      safeCurrentPage
                    }{" "}
                    /{" "}
                    {
                      totalPages
                    }
                  </span>


                  <button
                    disabled={
                      safeCurrentPage >=
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
                    className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next →
                  </button>

                </div>

              </div>

            </section>


            {aiAnalysis && (

              <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-8">

                <h2 className="text-2xl font-semibold">
                  🤖 AI Business Insights
                </h2>


                {aiAnalysis.summary && (

                  <div className="mt-6">

                    <h3 className="text-lg font-semibold">
                      Summary
                    </h3>

                    <p className="mt-3 leading-7 text-slate-300">
                      {
                        aiAnalysis.summary
                      }
                    </p>

                  </div>

                )}


                {Array.isArray(
                  aiAnalysis.kpis
                ) &&
                  aiAnalysis.kpis
                    .length >
                    0 && (

                    <div className="mt-8">

                      <h3 className="text-lg font-semibold">
                        KPIs
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
                              className="rounded-xl bg-slate-800 p-5"
                            >

                              <p className="text-sm text-slate-400">
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

                                <p className="mt-2 text-sm text-slate-400">
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


                {Array.isArray(
                  aiAnalysis.insights
                ) &&
                  aiAnalysis.insights
                    .length >
                    0 && (

                    <div className="mt-8">

                      <h3 className="text-lg font-semibold">
                        Key Insights
                      </h3>

                      <ul className="mt-4 space-y-3">

                        {aiAnalysis.insights.map(
                          (
                            insight,
                            index
                          ) => (

                            <li
                              key={
                                index
                              }
                              className="rounded-lg bg-slate-800 p-4 text-slate-300"
                            >
                              {
                                insight
                              }
                            </li>

                          )
                        )}

                      </ul>

                    </div>

                  )}


                {Array.isArray(
                  aiAnalysis.anomalies
                ) &&
                  aiAnalysis.anomalies
                    .length >
                    0 && (

                    <div className="mt-8">

                      <h3 className="text-lg font-semibold">
                        ⚠️ Anomalies
                      </h3>

                      <ul className="mt-4 space-y-3">

                        {aiAnalysis.anomalies.map(
                          (
                            anomaly,
                            index
                          ) => (

                            <li
                              key={
                                index
                              }
                              className="rounded-lg bg-red-950 p-4 text-red-300"
                            >
                              {
                                anomaly
                              }
                            </li>

                          )
                        )}

                      </ul>

                    </div>

                  )}


                {Array.isArray(
                  aiAnalysis.recommendations
                ) &&
                  aiAnalysis.recommendations
                    .length >
                    0 && (

                    <div className="mt-8">

                      <h3 className="text-lg font-semibold">
                        💡 Recommendations
                      </h3>

                      <ul className="mt-4 space-y-3">

                        {aiAnalysis.recommendations.map(
                          (
                            recommendation,
                            index
                          ) => (

                            <li
                              key={
                                index
                              }
                              className="rounded-lg bg-emerald-950 p-4 text-emerald-300"
                            >
                              {
                                recommendation
                              }
                            </li>

                          )
                        )}

                      </ul>

                    </div>

                  )}

              </section>

            )}

          </>

        )}

      </div>

    </main>
  );
}