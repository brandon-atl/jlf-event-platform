"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  TreePine,
  Mail,
  Shield,
  Eye,
  EyeOff,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { DarkModeToggle } from "@/components/dark-mode-toggle";
import { colors, darkColors } from "@/lib/theme";
import { enableDemo } from "@/lib/demo-data";
import { auth as authApi } from "@/lib/api";

const FEATURES = [
  "Automated reconciliation",
  "Real-time dashboards",
  "Co-host self-service",
  "Day-of logistics",
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { isDark } = useDarkMode();

  const formBg = isDark ? darkColors.surface : "#ffffff";
  const textMain = isDark ? darkColors.textPrimary : colors.forest;
  const textSub = isDark ? darkColors.textSecondary : "#9ca3af";
  const inputBg = isDark ? darkColors.cream : "#ffffff";
  const inputBorder = isDark ? darkColors.surfaceBorder : "#e5e7eb";

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await authApi.sendMagicLink(forgotEmail || email);
      setForgotSent(true);
    } catch {
      // Don't reveal whether the email exists
      setForgotSent(true);
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/events");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid email or password"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex"
      style={{
        background: `linear-gradient(135deg, ${colors.forest} 0%, #065f46 40%, ${colors.canopy} 80%, ${colors.moss} 100%)`,
      }}
    >
      {/* Left side — branding */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-16 relative overflow-hidden">
        {/* Subtle pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='.5'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="text-center relative z-10">
          <div className="w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-8 border border-white/20 animate-float">
            <TreePine size={40} className="text-white" />
          </div>
          <h1
            className="text-5xl font-bold text-white mb-4"
            style={{ fontFamily: "var(--font-dm-serif), serif" }}
          >
            Just Love Forest
          </h1>
          <p className="text-emerald-200/80 text-lg max-w-md mx-auto leading-relaxed">
            Event Management System — where community gathering meets
            operational clarity.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-4 max-w-sm mx-auto text-left">
            {FEATURES.map((t) => (
              <div
                key={t}
                className="flex items-center gap-2 text-emerald-200/70 text-sm"
              >
                <CheckCircle size={14} />
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side — login form */}
      <div
        className="flex-1 flex items-center justify-center p-8 lg:rounded-l-[3rem] transition-colors duration-300 relative"
        style={{ background: formBg }}
      >
        {/* Dark mode toggle — top right of form area */}
        <div className="absolute top-5 right-5">
          <DarkModeToggle />
        </div>
        <div className="w-full max-w-md animate-in fade-in duration-300">
          {/* Mobile-only logo */}
          <div className="lg:hidden mb-8 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: colors.canopy }}
            >
              <TreePine size={24} className="text-white" />
            </div>
            <h1
              className="text-2xl font-bold"
              style={{
                color: textMain,
                fontFamily: "var(--font-dm-serif), serif",
              }}
            >
              Just Love Forest
            </h1>
          </div>

          <h2
            className="text-2xl font-bold mb-1"
            style={{
              color: textMain,
              fontFamily: "var(--font-dm-serif), serif",
            }}
          >
            Welcome back
          </h2>
          <p className="text-sm mb-8" style={{ color: textSub }}>
            Sign in to manage events and attendees
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-600">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: textSub }}>
                Email
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: textSub }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="brian@justloveforest.com"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                  style={{ background: inputBg, borderColor: inputBorder, color: textMain, border: `1px solid ${inputBorder}` }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: textSub }}>
                Password
              </label>
              <div className="relative">
                <Shield
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: textSub }}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-12 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                  style={{ background: inputBg, borderColor: inputBorder, color: textMain, border: `1px solid ${inputBorder}` }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: textSub }}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-white font-semibold rounded-xl hover:shadow-lg active:scale-[0.98] transition-all shadow-md mt-2 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: colors.canopy }}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <div className="text-center mt-3">
              <button
                type="button"
                className="text-xs transition-colors hover:underline underline-offset-2"
                style={{ color: textSub }}
                onClick={() => { setShowForgot(!showForgot); setForgotSent(false); setForgotEmail(email); }}
              >
                Forgot password?
              </button>
            </div>

            {showForgot && !forgotSent && (
              <form onSubmit={handleForgot} className="mt-3 p-4 rounded-xl border space-y-3" style={{ background: isDark ? darkColors.surfaceHover : "#f9fafb", borderColor: inputBorder }}>
                <p className="text-xs font-semibold" style={{ color: textMain }}>
                  Send a magic sign-in link
                </p>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition"
                  style={{ background: inputBg, borderColor: inputBorder, color: textMain }}
                />
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-70"
                  style={{ background: colors.canopy }}
                >
                  {forgotLoading && <Loader2 size={14} className="animate-spin" />}
                  {forgotLoading ? "Sending…" : "Send Magic Link"}
                </button>
              </form>
            )}

            {showForgot && forgotSent && (
              <div className="mt-3 p-4 rounded-xl border flex items-center gap-3" style={{ background: isDark ? "rgba(52,211,153,0.08)" : "#ecfdf5", borderColor: isDark ? "rgba(52,211,153,0.2)" : "#a7f3d0" }}>
                <CheckCircle size={18} style={{ color: isDark ? "#34d399" : "#059669" }} className="flex-shrink-0" />
                <p className="text-xs" style={{ color: isDark ? "#34d399" : "#065f46" }}>
                  If that email exists, a magic link is on its way. Check your inbox.
                </p>
              </div>
            )}
          </form>

          <div className="mt-6 text-center">
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full" style={{ borderTop: `1px solid ${inputBorder}` }} /></div>
              <div className="relative flex justify-center text-xs"><span className="px-3" style={{ background: formBg, color: textSub }}>or</span></div>
            </div>
            <button
              onClick={() => { enableDemo(); window.location.href = "/events"; }}
              className="w-full py-3 font-semibold rounded-xl border-2 border-dashed transition-all hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
              style={{ borderColor: colors.canopy, color: colors.canopy }}
            >
              <TreePine size={16} />
              Explore Demo — Real JLF Events
            </button>
            <p className="text-[11px] text-gray-300 mt-2">No login required · Sample data from justloveforest.com</p>
          </div>

          <p className="text-center text-xs mt-4" style={{ color: textSub }}>
            Protected by JWT + TLS 1.3 encryption
          </p>
        </div>
      </div>
    </div>
  );
}
