const API_BASE = 'http://localhost:5000/api';

export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('hrms_token');
  }
  return null;
}

export function setAuthToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('hrms_token', token);
  }
}

export function clearAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('hrms_token');
    localStorage.removeItem('hrms_user');
  }
}

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

export const api = {
  // Auth
  registerOrg: (data: any) => apiFetch('/auth/register-org', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: any) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => apiFetch('/auth/me'),
  logout: () => apiFetch('/auth/logout', { method: 'POST' }),

  // Employees
  getEmployees: (reveal = false, department = '') =>
    apiFetch(`/employees?reveal=${reveal}${department ? `&department=${department}` : ''}`),
  getEmployee: (id: string, reveal = false) => apiFetch(`/employees/${id}?reveal=${reveal}`),
  createEmployee: (data: any) => apiFetch('/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id: string, data: any) => apiFetch(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getHierarchyTree: () => apiFetch('/employees/hierarchy/tree'),
  getExpiringDocuments: () => apiFetch('/employees/documents/expiring'),

  // Attendance
  generateQR: () => apiFetch('/attendance/generate-qr'),
  checkIn: (data: any) => apiFetch('/attendance/check-in', { method: 'POST', body: JSON.stringify(data) }),
  checkOut: (data: any) => apiFetch('/attendance/check-out', { method: 'POST', body: JSON.stringify(data) }),
  getTodayAttendance: (employeeId?: string) =>
    apiFetch(`/attendance/today${employeeId ? `?employeeId=${employeeId}` : ''}`),
  getAttendanceHistory: (startDate?: string, endDate?: string) =>
    apiFetch(`/attendance/history${startDate ? `?startDate=${startDate}&endDate=${endDate}` : ''}`),

  // Leave
  getMyLeaveBalances: (employeeId?: string) =>
    apiFetch(`/leave/my-balances${employeeId ? `?employeeId=${employeeId}` : ''}`),
  applyLeave: (data: any) => apiFetch('/leave/apply', { method: 'POST', body: JSON.stringify(data) }),
  getLeaveRequests: (status?: string) => apiFetch(`/leave/requests${status ? `?status=${status}` : ''}`),
  reviewLeaveRequest: (id: string, decision: 'Approved' | 'Rejected', comments?: string) =>
    apiFetch(`/leave/requests/${id}/review`, { method: 'POST', body: JSON.stringify({ decision, comments }) }),

  // Payroll
  executePayrollRun: (month: number, year: number) =>
    apiFetch('/payroll/run', { method: 'POST', body: JSON.stringify({ month, year }) }),
  getPayrollRuns: () => apiFetch('/payroll/runs'),
  getRunPayslips: (runId: string) => apiFetch(`/payroll/runs/${runId}/payslips`),
  getMyPayslips: () => apiFetch('/payroll/my-payslips'),
  getPdfUrl: (payslipId: string) => `${API_BASE}/payroll/payslips/${payslipId}/pdf`,
  getSlipsUrl: (runId: string) => `${API_BASE}/payroll/runs/${runId}/slips-export`,

  // Lifecycle
  getAssets: () => apiFetch('/lifecycle/assets'),
  registerAsset: (data: any) => apiFetch('/lifecycle/assets', { method: 'POST', body: JSON.stringify(data) }),
  allocateAsset: (id: string, employeeId: string) =>
    apiFetch(`/lifecycle/assets/${id}/allocate`, { method: 'POST', body: JSON.stringify({ employeeId }) }),
  returnAsset: (id: string, condition: string) =>
    apiFetch(`/lifecycle/assets/${id}/return`, { method: 'POST', body: JSON.stringify({ condition }) }),
  getOnboarding: (employeeId: string) => apiFetch(`/lifecycle/onboarding/${employeeId}`),
  completeOnboardingTask: (employeeId: string, taskId: string) =>
    apiFetch(`/lifecycle/onboarding/${employeeId}/complete-task`, { method: 'POST', body: JSON.stringify({ taskId }) }),
  resign: (data: any) => apiFetch('/lifecycle/offboarding/resign', { method: 'POST', body: JSON.stringify(data) }),
  getOffboardings: () => apiFetch('/lifecycle/offboarding'),
  clearITGate: (id: string, notes?: string) =>
    apiFetch(`/lifecycle/offboarding/${id}/it-gate`, { method: 'POST', body: JSON.stringify({ notes }) }),
  clearFinanceGate: (id: string, notes?: string) =>
    apiFetch(`/lifecycle/offboarding/${id}/finance-gate`, { method: 'POST', body: JSON.stringify({ notes }) }),
  clearHRGate: (id: string, notes?: string) =>
    apiFetch(`/lifecycle/offboarding/${id}/hr-gate`, { method: 'POST', body: JSON.stringify({ notes }) }),

  // RAG Assistant
  askPolicyAssistant: (question: string) => apiFetch('/rag/ask', { method: 'POST', body: JSON.stringify({ question }) }),
  getPolicyList: () => apiFetch('/rag/policies'),

  // Audit
  getAuditLogs: (limit = 50) => apiFetch(`/audit?limit=${limit}`),
};
