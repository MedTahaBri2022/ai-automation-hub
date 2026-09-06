
"use client";

import {
  BarChart3,
  FileText,
  LayoutDashboard,
  Settings,
  Sparkles,
  Upload,
} from "lucide-react";

type SidebarProps = {
  activePage: string;
  onPageChange: (page: string) => void;
};

export default function Sidebar({
  activePage,
  onPageChange,
}: SidebarProps) {
  const items = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Analytics",
      icon: BarChart3,
    },
    {
      name: "Reports",
      icon: FileText,
    },
  ];

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-950">

      <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-6">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
          <Sparkles size={21} />
        </div>

        <div>
          <h1 className="font-bold text-white">
            AI Automation
          </h1>

          <p className="text-xs text-slate-500">
            Business Intelligence
          </p>
        </div>

      </div>


      <nav className="flex-1 space-y-2 p-4">

        {items.map((item) => {
          const Icon = item.icon;

          const active =
            activePage === item.name;

          return (
            <button
              key={item.name}
              onClick={() =>
                onPageChange(item.name)
              }
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <Icon size={19} />

              {item.name}
            </button>
          );
        })}

        <div className="my-5 border-t border-slate-800" />

        <button
          onClick={() =>
            onPageChange("Upload")
          }
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
        >
          <Upload size={19} />

          Upload Data
        </button>

      </nav>


      <div className="border-t border-slate-800 p-4">

        <button
          onClick={() =>
            onPageChange("Settings")
          }
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 hover:bg-slate-900 hover:text-white"
        >
          <Settings size={19} />

          Settings
        </button>

      </div>

    </aside>
  );
}