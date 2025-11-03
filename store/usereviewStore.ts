// store/reviewStore.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ==========================================================
// 1) Types
// ========================================================== */

// Helper types for Mongo fields (kept consistent with your coupon store)
type MongoDate = string | { $date: string };
type IDType = string | { $oid: string };

// Matches models/review.js schema (+ timestamps & __v as optional)
export interface Review {
  _id?: IDType;
  name: string;
  thumbnail: string;   // GCS URL
  videoURL: string;    // GCS URL
  description: string;
  language: string;
  createdAt?: MongoDate;
  updatedAt?: MongoDate;
  __v?: number;
}

// Store state interface
interface ReviewStoreState {
  review: Review | null;
  setReview: (review: Review) => void;
  clearReview: () => void;
}

/* ==========================================================
// 2) Zustand Store (Persisted)
// ========================================================== */

export const useReviewStore = create<ReviewStoreState>()(
  persist(
    (set) => ({
      review: null,

      /** Sets the review data (e.g., when navigating to an edit page). */
      setReview: (review) => set({ review }),

      /** Clears the stored review (e.g., on cancel/back). */
      clearReview: () => set({ review: null }),
    }),
    {
      name: "review-storage", // key in localStorage
      version: 1,
    }
  )
);
