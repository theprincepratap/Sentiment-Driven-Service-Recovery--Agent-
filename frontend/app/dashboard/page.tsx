"use client";
import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import { getSummary } from "@/lib/api";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = () => getSummary().then(setData).catch(console.error).finally(() => setLoading(false));

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { label: "Total Feedback", value: data?.totalFeedback ?? 0, icon: "💬", color: "indigo" },
    { label: "Open Tickets", value: data?.openTickets ?? 0, icon: "🎫", color: "yellow" },
    { label: "Critical Alerts", value: data?.criticalAlerts ?? 0, icon: "🚨", color: "red" },
    { label: "Avg Severity", value: data?.avgSeverity ?? "—", icon: "📊", color: "purple" },
  ];

  return (
    <div>
      <TopBar title="Command Dashboard" subtitle="Real-time hospital patient sentiment monitoring" />
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((s) => (
              <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="text-2xl mb-2">{s.icon}</div>
                <div className="text-3xl font-bold text-white mb-1">{s.value}</div>
                <div className="text-gray-400 text-sm">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sentiment Distribution */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">Sentiment Distribution</h3>
              {data?.sentimentDistribution && Object.keys(data.sentimentDistribution).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(data.sentimentDistribution).map(([k, v]: any) => {
                    const total = Object.values(data.sentimentDistribution).reduce((a: any, b: any) => a + b, 0) as number;
                    const pct = total ? Math.round((v / total) * 100) : 0;
                    const colors: any = { Positive: "bg-green-500", Negative: "bg-red-500", Neutral: "bg-yellow-500" };
                    return (
                      <div key={k}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-300">{k}</span>
                          <span className="text-gray-400">{v} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2">
                          <div className={`${colors[k] || "bg-indigo-500"} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-gray-600 text-sm">No data yet. Submit feedback first.</p>}
            </div>

            {/* Top Complaint Categories */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">Top Complaint Categories</h3>
              {data?.topCategories?.length > 0 ? (
                <div className="space-y-3">
                  {data.topCategories.map((c: any) => (
                    <div key={c.category} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
                      <span className="text-gray-200 text-sm">{c.category}</span>
                      <span className="text-white font-bold text-sm bg-indigo-900/50 px-2 py-1 rounded">{c.count}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-600 text-sm">No complaints yet.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}