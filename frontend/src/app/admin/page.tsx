/**
 * Administrator Analytics & Overview Dashboard.
 */

"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  GraduationCap,
  School,
  FileCheck2,
  FileText,
  Database,
  ArrowUpRight,
  ShieldCheck,
  UserPlus,
  Clock,
  Sparkles,
} from "lucide-react";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["adminStats"],
    queryFn: () => api.get<any>("/admin/stats"),
  });

  const stats = data?.stats;
  const recentActivity = data?.recentActivity || [];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-10 w-48 bg-muted rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted/60 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Enrolled Students",
      value: stats?.users?.students || 0,
      description: "Active academic students",
      icon: GraduationCap,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20",
      href: "/admin/students",
    },
    {
      title: "Faculty & Teachers",
      value: stats?.users?.teachers || 0,
      description: "Authorized professors",
      icon: Users,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20",
      href: "/admin/faculty",
    },
    {
      title: "Active Classrooms",
      value: stats?.classrooms?.total || 0,
      description: "Institutional labs & courses",
      icon: School,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20",
      href: "/admin/classrooms",
    },
    {
      title: "Approved Journals",
      value: stats?.journals?.approved || 0,
      description: `${stats?.journals?.total || 0} total submissions`,
      icon: FileCheck2,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",
      href: "/admin/journals",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-100/90 via-blue-50/80 to-white dark:from-purple-950/40 dark:via-blue-950/20 dark:to-zinc-900 border border-purple-300/80 dark:border-purple-800/40 shadow-sm relative overflow-hidden">
        <div className="flex flex-col gap-1.5 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-500/20 text-purple-900 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30">
              Administrative Headquarters
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-700 dark:text-zinc-400 font-bold">
              <Sparkles className="size-3 text-amber-500" />
              Full Governance Access
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 dark:text-zinc-50">
            System Control &amp; Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-2xl font-medium leading-relaxed">
            Manage institutional faculty onboarding, audit student submissions, oversee classrooms, and enforce cryptographic security standards across the platform.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 z-10">
          <Link href="/admin/faculty">
            <Button size="sm" className="gap-2 rounded-xl text-xs font-semibold cursor-pointer shadow-sm">
              <UserPlus className="size-3.5" />
              <span>Add Faculty</span>
            </Button>
          </Link>
          <Link href="/admin/classrooms">
            <Button variant="outline" size="sm" className="gap-2 rounded-xl text-xs font-semibold border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 cursor-pointer shadow-xs">
              <School className="size-3.5" />
              <span>Classrooms</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Core Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={card.href} className="group">
              <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-300/90 dark:border-zinc-800 hover:border-slate-400 dark:hover:border-zinc-700 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4 h-full">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-600 dark:text-zinc-400">
                      {card.title}
                    </span>
                    <span className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-zinc-50">
                      {card.value}
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-2xl border ${card.bgColor} ${card.color}`}>
                    <Icon className="size-5" />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-zinc-400 pt-3 border-t border-slate-200 dark:border-zinc-800">
                  <span>{card.description}</span>
                  <ArrowUpRight className="size-3.5 text-slate-400 group-hover:text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 3. Secondary Detailed Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Journal Workflow State Distribution */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-300/90 dark:border-zinc-800 shadow-xs flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-base font-bold tracking-tight text-slate-950 dark:text-zinc-50 flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                Journal Submissions Breakdown
              </h2>
              <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">
                Document workflow lifecycle states across all classrooms
              </span>
            </div>
            <Link href="/admin/journals">
              <Button variant="ghost" size="sm" className="text-xs font-semibold gap-1 rounded-xl text-slate-700 dark:text-zinc-300 hover:text-foreground">
                <span>View All</span>
                <ArrowUpRight className="size-3" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-400/80 dark:border-emerald-800/50 flex flex-col gap-1 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300">
                Approved
              </span>
              <span className="text-2xl font-black text-emerald-950 dark:text-emerald-100">
                {stats?.journals?.approved || 0}
              </span>
              <span className="text-[10px] font-semibold text-emerald-800 dark:text-zinc-400">Verified &amp; Graded</span>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-400/80 dark:border-blue-800/50 flex flex-col gap-1 shadow-2xs">
              <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300">
                Submitted
              </span>
              <span className="text-2xl font-black text-blue-950 dark:text-blue-100">
                {stats?.journals?.submitted || 0}
              </span>
              <span className="text-[10px] font-semibold text-blue-800 dark:text-zinc-400">Pending Review</span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-400/80 dark:border-amber-800/50 flex flex-col gap-1 shadow-2xs">
              <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300">
                Revisions
              </span>
              <span className="text-2xl font-black text-amber-950 dark:text-amber-100">
                {stats?.journals?.changes_requested || 0}
              </span>
              <span className="text-[10px] font-semibold text-amber-800 dark:text-zinc-400">Changes Requested</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border-2 border-slate-300 dark:border-zinc-700 flex flex-col gap-1 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-800 dark:text-zinc-300">
                Drafts
              </span>
              <span className="text-2xl font-black text-slate-950 dark:text-zinc-100">
                {stats?.journals?.draft || 0}
              </span>
              <span className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">In Progress</span>
            </div>
          </div>

          {/* Infrastructure Health Badges */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800 text-xs">
            <span className="font-bold text-slate-700 dark:text-zinc-400 flex items-center gap-1.5">
              <Database className="size-3.5" />
              Connected Infrastructure:
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 text-[11px] font-bold flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              MongoDB Atlas (Online)
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 text-[11px] font-bold flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Upstash Redis (Active)
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-500/15 text-purple-900 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30 text-[11px] font-bold">
              Cloudinary Media ({stats?.storage?.assetsCount || 0} assets)
            </span>
          </div>
        </div>

        {/* Right Col: Recent System Audit Activity */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-300/90 dark:border-zinc-800 shadow-xs flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-base font-bold tracking-tight text-slate-950 dark:text-zinc-50 flex items-center gap-2">
                <Clock className="size-4 text-purple-500" />
                Recent Audit Trail
              </h2>
              <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">
                Live institutional security events
              </span>
            </div>
            <Link href="/admin/audit-logs">
              <Button variant="ghost" size="sm" className="text-xs font-semibold gap-1 rounded-xl text-slate-700 dark:text-zinc-300">
                <span>All</span>
                <ArrowUpRight className="size-3" />
              </Button>
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            {recentActivity.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-6 text-center">
                No recent audit events logged yet.
              </p>
            ) : (
              recentActivity.slice(0, 5).map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700/80 hover:bg-slate-100/90 dark:hover:bg-zinc-800/70 transition-all shadow-2xs"
                >
                  <div className="size-6 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 mt-0.5 border border-purple-300 dark:border-purple-500/30">
                    <ShieldCheck className="size-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold truncate text-slate-950 dark:text-zinc-100">
                        {log.action.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 shrink-0 font-medium">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-600 dark:text-zinc-400 truncate font-medium">
                      by {log.userName || log.userEmail || "System"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <Link href="/admin/audit-logs">
            <Button variant="outline" size="sm" className="w-full text-xs font-semibold rounded-xl border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 shadow-xs">
              Inspect Security Audit Logs
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
