/**
 * Administrator Faculty & Teacher Management View.
 *
 * Enforces controlled faculty provisioning and account lifecycle management.
 */

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import {
  Users,
  UserPlus,
  Search,
  KeyRound,
  Ban,
  CheckCircle2,
  Copy,
  Check,
  X,
  Building2,
  Mail,
  ShieldCheck,
  Loader2,
} from "lucide-react";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

const createFacultySchema = zod.object({
  name: zod.string().min(2, "Name must be at least 2 characters"),
  email: zod.string().email("Enter a valid institutional email"),
  department: zod.string().min(2, "Department is required"),
  designation: zod.string().min(2, "Designation is required"),
  password: zod
    .string()
    .optional()
    .refine((val) => !val || val.trim().length === 0 || val.trim().length >= 8, {
      message: "Password must be at least 8 characters if provided",
    }),
});

type CreateFacultyFields = zod.infer<typeof createFacultySchema>;

export default function AdminFacultyPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [resetModalUser, setResetModalUser] = useState<any | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [provisionSuccessInfo, setProvisionSuccessInfo] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Fetch faculty users
  const { data, isLoading } = useQuery({
    queryKey: ["adminFaculty", search, departmentFilter],
    queryFn: () =>
      api.get<any>("/admin/users", {
        role: "teacher",
        search: search || undefined,
        department: departmentFilter || undefined,
        limit: 50,
      }),
  });

  const facultyList = data?.items || [];

  // 2. Add Faculty Mutation
  const addFacultyMutation = useMutation({
    mutationFn: (data: CreateFacultyFields) => {
      const payload = {
        ...data,
        password: data.password && data.password.trim().length > 0 ? data.password.trim() : undefined,
      };
      return api.post("/admin/faculty", payload);
    },
    onSuccess: (res: any) => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ["adminFaculty"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      setShowAddModal(false);
      setProvisionSuccessInfo(res);
      addForm.reset();
    },
    onError: (err: any) => {
      setActionError(err.message || "Failed to create faculty member.");
    },
  });

  // 3. Toggle User Status Mutation (Suspend/Activate)
  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, newStatus }: { userId: string; newStatus: string }) =>
      api.patch(`/admin/users/${userId}/status`, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminFaculty"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    },
    onError: (err: any) => {
      setActionError(err.message || "Failed to update faculty status.");
    },
  });

  // 4. Reset Password Mutation
  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      api.post(`/admin/users/${userId}/reset-password`, { newPassword: password }),
    onSuccess: () => {
      setResetModalUser(null);
      setNewPasswordInput("");
      alert("Faculty password reset successfully.");
    },
    onError: (err: any) => {
      setActionError(err.message || "Failed to reset password.");
    },
  });

  const addForm = useForm<CreateFacultyFields>({
    resolver: zodResolver(createFacultySchema),
    defaultValues: {
      designation: "Assistant Professor",
      department: "Computer Science & Engineering",
    },
  });

  const handleCopyPassword = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
              <Users className="size-7 text-purple-600 dark:text-purple-400" />
              Faculty Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25">
              {data?.total || 0} Faculty
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Authoritative faculty directory. Create verified accounts, reset credentials, and manage teaching authorizations.
          </p>
        </div>

        <Button
          onClick={() => {
            setActionError(null);
            setShowAddModal(true);
          }}
          className="gap-2 rounded-xl text-xs font-semibold cursor-pointer shadow-sm shrink-0"
        >
          <UserPlus className="size-4" />
          <span>Provision New Faculty</span>
        </Button>
      </div>

      {/* Provisioned Success Banner */}
      {provisionSuccessInfo && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex flex-col text-xs">
              <span className="font-bold text-sm">
                Faculty Account Provisioned: {provisionSuccessInfo.name} ({provisionSuccessInfo.email})
              </span>
              <span className="text-muted-foreground">
                Initial Password: <code className="bg-background/80 px-2 py-0.5 rounded font-mono font-bold text-foreground">{provisionSuccessInfo.initialPassword}</code>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCopyPassword(provisionSuccessInfo.initialPassword)}
              className="text-xs gap-1.5 rounded-xl h-8 cursor-pointer"
            >
              {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
              <span>{copied ? "Copied" : "Copy Password"}</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setProvisionSuccessInfo(null)}
              className="size-8 p-0 rounded-xl"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Action Error Banner */}
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

      {/* Search and Filters */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by faculty name, email, or employee ID..."
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

      {/* Faculty Table */}
      <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-muted-foreground animate-pulse">
            Loading faculty registry...
          </div>
        ) : facultyList.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-2">
            <Users className="size-8 text-zinc-400" />
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No faculty members found</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {search || departmentFilter ? "Try adjusting your search criteria" : "Click 'Provision New Faculty' to onboard your first teacher."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 font-bold text-zinc-600 dark:text-zinc-400">
                  <th className="p-4 pl-6">Faculty Member</th>
                  <th className="p-4">Department &amp; Title</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Created On</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800 font-medium">
                {facultyList.map((f: any) => {
                  const isSuspended = f.status === "suspended";
                  return (
                    <tr key={f.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {f.profile?.name ? f.profile.name.charAt(0) : "T"}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-foreground truncate">
                              {f.profile?.name || "Unnamed Faculty"}
                            </span>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Mail className="size-3" />
                              {f.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">
                            {f.profile?.department || "Unassigned"}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {f.profile?.designation || "Faculty"}
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

                      <td className="p-4 text-muted-foreground text-[11px]">
                        {new Date(f.createdAt).toLocaleDateString()}
                      </td>

                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActionError(null);
                              setResetModalUser(f);
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
                                userId: f.id,
                                newStatus: isSuspended ? "active" : "suspended",
                              })
                            }
                            disabled={toggleStatusMutation.isPending}
                            className="h-7 text-[11px] font-semibold gap-1 rounded-lg px-2 cursor-pointer"
                          >
                            {isSuspended ? <CheckCircle2 className="size-3 text-emerald-600" /> : <Ban className="size-3" />}
                            <span>{isSuspended ? "Activate" : "Suspend"}</span>
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

      {/* MODAL: Provision New Faculty Member */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col gap-5 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 flex items-center justify-center border border-purple-200 dark:border-purple-500/30">
                  <UserPlus className="size-4" />
                </div>
                <h3 className="font-bold text-base text-zinc-950 dark:text-zinc-50">Provision Faculty Account</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddModal(false)}
                className="size-7 p-0 rounded-full text-zinc-500 hover:text-foreground"
              >
                <X className="size-4" />
              </Button>
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20 animate-in fade-in">
                {actionError}
              </div>
            )}

            <form
              onSubmit={addForm.handleSubmit((d) => addFacultyMutation.mutate(d))}
              className="flex flex-col gap-3.5"
            >
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Rajesh Sharma"
                  className="px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  {...addForm.register("name")}
                />
                {addForm.formState.errors.name && (
                  <span className="text-[11px] text-destructive">{addForm.formState.errors.name.message}</span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Institutional Email *</label>
                <input
                  type="email"
                  placeholder="faculty@university.edu"
                  className="px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  {...addForm.register("email")}
                />
                {addForm.formState.errors.email && (
                  <span className="text-[11px] text-destructive">{addForm.formState.errors.email.message}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Department *</label>
                  <input
                    type="text"
                    placeholder="Computer Science"
                    className="px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    {...addForm.register("department")}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Designation *</label>
                  <input
                    type="text"
                    placeholder="Assistant Professor"
                    className="px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    {...addForm.register("designation")}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  Initial Password (Optional - auto-generated if left blank)
                </label>
                <input
                  type="text"
                  placeholder="Leave empty for auto-generated secure password (min 8 chars if provided)"
                  className="px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 font-mono text-[11px]"
                  {...addForm.register("password")}
                />
                {addForm.formState.errors.password && (
                  <span className="text-[11px] text-destructive">{addForm.formState.errors.password.message}</span>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl text-xs font-semibold border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={addFacultyMutation.isPending}
                  className="gap-2 rounded-xl text-xs font-semibold shadow-sm"
                >
                  {addFacultyMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                  <span>{addFacultyMutation.isPending ? "Provisioning..." : "Create Faculty"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Reset Faculty Password */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center border border-amber-200 dark:border-amber-500/30">
                  <KeyRound className="size-4" />
                </div>
                <h3 className="font-bold text-sm text-zinc-950 dark:text-zinc-50">Reset Password</h3>
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
              Setting new credentials for <strong className="text-zinc-900 dark:text-zinc-100">{resetModalUser.profile?.name || resetModalUser.email}</strong>.
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
