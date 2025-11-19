import axios from "axios";
import type { AxiosError, AxiosResponse } from "axios";

export default defineNuxtPlugin(async (nuxtApp) => {
  if (import.meta.server) return;

  const config = useRuntimeConfig();

  axios.defaults.baseURL = `${config.public.apiBase}/api`;
  axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";
  axios.defaults.headers.common["Content-Type"] = "application/json";
  axios.defaults.headers.common["Accept"] = "application/json";
  axios.defaults.withCredentials = true;
  axios.defaults.withXSRFToken = true;
  axios.defaults.xsrfCookieName = 'XSRF-TOKEN';
  axios.defaults.xsrfHeaderName = 'X-XSRF-TOKEN';

  axios.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
      if ([401, 419].includes(error.response?.status) && !error.request?.responseURL?.endsWith("/api/user")) {
        const { logout } = useAuth();
        logout();
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