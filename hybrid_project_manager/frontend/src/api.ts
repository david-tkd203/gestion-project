const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('access_token');
}

export function isAuthed(): boolean {
  return !!getToken();
}

export function logout() {
  localStorage.removeItem('access_token');
  window.location.href = '/login';
}

async function request<T>(url: string, opts?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { ...(opts?.headers as any) || {} };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(opts?.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const res = await fetch(BASE + url, { ...opts, headers });
  if (res.status === 401) { logout(); throw new Error('Sesión expirada'); }
  if (!res.ok) {
    const text = await res.text().catch(() => 'Error');
    throw new Error(text.slice(0, 300));
  }
  return res.json();
}

// ─── Auth ───
export const login = (user: string, pass: string) =>
  request<{ access: string; refresh: string }>('/token/', {
    method: 'POST',
    body: JSON.stringify({ username: user, password: pass }),
  });

// ─── Proyectos ───
export const getProyectos = () =>
  request<{ results: any[]; count: number }>('/proyectos/').then(r => r.results);

export const createProyecto = (nombre: string) =>
  request<any>('/proyectos/', { method: 'POST', body: JSON.stringify({ nombre }) });

export const importExcel = (proyectoId: string, file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  return request<any>(`/proyectos/${proyectoId}/import-excel/`, { method: 'POST', body: fd });
};

// ─── Sprints ───
export const getSprints = (proyectoId?: string) =>
  request<any[]>('/sprints/' + (proyectoId ? `?proyecto=${proyectoId}` : ''))
    .then((r: any) => r.results || r);

export const getSprintStatus = (id: string) =>
  request<any>(`/dashboard/sprint-status/${id}/`);

// ─── Tareas ───
export const getTareas = (params?: string) =>
  request<any>('/tareas/' + (params || '')).then((r: any) => r.results || r);

export const updateTareaStatus = (id: string, status: string) =>
  request<any>(`/tareas/${id}/status/`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

// ─── Gantt ───
export const getProyectoGantt = (id: string) =>
  request<any>(`/gantt/proyecto/${id}/`);

export const getCriticalPath = (id: string) =>
  request<any>(`/gantt/critical-path/${id}/`);

// ─── Me ───
export interface MeUser {
  id: string;
  username: string;
  nombre_completo: string;
  role: 'director' | 'arquitecto' | 'lector';
  is_admin: boolean;
}

export const getMe = () => request<MeUser>('/me/');

// ─── Tarea detail & actions ───
export const getTareaDetail = (id: string) => request<any>(`/tareas/${id}/`);

export const blockTarea = (id: string, reason: string) =>
  request<any>(`/tareas/${id}/block/`, {
    method: 'POST',
    body: JSON.stringify({ blocked_reason: reason }),
  });

export const unblockTarea = (id: string) =>
  request<any>(`/tareas/${id}/unblock/`, { method: 'POST' });

export const updateCriterios = (id: string, criterios: any[]) =>
  request<any>(`/tareas/${id}/criterios/`, {
    method: 'PATCH',
    body: JSON.stringify({ criterios_aceptacion: criterios }),
  });

export const updateTarea = (id: string, data: Record<string, any>) =>
  request<any>(`/tareas/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

// ─── GitHub ───
export const getGithubConnection = (proyectoId: string) =>
  request<any>(`/github/connections/?proyecto=${proyectoId}`)
    .then((r: any) => r.results?.[0] || null);

export const createGithubConnection = (data: {
  proyecto: string;
  repo_owner: string;
  repo_name: string;
  access_token: string;
}) => request<any>('/github/connections/', {
  method: 'POST',
  body: JSON.stringify(data),
});

export const deleteGithubConnection = (id: string) =>
  request<any>(`/github/connections/${id}/`, { method: 'DELETE' });

export const triggerSync = (id: string) =>
  request<any>(`/github/connections/${id}/sync/`, { method: 'POST' });

export const getBranches = (connectionId: string) =>
  request<any>(`/github/branches/?connection=${connectionId}`)
    .then((r: any) => r.results || r);

export const updateBranch = (id: string, data: { area: string | null }) =>
  request<any>(`/github/branches/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const getCommits = (connectionId: string, params?: string) =>
  request<any>(`/github/commits/?branch__connection=${connectionId}${params || ''}`)
    .then((r: any) => r.results || r);

export const getAlerts = (connectionId: string, params?: string) =>
  request<any>(`/github/alerts/?connection=${connectionId}${params || ''}`)
    .then((r: any) => r.results || r);

export const getAreas = () =>
  request<any>('/areas/').then((r: any) => r.results || r);
