const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const TOKEN_KEY = "zarni_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
function authHeaders() {
  const token = getToken();
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
  createProject: (body) =>
    fetch(`${API_BASE}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    }).then(json),

  listProjects: () => fetch(`${API_BASE}/projects`, { headers: authHeaders() }).then(json),

  getProject: (id) => fetch(`${API_BASE}/projects/${id}`, { headers: authHeaders() }).then(json),

  updateProject: (id, body) =>
    fetch(`${API_BASE}/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    }).then(json),

  uploadField: (id, field, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${API_BASE}/projects/${id}/uploads?field=${encodeURIComponent(field)}`, {
      method: "POST",
      headers: authHeaders(),
      body: fd,
    }).then(json);
  },

  generateSlide19: (id, promptTemplate) =>
    fetch(`${API_BASE}/projects/${id}/slide19/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ prompt_template: promptTemplate }),
    }).then(json),

  uploadSlide19Fallback: (id, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${API_BASE}/projects/${id}/slide19/upload`, { method: "POST", headers: authHeaders(), body: fd }).then(json);
  },

  slide21Draft: (id) => fetch(`${API_BASE}/projects/${id}/slide21/draft`, { headers: authHeaders() }).then(json),

  analyzeConsumption: (id, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${API_BASE}/projects/${id}/analyze-consumption`, { method: "POST", headers: authHeaders(), body: fd }).then(json);
  },

  previewFlowchartUrl: (id) => `${API_BASE}/projects/${id}/slide20/preview?t=${Date.now()}`,

  exportProject: async (id) => {
    const resp = await fetch(`${API_BASE}/projects/${id}/export`, { method: "POST", headers: authHeaders() });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`${resp.status}: ${text}`);
    }
    const disposition = resp.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : "proposal.pptx";
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

  fileUrl: (path) => (path ? `${API_BASE}${path}` : null),

  deleteProject: (id) =>
    fetch(`${API_BASE}/projects/${id}`, { method: "DELETE", headers: authHeaders() }).then(json),

  // ---- auth ----
  login: (email, password) =>
    fetch(`${API_BASE}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then(json).then((r) => {
      setToken(r.token);
      return r;
    }),

  me: () => fetch(`${API_BASE}/admin/me`, { headers: authHeaders() }).then(json),

  // ---- clients ----
  listClients: () => fetch(`${API_BASE}/clients`, { headers: authHeaders() }).then(json),
  getClient: (id) => fetch(`${API_BASE}/clients/${id}`, { headers: authHeaders() }).then(json),
  createClient: (body) =>
    fetch(`${API_BASE}/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    }).then(json),
  updateClient: (id, body) =>
    fetch(`${API_BASE}/clients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    }).then(json),
  deleteClient: (id) =>
    fetch(`${API_BASE}/clients/${id}`, { method: "DELETE", headers: authHeaders() }).then(json),

  // ---- users (admin only) ----
  listUsers: () => fetch(`${API_BASE}/users`, { headers: authHeaders() }).then(json),
  createUser: (body) =>
    fetch(`${API_BASE}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    }).then(json),
  updateUser: (id, body) =>
    fetch(`${API_BASE}/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    }).then(json),
  deleteUser: (id) =>
    fetch(`${API_BASE}/users/${id}`, { method: "DELETE", headers: authHeaders() }).then(json),

  // ---- admin: products & boilerplate ----
  listProductsAll: () => fetch(`${API_BASE}/admin/products`).then(json),

  createProduct: (token, body) =>
    fetch(`${API_BASE}/admin/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    }).then(json),

  updateProduct: (token, id, body) =>
    fetch(`${API_BASE}/admin/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    }).then(json),

  deleteProduct: (token, id) =>
    fetch(`${API_BASE}/admin/products/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    }).then(json),

  uploadProductImage: (token, id, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${API_BASE}/admin/products/${id}/image`, {
      method: "POST",
      headers: authHeaders(),
      body: fd,
    }).then(json);
  },

  getBoilerplate: (key) => fetch(`${API_BASE}/admin/boilerplate/${key}`).then(json),

  putBoilerplate: (token, key, value) =>
    fetch(`${API_BASE}/admin/boilerplate/${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(value),
    }).then(json),
};

export default API_BASE;
