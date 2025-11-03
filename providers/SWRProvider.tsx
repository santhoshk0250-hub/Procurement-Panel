"use client";

import { SWRConfig } from "swr";
import { ReactNode } from "react";
import { showToast } from "./ToastProvider";
import { getInstance } from "@/lib/swr";

type Props = {
  children: ReactNode;
};

export default function SWRProvider({ children }: Props) {
  return (
    <SWRConfig
      value={{
        fetcher: getInstance,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        revalidateIfStale: true,
        shouldRetryOnError: true,
        errorRetryCount: 3,
        errorRetryInterval: 5000,
        dedupingInterval: 2000,
        focusThrottleInterval: 5000,
        loadingTimeout: 3000,
        onError: (error) => {
          // Show error toast for user-facing errors
          if (error.status >= 400 && error.status < 500) {
            showToast.error(`Request failed: ${error.message || 'Something went wrong'}`);
          } else if (error.status >= 500) {
            showToast.error('Server error. Please try again later.');
          }
        },
        onSuccess: (data, key) => {
          console.log(`SWR Success for ${key}:`, data);
        },
        onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
          // Don't retry on 4xx errors
          if (error.status >= 400 && error.status < 500) return;
          
          // Retry up to 3 times with exponential backoff
          if (retryCount >= 3) return;
          
          const timeout = Math.min(1000 * 2 ** retryCount, 10000);
          setTimeout(() => revalidate({ retryCount }), timeout);
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}


