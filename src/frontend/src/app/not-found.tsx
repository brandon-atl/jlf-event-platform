import Link from "next/link";
import { TreePine } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-8"
      style={{ background: "#faf8f2" }}
    >
      <div className="text-center max-w-md">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "#2d5a3d15" }}
        >
          <TreePine size={32} style={{ color: "#2d5a3d" }} />
        </div>
        <h1
          className="text-3xl font-bold mb-2"
          style={{
            color: "#1a3a2a",
            fontFamily: "'DM Serif Display', serif",
          }}
        >
          Page Not Found
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          This path doesn&apos;t lead anywhere in the forest. Let&apos;s get
          you back on track.
        </p>
        <Link
          href="/events"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-semibold transition hover:opacity-90"
          style={{ background: "#2d5a3d" }}
        >
          <TreePine size={16} />
          Back to Events
        </Link>
      </div>
    </div>
  );
}
