'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { formatCategory, timeAgo } from '@/lib/utils';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid
} from 'recharts';
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

export default function AnalyticsPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async () => {
    try {
      const data = await api.getWeeklyReport();
      setReport(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadReport(); }, [loadReport]);

  const tooltipStyle = {
    contentStyle: { background: '#111827', border: '1px solid #1e2d45', borderRadius: 8, fontSize: 12 },
    labelStyle: { color: '#f0f4ff' }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Analytics Report</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Weekly trends, patterns, and performance insights
          </p>
        </div>
        <button onClick={loadReport} className="p-2 rounded-lg hover:bg-white/5">
          <RefreshCw size={16} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card h-28 animate-pulse" />
          ))}
        </div>
      ) : report ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Feedback (7d)', value: report.summary.total_feedback, color: '#3b82f6' },
              { label: 'Negative Complaints', value: report.summary.negative, color: '#ef4444' },
              { label: 'Avg Severity', value: report.summary.avg_severity, color: '#f59e0b' },
              { label: 'Escalations', value: report.summary.escalations, color: '#8b5cf6' },
            ].map(({ label, value, color }) => (
              <div key={label} className="glass-card p-5">
                <div className="text-2xl font-bold mb-1" style={{ color }}>{value}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Daily Trend */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
              7-Day Feedback Trend
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={report.daily_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                <XAxis dataKey="date" tick={{ fill: '#4a6080', fontSize: 11 }} />
                <YAxis tick={{ fill: '#4a6080', fontSize: 11 }} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#8da0b8' }} />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }} name="Total" />
                <Line type="monotone" dataKey="negative" stroke="#ef4444" strokeWidth={2} dot={{ r: 4, fill: '#ef4444' }} name="Negative" />
                <Line type="monotone" dataKey="positive" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} name="Positive" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Department Breakdown + Top Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
                Department Breakdown
              </h3>
              {report.department_breakdown.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={report.department_breakdown.slice(0, 8)} margin={{ left: -20 }}>
                    <XAxis dataKey="department" tick={{ fill: '#4a6080', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#4a6080', fontSize: 10 }} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="total" fill="#3b82f622" stroke="#3b82f6" radius={[3, 3, 0, 0]} name="Total" />
                    <Bar dataKey="negative" fill="#ef444422" stroke="#ef4444" radius={[3, 3, 0, 0]} name="Negative" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
                Top Complaint Categories (7d)
              </h3>
              {report.top_categories.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No data yet</p>
              ) : (
                <div className="space-y-3">
                  {report.top_categories.map((c: any, i: number) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: 'var(--text-secondary)' }}>{formatCategory(c.category)}</span>
                        <span style={{ color: 'var(--text-primary)' }}>{c.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div className="h-1.5 rounded-full"
                          style={{
                            width: `${Math.min((c.count / report.top_categories[0].count) * 100, 100)}%`,
                            background: `linear-gradient(90deg, #3b82f6, #8b5cf6)`
                          }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="glass-card p-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Failed to load analytics. Make sure the backend is running.
        </div>
      )}
    </div>
  );
}
