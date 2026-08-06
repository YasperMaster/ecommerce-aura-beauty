import axios from "axios";

const API_BASE_URL = (
  import.meta.env.VITE_BACKEND_URL || "http://localhost:3001/api/v1"
).replace(/\/$/, "");

const defaultConfig = {
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
};

export const publicApi = axios.create({
  ...defaultConfig,
  withCredentials: false,
});

export const authApi = axios.create({
  ...defaultConfig,
  withCredentials: true,
});

// ============================================================================
// CSRF Token Management
// ============================================================================
// The backend uses double-submit cookie CSRF protection. On app startup,
// we fetch a CSRF token from the backend which sets a `csrf-token` cookie.
// We then read that cookie and include the token in the `X-CSRF-Token`
// header on all state-changing (POST/PUT/PATCH/DELETE) requests.

let csrfToken = null;
let csrfTokenPromise = null;

/**
 * Reads a cookie value by name from document.cookie.
 * @param {string} name - The cookie name to look up.
 * @returns {string|null} The cookie value, or null if not found.
 */
const getCookie = (name) => {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
};

/**
 * Fetches the CSRF token from the backend and stores it in memory.
 * The backend also sets a `csrf-token` cookie which we read back.
 * Should be called once on app startup (e.g. in UserContext).
 */
export const fetchCsrfToken = async () => {
  if (csrfTokenPromise) return csrfTokenPromise;

  csrfTokenPromise = (async () => {
    try {
      await authApi.get("/csrf-token");
      csrfToken = getCookie("csrf-token");
    } catch {
      // Non-fatal: CSRF protection may not be enabled (e.g. dev mode)
      csrfToken = null;
    } finally {
      csrfTokenPromise = null;
    }
  })();

  return csrfTokenPromise;
};

/**
 * Axios request interceptor that attaches the CSRF token to all
 * state-changing requests (POST, PUT, PATCH, DELETE).
 * If the CSRF token hasn't been fetched yet, waits for it before proceeding.
 */
const attachCsrfToken = async (config) => {
  const method = (config.method || "get").toLowerCase();

  if (["post", "put", "patch", "delete"].includes(method)) {
    // Ensure CSRF token is available before sending state-changing requests
    if (!csrfToken) {
      await fetchCsrfToken();
    }

    if (csrfToken) {
      config.headers["X-CSRF-Token"] = csrfToken;
    }
  }

  return config;
};

authApi.interceptors.request.use(attachCsrfToken);

export const getApiErrorMessage = (error, fallbackMessage) => {
  if (error?.code === "ECONNABORTED") {
    return "El servidor tardó demasiado en responder.";
  }

  if (error?.message === "Network Error" || !error?.response) {
    return "No se pudo conectar con la base de datos. Intentá de nuevo más tarde.";
  }

  return error?.response?.data?.message || fallbackMessage;
};