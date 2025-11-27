import axios from "axios";
import type {
  AxiosInstance,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import { getAccessToken, clearTokens } from "@/auth/tokenStorage.js";
import { getApiUrl } from "@/config/env";

/** Error de servicios */
export interface ApiErrorPayload {
  message: string;
  status?: number;
  data?: any;
  type?: string;
}

export class ApiError extends Error {
  public payload: ApiErrorPayload;
  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.name = "ApiError";
    this.payload = payload;
  }
}

/** Axios base */
export const api: AxiosInstance = axios.create({
  baseURL: getApiUrl(), // ✅ Now uses runtime config instead of build-time env var
  timeout: 10000,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    Accept: "application/json; charset=utf-8",
  },
});

// token en headers
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    try {
      const token = getAccessToken();
      if (token && config.headers) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (config.headers as any).Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn("No se pudo leer el token de almacenamiento:", e);
    }
    return config;
  },
  (error) => Promise.reject(new ApiError({ message: error?.message ?? "Request error", data: error })),
);

// detectar login (soporta URL relativa/absoluta)
const isLoginRequest = (url: string): boolean => {
  if (!url) return false;
  try {
    const u = url.startsWith("http") ? new URL(url) : new URL(url, globalThis.location?.origin ?? "http://localhost");
    const p = u.pathname;
    return p === "/auth/login" || p.endsWith("/auth/login") || p === "/login" || p.endsWith("/login");
  } catch {
    return url.includes("/auth/login") || url.includes("/login");
  }
};

// respuestas/errores
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(new ApiError({ message: "Error desconocido", data: error }));
    }

    const status = error.response?.status;
    const reqUrl = error.config?.url ?? "";

    if (status === 401) {
      if (!isLoginRequest(reqUrl)) {

        console.log('[DEBUG LOGIN REQUEST]', {
          'URL completa': config.baseURL + config.url,
          'baseURL': config.baseURL,
          'url': config.url,
          'VITE_API_URL (build-time)': import.meta.env.VITE_API_URL,
          'window.ENV?.VITE_API_URL (runtime)': window.ENV?.VITE_API_URL,
        });
        
        clearTokens();
        (globalThis as any).location.href = "/login";
        return Promise.reject(new ApiError({ message: "Unauthorized", status: 401 }));
      }
      // si es login → no redirigir, dejar que la pantalla muestre el error
      return Promise.reject(new ApiError({ message: "Unauthorized", status: 401, data: error.response?.data }));
    }

    if (!error.response) {
      const payload: ApiErrorPayload = { message: "Error de conexión. Verifica tu internet.", type: "network" };
      return Promise.reject(new ApiError(payload));
    }

    /* eslint-disable no-console */
    console.log("Error completo de la API:", {
      status: error.response.status,
      statusText: error.response.statusText,
      data: error.response.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data,
      },
    });
    /* eslint-enable no-console */

    const data = error.response.data as Record<string, any> | undefined;

    // Manejar 403 Forbidden (contenido peligroso detectado)
    if (error.response.status === 403) {
      const type = (data?.type as string | undefined) || "";
      const shouldRedirect =
        !isLoginRequest(reqUrl) &&
        (type.endsWith("account-blocked") ||
          type.endsWith("account-pending") ||
          type.endsWith("account-inactive"));

      if (shouldRedirect) {
        clearTokens();
        (globalThis as any).location.href = "/login?reason=forbidden";
      }

      const payload: ApiErrorPayload = {
        message: data?.detail || data?.message || "Acceso prohibido",
        status: 403,
        data,
        type: "forbidden",
      };
      return Promise.reject(new ApiError(payload));
    }

    if (error.response.status === 400 && data?.errors) {
      const payload: ApiErrorPayload = {
        message: data?.message || data?.detail || "Errores de validación",
        status: error.response.status,
        data,
        type: "validation",
      };
      return Promise.reject(new ApiError(payload));
    }

    let errorMessage: string | undefined = data?.message || data?.detail || data?.error || undefined;
    if (error.response.status === 409 && !errorMessage) {
      errorMessage = "Error de conflicto.";
    }

    const payload: ApiErrorPayload = {
      message: errorMessage ?? "Ha ocurrido un error inesperado",
      status: error.response.status,
      data,
    };

    return Promise.reject(new ApiError(payload));
  },
);

export default api;
