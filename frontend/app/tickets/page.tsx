'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useWebSocketContext } from '@/components/WSProvider';
import { getSeverityColor, getSeverityLabel, formatCategory, timeAgo } from '@/lib/utils';
import { CheckCircle, Clock, AlertTriangle, Filter, RefreshCw, Ticket, ChevronDown } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: '#f59e0b' },
  in_progress: { label: 'In Progress', color: '#3b82f6' },
  resolved: { label: 'Resolved', color: '#10b981' },
  escalated: { label: 'Escalated', color: '#8b5cf6' },
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [resolving, setResolving] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { events } = useWebSocketContext();

  const loadTickets = useCallback(async () => {
    try {
      const data = await api.getTickets({ limit: 100 });
      setTickets(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  useEffect(() => {
    if (events.length > 0 && ['new_ticket', 'ticket_resolved', 'ticket_updated'].includes(events[0].event_type)) {
      setTimeout(loadTickets, 800);
    }
  }, [events, loadTickets]);

  const handleResolve = async (ticketId: string) => {
    setResolving(ticketId);
    try {
      await api.resolveTicket(ticketId, 'Resolved by manager via dashboard');
      await loadTickets();
    } catch (e) { console.error(e); }
    finally { setResolving(null); }
  };

  const filtered = tickets.filter(t =>
    !filter || t.status === filter
  );

  const counts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Complaint Tickets</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Manage and resolve patient complaint tickets
          </p>
        </div>
        <button onClick={loadTickets} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
          <RefreshCw size={16} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: '', label: `All (${counts.all})` },
          { key: 'open', label: `Open (${counts.open})` },
          { key: 'in_progress', label: `In Progress (${counts.in_progress})` },
          { key: 'resolved', label: `Resolved (${counts.resolved})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={filter === key ? {
              background: 'rgba(59,130,246,0.2)',
              color: '#3b82f6',
              border: '1px solid rgba(59,130,246,0.4)'
            } : {
              background: 'transparent',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)'
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Ticket List */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th className="text-left">Ticket ID</th>
                <th className="text-left">Patient / Dept</th>
                <th className="text-left">Category</th>
                <th className="text-left">Severity</th>
                <th className="text-left">Status</th>
                <th className="text-left">Created</th>
                <th className="text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j}>
                        <div className="h-4 rounded animate-pulse"
                          style={{ background: 'rgba(17,24,39,0.5)', width: '80%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>
                    No tickets found
                  </td>
                </tr>
              ) : (
                filtered.map((ticket) => {
                  const isExpanded = expandedId === ticket.ticket_id;
                  const sev = STATUS_CONFIG[ticket.status];
                  return (
                    <>
                      <tr key={ticket.ticket_id}
                        onClick={() => setExpandedId(isExpanded ? null : ticket.ticket_id)}
                        className="cursor-pointer"
                        style={{ borderLeft: ticket.severity >= 4 ? `3px solid ${getSeverityColor(ticket.severity)}` : '3px solid transparent' }}>
                        <td>
                          <span className="font-mono text-xs font-medium" style={{ color: '#3b82f6' }}>
                            {ticket.ticket_id}
                          </span>
                          {ticket.escalated && (
                            <span className="ml-1 text-xs" style={{ color: '#8b5cf6' }}>⬆️</span>
                          )}
                        </td>
                        <td>
                          <div className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>
                            {ticket.patient_name}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{ticket.department}</div>
                        </td>
                        <td>
                          <span className="text-xs">{formatCategory(ticket.category)}</span>
                        </td>
                        <td>
                          <span className={`severity-${ticket.severity} text-xs px-2 py-0.5 rounded-full border font-medium`}>
                            {getSeverityLabel(ticket.severity)} ({ticket.severity})
                          </span>
                        </td>
                        <td>
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: `${sev?.color}22`, color: sev?.color, border: `1px solid ${sev?.color}44` }}>
                            {sev?.label || ticket.status}
                          </span>
                        </td>
                        <td className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {timeAgo(ticket.created_at)}
                        </td>
                        <td>
                          {ticket.status !== 'resolved' && (
                            <button
                              onClick={e => { e.stopPropagation(); handleResolve(ticket.ticket_id); }}
                              disabled={resolving === ticket.ticket_id}
                              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium transition-all disabled:opacity-50"
                              style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                              <CheckCircle size={12} />
                              {resolving === ticket.ticket_id ? '...' : 'Resolve'}
                            </button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${ticket.ticket_id}-expanded`}>
                          <td colSpan={7} className="px-4 py-3" style={{ background: 'rgba(17,24,39,0.4)' }}>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <p className="font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Original Feedback</p>
                                <p className="italic" style={{ color: 'var(--text-secondary)' }}>"{ticket.original_feedback}"</p>
                              </div>
                              <div>
                                <p className="font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Resolution Message</p>
                                <p style={{ color: 'var(--text-secondary)' }}>{ticket.resolution_message}</p>
                                <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
                                  Assigned to: <span style={{ color: '#3b82f6' }}>{ticket.assigned_manager}</span>
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
