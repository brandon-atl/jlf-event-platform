"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TreePine, Loader2, CheckCircle, XCircle } from "lucide-react";
import { auth } from "@/lib/api";
import { colors, darkColors } from "@/lib/theme";
import { useDarkMode } from "@/hooks/use-dark-mode";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const { isDark } = useDarkMode();

  const c = isDark ? darkColors : colors;
  const pageBg = isDark ? darkColors.cream : colors.cream;
  const cardBg = isDark ? darkColors.surface : "#ffffff";
  const borderColor = isDark ? darkColors.surfaceBorder : "#f3f4f6";
  const textMain = isDark ? darkColors.textPrimary : colors.forest;
  const textSub = isDark ? darkColors.textSecondary : "#6b7280";
  const textMuted = isDark ? darkColors.textMuted : "#9ca3af";

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg("No token provided");
      return;
    }

    let redirectTimer: ReturnType<typeof setTimeout>;

    auth
      .verifyMagicLink(token)
      .then((res) => {
        // Store the JWT
        localStorage.setItem("jlf_token", res.access_token);
        setStatus("success");
        // Redirect to portal after brief success message
        redirectTimer = setTimeout(() => {
          // Force full page reload so Providers picks up new token
          window.location.href = "/portal";
        }, 1000);
      })
      .catch((err) => {
        setStatus("error");
        setErrorMsg(
          err instanceof Error ? err.message : "Invalid or expired link"
        );
      });

    return () => clearTimeout(redirectTimer);
  }, [token, router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: pageBg }}
    >
      <div
        className="rounded-2xl border shadow-sm p-8 max-w-sm w-full mx-4 text-center"
        style={{ background: cardBg, borderColor }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
          style={{ background: c.canopy }}
        >
          <TreePine size={20} className={isDark ? "text-black" : "text-white"} />
        </div>
        <h1
          className="text-lg font-bold mb-1"
          style={{
            color: textMain,
            fontFamily: "var(--font-dm-serif), serif",
          }}
        >
          Just Love Forest
        </h1>
        <p className="text-xs mb-6" style={{ color: textMuted }}>Co-Creator Portal</p>

        {status === "loading" && (
          <div className="space-y-3">
            <Loader2
              size={28}
              className="mx-auto animate-spin"
              style={{ color: c.canopy }}
            />
            <p className="text-sm" style={{ color: textSub }}>Verifying your link...</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-3">
            <CheckCircle
              size={28}
              className="mx-auto"
              style={{ color: c.canopy }}
            />
            <p className="text-sm font-medium" style={{ color: textMain }}>
              Verified! Redirecting to portal...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-3">
            <XCircle size={28} className="mx-auto" style={{ color: isDark ? darkColors.ember : "#f87171" }} />
            <p className="text-sm font-medium" style={{ color: textMain }}>
              Verification failed
            </p>
            <p className="text-xs" style={{ color: textMuted }}>{errorMsg}</p>
            <button
              onClick={() => router.push("/login")}
              className="mt-2 text-sm font-medium px-4 py-2 rounded-xl transition hover:opacity-80"
              style={{ color: c.canopy }}
            >
              Go to login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function VerifyFallback() {
  const { isDark } = useDarkMode();
  const pageBg = isDark ? darkColors.cream : colors.cream;
  const c = isDark ? darkColors : colors;

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: pageBg }}
    >
      <Loader2
        size={28}
        className="animate-spin"
        style={{ color: c.canopy }}
      />
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<VerifyFallback />}>
      <VerifyContent />
    </Suspense>
  );
}
