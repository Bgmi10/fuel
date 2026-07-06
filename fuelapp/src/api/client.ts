import axios, { AxiosRequestConfig } from "axios";
import { API_BASE_URL } from "../constants/config";
import { storage } from "../utils/storage";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const token = await storage.get("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    return Promise.reject(
      error?.response?.data ?? {
        success: false,
        message: "Something went wrong",
      }
    );
  }
);

export const request = async <T = any>(
  config: AxiosRequestConfig
): Promise<T> => {
  return api(config);
};