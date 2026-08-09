import { auth } from "./firebaseClient";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

// Fetches a token fresh on every call instead of relying on a passively
// cached one. getIdToken() checks the token's local expiry and transparently
// refreshes over the network when it's stale -- previously a single token
// was cached once at sign-in and only updated by Firebase's own background
// refresh timer, which browsers can throttle/skip on a backgrounded or
// long-idle tab. That let an expired token sit in memory for the rest of the
// session, so a request made after the form had been open for a while (e.g.
// clicking Export) could 401 with "Not authenticated" even though the user
// was still properly signed in.
export async function ensureFreshToken() {
  return auth.currentUser ? auth.currentUser.getIdToken() : null;
}

async function authHeaders() {
  const token = await ensureFreshToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function json(resp) {
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`${resp.status}: ${text}`);
  }
  return resp.json();
}

export const api = {
  createProject: async (body) =>
    fetch(`${API_BASE}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(body),
    }).then(json),

  listProjects: async () => fetch(`${API_BASE}/projects`, { headers: await authHeaders() }).then(json),

  getProject: async (id) => fetch(`${API_BASE}/projects/${id}`, { headers: await authHeaders() }).then(json),

  updateProject: async (id, body) =>
    fetch(`${API_BASE}/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(body),
    }).then(json),

  uploadField: async (id, field, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${API_BASE}/projects/${id}/uploads?field=${encodeURIComponent(field)}`, {
      method: "POST",
      headers: await authHeaders(),
      body: fd,
    }).then(json);
  },

  generateSlide19: async (id, promptTemplate) =>
    fetch(`${API_BASE}/projects/${id}/slide19/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ prompt_template: promptTemplate }),
    }).then(json),

  uploadSlide19Fallback: async (id, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${API_BASE}/projects/${id}/slide19/upload`, { method: "POST", headers: await authHeaders(), body: fd }).then(json);
  },

  slide21Draft: async (id) => fetch(`${API_BASE}/projects/${id}/slide21/draft`, { headers: await authHeaders() }).then(json),

  analyzePowerLog: async (id, field, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${API_BASE}/projects/${id}/analyze-power-log?field=${encodeURIComponent(field)}`, {
      method: "POST", headers: await authHeaders(), body: fd,
    }).then(json);
  },

  fetchMapImage: async (id, lat, lng) =>
    fetch(`${API_BASE}/projects/${id}/fetch-map-image?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`, {
      method: "POST", headers: await authHeaders(),
    }).then(json),

  previewFlowchartUrl: (id) => `${API_BASE}/projects/${id}/slide20/preview?t=${Date.now()}`,

  exportProject: async (id, format = "pptx") => {
    const token = await ensureFreshToken();
    const resp = await fetch(`${API_BASE}/projects/${id}/export?format=${encodeURIComponent(format)}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`${resp.status}: ${text}`);
    }
    const disposition = resp.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : `proposal.${format}`;
    const blob = await resp.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  // storage.url_for() on the backend already returns a full Firebase Storage
  // URL -- only relative paths need the API_BASE prefix.
  fileUrl: (path) => {
    if (!path) return null;
    return /^https?:\/\//i.test(path) ? path : `${API_BASE}${path}`;
  },

  deleteProject: async (id) =>
    fetch(`${API_BASE}/projects/${id}`, { method: "DELETE", headers: await authHeaders() }).then(json),

  // ---- auth ----
  me: async () => fetch(`${API_BASE}/admin/me`, { headers: await authHeaders() }).then(json),
  logout: async () => fetch(`${API_BASE}/admin/logout`, { method: "POST", headers: await authHeaders() }).then(json),

  // ---- system logs ----
  listLogs: async ({ limit = 20, cursor = null, from = null, to = null } = {}) => {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    if (cursor) params.set("cursor", cursor);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return fetch(`${API_BASE}/admin/logs?${params.toString()}`, { headers: await authHeaders() }).then(json);
  },
  exportLogsPdf: async ({ from = null, to = null } = {}) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const token = await ensureFreshToken();
    const resp = await fetch(`${API_BASE}/admin/logs/export.pdf?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`${resp.status}: ${text}`);
    }
    const blob = await resp.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "system-logs.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  // ---- clients ----
  listClients: async () => fetch(`${API_BASE}/clients`, { headers: await authHeaders() }).then(json),
  getClient: async (id) => fetch(`${API_BASE}/clients/${id}`, { headers: await authHeaders() }).then(json),
  createClient: async (body) =>
    fetch(`${API_BASE}/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(body),
    }).then(json),
  updateClient: async (id, body) =>
    fetch(`${API_BASE}/clients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(body),
    }).then(json),
  deleteClient: async (id) =>
    fetch(`${API_BASE}/clients/${id}`, { method: "DELETE", headers: await authHeaders() }).then(json),

  // ---- users (admin only) ----
  listUsers: async () => fetch(`${API_BASE}/users`, { headers: await authHeaders() }).then(json),
  createUser: async (body) =>
    fetch(`${API_BASE}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(body),
    }).then(json),
  updateUser: async (id, body) =>
    fetch(`${API_BASE}/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(body),
    }).then(json),
  deleteUser: async (id) =>
    fetch(`${API_BASE}/users/${id}`, { method: "DELETE", headers: await authHeaders() }).then(json),

  // ---- admin: products & boilerplate ----
  listProductsAll: async () => fetch(`${API_BASE}/admin/products`).then(json),

  listPptxThemes: async () => fetch(`${API_BASE}/admin/pptx-themes`).then(json),

  createProduct: async (token, body) =>
    fetch(`${API_BASE}/admin/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(body),
    }).then(json),

  updateProduct: async (token, id, body) =>
    fetch(`${API_BASE}/admin/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(body),
    }).then(json),

  deleteProduct: async (token, id) =>
    fetch(`${API_BASE}/admin/products/${id}`, {
      method: "DELETE",
      headers: await authHeaders(),
    }).then(json),

  uploadProductImage: async (token, id, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${API_BASE}/admin/products/${id}/image`, {
      method: "POST",
      headers: await authHeaders(),
      body: fd,
    }).then(json);
  },

  getBoilerplate: async (key) => fetch(`${API_BASE}/admin/boilerplate/${key}`).then(json),

  putBoilerplate: async (token, key, value) =>
    fetch(`${API_BASE}/admin/boilerplate/${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(value),
    }).then(json),
};

export default API_BASE;
