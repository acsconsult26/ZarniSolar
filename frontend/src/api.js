import { onIdTokenChanged } from "firebase/auth";
import { auth } from "./firebaseClient";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

// Firebase ID tokens are fetched async, but most call sites here build headers
// synchronously -- so cache the latest token and keep it fresh via the SDK's
// own onIdTokenChanged (fires on sign-in/out and automatic token refresh).
let currentToken = null;
onIdTokenChanged(auth, async (user) => {
  currentToken = user ? await user.getIdToken() : null;
});

// Call this before the first request after a sign-in state change (e.g. right
// after onAuthStateChanged fires) -- onIdTokenChanged above is async, so
// currentToken can otherwise still be stale/null for a brief window.
export async function ensureFreshToken() {
  currentToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
}

function authHeaders() {
  return currentToken ? { Authorization: `Bearer ${currentToken}` } : {};
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

  // storage.url_for() on the backend already returns a full Firebase Storage
  // URL -- only relative paths need the API_BASE prefix.
  fileUrl: (path) => {
    if (!path) return null;
    return /^https?:\/\//i.test(path) ? path : `${API_BASE}${path}`;
  },

  deleteProject: (id) =>
    fetch(`${API_BASE}/projects/${id}`, { method: "DELETE", headers: authHeaders() }).then(json),

  // ---- auth ----
  me: () => fetch(`${API_BASE}/admin/me`, { headers: authHeaders() }).then(json),
  logout: () => fetch(`${API_BASE}/admin/logout`, { method: "POST", headers: authHeaders() }).then(json),

  // ---- system logs ----
  listLogs: () => fetch(`${API_BASE}/admin/logs`, { headers: authHeaders() }).then(json),

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
