/**
 * Forgot Password & Password Reset Self-Service View.
 *
 * Supports 4-step progressive recovery:
 * Step 1: Enter Institutional Email
 * Step 2: Enter & Verify 6-digit OTP Code
 * Step 3: Create & Confirm New Password
 * Step 4: Success & Redirection
 */

"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { useMutation } from "@tanstack/react-query";
import {
  KeyRound,
  ArrowLeft,
  Mail,
  Lock,
  ShieldCheck,
  Check,
} from "lucide-react";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

// Step 1 Schema: Request OTP
const requestOtpSchema = zod.object({
  email: zod.string().email("Enter a valid institutional email"),
});
type RequestOtpFields = zod.infer<typeof requestOtpSchema>;

// Step 2 Schema: Verify 6-digit OTP
const verifyOtpSchema = zod.object({
  otp: zod
    .string()
    .min(6, "Enter the 6-digit code")
    .max(6, "Enter the 6-digit code"),
});
type VerifyOtpFields = zod.infer<typeof verifyOtpSchema>;

// Step 3 Schema: Create New Password
const newPasswordSchema = zod
  .object({
    new_password: zod
      .string()
      .min(8, "Password must be at least 8 characters"),
    confirm_password: zod
      .string()
      .min(8, "Please confirm your new password"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });
type NewPasswordFields = zod.infer<typeof newPasswordSchema>;

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  // Step state: 1 = Email, 2 = Verify OTP, 3 = New Password, 4 = Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [activeEmail, setActiveEmail] = useState(initialEmail);
  const [verifiedOtp, setVerifiedOtp] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Step 1 Form: Email
  const {
    register: registerStep1,
    handleSubmit: handleSubmitStep1,
    formState: { errors: errorsStep1 },
  } = useForm<RequestOtpFields>({
    resolver: zodResolver(requestOtpSchema),
    defaultValues: { email: initialEmail },
  });

  // Step 2 Form: OTP
  const {
    register: registerStep2,
    handleSubmit: handleSubmitStep2,
    formState: { errors: errorsStep2 },
  } = useForm<VerifyOtpFields>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { otp: "" },
  });

  // Step 3 Form: New Password
  const {
    register: registerStep3,
    handleSubmit: handleSubmitStep3,
    formState: { errors: errorsStep3 },
  } = useForm<NewPasswordFields>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: {
      new_password: "",
      confirm_password: "",
    },
  });

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // 1. Request OTP Mutation
  const requestOtpMutation = useMutation({
    mutationFn: (data: RequestOtpFields) =>
      api.post<{ email: string; message: string }>("/auth/forgot-password", data),
    onSuccess: (_data, variables) => {
      setActiveEmail(variables.email);
      setErrorMsg(null);
      setStep(2);
      setCooldown(30);
    },
    onError: (error: any) => {
      setErrorMsg(error.message || "Failed to send reset code. Please check your email.");
    },
  });

  // 2. Resend OTP Mutation
  const resendOtpMutation = useMutation({
    mutationFn: () =>
      api.post<{ email: string; message: string }>("/auth/forgot-password", {
        email: activeEmail,
      }),
    onSuccess: () => {
      setErrorMsg(null);
      setCooldown(30);
    },
    onError: (error: any) => {
      setErrorMsg(error.message || "Failed to resend code. Please wait.");
    },
  });

  // 3. Verify OTP Mutation
  const verifyOtpMutation = useMutation({
    mutationFn: (data: VerifyOtpFields) =>
      api.post<boolean>("/auth/verify-reset-otp", {
        email: activeEmail,
        otp: data.otp,
      }),
    onSuccess: (_data, variables) => {
      setVerifiedOtp(variables.otp);
      setErrorMsg(null);
      setStep(3);
    },
    onError: (error: any) => {
      setErrorMsg(error.message || "Invalid or expired verification code.");
    },
  });

  // 4. Reset Password Mutation
  const resetPasswordMutation = useMutation({
    mutationFn: (data: NewPasswordFields) =>
      api.post<string>("/auth/reset-password", {
        email: activeEmail,
        otp: verifiedOtp,
        new_password: data.new_password,
      }),
    onSuccess: () => {
      setErrorMsg(null);
      setStep(4);
      // Automatically redirect to login after 2.5 seconds
      setTimeout(() => {
        router.push("/auth/login");
      }, 2500);
    },
    onError: (error: any) => {
      setErrorMsg(error.message || "Failed to reset password. Check your code.");
    },
  });

  const onSubmitStep1 = (data: RequestOtpFields) => {
    setErrorMsg(null);
    requestOtpMutation.mutate(data);
  };

  const onSubmitStep2 = (data: VerifyOtpFields) => {
    setErrorMsg(null);
    verifyOtpMutation.mutate(data);
  };

  const onSubmitStep3 = (data: NewPasswordFields) => {
    setErrorMsg(null);
    resetPasswordMutation.mutate(data);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background relative overflow-hidden">
      {/* Subtle ambient light glow underneath floating glass card */}
      <div className="absolute size-[450px] rounded-full bg-purple-500/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[420px] p-8 rounded-3xl bg-gradient-to-b from-white/90 via-white/75 to-white/60 dark:from-zinc-900/85 dark:via-zinc-900/75 dark:to-zinc-950/70 backdrop-blur-2xl backdrop-saturate-180 border border-slate-200/90 dark:border-white/15 ring-1 ring-black/5 dark:ring-white/10 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.1),_inset_0_1px_1px_0_rgba(255,255,255,0.95),_inset_0_-1px_1px_0_rgba(0,0,0,0.05)] dark:shadow-[0_24px_60px_-15px_rgba(0,0,0,0.7),_inset_0_1px_1px_0_rgba(255,255,255,0.18),_inset_0_-1px_1px_0_rgba(0,0,0,0.5)] flex flex-col gap-6 relative transition-all duration-300">
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-1 text-center">
          <img
            src="/logo.png"
            alt="eJournal Logo"
            className="h-14 w-auto object-contain mb-1"
          />
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">
            {step === 4
              ? "Password Reset!"
              : step === 3
              ? "Create New Password"
              : step === 2
              ? "Verify Reset Code"
              : "Forgot Password"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400">
            {step === 4
              ? "Your password has been successfully updated"
              : step === 3
              ? "Choose a strong password with at least 8 characters"
              : step === 2
              ? `Enter the 6-digit code sent to ${activeEmail}`
              : "Recover access for Student or Faculty account"}
          </p>
        </div>

        {/* Step Indicator Pills */}
        {step < 4 && (
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === s
                    ? "w-8 bg-primary"
                    : step > s
                    ? "w-4 bg-primary/40"
                    : "w-4 bg-slate-200 dark:bg-zinc-700"
                }`}
              />
            ))}
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold border border-destructive/20 animate-in fade-in">
            {errorMsg}
          </div>
        )}

        {/* STEP 1: Enter Institutional Email */}
        {step === 1 && (
          <form onSubmit={handleSubmitStep1(onSubmitStep1)} className="flex flex-col gap-4">
            <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/25 border border-purple-200 dark:border-purple-800/40 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-2.5 leading-relaxed">
              <KeyRound className="size-4 shrink-0 text-purple-600 dark:text-purple-400 mt-0.5" />
              <div>
                Enter your institutional email address. We will send a 6-digit verification code to reset your password.
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Institutional Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="student@university.edu or faculty@university.edu"
                  className="w-full pl-9 pr-3 h-10 rounded-xl border border-slate-300 dark:border-zinc-700 bg-background text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  {...registerStep1("email")}
                />
              </div>
              {errorsStep1.email && (
                <span className="text-xs text-destructive mt-0.5">
                  {errorsStep1.email.message}
                </span>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full mt-2 rounded-xl text-xs font-bold cursor-pointer"
              disabled={requestOtpMutation.isPending}
            >
              {requestOtpMutation.isPending ? "Sending Code..." : "Send Reset Code"}
            </Button>

            <div className="text-center text-xs text-slate-600 dark:text-zinc-400 mt-2">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-zinc-300 hover:text-primary transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </form>
        )}

        {/* STEP 2: Enter & Verify 6-Digit OTP Code */}
        {step === 2 && (
          <form onSubmit={handleSubmitStep2(onSubmitStep2)} className="flex flex-col gap-4">
            {/* Active Email Pill & Change Action */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 text-xs">
              <span className="truncate text-slate-700 dark:text-zinc-300 font-medium">
                Sent to: <strong className="text-slate-900 dark:text-zinc-100">{activeEmail}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setStep(1);
                }}
                className="text-primary hover:underline font-bold text-xs shrink-0 cursor-pointer ml-2"
              >
                Change
              </button>
            </div>

            {/* 6-Digit OTP Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                placeholder="123456"
                maxLength={6}
                autoFocus
                className="h-11 text-center tracking-widest font-mono text-lg font-bold rounded-xl border border-slate-300 dark:border-zinc-700 bg-background text-slate-900 dark:text-zinc-100 placeholder:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                {...registerStep2("otp")}
              />
              {errorsStep2.otp && (
                <span className="text-xs text-destructive mt-0.5">
                  {errorsStep2.otp.message}
                </span>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full mt-2 rounded-xl text-xs font-bold cursor-pointer"
              disabled={verifyOtpMutation.isPending}
            >
              {verifyOtpMutation.isPending ? "Verifying Code..." : "Verify Code"}
            </Button>

            {/* Resend Code Option */}
            <div className="flex items-center justify-center gap-2 pt-2 text-xs text-slate-600 dark:text-zinc-400">
              <span>Didn&apos;t receive the code?</span>
              <button
                type="button"
                onClick={() => resendOtpMutation.mutate()}
                disabled={cooldown > 0 || resendOtpMutation.isPending}
                className="font-bold text-primary hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
              >
                {cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : resendOtpMutation.isPending
                  ? "Sending..."
                  : "Resend Code"}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Create & Confirm New Password (Only after OTP is verified!) */}
        {step === 3 && (
          <form onSubmit={handleSubmitStep3(onSubmitStep3)} className="flex flex-col gap-4">
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              <ShieldCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Reset code verified for <strong>{activeEmail}</strong></span>
            </div>

            {/* New Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  autoFocus
                  className="w-full pl-9 pr-3 h-10 rounded-xl border border-slate-300 dark:border-zinc-700 bg-background text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  {...registerStep3("new_password")}
                />
              </div>
              {errorsStep3.new_password && (
                <span className="text-xs text-destructive mt-0.5">
                  {errorsStep3.new_password.message}
                </span>
              )}
            </div>

            {/* Confirm New Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 h-10 rounded-xl border border-slate-300 dark:border-zinc-700 bg-background text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  {...registerStep3("confirm_password")}
                />
              </div>
              {errorsStep3.confirm_password && (
                <span className="text-xs text-destructive mt-0.5">
                  {errorsStep3.confirm_password.message}
                </span>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full mt-2 rounded-xl text-xs font-bold cursor-pointer"
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? "Updating Password..." : "Update Password"}
            </Button>
          </form>
        )}

        {/* STEP 4: Success Confirmation */}
        {step === 4 && (
          <div className="flex flex-col items-center gap-5 py-4 text-center animate-in zoom-in-95">
            <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border-2 border-emerald-300 dark:border-emerald-500/30">
              <Check className="size-8 stroke-[3]" />
            </div>

            <div className="flex flex-col gap-1.5">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-zinc-50">
                Password Successfully Reset
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 max-w-xs leading-relaxed">
                Your credentials have been securely updated. You will now be redirected to the sign-in screen.
              </p>
            </div>

            <Link href="/auth/login" className="w-full">
              <Button size="lg" className="w-full rounded-xl text-xs font-bold cursor-pointer">
                Sign In Now
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
