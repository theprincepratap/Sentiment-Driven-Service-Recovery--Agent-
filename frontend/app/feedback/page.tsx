"use client";
import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import { getFeedbacks } from "@/lib/api";

const sentimentColor: any = {
  Positive: "text-green-400 bg-green-900/30 border-green-700",
  Negative: "text-red-400 bg-red-900/30 border-red-700",
  Neutral: "text-yellow-400 bg-yellow-900/30 border-yellow-700",
};

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFeedbacks().then(setFeedbacks).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <TopBar title="Feedback Monitor" subtitle="All patient feedback with Gemini analysis" />
      {loading ? <p className="text-gray-500">Loading...</p> : feedbacks.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-4xl mb-3">💬</p>
          <p className="text-gray-400">No feedback yet. Use the Patient Simulator to submit some.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedbacks.map((f) => (
            <div key={f._id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-white font-medium">{f.patientName}</p>
                  <p className="text-gray-400 text-xs">{f.patientId} · {f.department} · {new Date(f.submittedAt).toLocaleString()}</p>
                </div>
                <div className={`text-xs px-3 py-1 rounded-full border font-medium ${sentimentColor[f.sentiment] || "text-gray-400 bg-gray-800 border-gray-700"}`}>
                  {f.sentiment}
                </div>
              </div>
              <p className="text-gray-300 text-sm bg-gray-800 rounded-lg p-3 mb-3 italic">"{f.rawText}"</p>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded border border-gray-700">📂 {f.category}</span>
                <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded border border-gray-700">⚡ Severity {f.severity}/5</span>
                {f.complaintEntities?.map((e: string, i: number) => (
                  <span key={i} className="text-xs bg-indigo-900/30 text-indigo-300 px-2 py-1 rounded border border-indigo-800">{e}</span>
                ))}
              </div>
              {f.resolutionMessage && (
                <div className="text-xs text-gray-400 bg-gray-800 rounded p-3 border-l-2 border-indigo-500">
                  💬 <span className="italic">{f.resolutionMessage}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}