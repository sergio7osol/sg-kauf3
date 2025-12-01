import axios from "axios";
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { toSnakeCase, toCamelCase } from "~/utils/caseTransform";

export default defineNuxtPlugin(async (nuxtApp) => {
  if (import.meta.server) return;

  const config = useRuntimeConfig();
  let isLoggingOut = false;

  axios.defaults.baseURL = `${config.public.apiBase}/api`;
  axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";
  axios.defaults.headers.common["Content-Type"] = "application/json";
  axios.defaults.headers.common["Accept"] = "application/json";
  axios.defaults.xsrfCookieName = 'XSRF-TOKEN';
  axios.defaults.xsrfHeaderName = 'X-XSRF-TOKEN';
  axios.defaults.withCredentials = true;
  axios.defaults.withXSRFToken = true;

  // Request interceptor: transform camelCase → snake_case for outgoing requests
  axios.interceptors.request.use(
    (requestConfig: InternalAxiosRequestConfig) => {
      // Transform query params (GET requests)
      if (requestConfig.params && !(requestConfig.params instanceof FormData)) {
        requestConfig.params = toSnakeCase(requestConfig.params);
      }
      // Transform request body (POST/PUT/PATCH requests)
      if (requestConfig.data && !(requestConfig.data instanceof FormData)) {
        requestConfig.data = toSnakeCase(requestConfig.data);
      }
      return requestConfig;
    },
    (error: AxiosError) => Promise.reject(error)
  );

  // Response interceptor: transform snake_case → camelCase for incoming responses
  axios.interceptors.response.use(
    (response: AxiosResponse) => {
      // Transform response data
      if (response.data) {
        response.data = toCamelCase(response.data);
      }
      return response;
    },
    (error: AxiosError) => {
      const status = error.response?.status;
      const url = error.request?.responseURL;
      
      // Prevent logout loop - only logout once
      if ([401, 419].includes(status) && !url?.endsWith("/api/user") && !url?.endsWith("/api/logout") && !isLoggingOut) {
        isLoggingOut = true;
        console.error('Authentication error detected:', status, 'on', url);
        const { logout } = useAuth();
        logout().finally(() => {
          isLoggingOut = false;
        });
      }
      return Promise.reject(error);
    }
  );

  try {
    await axios.get("/sanctum/csrf-cookie", {
      baseURL: config.public.apiBase
    });
  } catch (error) {
    console.error('Failed to fetch CSRF cookie:', error);
  }
});