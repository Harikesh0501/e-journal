"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";

export function SessionGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isPublic = pathname?.startsWith("/auth") || pathname === "/";
    if (isPublic) return;

    // RULE-AUTH01 / User requirement: Require login whenever the browser was closed
    const hasSession = sessionStorage.getItem("ejournal_session_active");
    if (!hasSession) {
      // Browser was closed and reopened! Immediately invalidate credentials and redirect to login
      (window as any).__IS_LOGGING_OUT = true;
      api
        .post("/auth/logout")
        .catch(() => {})
        .finally(() => {
          window.location.href = "/auth/login";
        });
    }
  }, [pathname]);

  return null;
}
