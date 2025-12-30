// store/couponStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ==========================================================
   Types (ONLY from your Mongoose schema)
   ========================================================== */

// Mongo helpers (for reading DB objects OR plain strings)
export type MongoDate = string | { $date: string };
export type IDType = string | { $oid: string };

export type CouponType =
  | "FIXED_VALUE"
  | "PERCENTAGE"
  | "FREEBIE"
  | "BOGO"
  | "SERVICE_MONETARY";

export type DiscountType = "fixed" | "percentage";

export interface Discount {
  type: DiscountType;
  value: number;
  currency: string;

  // Optional for SERVICE_MONETARY
  calculation_basis?: string;
  show_as_value_only?: boolean;
}

export interface Eligibility {
  user_type: string; // schema: array
  first_booking: boolean;
  min_cart_value: number;
  max_uses_per_user: number;
}

export interface ServiceScope {
  level: "SERVICE" | "CART" | "HOTEL";
  service_type?: string;
}

export interface PaxRules {
  min_pax?: number;
  max_pax?: number;
  allowed_pax_slabs?: string[];
}

export interface DayRules {
  max_nights_allowed?: number | null;
  allowed_nights?: number[];
  night_groups?: string[];
}

export interface StackingRules {
  can_stack_with_same_service: boolean;
  can_stack_with_other_services: boolean;
  can_stack_with_fixed_coupon: boolean;
  sum_multiple_services: boolean;
}

export interface DateRules {
  valid_from: MongoDate;
  valid_to: MongoDate;
  allowed_days: string[];
  blockout_allowed: boolean;

  // Optional (SERVICE_MONETARY)
  weekday?: { enabled: boolean; min_markup: number; max_markup: number };
  weekend?: { enabled: boolean; min_markup: number; max_markup: number };
  blockout?: { enabled: boolean };
}

export interface UsageLimits {
  total_uses: number;
  max_total_uses: number | null;
}

export interface Status {
  is_active: boolean;
  is_deleted: boolean;
}

export interface Audit {
  created_by?: string;
  created_at?: MongoDate;
  updated_at?: MongoDate;
}

/** allowed_services (NEW SHAPE) */
export interface AllowedIdsBlock {
  allowed_all: boolean;
  ids: IDType[];
}

export interface AllowedHotels {
  allowed_all: boolean;
  hotel_categories: string[];
  allowed_hotel_ids: IDType[];
}

export interface AllowedServices {
  activities: AllowedIdsBlock;
  sightseeing: AllowedIdsBlock;
  leisure_activities: AllowedIdsBlock;
  nightlife: AllowedIdsBlock;
  rentals: AllowedIdsBlock;
  pickup_drop: AllowedIdsBlock;
   food_services:AllowedIdsBlock;
    tour_manager: AllowedIdsBlock;
}

export interface AllowedServicesRoot {
  allowed_all: boolean;
  hotels: AllowedHotels;
  services: AllowedServices;
}

export interface Coupon {
  _id?: IDType;

  seq: number;

  coupon_type: CouponType;
  coupon_code: string;

  title: string;
  description: string;

  thumbnail?: string;

  discount: Discount;
  eligibility: Eligibility;

  // Optional blocks (SERVICE_MONETARY)
  service_scope?: ServiceScope;
  pax_rules?: PaxRules;
  day_rules?: DayRules;
  stacking_rules?: StackingRules;

  date_rules: DateRules;

  usage_limits: UsageLimits;

  terms_conditions: string[];

  allowed_services: AllowedServicesRoot;

  status: Status;

  audit?: Audit;

  createdAt?: MongoDate;
  updatedAt?: MongoDate;
  __v?: number;
}

/* ==========================================================
   Zustand Store
   ========================================================== */

interface CouponStoreState {
  coupon: Coupon | null;
  setCoupon: (coupon: Coupon | null) => void;
  clearCoupon: () => void;
}

export const useCouponStore = create<CouponStoreState>()(
  persist(
    (set) => ({
      coupon: null,
      setCoupon: (coupon) => set({ coupon }),
      clearCoupon: () => set({ coupon: null }),
    }),
    {
      name: "coupon-storage",
      version: 1,
    }
  )
);
