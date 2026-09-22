/**
 * Central Admin Layout with modern Apple HIG-inspired Liquid Glass Sidebar.
 */

"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  School,
  FileText,
  ShieldAlert,
  ArrowLeft,
  LogOut,
  ShieldCheck,
  User,
} from "lucide-react";

import { api, clearAuthToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Faculty Management",
    href: "/admin/faculty",
    icon: Users,
  },
  {
    label: "Student Directory",
    href: "/admin/students",
    icon: GraduationCap,
  },
  {
    label: "Classrooms Oversight",
    href: "/admin/classrooms",
    icon: School,
  },
  {
    label: "Journal Submissions",
    href: "/admin/journals",
    icon: FileText,
  },
  {
    label: "Security Audit Logs",
    href: "/admin/audit-logs",
    icon: ShieldAlert,
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch active admin details
  const { data: user, isLoading } = useQuery({
    queryKey: ["userMe"],
    queryFn: () => api.get<any>("/auth/me"),
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      clearAuthToken();
      if (typeof window !== "undefined") {
        (window as any).__IS_LOGGING_OUT = true;
      }
      try {
        await api.post("/auth/logout");
      } catch (err) {
        // Ignore network errors on logout
      }
    },
    onSettled: () => {
      clearAuthToken();
      queryClient.clear();
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login?logout=1";
      } else {
        router.push("/auth/login?logout=1");
      }
    },
  });

  useEffect(() => {
    if (!isLoading && user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  if (isLoading || (user && user.role !== "admin")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-muted-foreground animate-pulse">
            Verifying administrative credentials...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-zinc-950 text-foreground flex">
      {/* 1. Desktop & Tablet Sidebar */}
      <aside className="w-72 border-r border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col justify-between shrink-0 p-5 sticky top-0 h-screen z-30 select-none">
        <div className="flex flex-col gap-6">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-2 pt-1">
            <Link href="/admin" className="flex items-center gap-3 group">
              <img
                src="/logo.png"
                alt="eJournal Logo"
                className="h-8 w-auto object-contain transition-transform group-hover:scale-105"
              />
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-slate-900 dark:text-zinc-50 flex items-center gap-1.5">
                  eJournal
                  <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                    Admin
                  </span>
                </span>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400">
                  Institutional Control
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);

              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-[1.01]"
                        : "text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-98"
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Area: Admin Info & Quick Actions */}
        <div className="flex flex-col gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
          {/* Switch back to regular Academic Workspace */}
          <Link href="/dashboard">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 text-xs font-semibold rounded-xl h-9 border-slate-300 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/40 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="size-3.5" />
              <span>Academic Workspace</span>
            </Button>
          </Link>

          {/* Admin Profile Pill & Sign Out */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/70 border border-slate-300 dark:border-zinc-700 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-7 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0">
                <ShieldCheck className="size-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold truncate text-slate-900 dark:text-zinc-100">
                  {user?.profile?.name || "Administrator"}
                </span>
                <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 truncate">
                  {user?.email}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => logoutMutation.mutate()}
                title="Sign Out"
                className="text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
              >
                <LogOut className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto flex flex-col gap-8">
          {children}
        </main>
      </div>
    </div>
  );
}
