// store/vehicleStoreV2.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ==========================================================
   1) Types aligned to models/Vehicle.js
   ========================================================== */

export type MongoDate = string | { $date: string };
export type IDType = string | { $oid: string };

export type Currency = "INR" | (string & {});

export interface Pricing {
  oneDay: string;
  twoDays: string;
  threePlusPerDay: string;
  currency?: Currency;
  minDaysIfApplicable?: string;
}
export interface ActivitySegregatedImageGroup {
  category: string;
  urls: string[]; // image URLs stored in DB
}
export interface Deposits {
  security: string;
  serviceCharge: number;
  currency?: Currency;
}

export interface Fuel {
  type?: string;
  status?: string;
}

export type SurgeMode = "single" | "range";

/** Keep dates as YYYY-MM-DD string on client; server converts to Date (UTC midnight) */
export interface SurgeCharge {
  mode: SurgeMode;               // "single" | "range"
  startDate: string;             // "YYYY-MM-DD"
  endDate?: string;              // "YYYY-MM-DD" (defaults to startDate if absent)
  amount: number;
  currency?: Currency;
}

export type VehicleType = "2 wheeler" | "4 wheeler";
export type SeaterCapacity = "2 seater" | "4 seater" | "7 seater";

export interface Vehicle {
  _id?: IDType;
  vehicleId?: string;
  vehicleType: VehicleType;
  seaterCapacity: SeaterCapacity;
  variant?: string | null;

  images: string[];
  thumbnailUrl?: string | null;
  segregated_images?: ActivitySegregatedImageGroup[];
  
  pricing?: Pricing;
  vendorPricing?: Pricing;
  sellerPricing?: Pricing;

  mileage?: string;               // text field
  distanceLimitPerDay?: string;   // text field
  deposits: Deposits;             // required

  rating?: number | null;

  pickupLocations?: string;       // newline-separated text
  dropLocations?: string;         // newline-separated text

  cancellationPolicy?: string | null;
  supportInfo?: string | null;

  speedLimit?: string;

  collectingProcedure?: string;
  handoverProcedure?: string;
  termsAndConditions?: string;

  fuel?: Fuel;

  maxKmPerDay?: number | null;

  reviewsLink?: string | null;

  surgeCharge?: SurgeCharge;

  createdAt?: MongoDate;
  updatedAt?: MongoDate;
}

/* ==========================================================
   2) Helpers
   ========================================================== */

const CURRENCY_DEFAULT: Currency = "INR";

export const newBlankVehicle = (): Vehicle => ({
  vehicleType: "4 wheeler",
  seaterCapacity: "4 seater",
  variant: null,

  images: [],
  thumbnailUrl: null,

  vendorPricing: undefined,
  sellerPricing: undefined,

  mileage: "",
  distanceLimitPerDay: "",
  deposits: { security: "", serviceCharge: 0, currency: CURRENCY_DEFAULT },

  rating: null,

  pickupLocations: "",
  dropLocations: "",

  cancellationPolicy: null,
  supportInfo: null,

  speedLimit: "",

  collectingProcedure: "",
  handoverProcedure: "",
  termsAndConditions: "",

  fuel: undefined,
  maxKmPerDay: null,

  reviewsLink: null,

  surgeCharge: undefined,
});

/** Build payload as server expects (mirrors your `fromClientPayload`) */
export function toServerPayload(v: Vehicle) {
  const coercePricing = (x?: Pricing) =>
    x && {
      oneDay: Number(x.oneDay || 0),
      twoDays: Number(x.twoDays || 0),
      threePlusPerDay: Number(x.threePlusPerDay || 0),
      currency: (x.currency as Currency) || CURRENCY_DEFAULT,
      ...(x.minDaysIfApplicable != null && x.minDaysIfApplicable !== ("" as any)
        ? { minDaysIfApplicable: Number(x.minDaysIfApplicable) }
        : {}),
    };

  const surge =
    v.surgeCharge &&
    v.surgeCharge.mode &&
    v.surgeCharge.startDate &&
    v.surgeCharge.startDate.trim().length
      ? {
          mode: v.surgeCharge.mode,
          startDate: v.surgeCharge.startDate,             // server converts to Date
          endDate: v.surgeCharge.endDate || v.surgeCharge.startDate,
          amount: Number(v.surgeCharge.amount || 0),
          currency:
            (v.surgeCharge.currency as Currency) ||
            v.sellerPricing?.currency ||
            v.vendorPricing?.currency ||
            CURRENCY_DEFAULT,
        }
      : undefined;

  return {
    vehicleId: v.vehicleId,
    vehicleType: v.vehicleType,
    seaterCapacity: v.seaterCapacity,
    variant: v.variant || null,

    images: Array.isArray(v.images) ? v.images : [],
    thumbnailUrl: v.thumbnailUrl || null,

    vendorPricing: coercePricing(v.vendorPricing) || undefined,
    sellerPricing: coercePricing(v.sellerPricing) || undefined,

    mileage: v.mileage || "",
    distanceLimitPerDay: v.distanceLimitPerDay || "",
    deposits: {
      security: Number(v.deposits?.security || 0),
      serviceCharge: Number(v.deposits?.serviceCharge || 0),
      currency: (v.deposits?.currency as Currency) || CURRENCY_DEFAULT,
    }, 
    pickupLocations: v.pickupLocations || "",
    dropLocations: v.dropLocations || "",

    cancellationPolicy: v.cancellationPolicy || null,
    supportInfo: v.supportInfo || null,

    speedLimit: v.speedLimit || "",

    collectingProcedure: v.collectingProcedure || "",
    handoverProcedure: v.handoverProcedure || "",
    termsAndConditions: v.termsAndConditions || "",

    fuel:
      v.fuel && (v.fuel.type || v.fuel.status)
        ? { type: v.fuel.type || "", status: v.fuel.status || "" }
        : undefined,

    maxKmPerDay:
      v.maxKmPerDay === ("" as any) || v.maxKmPerDay == null
        ? null
        : Number(v.maxKmPerDay),

    reviewsLink: v.reviewsLink || null,

    surgeCharge: surge,
  };
}

/* ==========================================================
   3) Store State
   ========================================================== */

interface VehicleStoreState {
  /** Currently edited/selected vehicle */
  vehicle: Vehicle;

  /** Replace vehicle entirely (e.g., when loading for edit) */
  setVehicle: (c: Vehicle) => void;

  /** Patch vehicle fields */
  patchVehicle: (patch: Partial<Vehicle>) => void;

  /** Reset to a blank vehicle */
  clearVehicle: () => void;

  /** Focused helpers */
  setVendorPricing: (p?: Pricing) => void;
  setSellerPricing: (p?: Pricing) => void;
  setDeposits: (d: Deposits) => void;
  setSurgeCharge: (s?: SurgeCharge) => void;
}

/* ==========================================================
   4) Store
   ========================================================== */

export const useVehicleStore = create<VehicleStoreState>()(
  persist(
    (set, get) => ({
      vehicle: newBlankVehicle(),

      setVehicle: (v) => set({ vehicle: { ...v } }),

      patchVehicle: (patch) =>
        set({ vehicle: { ...get().vehicle, ...patch } }),

      clearVehicle: () => set({ vehicle: newBlankVehicle() }),

      setVendorPricing: (p) =>
        set({ vehicle: { ...get().vehicle, vendorPricing: p } }),

      setSellerPricing: (p) =>
        set({ vehicle: { ...get().vehicle, sellerPricing: p } }),

      setDeposits: (d) =>
        set({
          vehicle: {
            ...get().vehicle,
            deposits: {
              security: d.security,
              serviceCharge: Number(d.serviceCharge || 0),
              currency: d.currency || CURRENCY_DEFAULT,
            },
          },
        }),

      setSurgeCharge: (s) =>
        set({
          vehicle: {
            ...get().vehicle,
            surgeCharge: s,
          },
        }),
    }),
    {
      name: "vehicle-storage-v2",
      version: 1,
      // Persist only the form data
      partialize: (state) => ({ vehicle: state.vehicle }),
    }
  )
);


