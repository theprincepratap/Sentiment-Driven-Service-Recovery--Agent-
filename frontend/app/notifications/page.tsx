'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useWebSocketContext } from '@/components/WSProvider';
import { getSeverityColor, timeAgo } from '@/lib/utils';
import { Bell, AlertTriangle, CheckCircle, RefreshCw, Zap } from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { events, clearCount } = useWebSocketContext();

  const loadNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadNotifications();
    clearCount();
  }, [loadNotifications, clearCount]);

  useEffect(() => {
    if (events.length > 0 && ['manager_alert', 'escalation'].includes(events[0].event_type)) {
      setTimeout(loadNotifications, 800);
    }
  }, [events, loadNotifications]);

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const liveAlerts = events.filter(e => ['manager_alert', 'escalation'].includes(e.event_type));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Manager Notifications
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Critical alerts for the duty management team
          </p>
        </div>
        <button onClick={loadNotifications} className="p-2 rounded-lg hover:bg-white/5">
          <RefreshCw size={16} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Live WebSocket Alerts */}
      {liveAlerts.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold mb-2 flex items-center gap-2" style={{ color: '#ef4444' }}>
            <div className="live-dot" style={{ background: '#ef4444' }} />
            Live Incoming Alerts
          </h3>
          <div className="space-y-2">
            {liveAlerts.slice(0, 5).map((e, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl animate-slide-in"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <Zap size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#ef4444' }} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#ef4444' }}>
                      {e.event_type.replace(/_/g, ' ')}
                    </span>
                    {(e.data as any)?.severity && (
                      <span className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: `${getSeverityColor((e.data as any).severity)}22`, color: getSeverityColor((e.data as any).severity) }}>
                        Severity {(e.data as any).severity}/5
                      </span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {(e.data as any)?.message || JSON.stringify(e.data)}
                  </p>
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                  {timeAgo(e.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historical Notifications */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            All Alerts ({notifications.length})
          </h3>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Unread: {notifications.filter(n => !n.read).length}
          </span>
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl animate-pulse"
                style={{ background: 'rgba(17,24,39,0.5)' }} />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell size={32} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No alerts yet.</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Critical complaints (severity ≥ 4) will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(30,45,69,0.5)' }}>
            {notifications.map((n: any) => (
              <div key={n._id}
                className="p-4 flex items-start gap-4 transition-colors hover:bg-white/5"
                style={!n.read ? { background: 'rgba(239,68,68,0.04)' } : {}}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${getSeverityColor(n.severity)}18` }}>
                  <AlertTriangle size={18} style={{ color: getSeverityColor(n.severity) }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-bold" style={{ color: '#ef4444' }}>
                      CRITICAL COMPLAINT
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: `${getSeverityColor(n.severity)}22`, color: getSeverityColor(n.severity), border: `1px solid ${getSeverityColor(n.severity)}44` }}>
                      Severity {n.severity}/5
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
                      {n.department}
                    </span>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full" style={{ background: '#3b82f6' }} />
                    )}
                  </div>
                  <p className="text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>{n.message}</p>
                  <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>Patient: {n.patient_id}</span>
                    {n.ticket_id && <span>Ticket: {n.ticket_id}</span>}
                    {n.manager_name && <span>Assigned: {n.manager_name}</span>}
                    <span className="ml-auto">{timeAgo(n.created_at)}</span>
                  </div>
                </div>
                {!n.read && (
                  <button onClick={() => handleMarkRead(n._id)}
                    className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 flex-shrink-0 transition-all hover:scale-105"
                    style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                    <CheckCircle size={12} /> Mark Read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
