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
import { colors } from "@/lib/theme";

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
  const { login } = useAuth();
  const router = useRouter();

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
      <div className="flex-1 flex items-center justify-center p-8 bg-white lg:rounded-l-[3rem]">
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
                color: colors.forest,
                fontFamily: "var(--font-dm-serif), serif",
              }}
            >
              Just Love Forest
            </h1>
          </div>

          <h2
            className="text-2xl font-bold mb-1"
            style={{
              color: colors.forest,
              fontFamily: "var(--font-dm-serif), serif",
            }}
          >
            Welcome back
          </h2>
          <p className="text-gray-400 text-sm mb-8">
            Sign in to manage events and attendees
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-600">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="brian@justloveforest.com"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Shield
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
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
          </form>

          <p className="text-center text-xs text-gray-300 mt-6">
            Protected by JWT + TLS 1.3 encryption
          </p>
        </div>
      </div>
    </div>
  );
}
