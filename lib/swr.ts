import api from "./axios";
import { AxiosError, AxiosRequestConfig } from "axios";

export type Fetcher<T = unknown> = (url: string, config?: AxiosRequestConfig) => Promise<T>;

export const getInstance: Fetcher = async (url, config) => {
  try {
    const response = await api.get(url, config);
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(`API Error: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
};

// POST fetcher for mutations
export const postInstance = async <T = unknown>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> => {
  try {
    const isFormData = data instanceof FormData;

    const response = await api.post(url, data, {
      ...config,
      headers: {
        ...(isFormData ? { "Content-Type": "multipart/form-data" } : {}),
        ...config?.headers,
      },
    });

    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(
        `API Error: ${error.response?.data?.message || error.message}`
      );
    }
    throw error;
  }
};

// PUT fetcher for mutations
export const putInstance = async <T = unknown>(
  url: string, 
  data?: unknown, 
  config?: AxiosRequestConfig
): Promise<T> => {
  try {
    const response = await api.put(url, data, config);
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(`API Error: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
};

// PUT fetcher for mutations
export const patchInstance = async <T = unknown>(
  url: string, 
  data?: unknown, 
  config?: AxiosRequestConfig
): Promise<T> => {
  try {
    const response = await api.patch(url, data, config);
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(`API Error: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
};

// DELETE fetcher for mutations
export const deleteInstance = async <T = unknown>(
  url: string, 
  config?: AxiosRequestConfig
): Promise<T> => {
  try {
    const response = await api.delete(url, config);
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(`API Error: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
};

// Utility function to create custom fetchers with specific configs
export const createFetcher = (method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE') => {
  return async <T = unknown>(
    url: string, 
    data?: unknown, 
    config?: AxiosRequestConfig
  ): Promise<T> => {
    try {
      let response;
      switch (method) {
        case 'GET':
          response = await api.get(url, config);
          break;
        case 'POST':
          response = await api.post(url, data, config);
          break;
        case 'PUT':
          response = await api.put(url, data, config);
          break;
        case 'PATCH':
          response = await api.patch(url, data, config);
          break;
        case 'DELETE':
          response = await api.delete(url, config);
          break;
      }
      return response?.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(`API Error: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  };
};
