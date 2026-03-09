'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useWebSocketContext } from '@/components/WSProvider';
import { getSentimentColor, getSeverityColor, getSeverityLabel, formatCategory, timeAgo } from '@/lib/utils';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  AlertTriangle, CheckCircle, Ticket, MessageSquare,
  TrendingUp, RefreshCw, Activity, Zap
} from 'lucide-react';

const SENTIMENT_COLORS = ['#10b981', '#ef4444', '#f59e0b'];

function StatCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string | number; sub?: string; color: string; icon: React.ElementType;
}) {
  return (
    <div className="glass-card p-5 animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color}22` }}>
          <Icon size={20} style={{ color }} />
        </div>
        <TrendingUp size={14} style={{ color: '#4a6080' }} />
      </div>
      <div className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{value}</div>
      <div className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</div>
      {sub && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { events, connected } = useWebSocketContext();

  const loadStats = useCallback(async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  // Re-fetch when WS events arrive
  useEffect(() => {
    if (events.length > 0) {
      const t = setTimeout(loadStats, 800);
      return () => clearTimeout(t);
    }
  }, [events, loadStats]);

  const sentimentData = stats ? [
    { name: 'Positive', value: stats.sentiment_breakdown.positive },
    { name: 'Negative', value: stats.sentiment_breakdown.negative },
    { name: 'Neutral', value: stats.sentiment_breakdown.neutral },
  ] : [];

  const categoryData = stats?.category_breakdown?.map((c: any) => ({
    name: formatCategory(c.category),
    count: c.count
  })) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Command Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Real-time hospital patient sentiment monitoring
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: connected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${connected ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
            <div className={`live-dot ${connected ? '' : 'bg-red-400'}`}
              style={{ background: connected ? '#10b981' : '#ef4444' }} />
            <span className="text-xs font-medium" style={{ color: connected ? '#10b981' : '#ef4444' }}>
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>
          <button onClick={loadStats} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <RefreshCw size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-5 h-28 animate-pulse"
              style={{ background: 'rgba(17,24,39,0.5)' }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Feedback" value={stats?.total_feedback || 0}
            sub="All time" color="#3b82f6" icon={MessageSquare} />
          <StatCard label="Open Tickets" value={stats?.open_tickets || 0}
            sub={`${stats?.total_tickets || 0} total`} color="#f59e0b" icon={Ticket} />
          <StatCard label="Critical Alerts" value={stats?.critical_alerts || 0}
            sub="Severity ≥ 4" color="#ef4444" icon={AlertTriangle} />
          <StatCard label="Avg Severity" value={stats?.avg_severity || '—'}
            sub="Across all feedback" color="#8b5cf6" icon={Activity} />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sentiment Pie */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
            Sentiment Distribution
          </h3>
          {sentimentData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                  paddingAngle={3} dataKey="value">
                  {sentimentData.map((_, i) => (
                    <Cell key={i} fill={SENTIMENT_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#f0f4ff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No data yet
            </div>
          )}
          <div className="flex justify-center gap-4 mt-2">
            {['Positive', 'Negative', 'Neutral'].map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: SENTIMENT_COLORS[i] }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Bar Chart */}
        <div className="glass-card p-5 col-span-2">
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
            Complaints by Category
          </h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryData} margin={{ left: -20 }}>
                <XAxis dataKey="name" tick={{ fill: '#4a6080', fontSize: 11 }} />
                <YAxis tick={{ fill: '#4a6080', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#f0f4ff' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No data yet
            </div>
          )}
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="live-dot" />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Live Activity Feed
          </h3>
        </div>

        {/* WS Events (last 5) */}
        {events.length > 0 && (
          <div className="mb-3 space-y-2">
            {events.slice(0, 5).map((e, i) => (
              <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-lg animate-slide-in"
                style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.1)' }}>
                <Zap size={14} className="mt-0.5 text-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium" style={{ color: '#3b82f6' }}>
                    [{e.event_type.replace(/_/g, ' ').toUpperCase()}]
                  </span>
                  {' '}
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {(e.data as any)?.message || (e.data as any)?.preview || JSON.stringify(e.data)?.slice(0, 80) || ''}
                  </span>
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                  {timeAgo(e.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* DB Activity */}
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {stats?.activity_feed?.map((item: any, i: number) => (
            <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-lg"
              style={{ borderBottom: '1px solid rgba(30,45,69,0.5)' }}>
              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                style={{
                  background: item.type === 'ticket'
                    ? getSeverityColor(item.severity)
                    : getSentimentColor(item.sentiment)
                }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{item.message}</p>
              </div>
              <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                {timeAgo(item.timestamp)}
              </span>
            </div>
          ))}
          {(!stats?.activity_feed || stats.activity_feed.length === 0) && (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
              No activity yet. Submit feedback to see updates.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
