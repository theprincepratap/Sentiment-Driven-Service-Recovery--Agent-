"use client";
import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import { getWeeklyReport } from "@/lib/api";

export default function AnalyticsPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getWeeklyReport();
      setReport(data);
    } catch {
      setError("Failed to generate report. Make sure backend is running.");
    }
    setLoading(false);
  };

  return (
    <div>
      <TopBar title="Analytics Report" subtitle="Weekly trends, patterns, and performance insights" />
      {!report && !loading && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-4xl mb-3">📈</p>
          <p className="text-gray-300 font-medium mb-2">Generate Weekly Report</p>
          <p className="text-gray-500 text-sm mb-6">Gemini will analyze all feedback from the past 7 days</p>
          <button onClick={load} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-all">
            Generate Report
          </button>
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>
      )}
      {loading && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <div className="text-5xl mb-4">🤖</div>
          <p className="text-white font-medium">Gemini analyzing weekly data...</p>
          <div className="mt-4 flex justify-center">
            <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      )}
      {report && !loading && (
        <div className="space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Feedback", value: report.totalFeedback },
              { label: "Avg Severity", value: report.avgSeverity },
              { label: "Resolution Rate", value: `${Math.round((report.resolutionRate || 0) * 100)}%` },
              { label: "SLA Breaches", value: report.slaBreachCount },
            ].map((s) => (
              <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
                <p className="text-3xl font-bold text-white mb-1">{s.value}</p>
                <p className="text-gray-400 text-sm">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Sentiment Breakdown */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Sentiment Breakdown</h3>
            <div className="flex gap-6">
              {Object.entries(report.sentimentBreakdown || {}).map(([k, v]: any) => {
                const colors: any = { positive: "text-green-400", negative: "text-red-400", neutral: "text-yellow-400" };
                return (
                  <div key={k} className="text-center">
                    <p className={`text-3xl font-bold ${colors[k]}`}>{v}</p>
                    <p className="text-gray-400 text-sm capitalize">{k}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Complaints + AI Insight */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">Top Complaint Categories</h3>
              <div className="space-y-2">
                {report.topComplaintCategories?.map((c: any) => (
                  <div key={c.category} className="flex justify-between items-center bg-gray-800 rounded-lg px-4 py-3">
                    <span className="text-gray-200 text-sm">{c.category}</span>
                    <span className="text-white font-bold text-sm">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">🤖 AI Insight</h3>
              <p className="text-gray-300 text-sm leading-relaxed mb-4">{report.overallInsight}</p>
              <h4 className="text-gray-400 text-xs uppercase tracking-wide mb-2">Recommended Actions</h4>
              <ul className="space-y-2">
                {report.recommendedActions?.map((a: string, i: number) => (
                  <li key={i} className="text-sm text-gray-300 flex gap-2">
                    <span className="text-indigo-400">→</span> {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <button onClick={load} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-all">
            🔄 Regenerate Report
          </button>
        </div>
      )}
    </div>
  );
}