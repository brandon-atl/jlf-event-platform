"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TreePine, Loader2, CheckCircle, XCircle } from "lucide-react";
import { auth } from "@/lib/api";
import { colors } from "@/lib/theme";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg("No token provided");
      return;
    }

    auth
      .verifyMagicLink(token)
      .then((res) => {
        // Store the JWT
        localStorage.setItem("jlf_token", res.access_token);
        setStatus("success");
        // Redirect to portal after brief success message
        setTimeout(() => {
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
  }, [token, router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: colors.cream }}
    >
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-sm w-full mx-4 text-center">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
          style={{ background: colors.canopy }}
        >
          <TreePine size={20} className="text-white" />
        </div>
        <h1
          className="text-lg font-bold mb-1"
          style={{
            color: colors.forest,
            fontFamily: "var(--font-dm-serif), serif",
          }}
        >
          Just Love Forest
        </h1>
        <p className="text-xs text-gray-400 mb-6">Co-Creator Portal</p>

        {status === "loading" && (
          <div className="space-y-3">
            <Loader2
              size={28}
              className="mx-auto animate-spin"
              style={{ color: colors.canopy }}
            />
            <p className="text-sm text-gray-500">Verifying your link...</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-3">
            <CheckCircle
              size={28}
              className="mx-auto"
              style={{ color: colors.canopy }}
            />
            <p className="text-sm text-gray-700 font-medium">
              Verified! Redirecting to portal...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-3">
            <XCircle size={28} className="mx-auto text-red-400" />
            <p className="text-sm text-gray-700 font-medium">
              Verification failed
            </p>
            <p className="text-xs text-gray-400">{errorMsg}</p>
            <button
              onClick={() => router.push("/login")}
              className="mt-2 text-sm font-medium px-4 py-2 rounded-xl transition"
              style={{ color: colors.canopy }}
            >
              Go to login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: colors.cream }}
        >
          <Loader2
            size={28}
            className="animate-spin"
            style={{ color: colors.canopy }}
          />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
