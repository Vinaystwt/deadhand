import axios from "axios";
import { useAuthStore } from "@/store/authStore";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || "/api";

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().clear();
    }
    return Promise.reject(err);
  }
);

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const reason = err.response?.data?.details?.reason;
    if (typeof reason === "string" && err.response?.data?.error) {
      return `${err.response.data.error}: ${reason}`;
    }
    return err.response?.data?.error ?? err.response?.data?.message ?? err.message ?? "Unknown error";
  }
  if (err instanceof Error) return err.message;
  return "Unknown error";
}
