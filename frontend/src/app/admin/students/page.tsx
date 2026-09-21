/**
 * Administrator Student Directory & Oversight View.
 */

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GraduationCap,
  Search,
  KeyRound,
  Ban,
  CheckCircle2,
  Trash2,
  Mail,
  X,
  UserX,
} from "lucide-react";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function AdminStudentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<any | null>(null);
  const [resetModalUser, setResetModalUser] = useState<any | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Fetch student list
  const { data, isLoading } = useQuery({
    queryKey: ["adminStudents", search, departmentFilter],
    queryFn: () =>
      api.get<any>("/admin/users", {
        role: "student",
        search: search || undefined,
        department: departmentFilter || undefined,
        limit: 50,
      }),
  });

  const studentList = data?.items || [];

  // 2. Toggle Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, newStatus }: { userId: string; newStatus: string }) =>
      api.patch(`/admin/users/${userId}/status`, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminStudents"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    },
    onError: (err: any) => {
      setActionError(err.message || "Failed to update student status.");
    },
  });

  // 3. Delete Student Mutation
  const deleteMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/admin/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminStudents"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      setDeleteConfirmUser(null);
    },
    onError: (err: any) => {
      setActionError(err.message || "Failed to delete student account.");
    },
  });

  // 4. Reset Password Mutation
  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      api.post(`/admin/users/${userId}/reset-password`, { newPassword: password }),
    onSuccess: () => {
      setResetModalUser(null);
      setNewPasswordInput("");
      alert("Student password reset successfully.");
    },
    onError: (err: any) => {
      setActionError(err.message || "Failed to reset password.");
    },
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
              <GraduationCap className="size-7 text-blue-600 dark:text-blue-400" />
              Student Directory
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25">
              {data?.total || 0} Students
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Complete institutional student roster. Inspect enrolled cohorts, manage account standing, and reset credentials.
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

      {/* Search & Filters */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by student name, roll number, enrollment number, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="w-full sm:w-64 py-2 px-3 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
        >
          <option value="">All Academic Departments</option>
          <option value="Computer Science & Engineering">Computer Science &amp; Engineering</option>
          <option value="Information Technology">Information Technology</option>
          <option value="Electronics & Communication">Electronics &amp; Communication</option>
          <option value="Mechanical Engineering">Mechanical Engineering</option>
          <option value="Civil Engineering">Civil Engineering</option>
          <option value="Chemical Engineering">Chemical Engineering</option>
        </select>
      </div>

      {/* Students Table */}
      <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-muted-foreground animate-pulse">
            Loading student records...
          </div>
        ) : studentList.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-2">
            <UserX className="size-8 text-zinc-400" />
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No student records found</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {search || departmentFilter ? "Try adjusting your filters" : "Students will populate here upon registration."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 font-bold text-zinc-600 dark:text-zinc-400">
                  <th className="p-4 pl-6">Student Details</th>
                  <th className="p-4">Enrollment / Roll No</th>
                  <th className="p-4">Department &amp; Sem</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800 font-medium">
                {studentList.map((s: any) => {
                  const isSuspended = s.status === "suspended";
                  return (
                    <tr key={s.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {s.profile?.name ? s.profile.name.charAt(0) : "S"}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-foreground truncate">
                              {s.profile?.name || "Pending Profile Setup"}
                            </span>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Mail className="size-3" />
                              {s.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="font-mono font-bold text-foreground">
                          {s.profile?.enrollmentNumber || "N/A"}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">
                            {s.profile?.department || "Unassigned"}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {s.profile?.semester ? `Sem ${s.profile.semester}` : ""}
                            {s.profile?.division ? ` • Div ${s.profile.division}` : ""}
                          </span>
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${
                            isSuspended
                              ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                              : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          <span className={`size-1.5 rounded-full ${isSuspended ? "bg-rose-500" : "bg-emerald-500"}`} />
                          {isSuspended ? "Suspended" : "Active"}
                        </span>
                      </td>

                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActionError(null);
                              setResetModalUser(s);
                              setNewPasswordInput("");
                            }}
                            title="Reset Credentials"
                            className="h-7 text-[11px] font-semibold gap-1 rounded-lg px-2 cursor-pointer"
                          >
                            <KeyRound className="size-3" />
                            <span>Reset</span>
                          </Button>

                          <Button
                            variant={isSuspended ? "outline" : "destructive"}
                            size="sm"
                            onClick={() =>
                              toggleStatusMutation.mutate({
                                userId: s.id,
                                newStatus: isSuspended ? "active" : "suspended",
                              })
                            }
                            disabled={toggleStatusMutation.isPending}
                            className="h-7 text-[11px] font-semibold gap-1 rounded-lg px-2 cursor-pointer"
                          >
                            {isSuspended ? <CheckCircle2 className="size-3 text-emerald-600" /> : <Ban className="size-3" />}
                            <span>{isSuspended ? "Activate" : "Suspend"}</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirmUser(s)}
                            className="h-7 size-7 p-0 text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                            title="Delete Student"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Delete Student Confirmation */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2.5 text-destructive">
              <div className="size-8 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 flex items-center justify-center border border-rose-200 dark:border-rose-500/30">
                <Trash2 className="size-4" />
              </div>
              <h3 className="font-bold text-sm text-zinc-950 dark:text-zinc-50">Confirm Deletion</h3>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Are you sure you want to permanently delete the account for{" "}
              <strong className="text-zinc-950 dark:text-zinc-50">
                {deleteConfirmUser.profile?.name || deleteConfirmUser.email}
              </strong>
              ? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmUser(null)}
                className="rounded-xl text-xs border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteConfirmUser.id)}
                className="rounded-xl text-xs font-semibold"
              >
                {deleteMutation.isPending ? "Deleting..." : "Permanently Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Force Reset Password */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center border border-amber-200 dark:border-amber-500/30">
                  <KeyRound className="size-4" />
                </div>
                <h3 className="font-bold text-sm text-zinc-950 dark:text-zinc-50">Reset Student Password</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setResetModalUser(null)}
                className="size-7 p-0 rounded-full text-zinc-500 hover:text-foreground"
              >
                <X className="size-4" />
              </Button>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Setting new credentials for <strong className="text-zinc-950 dark:text-zinc-50">{resetModalUser.profile?.name || resetModalUser.email}</strong>.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">New Password (min 8 chars) *</label>
              <input
                type="text"
                placeholder="Enter new secure password"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setResetModalUser(null)}
                className="rounded-xl text-xs border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={newPasswordInput.length < 8 || resetPasswordMutation.isPending}
                onClick={() =>
                  resetPasswordMutation.mutate({
                    userId: resetModalUser.id,
                    password: newPasswordInput,
                  })
                }
                className="rounded-xl text-xs font-semibold"
              >
                {resetPasswordMutation.isPending ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
