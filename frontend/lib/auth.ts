import { StakeholderRole } from "@/types";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: StakeholderRole;
  organization_name?: string | null;
  organization_id?: string | null;
  designation?: string | null;
  phone_number?: string | null;
  domain_expertise?: string | null;
  is_active: boolean;
  is_verified: boolean;
  department_id?: string | null;
  startup_id?: string | null;
  department_name?: string | null;
  company_name?: string | null;
  last_login?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
}

const TOKEN_KEY = "govinnovate_token";
const REFRESH_TOKEN_KEY = "govinnovate_refresh_token";
const USER_KEY = "govinnovate_user";

export function getStoredAuth(): AuthState {
  if (typeof window === "undefined") {
    return { token: null, refreshToken: null, user: null };
  }
  const token = localStorage.getItem(TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  const userStr = localStorage.getItem(USER_KEY);
  let user: AuthUser | null = null;
  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch {
      user = null;
    }
  }
  return { token, refreshToken, user };
}

export function setStoredAuth(token: string, refreshToken: string, user: AuthUser) {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function updateStoredUser(user: AuthUser) {
  if (typeof window !== "undefined") {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function clearStoredAuth() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

export function getDashboardPathForRole(role?: StakeholderRole | null): string {
  if (!role) return "/login";
  switch (role) {
    case "GOVERNMENT":
      return "/government/dashboard";
    case "STARTUP":
      return "/startup/dashboard";
    case "EXPERT":
    case "EXPERT_EVALUATOR":
      return "/expert/dashboard";
    case "VALIDATOR":
    case "INDEPENDENT_VALIDATOR":
      return "/validator/dashboard";
    case "PROCUREMENT_OFFICER":
      return "/procurement/dashboard";
    case "ADMIN":
      return "/admin/dashboard";
    default:
      return "/";
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const { token, refreshToken } = getStoredAuth();

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response = await fetch(`${apiUrl}${endpoint}`, {
    ...options,
    headers,
  });

  // Attempt automatic session renewal on 401 if refresh token is present
  if (response.status === 401 && refreshToken && !endpoint.includes("/auth/refresh") && !endpoint.includes("/auth/login")) {
    try {
      const refreshRes = await fetch(`${apiUrl}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setStoredAuth(refreshData.access_token, refreshData.refresh_token, refreshData.user);
        headers["Authorization"] = `Bearer ${refreshData.access_token}`;

        // Retry original request with refreshed token
        response = await fetch(`${apiUrl}${endpoint}`, {
          ...options,
          headers,
        });
      } else {
        clearStoredAuth();
      }
    } catch {
      clearStoredAuth();
    }
  }

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore parsing error
    }
    throw new Error(errorDetail);
  }

  return response.json();
}
