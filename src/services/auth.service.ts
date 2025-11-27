import api from "./api";
import { clearTokens, setAccessToken } from "@/auth/tokenStorage";
import { setUserData, clearUserData } from "@/auth/userStorage";
import type { UserResponse } from "@/services/auth/interfaces/UserResponse";

export interface LoginResponse {
  token?: string;
  accessToken?: string;
  [key: string]: any;
}

export interface LoginResult {
  success: boolean;
  accessToken?: string;
  [key: string]: any;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  phone: string;
  firstName: string;
  lastName: string;
  cedula: string;
  gender: string;
  roles: Array<{ roleName: string }>;

  latitude: number;
  longitude: number;
}

export interface VerifyEmailResponse {
  success?: boolean;
  message?: string;
  [key: string]: any;
}

export interface ForgotPasswordResponse {
  success?: boolean;
  message?: string;
  [key: string]: any;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  success?: boolean;
  message?: string;
  [key: string]: any;
}

const authService = {
  login: async (email: string, password: string): Promise<LoginResult> => {
    console.log("[DEBUG LOGIN] Antes de hacer petición:", {
      "API Base URL": api.defaults.baseURL,
      "VITE_API_URL (build-time)": import.meta.env.VITE_API_URL,
      "window.ENV?.VITE_API_URL (runtime)": window.ENV?.VITE_API_URL,
    });

    const response = await api.post<LoginResponse>(`/login`, {
      email,
      password,
    });
    const data = response.data;

    if (!data?.token) {
      throw new Error("Respuesta inválida del servidor: falta 'token'");
    }

    setAccessToken(data.token);

    try {
      const profile = await authService.getProfile();
      if (profile) {
        setUserData({
          id: profile.id,
          roles:
            profile.roles?.map((role: { name: string }) => role.name) || [],
          latitude: profile.latitude,
          longitude: profile.longitude,
        });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }

    return {
      ...data,
      accessToken: data.token,
      success: true,
    } as LoginResult;
  },

  logout: async (): Promise<{ success: boolean }> => {
    clearTokens();
    clearUserData();
    return { success: true };
  },

  getProfile: async (): Promise<UserResponse> => {
    const response = await api.get<UserResponse>("/api/auth/profile");
    return response.data;
  },

  register: async (payload: RegisterPayload): Promise<any> => {
    const response = await api.post("/api/users", payload);
    return response.data;
  },

  verifyEmail: async (token: string): Promise<VerifyEmailResponse> => {
    const response = await api.get<VerifyEmailResponse>(
      "/api/auth/verify-email",
      {
        params: { token },
      },
    );
    return response.data;
  },

  resendVerification: async (token: string): Promise<VerifyEmailResponse> => {
    const response = await api.post<VerifyEmailResponse>(
      `/api/auth/verify-email/resend?token=${encodeURIComponent(token)}`,
    );
    return response.data;
  },

  forgotPassword: async (email: string): Promise<ForgotPasswordResponse> => {
    const response = await api.post<ForgotPasswordResponse>(
      "/api/auth/password/forgot",
      { email },
    );
    return response.data ?? null;
  },

  resetPassword: async ({
    token,
    newPassword,
  }: ResetPasswordPayload): Promise<ResetPasswordResponse> => {
    const payload = { tokenValue: token, newPassword };
    const response = await api.post<ResetPasswordResponse>(
      "/api/auth/password/reset",
      payload,
    );
    return response.data ?? null;
  },
};

export default authService;
