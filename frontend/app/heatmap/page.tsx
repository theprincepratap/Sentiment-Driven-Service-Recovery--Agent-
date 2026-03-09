"use client";
import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import { getHeatmap } from "@/lib/api";

const riskConfig: any = {
  None: { bg: "bg-gray-800", border: "border-gray-700", text: "text-gray-400", dot: "bg-gray-500" },
  Low: { bg: "bg-green-900/30", border: "border-green-700", text: "text-green-300", dot: "bg-green-500" },
  Medium: { bg: "bg-yellow-900/30", border: "border-yellow-700", text: "text-yellow-300", dot: "bg-yellow-500" },
  High: { bg: "bg-orange-900/30", border: "border-orange-700", text: "text-orange-300", dot: "bg-orange-500" },
  Critical: { bg: "bg-red-900/40", border: "border-red-600", text: "text-red-300", dot: "bg-red-500" },
};

export default function HeatmapPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHeatmap().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <TopBar title="Department Heatmap" subtitle="Complaint risk intensity by department — darker means higher risk" />
      <div className="flex gap-4 mb-6 flex-wrap">
        {Object.entries(riskConfig).map(([level, cfg]: any) => (
          <div key={level} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${cfg.dot}`} />
            <span className="text-gray-400 text-xs">{level}</span>
          </div>
        ))}
      </div>
      {loading ? <p className="text-gray-500">Loading...</p> : data.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-400">No department data yet. Submit feedback first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((d) => {
            const cfg = riskConfig[d.riskLevel] || riskConfig.None;
            return (
              <div key={d.department} className={`${cfg.bg} border ${cfg.border} rounded-xl p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">{d.department}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full border ${cfg.border} ${cfg.text} font-medium`}>{d.riskLevel}</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{d.totalFeedback}</p>
                    <p className="text-gray-400 text-xs">Total</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-400">{d.negativeCount}</p>
                    <p className="text-gray-400 text-xs">Negative</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{d.avgSeverity}</p>
                    <p className="text-gray-400 text-xs">Avg Sev</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}