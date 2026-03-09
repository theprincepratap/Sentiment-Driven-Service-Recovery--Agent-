'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { getSeverityColor } from '@/lib/utils';
import { RefreshCw, AlertTriangle, TrendingUp } from 'lucide-react';

function getRiskColor(risk: number): string {
  if (risk === 0) return '#1a2235';
  if (risk < 20) return '#10b981';
  if (risk < 40) return '#f59e0b';
  if (risk < 60) return '#ef4444';
  return '#8b5cf6';
}

function getRiskLabel(risk: number): string {
  if (risk === 0) return 'None';
  if (risk < 20) return 'Low';
  if (risk < 40) return 'Medium';
  if (risk < 60) return 'High';
  return 'Critical';
}

export default function HeatmapPage() {
  const [heatmap, setHeatmap] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const data = await api.getDepartmentHeatmap();
      setHeatmap(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Department Heatmap</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Complaint risk intensity by department — darker means higher risk
          </p>
        </div>
        <button onClick={loadData} className="p-2 rounded-lg hover:bg-white/5">
          <RefreshCw size={16} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Risk Level:</span>
        {['None', 'Low', 'Medium', 'High', 'Critical'].map((label, i) => {
          const colors = ['#1a2235', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
          return (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ background: colors[i] }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
            </div>
          );
        })}
      </div>

      {/* Heatmap Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-40 rounded-xl animate-pulse"
              style={{ background: 'rgba(17,24,39,0.5)' }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {heatmap.map((dept) => {
            const riskColor = getRiskColor(dept.risk_score);
            const riskLabel = getRiskLabel(dept.risk_score);
            return (
              <div key={dept.department}
                className="rounded-xl p-5 transition-all duration-300 cursor-pointer hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${riskColor}22, ${riskColor}11)`,
                  border: `1px solid ${riskColor}44`,
                }}>
                <div className="mb-3">
                  <div className="w-2.5 h-2.5 rounded-full mb-2" style={{ background: riskColor }} />
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {dept.department}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: `${riskColor}22`, color: riskColor, border: `1px solid ${riskColor}44` }}>
                    {riskLabel} Risk
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span style={{ color: 'var(--text-muted)' }}>Total Feedback</span>
                    <span style={{ color: 'var(--text-primary)' }}>{dept.total_feedback}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: 'var(--text-muted)' }}>Complaints</span>
                    <span style={{ color: '#ef4444' }}>{dept.negative_count}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: 'var(--text-muted)' }}>Avg Severity</span>
                    <span style={{ color: getSeverityColor(Math.round(dept.avg_severity)) }}>
                      {dept.avg_severity}/5
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: 'var(--text-muted)' }}>Top Issue</span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {dept.top_category?.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Risk bar */}
                <div className="mt-3">
                  <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-1.5 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(dept.risk_score, 100)}%`, background: riskColor }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Risk</span>
                    <span className="text-xs font-semibold" style={{ color: riskColor }}>
                      {dept.risk_score}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {heatmap.length === 0 && (
            <div className="col-span-4 text-center py-16 text-sm" style={{ color: 'var(--text-muted)' }}>
              No department data yet. Submit feedback first.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
