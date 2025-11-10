// store/activityStore.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ==========================================================
   1) Types
   ========================================================== */

// Helper types for Mongo fields (kept consistent with your review store)
export type MongoDate = string | { $date: string };
export type IDType = string | { $oid: string };

// Mirrors the surcharge shape used by the backend payload
export type ActivityDateSurcharge = {
  mode: "single" | "range";
  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // "YYYY-MM-DD" (same as startDate when mode === "single")
  surchargeAmount: number; // fixed INR or percentage based on surchargeType
  surchargeType: "fixed" | "percentage";
};

// Matches the Activity model you POST to (plus media URLs and timestamps)
export interface Activity {
  _id?: IDType;

  // Core fields
  name: string;
  description: string; // HTML stored from WYSIWYG
  destination: string;
  coverImage?: string | null; // GCS URL or null

  // Pricing
  vendorPrice: number;
  sellingPrice: number;
  taxRate: number;
  taxIncluded: boolean;

  // Surcharges
  dateSurcharges: ActivityDateSurcharge[];

  // Schedule
  operatingDays: string[]; // e.g., ["Mon","Tue",...]
  openTime: string;        // "HH:mm"
  closeTime: string;       // "HH:mm"
  duration: number;        // numeric value
  durationType: "min" | "hrs";

  // Logistics
  pickupLocation: string;
  dropLocation: string;

  // Media (GCS URLs or absolute HTTP URLs once persisted)
  images: string[];
  videos: string[];

  // Completion flag used by your UI
  isComplete: boolean;

  // Mongoose meta
  createdAt?: MongoDate;
  updatedAt?: MongoDate;
  __v?: number;
}

// Store state interface
interface ActivityStoreState {
  activity: Activity | null;

  /** Sets the activity data (e.g., when navigating to an edit page). */
  setActivity: (activity: Activity) => void;

  /** Partial update helper (for small edits in-place). */
  patchActivity: (patch: Partial<Activity>) => void;

  /** Clears the stored activity (e.g., on cancel/back). */
  clearActivity: () => void;
}

/* ==========================================================
   2) Zustand Store (Persisted)
   ========================================================== */

export const useActivityStore = create<ActivityStoreState>()(
  persist(
    (set, get) => ({
      activity: null,

      setActivity: (activity) => set({ activity }),

      patchActivity: (patch) => {
        const current = get().activity;
        if (!current) {
          // If there is no existing activity, treat patch as a new one
          set({ activity: patch as Activity });
          return;
        }
        set({ activity: { ...current, ...patch } });
      },

      clearActivity: () => set({ activity: null }),
    }),
    {
      name: "activity-storage", // key in localStorage
      version: 1,
    }
  )
);
