import axios from "axios";

const API_BASE_URL = (
  import.meta.env.VITE_BACKEND_URL || "http://localhost:3001/api"
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

export const getApiErrorMessage = (error, fallbackMessage) => {
  if (error?.code === "ECONNABORTED") {
    return "El servidor tardó demasiado en responder.";
  }

  if (error?.message === "Network Error" || !error?.response) {
    return "No se pudo conectar con el backend.";
  }

  return error?.response?.data?.message || fallbackMessage;
};
