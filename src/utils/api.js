const API_ROOT =
  import.meta.env.VITE_API_BASE ||
  "https://nexushub-backend-production.up.railway.app";

const API_BASE = `${API_ROOT}/api`;

const TOKEN_KEY = "nexushub_token";
const USER_KEY = "nexushub_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function refreshToken() {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  if (data.accessToken) {
    setToken(data.accessToken);
    return data.accessToken;
  }
  return null;
}

async function request(endpoint, options = {}) {
  const token = getToken();

  const buildConfig = (accessToken) => ({
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      ...options.headers,
    },
  });

  let response = await fetch(`${API_BASE}${endpoint}`, buildConfig(token));

  if (response.status === 401 && !endpoint.includes("/auth/")) {
    const newToken = await refreshToken();
    if (newToken) {
      response = await fetch(`${API_BASE}${endpoint}`, buildConfig(newToken));
    } else {
      clearSession();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  }

  return response;
}

export const api = {
  get: (endpoint) => request(endpoint, { method: "GET" }),
  post: (endpoint, data) =>
    request(endpoint, {
      method: "POST",
      ...(data !== undefined && { body: JSON.stringify(data) }),
    }),
  put: (endpoint, data) =>
    request(endpoint, { method: "PUT", body: JSON.stringify(data) }),
  patch: (endpoint, data) =>
    request(endpoint, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (endpoint, data) =>
    request(endpoint, {
      method: "DELETE",
      ...(data !== undefined && { body: JSON.stringify(data) }),
    }),
};

export function getApiBase() {
  return API_BASE;
}

// Pull the server's own message off a failed response so the UI can show it
// instead of a generic "request failed" string.
export async function readError(response, fallback = "Request failed") {
  try {
    const data = await response.json();
    return data.error || data.message || fallback;
  } catch {
    return fallback;
  }
}

export function formatDate(dateString) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(dateString);
}
