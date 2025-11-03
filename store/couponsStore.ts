// store/couponStore.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ==========================================================
// 1. Typescript Interfaces
// ========================================================== */

// Helper types for Mongo fields
type MongoDate = string | { $date: string };
type IDType = string | { $oid: string };

export interface Coupon {
  _id: IDType;
  seq: number;
  name: string;
  coupon_code: string;
  details: string;
  price: string;
  discount_type?: "fixed" | "percentage";
  discount_value?: number;
  eligibility: {
    user_type: string;
    first_booking?: boolean;
    min_cart_value?: number;
    min_group_size?: number;
    min_stay_nights?: number;
    stay_days?: string[];
    same_day_booking?: boolean;
    payment_type?: string;
    booking_time_cutoff?: string; // e.g., "16:00"
    booking_date?: string; // e.g., "2025-10-21"
    pickup_airport?: string;
    max_pickup_distance_km?: number;
    property_tags_required?: string[];
    segments?: string[];
  };
  validity: {
    start: MongoDate;
    end: MongoDate;
  };
  terms_conditions: string[];
  images: string[];
  is_active?: boolean;
  total_uses?: number;
  max_total_uses?: number | null;
  timestamp?: MongoDate;
  createdAt?: MongoDate;
  updatedAt?: MongoDate;
  __v?: number;
}

// Store state interface
interface CouponStoreState {
  coupon: Coupon | null;
  setCoupon: (coupon: Coupon) => void;
  clearCoupon: () => void;
}

/* ==========================================================
// 2. Zustand Store Implementation
// ========================================================== */

/**
 * Zustand store for managing a single selected Coupon object,
 * typically used for passing data to an Edit page.
 */
export const useCouponStore = create<CouponStoreState>()(
  persist(
    (set) => ({
      // Initial State
      coupon: null,

      // Actions/Setters
      /** Sets the coupon data for editing/viewing. */
      setCoupon: (coupon) => set({ coupon }),
      
      /** Clears the coupon data from the store. */
      clearCoupon: () => set({ coupon: null }),
    }),
    {
      name: "coupon-storage", // Unique key in localStorage
      // We explicitly include 'version' for future data structure changes
      version: 1, 
    }
  )
);