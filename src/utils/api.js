const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://reddit-backend-production-e0ba.up.railway.app/api/v1";

async function request(endpoint, options = {}) {
  const token = localStorage.getItem("reddit_token");

  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (response.status === 401 && !endpoint.includes("/auth/token/refresh")) {
    const refresh = localStorage.getItem("reddit_refresh");
    if (refresh) {
      const refreshResponse = await fetch(`${API_BASE}/auth/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        localStorage.setItem("reddit_token", data.access);
        if (data.refresh) {
          localStorage.setItem("reddit_refresh", data.refresh);
        }

        config.headers.Authorization = `Bearer ${data.access}`;
        return fetch(`${API_BASE}${endpoint}`, config);
      } else {
        localStorage.removeItem("reddit_token");
        localStorage.removeItem("reddit_refresh");
        localStorage.removeItem("reddit_user");
        window.location.href = "/login";
      }
    }
  }

  return response;
}

export const api = {
  get: (endpoint) => request(endpoint, { method: "GET" }),
  post: (endpoint, data) =>
    request(endpoint, { method: "POST", body: JSON.stringify(data) }),
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
