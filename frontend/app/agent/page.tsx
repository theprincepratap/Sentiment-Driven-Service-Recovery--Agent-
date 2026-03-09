'use client';

import { useState, useEffect } from 'react';
import { Bot, Play, CheckCircle, AlertTriangle, ArrowRight, Zap, MessageSquare, Ticket, Bell, Star, ChevronDown, ChevronRight, RefreshCw, Sparkles, TrendingUp } from 'lucide-react';
import { getSeverityColor, formatCategory, timeAgo } from '@/lib/utils';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

const STEP_ICONS: Record<string, React.ElementType> = {
  agent_start: Bot,
  tool_call: Zap,
  tool_result: CheckCircle,
  agent_complete: CheckCircle,
  escalation: AlertTriangle,
  info: ArrowRight,
  mode: Bot,
  error: AlertTriangle,
};

const STEP_COLORS: Record<string, string> = {
  agent_start:    '#3b82f6',
  tool_call:      '#8b5cf6',
  tool_result:    '#10b981',
  agent_complete: '#10b981',
  escalation:     '#ef4444',
  info:           '#f59e0b',
  mode:           '#06b6d4',
  error:          '#ef4444',
};

const TOOL_COLORS: Record<string, string> = {
  get_discharged_patients: '#3b82f6',
  send_survey:             '#8b5cf6',
  get_survey_response:     '#06b6d4',
  analyze_sentiment:       '#f59e0b',
  create_crm_ticket:       '#ef4444',
  notify_duty_manager:     '#ef4444',
  send_resolution_message: '#10b981',
  send_review_nudge:       '#10b981',
};

function StepCard({ step, index }: { step: any; index: number }) {
  const [expanded, setExpanded] = useState(index < 3);
  const Icon = STEP_ICONS[step.step_type] || ArrowRight;
  const color = STEP_COLORS[step.step_type] || '#8da0b8';
  const toolColor = step.content?.tool ? TOOL_COLORS[step.content.tool] || color : color;
  const displayColor = step.step_type === 'tool_call' || step.step_type === 'tool_result' ? toolColor : color;

  const title = step.step_type === 'tool_call'
    ? `→ ${step.content?.tool?.replace(/_/g, ' ').toUpperCase()}`
    : step.step_type === 'tool_result'
    ? `← ${step.content?.tool?.replace(/_/g, ' ')} result`
    : step.step_type.replace(/_/g, ' ').toUpperCase();

  const preview = step.content?.message
    || step.content?.summary?.slice(0, 80)
    || (step.content?.args ? `Patient: ${step.content.args.patient_id || step.content.args.query_date || ''}` : '')
    || (step.content?.result?.patient_id ? `Patient: ${step.content.result.patient_id}` : '');

  return (
    <div className="animate-slide-in" style={{ animationDelay: `${index * 0.03}s` }}>
      <div
        className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all"
        onClick={() => setExpanded(!expanded)}
        style={{
          background: expanded ? `${displayColor}08` : 'transparent',
          border: `1px solid ${expanded ? displayColor + '30' : 'var(--border)'}`,
        }}
      >
        {/* Icon + connector line */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: `${displayColor}20` }}>
            <Icon size={14} style={{ color: displayColor }} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wide" style={{ color: displayColor }}>
              {title}
            </span>
            {step.step_type === 'escalation' && (
              <span className="text-xs px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                🚨 ESCALATED
              </span>
            )}
          </div>
          {!expanded && preview && (
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{preview}</p>
          )}
          {expanded && (
            <pre className="mt-2 text-xs rounded-lg p-3 overflow-x-auto leading-relaxed"
              style={{
                background: 'rgba(0,0,0,0.3)',
                color: '#8da0b8',
                border: '1px solid var(--border)',
                fontFamily: 'monospace',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
              {JSON.stringify(step.content, null, 2)}
            </pre>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {timeAgo(step.timestamp)}
          </span>
          {expanded ? <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />}
        </div>
      </div>
    </div>
  );
}

export default function AgentPage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState(true);

  // Check backend status on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/health`, { method: 'GET' });
        setBackendOnline(res.ok);
      } catch (e) {
        setBackendOnline(false);
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 5000);
    return () => clearInterval(interval);
  }, []);

  const runAgent = async () => {
    if (!backendOnline) {
      setError('Backend is offline. Make sure http://localhost:8000 is running.');
      return;
    }
    
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/agent/run`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Failed to run agent. Check backend connection.');
      setBackendOnline(false);
    } finally {
      setRunning(false);
    }
  };

  const summary = result?.summary;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
              <Sparkles size={16} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Service Recovery Agent
            </h1>
            <span className="text-xs px-2 py-1 rounded-lg font-mono"
              style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
              Gemini 3.1 AI
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Autonomous closed-loop patient feedback workflow
            </p>
            <span className={`text-xs px-2 py-1 rounded-lg flex items-center gap-1 ${backendOnline ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
              <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
              {backendOnline ? 'Backend Online' : 'Backend Offline'}
            </span>
          </div>
        </div>
        <button
          onClick={runAgent}
          disabled={running || !backendOnline}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 hover:shadow-lg"
          style={{
            background: running || !backendOnline ? 'rgba(59,130,246,0.2)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            color: 'white',
            border: 'none',
            cursor: running || !backendOnline ? 'not-allowed' : 'pointer',
          }}
        >
          {running ? (
            <>
              <RefreshCw size={15} className="animate-spin" />
              Agent Running...
            </>
          ) : backendOnline ? (
            <>
              <Play size={15} />
              Run Agent
            </>
          ) : (
            <>
              <AlertTriangle size={15} />
              Offline
            </>
          )}
        </button>
      </div>

      {/* Workflow diagram */}
      {!result && !running && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
              <Zap size={16} style={{ color: '#8b5cf6' }} />
              Workflow — 7 Tools, Closed Loop
            </h3>
            <div className="text-xs px-2 py-1 rounded-lg"
              style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
              ✨ Powered by Gemini 3.1 Flash
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs mb-4">
            {[
              { label: '1. get_discharged_patients', color: '#3b82f6' },
              { label: '2. send_survey', color: '#8b5cf6' },
              { label: '3. get_survey_response', color: '#06b6d4' },
              { label: '4. analyze_sentiment', color: '#f59e0b' },
            ].map(s => (
              <span key={s.label} className="px-2 py-1 rounded-lg font-mono"
                style={{ background: `${s.color}18`, color: s.color, border: `1px solid ${s.color}30` }}>
                {s.label}
              </span>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#ef4444' }}>🔴 Negative Sentiment</p>
              <div className="space-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <p>→ 5. create_crm_ticket (category + severity)</p>
                <p>→ 6. notify_duty_manager (15-min SLA)</p>
                <p>→ 7. send_resolution_message (personalized)</p>
                <p>⬆️ auto-escalate if 3+ same dept/week</p>
              </div>
            </div>
            <div className="p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#10b981' }}>🟢 Positive Sentiment</p>
              <div className="space-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <p>→ send_review_nudge</p>
                <p>   Google Review link via WhatsApp</p>
              </div>
              <p className="text-xs font-semibold mt-3 mb-1" style={{ color: '#f59e0b' }}>🟡 Neutral Sentiment</p>
              <div className="space-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <p>→ send_resolution_message (thank you)</p>
              </div>
            </div>
          </div>
          <div className="mt-4 text-xs px-3 py-2 rounded-lg"
            style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', color: 'var(--text-muted)' }}>
            📋 Demo data: 10 discharged patients · 5 survey responses (2 negative, 1 neutral, 2 positive) · 8 dept managers
          </div>
        </div>
      )}

      {/* Running indicator */}
      {running && (
        <div className="glass-card p-8 text-center">
          <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
            <Bot size={26} className="text-white animate-bounce" />
          </div>
          <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Agent is running...</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Processing discharge list → sending surveys → analyzing responses → creating tickets
          </p>
          <div className="flex justify-center gap-1 mt-4">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full" style={{ background: '#3b82f6', animation: `pulse-dot 1.4s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="glass-card p-5 flex items-start gap-3"
          style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
          <AlertTriangle size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
          <div className="flex-1">
            <p className="font-semibold text-sm" style={{ color: '#ef4444' }}>Agent Error</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{error}</p>
            <div className="mt-3 text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
              <p className="font-semibold">Quick Fix:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Ensure backend is running: <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'rgba(0,0,0,0.2)', fontFamily: 'monospace' }}>cd backend && uvicorn main:app --reload</code></li>
                <li>Check MongoDB is running on port 27017</li>
                <li>Verify Gemini API key in `.env`: <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'rgba(0,0,0,0.2)', fontFamily: 'monospace' }}>GOOGLE_API_KEY</code></li>
                <li>Frontend should reach backend at: <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'rgba(0,0,0,0.2)', fontFamily: 'monospace' }}>http://localhost:8000</code></li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Surveys Sent',     value: summary?.surveys_sent,       color: '#8b5cf6', icon: MessageSquare },
              { label: 'Responses',        value: summary?.responses_received,  color: '#06b6d4', icon: MessageSquare },
              { label: 'Tickets Created',  value: summary?.tickets_created,     color: '#ef4444', icon: Ticket },
              { label: 'Manager Alerts',   value: summary?.manager_alerts_sent, color: '#f59e0b', icon: Bell },
              { label: 'Messages Sent',    value: summary?.messages_sent,       color: '#10b981', icon: MessageSquare },
              { label: 'Escalations',      value: summary?.escalations,         color: '#ef4444', icon: AlertTriangle },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="glass-card p-4 text-center">
                <Icon size={16} className="mx-auto mb-1.5" style={{ color }} />
                <div className="text-xl font-bold" style={{ color }}>{value ?? 0}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Tickets & Escalations */}
          {summary?.crm_tickets?.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
                🎫 Created CRM Tickets
              </h3>
              <div className="space-y-2">
                {summary.crm_tickets.map((t: any) => (
                  <div key={t.ticket_id} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <div>
                      <span className="font-mono text-xs font-bold" style={{ color: '#ef4444' }}>{t.ticket_id}</span>
                      {t.auto_escalated && <span className="ml-2 text-xs" style={{ color: '#8b5cf6' }}>⬆️ Auto-Escalated</span>}
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.patient_name}</span>
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: `${getSeverityColor(t.severity)}22`, color: getSeverityColor(t.severity) }}>
                      {formatCategory(t.category)} · Sev {t.severity}
                    </span>
                    <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>{t.department}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {summary?.escalation_details?.length > 0 && (
            <div className="glass-card p-5" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#ef4444' }}>
                <AlertTriangle size={15} /> Auto-Escalation Triggered
              </h3>
              {summary.escalation_details.map((e: any, i: number) => (
                <div key={i} className="p-3 rounded-xl text-xs"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <p style={{ color: '#ef4444' }}>{e.message}</p>
                  <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
                    Notified: {e.dept_head} ({e.dept_head_email})
                  </p>
                  <p style={{ color: 'var(--text-muted)' }}>
                    Total complaints this week: {e.total_complaints}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Execution Trace */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Execution Trace ({result.steps?.length} steps · {result.duration_seconds}s)
              </h3>
              <span className="text-xs px-2 py-1 rounded"
                style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                ✅ Completed
              </span>
            </div>
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {result.steps?.map((step: any, i: number) => (
                <StepCard key={i} step={step} index={i} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
