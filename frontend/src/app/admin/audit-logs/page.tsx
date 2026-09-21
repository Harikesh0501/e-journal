/**
 * Administrator Security Audit Logs View.
 *
 * Implements append-only audit trail oversight (RULE-SEC10).
 */

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Clock,
  User,
  Activity,
  Filter,
} from "lucide-react";

import { api } from "@/lib/api";

const ACTION_FILTERS = [
  { label: "All Audit Events", value: "" },
  { label: "Faculty Created", value: "FACULTY_CREATED" },
  { label: "User Suspended", value: "USER_STATUS_SUSPENDED" },
  { label: "Classroom Reassigned", value: "CLASSROOM_REASSIGNED" },
  { label: "Password Reset", value: "PASSWORD_RESET_BY_ADMIN" },
  { label: "User Deleted", value: "USER_DELETED_BY_ADMIN" },
  { label: "Login Events", value: "USER_LOGGED_IN" },
];

export default function AdminAuditLogsPage() {
  const [actionFilter, setActionFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["adminAuditLogs", actionFilter],
    queryFn: () =>
      api.get<any>("/admin/audit-logs", {
        action: actionFilter || undefined,
        limit: 100,
      }),
  });

  const logs = data?.items || [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2.5">
              <ShieldAlert className="size-7 text-purple-600 dark:text-purple-400" />
              Security Audit Logs
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30">
              {data?.total || 0} Events (Max 100 FIFO)
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            Immutable, append-oriented security audit trail. Strict FIFO policy retains the latest 100 events to prevent database storage bloat.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center gap-3">
        <Filter className="size-4 text-zinc-400 shrink-0" />
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="py-1.5 px-3 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
        >
          {ACTION_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-muted-foreground animate-pulse">
            Loading security audit trail...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-2">
            <Activity className="size-8 text-zinc-400" />
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No audit logs found</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Audit events will record here automatically when administrative or security events occur.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/60 font-bold text-slate-700 dark:text-zinc-300">
                  <th className="p-4 pl-6">Timestamp (UTC)</th>
                  <th className="p-4">Action Event</th>
                  <th className="p-4">Performed By</th>
                  <th className="p-4">Target Entity</th>
                  <th className="p-4 pr-6">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800 font-medium">
                {logs.map((log: any) => {
                  const isCritical =
                    log.action.includes("DELETED") ||
                    log.action.includes("SUSPENDED") ||
                    log.action.includes("RESET");
                  const isCreation =
                    log.action.includes("CREATED") || log.action.includes("REASSIGNED");

                  return (
                    <tr key={log.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="p-4 pl-6 font-mono text-[11px] text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block ${
                            isCritical
                              ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                              : isCreation
                              ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30"
                              : "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30"
                          }`}
                        >
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                            <User className="size-3" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-foreground truncate">
                              {log.userName || log.userEmail || "System"}
                            </span>
                            {log.userRole && (
                              <span className="text-[10px] text-muted-foreground uppercase font-bold">
                                {log.userRole}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground capitalize">
                            {log.entity || "system"}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {log.entityId ? log.entityId.slice(0, 12) + "..." : "N/A"}
                          </span>
                        </div>
                      </td>

                      <td className="p-4 pr-6 font-mono text-[11px] text-muted-foreground">
                        {log.ipAddress || "127.0.0.1"}
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
