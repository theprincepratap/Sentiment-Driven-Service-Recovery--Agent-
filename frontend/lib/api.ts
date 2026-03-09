const API = process.env.NEXT_PUBLIC_API_URL;

export const apiGet = async (path: string) => {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed`);
  return res.json();
};

export const apiPost = async (path: string, body: any) => {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed`);
  return res.json();
};

export const apiPatch = async (path: string, body?: any) => {
  const res = await fetch(`${API}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`PATCH ${path} failed`);
  return res.json();
};

// Patient APIs
export const getPatients = () => apiGet("/api/patients");
export const getDischargedPatients = () => apiGet("/api/patients/discharged");
export const updateBillingStatus = (patientId: string, billingStatus: string) =>
  apiPatch(`/api/patients/${patientId}/billing`, { billingStatus });

// Feedback APIs
export const submitFeedback = (data: {
  patientId: string;
  patientName: string;
  department: string;
  rawText: string;
}) => apiPost("/api/feedback/submit", data);
export const getFeedbacks = () => apiGet("/api/feedback/list");

// Ticket APIs
export const getTickets = (status?: string) =>
  apiGet(`/api/tickets${status ? `?status=${status}` : ""}`);
export const updateTicket = (ticketId: string, status: string, resolutionNote?: string) =>
  apiPatch(`/api/tickets/${ticketId}`, { status, resolutionNote });

// Notification APIs
export const getNotifications = () => apiGet("/api/notifications");
export const markNotificationRead = (id: string) =>
  apiPatch(`/api/notifications/${id}/read`);
export const markAllRead = () => apiPatch("/api/notifications/read-all");

// Analytics APIs
export const getSummary = () => apiGet("/api/analytics/summary");
export const getWeeklyReport = () => apiGet("/api/analytics/weekly");

// Heatmap API
export const getHeatmap = () => apiGet("/api/heatmap");