export default function DashboardPage() {
  return (
    <div className="space-y-5">
      <h2
        className="text-2xl font-bold tracking-tight"
        style={{
          color: "#1a3a2a",
          fontFamily: "var(--font-dm-serif), serif",
        }}
      >
        Dashboard
      </h2>
      <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
        <p className="text-gray-400 text-sm">
          Select an event to view its dashboard.
        </p>
      </div>
    </div>
  );
}
