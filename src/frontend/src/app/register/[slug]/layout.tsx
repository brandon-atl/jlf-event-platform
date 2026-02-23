import { TreePine } from "lucide-react";
import Link from "next/link";

export default function RegistrationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: "#faf8f2", fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-6 py-4">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "#2d5a3d" }}
          >
            <TreePine size={16} className="text-white" />
          </div>
          <div>
            <p
              className="text-sm font-bold tracking-tight"
              style={{ color: "#1a3a2a", fontFamily: "'DM Serif Display', serif" }}
            >
              Just Love Forest
            </p>
            <p className="text-[10px] tracking-widest text-gray-400 uppercase">
              Poetry, Georgia
            </p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 py-8 sm:px-6">{children}</main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white/60 py-6 text-center">
        <p className="text-xs text-gray-400">
          <Link
            href="https://justloveforest.com"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-gray-600"
            style={{ color: "#2d5a3d" }}
          >
            Just Love Forest
          </Link>{" "}
          &middot; 716 acres of love in Poetry, GA
        </p>
        <p className="mt-1 text-[10px] text-gray-300">
          Questions?{" "}
          <Link
            href="mailto:hello@justloveforest.com"
            className="underline transition-colors hover:text-gray-500"
          >
            hello@justloveforest.com
          </Link>
        </p>
      </footer>
    </div>
  );
}
