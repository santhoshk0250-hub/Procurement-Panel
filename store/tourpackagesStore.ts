import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ==========================================================
   1) Shared helper types
   ========================================================== */

export type MongoDate = string | { $date: string };
export type IDType = string | { $oid: string };

/* ==========================================================
   2) Schema-aligned types
   ========================================================== */

// ----------------------
// ITINERARY (matches ItineraryDaySchema + ItineraryActivitySchema)
// ----------------------

export interface PackageItineraryActivity {
  serviceItemId: IDType;
  time?: string; // start time
  endtime?: string; // end time
  type?: string;
  note?: string;
  isOptional?: boolean;
}

export interface PackageItineraryDay {
  day: number;
  title: string;
  description?: string;
  activitieIds?: PackageItineraryActivity[];
}

// ----------------------
// INCLUSIONS (matches schemas exactly)
// ----------------------

export interface HotelInclusionItem {
  serviceItemId: IDType;
  name: string;
  location?: string;
  check_in?: string;
  check_out?: string;
  isReplaceable?: boolean;
  isRemovable?: boolean;
  star_category?: number; // 1..5
}

export interface BaseServiceInclusionItem {
  serviceItemId: IDType;
  name: string;
  pax?: number;
  date?: string; // "Day 2"
  time?: string; // string (not array)
  location?: string;
  duration?: number;
  isReplaceable?: boolean;
  isRemovable?: boolean;
}

export interface NightlifeInclusionItem {
  serviceItemId: IDType;
  name: string;
  time?: string; // string
  duration?: number;
  isReplaceable?: boolean;
  isRemovable?: boolean;
}

export interface MealInclusionItem {
  type: string;
  date?: string; // "Day 2"
  time?: string; // string
  noOfPeople?: number;
  isRemovable?: boolean;
}

export interface VehicleInclusionItem {
  serviceItemId?: IDType | null;
  vehicle_name?: string;
  seater?: string; // string
  // strict:false in schema => backend can send extra keys; UI doesn't need them typed
}

export interface ArrayInclusionSection<T> {
  title?: string;
  data?: T[];
}

export interface BooleanInclusionSection {
  title?: string;
  data?: boolean;
}

export interface PackageInclusions {
  hotel?: ArrayInclusionSection<HotelInclusionItem>;
  pickup_drop?: ArrayInclusionSection<VehicleInclusionItem>;
  activity?: ArrayInclusionSection<BaseServiceInclusionItem>;
  sightseeing?: ArrayInclusionSection<BaseServiceInclusionItem>;
  // NOTE: nightlife exists in your old store, but NOT in your posted schema's root inclusions.
  // Keep/remove based on backend. Removing here to match schema.
  rental_vehicle?: ArrayInclusionSection<VehicleInclusionItem>;
  meals?: ArrayInclusionSection<MealInclusionItem>;
  tourGuide?: BooleanInclusionSection;
  transport?: BooleanInclusionSection;
}

// ----------------------
// SURCHARGES (matches ActivitySurchargeSchema)
// ----------------------

export type ActivitySurcharge = {
  windowType: "single" | "range";
  singleDate?: string;
  startDate?: string;
  endDate?: string;
  amount: number;
  currency?: string; // schema default is INR, optional for UI
};

/* ==========================================================
   3) Package model (ONLY fields present in your schema)
   ========================================================== */

export interface PackageModel {
  _id?: IDType;

  name: string;
  description?: string;
  category?: string;
  thumbnail_image?: string;

  min_pax: number;
  max_pax: number;

  total_days: number;
  total_nights: number;

  start_date?: string;
  end_date?: string;

  isCustomizable?: boolean;

  itinerary?: PackageItineraryDay[];
  inclusions?: PackageInclusions;

  exclusions?: string[];
  surcharges?: ActivitySurcharge[];

  createdAt?: MongoDate;
  updatedAt?: MongoDate;
  __v?: number;
}

/* ==========================================================
   4) Zustand Store (Persisted)
   ========================================================== */

interface TourPackageStoreState {
  tourPackage: PackageModel | null;
  setTourPackage: (apiItem: Partial<PackageModel>) => void;
  patchPackage: (patch: Partial<PackageModel>) => void;
  clearPackage: () => void;
}

export const useTourPackageStore = create<TourPackageStoreState>()(
  persist(
    (set, get) => ({
      tourPackage: null,

      setTourPackage: (apiItem) => {
        if (!apiItem) return;

        const normalised: PackageModel = {
          // required in schema
          name: apiItem.name ?? "",
          min_pax: apiItem.min_pax ?? 1,
          max_pax: apiItem.max_pax ?? 1,
          total_days: apiItem.total_days ?? 1,
          total_nights: apiItem.total_nights ?? 0,

          // optional
          description: apiItem.description ?? "",
          ...apiItem,
        } as PackageModel;

        set({ tourPackage: normalised });
      },

      patchPackage: (patch) => {
        const current = get().tourPackage;

        if (!current) {
          const seeded: PackageModel = {
            name: patch.name ?? "",
            min_pax: patch.min_pax ?? 1,
            max_pax: patch.max_pax ?? 1,
            total_days: patch.total_days ?? 1,
            total_nights: patch.total_nights ?? 0,
            description: patch.description ?? "",
            ...(patch as PackageModel),
          };
          set({ tourPackage: seeded });
          return;
        }

        set({ tourPackage: { ...current, ...patch } });
      },

      clearPackage: () => set({ tourPackage: null }),
    }),
    {
      name: "tour-package-storage",
      version: 2,
    }
  )
);
