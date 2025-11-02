import axios from "axios";

export default defineNuxtPlugin(async (nuxtApp) => {
  if (import.meta.server) return;

  const config = useRuntimeConfig();

  axios.defaults.baseURL = config.public.apiBase;
  axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";
  axios.defaults.headers.common["Content-Type"] = "application/json";
  axios.defaults.headers.common["Accept"] = "application/json";
  axios.defaults.withCredentials = true;
  axios.defaults.withXSRFToken = true;
  axios.defaults.xsrfCookieName = 'XSRF-TOKEN';
  axios.defaults.xsrfHeaderName = 'X-XSRF-TOKEN';

  await axios.get("/sanctum/csrf-cookie");
});