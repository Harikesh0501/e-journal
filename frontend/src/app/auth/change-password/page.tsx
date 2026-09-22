/**
 * Teacher & First-time Login Mandatory Password Change View.
 *
 * Enforces mandatory password replacement for newly provisioned faculty accounts
 * before granting access to dashboard, classrooms, and student reviews.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  KeyRound,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

import { api, clearAuthToken, setAuthToken } from "@/lib/api";
import { Button } from "@/components/ui/button";

const changePasswordSchema = zod
  .object({
    current_password: zod
      .string()
      .min(1, "Enter your temporary / current password"),
    new_password: zod
      .string()
      .min(8, "New password must be at least 8 characters long"),
    confirm_password: zod
      .string()
      .min(1, "Please confirm your new password"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "New passwords do not match",
    path: ["confirm_password"],
  })
  .refine((data) => data.current_password !== data.new_password, {
    message: "New password must be different from current password",
    path: ["new_password"],
  });

type ChangePasswordFields = zod.infer<typeof changePasswordSchema>;

export default function ChangePasswordPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ChangePasswordFields>({
    resolver: zodResolver(changePasswordSchema),
  });

  const newPasswordValue = watch("new_password") || "";

  const mutation = useMutation({
    mutationFn: (data: ChangePasswordFields) =>
      api.post<any>("/auth/change-password", {
        current_password: data.current_password,
        new_password: data.new_password,
      }),
    onSuccess: (res) => {
      if (res.access_token) {
        setAuthToken(res.access_token);
      }
      queryClient.clear();
      setIsSuccess(true);
      setTimeout(() => {
        window.location.href = res.user?.is_profile_complete ? "/dashboard" : "/profile/setup";
      }, 1800);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to update password. Please check your credentials.");
    },
  });

  const onSubmit = (data: ChangePasswordFields) => {
    setErrorMsg(null);
    mutation.mutate(data);
  };

  const handleSignOut = () => {
    clearAuthToken();
    window.location.href = "/auth/login?logout=1";
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background relative overflow-hidden select-none">
      {/* Subtle ambient lighting orb */}
      <div className="absolute size-[480px] rounded-full bg-amber-500/10 dark:bg-amber-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[440px] p-8 rounded-3xl bg-gradient-to-b from-white/80 via-white/65 to-white/50 dark:from-zinc-900/85 dark:via-zinc-900/75 dark:to-zinc-950/70 backdrop-blur-2xl backdrop-saturate-180 border border-white/80 dark:border-white/15 ring-1 ring-black/5 dark:ring-white/10 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.1),_inset_0_1px_1px_0_rgba(255,255,255,0.95)] dark:shadow-[0_24px_60px_-15px_rgba(0,0,0,0.7),_inset_0_1px_1px_0_rgba(255,255,255,0.18)] flex flex-col gap-6 relative transition-all duration-300">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="size-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shadow-inner mb-1">
            <ShieldCheck className="size-7 stroke-[2.2]" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold">
            <Sparkles className="size-3.5" />
            <span>Faculty Initial Setup</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Set Your Personal Password
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-[340px]">
            Welcome to eJournal. Because you signed in with an initial temporary password, please create a permanent secure password to continue.
          </p>
        </div>

        {/* Success State */}
        {isSuccess ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shadow-lg">
              <CheckCircle2 className="size-8 stroke-[2.5]" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-foreground">Password Set Successfully!</h3>
              <p className="text-xs text-muted-foreground">
                Your credentials have been securely updated. Redirecting to your dashboard...
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20 flex items-start gap-2 animate-in fade-in duration-200">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Current / Temporary Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex justify-between">
                <span>Temporary / Current Password</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type={showCurrent ? "text" : "password"}
                  placeholder="Enter the password from your invitation email"
                  className="h-10 w-full rounded-xl border border-input bg-background/50 px-3 pr-10 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 transition-all placeholder:text-muted-foreground/60"
                  {...register("current_password")}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                >
                  {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.current_password && (
                <span className="text-xs text-destructive mt-0.5">{errors.current_password.message}</span>
              )}
            </div>

            {/* New Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                New Secure Password
              </label>
              <div className="relative flex items-center">
                <input
                  type={showNew ? "text" : "password"}
                  placeholder="At least 8 characters"
                  className="h-10 w-full rounded-xl border border-input bg-background/50 px-3 pr-10 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 transition-all placeholder:text-muted-foreground/60"
                  {...register("new_password")}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                >
                  {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.new_password && (
                <span className="text-xs text-destructive mt-0.5">{errors.new_password.message}</span>
              )}

              {/* Password strength indicator */}
              <div className="flex items-center gap-2 mt-1">
                <div
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    newPasswordValue.length >= 8 ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800"
                  }`}
                />
                <div
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    newPasswordValue.length >= 10 && /[0-9!@#$%^&*]/.test(newPasswordValue)
                      ? "bg-emerald-500"
                      : "bg-zinc-200 dark:bg-zinc-800"
                  }`}
                />
                <span className="text-[10px] text-muted-foreground">
                  {newPasswordValue.length >= 8 ? "Good" : "Min 8 chars"}
                </span>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Confirm New Password
              </label>
              <div className="relative flex items-center">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-type your new password"
                  className="h-10 w-full rounded-xl border border-input bg-background/50 px-3 pr-10 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 transition-all placeholder:text-muted-foreground/60"
                  {...register("confirm_password")}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                >
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.confirm_password && (
                <span className="text-xs text-destructive mt-0.5">{errors.confirm_password.message}</span>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full mt-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Updating Password..." : "Save Password & Continue"}
            </Button>
          </form>
        )}

        {/* Footer with Sign Out */}
        <div className="pt-2 border-t border-border/40 flex justify-center">
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
          >
            <LogOut className="size-3.5" />
            <span>Sign Out / Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
