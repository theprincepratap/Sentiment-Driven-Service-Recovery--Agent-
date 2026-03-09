'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useWebSocketContext } from '@/components/WSProvider';
import { getSentimentColor, getSeverityColor, getSeverityLabel, formatCategory, timeAgo } from '@/lib/utils';
import { Send, User, Building2, MessageSquare, RefreshCw, Brain } from 'lucide-react';

const DEPARTMENTS = [
  'Emergency', 'Cardiology', 'Orthopedics', 'Pediatrics',
  'Neurology', 'Oncology', 'General Medicine', 'ICU'
];

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const color = getSentimentColor(sentiment);
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
      {sentiment}
    </span>
  );
}

export default function FeedbackPage() {
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [form, setForm] = useState({
    patient_id: `PAT-${Math.floor(Math.random() * 9000 + 1000)}`,
    name: '',
    department: 'Emergency',
    text: '',
  });
  const { events } = useWebSocketContext();

  const loadFeedback = useCallback(async () => {
    try {
      const data = await api.getFeedback(30);
      setFeedbackList(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadFeedback(); }, [loadFeedback]);

  useEffect(() => {
    if (events.length > 0 && events[0].event_type === 'new_feedback') {
      setTimeout(loadFeedback, 1000);
    }
  }, [events, loadFeedback]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.text.trim()) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await api.submitFeedback(form);
      setResult(res);
      setForm(f => ({
        ...f,
        patient_id: `PAT-${Math.floor(Math.random() * 9000 + 1000)}`,
        name: '',
        text: ''
      }));
      setTimeout(loadFeedback, 1500);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const QUICK_SAMPLES = [
    "The nurse was extremely rude and dismissive when I asked about my medication. I waited 3 hours and nobody came.",
    "The doctor was incredibly thorough and explained everything so clearly. I felt completely at ease.",
    "The bathroom was not cleaned for two days and the food was cold every meal.",
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Feedback Monitor</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Submit patient feedback and watch AI analyze it in real time
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Submit Form */}
        <div className="lg:col-span-2 glass-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            <MessageSquare size={15} /> Submit Patient Feedback
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Patient ID</label>
                <input value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg" style={{ background: 'rgba(17,24,39,0.8)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Patient Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Anonymous" className="w-full px-3 py-2 text-sm rounded-lg"
                  style={{ background: 'rgba(17,24,39,0.8)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
            </div>

            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Department</label>
              <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg"
                style={{ background: 'rgba(17,24,39,0.8)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Feedback</label>
              <textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                rows={4} placeholder="Enter patient feedback here..."
                className="w-full px-3 py-2 text-sm rounded-lg resize-none"
                style={{ background: 'rgba(17,24,39,0.8)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>

            {/* Quick samples */}
            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Quick samples:</p>
              <div className="space-y-1">
                {QUICK_SAMPLES.map((s, i) => (
                  <button key={i} type="button"
                    onClick={() => setForm(f => ({ ...f, text: s }))}
                    className="w-full text-left text-xs px-2 py-1.5 rounded-md truncate transition-colors hover:bg-white/5"
                    style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    {s.slice(0, 60)}...
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={submitting || !form.text.trim()}
              className="w-full btn-primary py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {submitting ? (
                <>
                  <Brain size={15} className="animate-spin" />
                  Analyzing with AI...
                </>
              ) : (
                <>
                  <Send size={15} />
                  Submit & Analyze
                </>
              )}
            </button>
          </form>

          {/* Analysis Result */}
          {result && (
            <div className="mt-4 p-4 rounded-xl animate-slide-in"
              style={{ background: 'rgba(17,24,39,0.9)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold mb-2 flex items-center gap-1"
                style={{ color: '#3b82f6' }}>
                <Brain size={13} /> AI Analysis Result
              </p>
              <div className="space-y-1.5">
                {['sentiment', 'emotion', 'category', 'severity'].map(k => (
                  <div key={k} className="flex justify-between text-xs">
                    <span style={{ color: 'var(--text-muted)' }} className="capitalize">{k}</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {k === 'category' ? formatCategory(result.analysis?.[k]) : result.analysis?.[k]}
                    </span>
                  </div>
                ))}
              </div>
              {result.analysis?.resolution_message && (
                <div className="mt-3 p-2.5 rounded-lg text-xs italic"
                  style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)', color: 'var(--text-secondary)' }}>
                  "{result.analysis.resolution_message}"
                </div>
              )}
              {result.ticket && (
                <div className="mt-2 text-xs px-2 py-1 rounded"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                  🎫 Ticket created: {result.ticket.ticket_id}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Feedback Table */}
        <div className="lg:col-span-3 glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Recent Feedback ({feedbackList.length})
            </h3>
            <button onClick={loadFeedback} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
              <RefreshCw size={14} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 rounded-lg animate-pulse"
                    style={{ background: 'rgba(17,24,39,0.5)' }} />
                ))}
              </div>
            ) : feedbackList.length === 0 ? (
              <div className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
                No feedback yet. Submit some above!
              </div>
            ) : (
              <div className="space-y-2">
                {feedbackList.map((fb: any, i) => (
                  <div key={i} className="p-3 rounded-xl transition-colors"
                    style={{ background: 'rgba(17,24,39,0.5)', border: '1px solid var(--border)' }}>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <User size={13} style={{ color: 'var(--text-muted)' }} />
                        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                          {fb.name || 'Anonymous'}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>•</span>
                        <Building2 size={12} style={{ color: 'var(--text-muted)' }} />
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{fb.department}</span>
                      </div>
                      {fb.analysis && <SentimentBadge sentiment={fb.analysis.sentiment} />}
                    </div>
                    <p className="text-xs leading-relaxed mb-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                      {fb.text}
                    </p>
                    {fb.analysis && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {formatCategory(fb.analysis.category)}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded"
                          style={{ background: `${getSeverityColor(fb.analysis.severity)}22`, color: getSeverityColor(fb.analysis.severity) }}>
                          Sev {fb.analysis.severity}
                        </span>
                        <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
                          {timeAgo(fb.created_at)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
