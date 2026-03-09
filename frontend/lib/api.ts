const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Dashboard
  getDashboardStats: () => apiFetch('/api/dashboard/stats'),

  // Feedback
  submitFeedback: (data: { patient_id: string; department: string; text: string; name?: string }) =>
    apiFetch('/api/feedback', { method: 'POST', body: JSON.stringify(data) }),
  getFeedback: (limit = 50, department?: string) =>
    apiFetch(`/api/feedback?limit=${limit}${department ? `&department=${department}` : ''}`),

  // Tickets
  getTickets: (params?: { status?: string; department?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.department) q.set('department', params.department);
    if (params?.limit) q.set('limit', String(params.limit));
    return apiFetch(`/api/tickets?${q}`);
  },
  resolveTicket: (ticketId: string, notes?: string) =>
    apiFetch(`/api/tickets/${ticketId}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ resolution_notes: notes }),
    }),
  updateTicketStatus: (ticketId: string, status: string) =>
    apiFetch(`/api/tickets/${ticketId}/status?status=${status}`, { method: 'PATCH' }),

  // Departments / Heatmap
  getDepartmentHeatmap: () => apiFetch('/api/departments/heatmap'),
  getDepartments: () => apiFetch('/api/departments'),

  // Notifications
  getNotifications: (unreadOnly = false) =>
    apiFetch(`/api/managers/notifications?unread_only=${unreadOnly}`),
  markNotificationRead: (id: string) =>
    apiFetch(`/api/managers/notifications/${id}/read`, { method: 'PATCH' }),

  // Reports
  getWeeklyReport: () => apiFetch('/api/reports/weekly'),

  // Patients
  dischargePatient: (data: { patient_id: string; name: string; department: string; phone?: string; email?: string }) =>
    apiFetch('/api/patients/discharge', { method: 'POST', body: JSON.stringify(data) }),
};
