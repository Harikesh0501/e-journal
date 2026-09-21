/**
 * Administrator Global Journal Submissions Oversight View.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Search,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileEdit,
  User,
} from "lucide-react";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

const STATUS_FILTERS = [
  { label: "All Statuses", value: "" },
  { label: "Submitted", value: "submitted" },
  { label: "Approved", value: "approved" },
  { label: "Changes Requested", value: "changes_requested" },
  { label: "Draft", value: "draft" },
];

export default function AdminJournalsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["adminJournals", statusFilter, search],
    queryFn: () =>
      api.get<any>("/admin/journals", {
        status: statusFilter || undefined,
        search: search || undefined,
        limit: 50,
      }),
  });

  const journals = data?.items || [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
              <FileText className="size-7 text-amber-600 dark:text-amber-400" />
              Journal Submissions Oversight
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
              {data?.total || 0} Submissions
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Monitor institutional student lab documents, check submission timelines, and inspect approved versions.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl overflow-x-auto w-full sm:w-auto border border-zinc-200/60 dark:border-zinc-700/60">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === f.value
                  ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 shadow-xs border border-zinc-200/90 dark:border-zinc-700"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search student or practical title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Journals Table */}
      <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-muted-foreground animate-pulse">
            Loading journal documents...
          </div>
        ) : journals.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-2">
            <FileText className="size-8 text-zinc-400" />
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No journals found</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {statusFilter || search ? "Try adjusting your filters" : "Student submissions will populate here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 font-bold text-zinc-600 dark:text-zinc-400">
                  <th className="p-4 pl-6">Practical / Assignment</th>
                  <th className="p-4">Author Student</th>
                  <th className="p-4">Workflow State</th>
                  <th className="p-4">Version</th>
                  <th className="p-4">Last Updated</th>
                  <th className="p-4 pr-6 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800 font-medium">
                {journals.map((j: any) => {
                  const status = j.status;
                  const isApproved = status === "approved";
                  const isSubmitted = status === "submitted" || status === "resubmitted";
                  const isChangesRequested = status === "changes_requested";

                  return (
                    <tr key={j.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground">
                            {j.title || j.assignmentTitle || "Untitled Journal"}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {j.practicalNumber ? `Practical ${j.practicalNumber}` : "Lab Experiment"}
                          </span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className="size-7 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {j.studentName ? j.studentName.charAt(0) : "S"}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-foreground truncate">
                              {j.studentName || "Student"}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {j.enrollmentNumber || j.studentEmail}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${
                            isApproved
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                              : isSubmitted
                              ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30"
                              : isChangesRequested
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                              : "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border border-zinc-500/30"
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              isApproved
                                ? "bg-emerald-500"
                                : isSubmitted
                                ? "bg-blue-500 animate-pulse"
                                : isChangesRequested
                                ? "bg-amber-500"
                                : "bg-zinc-400"
                            }`}
                          />
                          {status ? status.replace(/_/g, " ") : "Draft"}
                        </span>
                      </td>

                      <td className="p-4 font-mono text-[11px] text-muted-foreground font-bold">
                        v{j.currentVersion || 1}
                      </td>

                      <td className="p-4 text-muted-foreground text-[11px]">
                        {new Date(j.updatedAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      <td className="p-4 pr-6 text-right">
                        <Link href={`/editor/${j.id}`} target="_blank" rel="noopener noreferrer">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2.5 text-[11px] font-semibold gap-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary cursor-pointer"
                          >
                            <span>Inspect</span>
                            <ExternalLink className="size-3" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
