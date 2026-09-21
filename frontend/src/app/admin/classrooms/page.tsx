/**
 * Administrator Classrooms Oversight & Reassignment View.
 */

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  School,
  Search,
  Users,
  UserCheck,
  Copy,
  Check,
  ArrowRightLeft,
  X,
  BookOpen,
} from "lucide-react";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function AdminClassroomsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [reassignClassroom, setReassignClassroom] = useState<any | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Fetch Classrooms
  const { data, isLoading } = useQuery({
    queryKey: ["adminClassrooms", search],
    queryFn: () =>
      api.get<any>("/admin/classrooms", {
        search: search || undefined,
        limit: 50,
      }),
  });

  const classroomList = data?.items || [];

  // 2. Fetch Faculty for Reassignment Dropdown
  const { data: facultyData } = useQuery({
    queryKey: ["adminFacultyListForSelect"],
    queryFn: () => api.get<any>("/admin/users", { role: "teacher", limit: 100 }),
  });
  const facultyOptions = facultyData?.items || [];

  // 3. Reassign Mutation
  const reassignMutation = useMutation({
    mutationFn: ({ classroomId, teacherId }: { classroomId: string; teacherId: string }) =>
      api.patch(`/admin/classrooms/${classroomId}/reassign`, { newTeacherId: teacherId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminClassrooms"] });
      setReassignClassroom(null);
      setSelectedTeacherId("");
    },
    onError: (err: any) => {
      setActionError(err.message || "Failed to reassign classroom.");
    },
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
              <School className="size-7 text-emerald-600 dark:text-emerald-400" />
              Classrooms Oversight
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
              {data?.total || 0} Classrooms
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Academic spaces, enrollment rosters, and faculty ownership across departments.
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {actionError && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-xs font-medium flex items-center justify-between">
          <span>{actionError}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setActionError(null)}
            className="size-6 p-0 hover:bg-transparent text-destructive"
          >
            <X className="size-3" />
          </Button>
        </div>
      )}

      {/* Search Filter */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by classroom name, subject code, join code, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Classrooms Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-muted-foreground animate-pulse">
          Loading institutional classrooms...
        </div>
      ) : classroomList.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 text-center flex flex-col items-center gap-2 shadow-sm">
          <School className="size-8 text-zinc-400" />
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No classrooms found</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {search ? "Try adjusting your search criteria" : "Classrooms created by teachers will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classroomList.map((c: any) => (
            <div
              key={c.id}
              className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 hover:border-slate-400 dark:hover:border-zinc-700 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">
                      {c.code || "COURSE"}
                    </span>
                    <h3 className="font-extrabold text-base text-zinc-950 dark:text-zinc-50 truncate">
                      {c.name}
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shrink-0">
                    {c.department || "Engineering"}
                  </span>
                </div>

                <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                  Subject: <span className="text-zinc-900 dark:text-zinc-100 font-medium">{c.subject}</span>
                </p>

                {/* Faculty In-charge */}
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-800 text-xs">
                  <div className="size-6 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-[10px] border border-purple-200 dark:border-purple-500/30">
                    {c.teacherName ? c.teacherName.charAt(0) : "T"}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate text-[11px]">
                      {c.teacherName || "Assigned Teacher"}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                      {c.teacherEmail}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Meta & Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                {/* Join Code Badge */}
                <button
                  type="button"
                  onClick={() => handleCopyCode(c.joinCode)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 font-mono font-bold text-[11px] text-zinc-900 dark:text-zinc-100 cursor-pointer transition-all active:scale-95 shadow-2xs"
                  title="Click to copy join code"
                >
                  <span>{c.joinCode}</span>
                  {copiedCode === c.joinCode ? (
                    <Check className="size-3 text-emerald-600" />
                  ) : (
                    <Copy className="size-3 text-zinc-400" />
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                    <Users className="size-3.5 text-blue-500" />
                    {c.studentCount || 0} students
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setActionError(null);
                      setReassignClassroom(c);
                      setSelectedTeacherId(c.teacherId || "");
                    }}
                    title="Transfer / Reassign Faculty"
                    className="h-7 size-7 p-0 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-primary cursor-pointer"
                  >
                    <ArrowRightLeft className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Reassign Classroom Faculty */}
      {reassignClassroom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-center border border-blue-200 dark:border-blue-500/30">
                  <ArrowRightLeft className="size-4" />
                </div>
                <h3 className="font-bold text-sm text-zinc-950 dark:text-zinc-50">Reassign Classroom Faculty</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReassignClassroom(null)}
                className="size-7 p-0 rounded-full text-zinc-500 hover:text-foreground"
              >
                <X className="size-4" />
              </Button>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Transfer administrative ownership of <strong className="text-zinc-950 dark:text-zinc-50">{reassignClassroom.name}</strong> to another faculty member.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Select New Faculty *</label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full py-2 px-3 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                <option value="">Select a professor...</option>
                {facultyOptions.map((f: any) => (
                  <option key={f.id} value={f.id}>
                    {f.profile?.name || f.email} ({f.profile?.department || "Faculty"})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReassignClassroom(null)}
                className="rounded-xl text-xs border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!selectedTeacherId || reassignMutation.isPending}
                onClick={() =>
                  reassignMutation.mutate({
                    classroomId: reassignClassroom.id,
                    teacherId: selectedTeacherId,
                  })
                }
                className="rounded-xl text-xs font-semibold shadow-sm"
              >
                {reassignMutation.isPending ? "Transferring..." : "Confirm Reassignment"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
