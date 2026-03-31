import axios from "axios";

const DEV_AUTH_STORAGE_KEY = "cloud-desk-dev-auth";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // by adding this field browser will send the cookies to server automatically, on every single req
});

axiosInstance.interceptors.request.use((config) => {
  if (import.meta.env.VITE_ENABLE_DEV_AUTH === "true" && typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(DEV_AUTH_STORAGE_KEY);
      const session = raw ? JSON.parse(raw) : null;

      if (session) {
        config.headers["x-dev-auth-id"] = session.id;
        config.headers["x-dev-auth-role"] = session.role;
        config.headers["x-dev-auth-name"] = session.name;
        config.headers["x-dev-auth-email"] = session.email;
        if (session.imageUrl) {
          config.headers["x-dev-auth-image"] = session.imageUrl;
        }
      }
    } catch {
      // Ignore malformed local dev auth state and continue with the request.
    }
  }

  return config;
});

export default axiosInstance;
