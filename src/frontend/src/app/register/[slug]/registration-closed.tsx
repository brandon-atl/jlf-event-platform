import { TreePine } from "lucide-react";

export function RegistrationClosed({ eventName }: { eventName: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="rounded-2xl border border-gray-100 bg-white p-12 shadow-sm">
        <div
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl"
          style={{ background: "#2d5a3d18" }}
        >
          <TreePine size={36} style={{ color: "#2d5a3d" }} />
        </div>
        <h1
          className="mb-2 text-3xl font-bold"
          style={{
            color: "#1a3a2a",
            fontFamily: "'DM Serif Display', serif",
          }}
        >
          Registration Closed
        </h1>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          <strong>{eventName}</strong> has ended. Thank you for your interest!
        </p>
        <p className="text-sm text-gray-400 mt-3">
          Check out our upcoming events and join us in the forest.
        </p>
        <a
          href="https://justloveforest.com"
          className="mt-6 inline-block rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all hover:shadow-lg"
          style={{ background: "#2d5a3d" }}
        >
          Explore Upcoming Events at justloveforest.com
        </a>
      </div>
    </div>
  );
}
