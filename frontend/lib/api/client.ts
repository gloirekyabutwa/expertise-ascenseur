import axios, { AxiosError } from "axios";

// Environment variables
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000") + "/api/v1";

// Custom error type
export interface ApiError {
    status: number;
    message: string;
    detail?: any;
}

// Axios instance
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true, // For cookies
});

// --- Interceptors ---

// Request: Inject Tenant ID and Auth Token
apiClient.interceptors.request.use(
    (config) => {
        // 1. Tenant ID
        // We'll read from localStorage or a global store helper. 
        // Since this runs on client (mostly), localStorage is accessible.
        // On server (SSR), we'd need another strategy (headers/cookies). 
        // For this MVP SPA-like usage:
        if (typeof window !== "undefined") {
            const tenantId = localStorage.getItem("selected_tenant_id");
            if (tenantId) {
                config.headers["X-Tenant-ID"] = tenantId;
            }

            // 2. Auth Token (if not using HttpOnly cookies exclusively for access)
            // If backend requires Authorization header:
            const token = localStorage.getItem("access_token");
            if (token) {
                config.headers["Authorization"] = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response: Handle Errors and 401
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const status = error.response?.status;
        const data = error.response?.data as any;

        if (status === 401) {
            // Unauthorized - Clear session and redirect to login
            if (typeof window !== "undefined") {
                // TODO: Implement refresh token logic if backend supports /refresh endpoint
                // For now, logout
                localStorage.removeItem("access_token");
                // localStorage.removeItem("selected_tenant_id"); // Keep tenant?
                window.location.href = "/login";
            }
        }

        // Normalize error
        const apiError: ApiError = {
            status: status || 500,
            message: data?.detail || error.message || "Unknown error",
            detail: data,
        };

        return Promise.reject(apiError);
    }
);
