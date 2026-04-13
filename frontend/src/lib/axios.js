import axios from "axios";

const DEV_AUTH_STORAGE_KEY = "cloud-desk-dev-auth";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// To be set by AuthProvider
let getTokenFn = null;

export const setGetTokenHook = (fn) => {
  getTokenFn = fn;
};

axiosInstance.interceptors.request.use(async (config) => {
  // 1. Handle Dev Auth
  if (
    import.meta.env.VITE_ENABLE_DEV_AUTH === "true" &&
    typeof window !== "undefined"
  ) {
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
        return config; // Return early for dev auth
      }
    } catch {
      // Ignore
    }
  }

  // 2. Handle Clerk Auth via Dynamic Token Retrieval
  if (getTokenFn) {
    try {
      const token = await getTokenFn();
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Axios interceptor: Failed to get token", error);
    }
  }

  return config;
});

export default axiosInstance;
