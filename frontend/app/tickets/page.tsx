"use client";
import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import { getTickets, updateTicket } from "@/lib/api";

const statusColor: any = {
  Open: "text-red-400 bg-red-900/30 border-red-700",
  "In Progress": "text-yellow-400 bg-yellow-900/30 border-yellow-700",
  Resolved: "text-green-400 bg-green-900/30 border-green-700",
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  const load = () => getTickets().then(setTickets).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const filtered = filter === "All" ? tickets : tickets.filter((t) => t.status === filter);

  const handleStatus = async (ticketId: string, status: string) => {
    await updateTicket(ticketId, status);
    load();
  };

  return (
    <div>
      <TopBar title="Complaint Tickets" subtitle="Manage and resolve patient complaint tickets" />
      <div className="flex gap-2 mb-6">
        {["All", "Open", "In Progress", "Resolved"].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === s ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
            {s} ({s === "All" ? tickets.length : tickets.filter(t => t.status === s).length})
          </button>
        ))}
      </div>
      {loading ? <p className="text-gray-500">Loading...</p> : filtered.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-400">No tickets found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const breached = t.slaDeadline && new Date(t.slaDeadline) < new Date() && t.status !== "Resolved";
            return (
              <div key={t._id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-mono text-sm font-medium">{t.ticketId}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor[t.status]}`}>{t.status}</span>
                      {breached && <span className="text-xs bg-red-900/50 text-red-300 border border-red-700 px-2 py-0.5 rounded-full">⏰ SLA Breached</span>}
                    </div>
                    <p className="text-gray-200 text-sm">{t.patientName} · {t.department}</p>
                    <p className="text-gray-400 text-xs mt-1">{t.description}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded border border-gray-700">{t.category}</span>
                      <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded border border-gray-700">Severity {t.severity}/5</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {t.status === "Open" && (
                      <button onClick={() => handleStatus(t.ticketId, "In Progress")}
                        className="text-xs px-3 py-1.5 bg-yellow-700 hover:bg-yellow-600 text-white rounded-lg transition-all">
                        Start
                      </button>
                    )}
                    {t.status === "In Progress" && (
                      <button onClick={() => handleStatus(t.ticketId, "Resolved")}
                        className="text-xs px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded-lg transition-all">
                        Resolve
                      </button>
                    )}
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