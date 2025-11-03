// store/useAuthStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

// Define the type for your user (based on your Mongoose schema)
interface User {
  _id?: string;
  name: string;
  email?: string;
  phone?: string;
  loginType: "email" | "phone" | "social";
  altNumber?: string[];
  socialLogins?: {
    provider: "google" | "facebook" | "twitter" | "github" | "linkedin";
    providerId: string;
    email?: string;
    name?: string;
  }[];
  role:
    | "guest"
    | "sales"
    | "vendorManager"
    | "ticketManager"
    | "admin"
    | "teo"
    | "support"
    | "salesManager"
    | "procurement"
    | "hr"
    | "finance"
    | "fieldManager"
    | "financeManager";
  details?: Record<string, any>; // guestDetails or employeeDetails
  timestamp?: string;
}

// Auth store state
interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,

      // Save user + token
      setAuth: (user, token) => set({ user, token }),

      // Clear user + token
      clearAuth: () => set({ user: null, token: null }),
    }),
    {
      name: "auth-storage", // key in localStorage
    }
  )
);
