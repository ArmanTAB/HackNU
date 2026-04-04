import { api, setToken, clearToken } from "./client";

interface LoginRequest {
  login: string;
  password: string;
}

interface RegisterRequest {
  name: string;
  login: string;
  password: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    login: string;
  };
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>("/api/auth/login", data);
  setToken(res.token);
  localStorage.setItem("auth_user", res.user.login);
  return res;
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>("/api/auth/register", data);
  setToken(res.token);
  localStorage.setItem("auth_user", res.user.login);
  return res;
}

export function logout() {
  clearToken();
  window.location.href = "/auth";
}
