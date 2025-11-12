const clean = (value) => (typeof value === "string" ? value.trim() : "");

const base = clean(import.meta.env.VITE_ADMIN_API_BASE_URL || "");
const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;

export const ADMIN_API_READY = Boolean(normalizedBase);

const ensurePath = (path) => {
  if (!path) {
    throw new Error("Admin API path is required.");
  }
  return path.startsWith("/") ? path : `/${path}`;
};

const requestAdminApi = async (path, { method = "GET", body } = {}) => {
  if (!ADMIN_API_READY) {
    throw new Error(
      "Admin API base URL is missing. Set VITE_ADMIN_API_BASE_URL in your .env file and restart the dev server."
    );
  }

  const url = `${normalizedBase}${ensurePath(path)}`;
  const options = { method };

  if (body !== undefined) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      console.error("Admin API returned non-JSON payload:", text);
      throw new Error(
        `Admin API at ${url} did not return JSON (status ${response.status}). Check that the backend server is running and returning JSON.`
      );
    }
  }

  if (!response.ok) {
    const errorMessage = data?.message || data?.error || `Request failed (${response.status}).`;
    throw new Error(errorMessage);
  }

  return data;
};

export function callAdminApi(path, payload = {}) {
  return requestAdminApi(path, { method: "POST", body: payload });
}

export function fetchAdminData(path) {
  return requestAdminApi(path, { method: "GET" });
}
