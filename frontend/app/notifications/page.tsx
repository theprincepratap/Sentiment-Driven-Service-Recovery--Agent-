"use client";
import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import { getNotifications, markNotificationRead, markAllRead } from "@/lib/api";

const urgencyColor: any = {
  critical: "border-l-red-500 bg-red-900/10",
  high: "border-l-orange-500 bg-orange-900/10",
  medium: "border-l-yellow-500 bg-yellow-900/10",
  low: "border-l-gray-500 bg-gray-900/10",
};

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => getNotifications().then(setNotifs).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleRead = async (id: string) => {
    await markNotificationRead(id);
    load();
  };

  const handleReadAll = async () => {
    await markAllRead();
    load();
  };

  const unread = notifs.filter((n) => !n.isRead).length;

  return (
    <div>
      <TopBar title="Manager Notifications" subtitle="Critical alerts for the duty management team" />
      <div className="flex items-center justify-between mb-6">
        <span className="text-gray-400 text-sm">All Alerts ({notifs.length}) · Unread: {unread}</span>
        {unread > 0 && (
          <button onClick={handleReadAll} className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all">
            Mark All Read
          </button>
        )}
      </div>
      {loading ? <p className="text-gray-500">Loading...</p> : notifs.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-4xl mb-3">🔔</p>
          <p className="text-gray-400">No alerts yet. Critical complaints (severity ≥ 4) will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifs.map((n) => (
            <div key={n._id} className={`bg-gray-900 border-l-4 border border-gray-800 rounded-xl p-5 transition-all ${urgencyColor[n.urgency] || ""} ${!n.isRead ? "ring-1 ring-indigo-500/30" : "opacity-70"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />}
                    <p className="text-white font-medium text-sm">{n.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      n.urgency === "critical" ? "bg-red-900/40 text-red-300" :
                      n.urgency === "high" ? "bg-orange-900/40 text-orange-300" : "bg-gray-700 text-gray-300"
                    }`}>{n.urgency}</span>
                  </div>
                  <p className="text-gray-300 text-sm">{n.message}</p>
                  <p className="text-gray-500 text-xs mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                {!n.isRead && (
                  <button onClick={() => handleRead(n._id)}
                    className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex-shrink-0 transition-all">
                    Mark Read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}