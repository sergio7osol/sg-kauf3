import axios from "axios";
import type { AxiosError, AxiosResponse } from "axios";

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

  axios.interceptors.response.use(
    (response: AxiosResponse) => response,
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