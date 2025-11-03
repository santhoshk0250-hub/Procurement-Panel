// store/freebieStore.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ==========================================================
// 1) TypeScript Interfaces (aligned with models/Freebie.js)
// ========================================================== */

// Helper types for Mongo-ish fields coming from APIs/exports
type MongoDate = string | { $date: string };
type IDType = string | { $oid: string };

export interface Range {
  min?: number;
  max?: number;
}

export interface FreebieEligibility {
  // Generic targeting
  user_type?: string;                       // "new_user" | "family" | ...
  guest_type?: string[];                    // mirrors payload

  // Booking value / counts / age / loyalty / channels
  min_booking_value?: number;
  booking_value_min?: number;
  min_completed_bookings?: number;
  min_age?: number;
  min_age_alcohol?: number;
  loyalty_tier?: string[];                  // ["silver","gold","platinum"]
  booking_channel?: string[];               // ["app","web"]

  // Duration constraints
  min_stay_nights?: number;
  stay_duration_nights?: Range;             // { min, max? }
  booking_duration_nights?: Range;
  trip_duration_days?: Range;

  // Travel/date filters
  travel_day?: string[];                    // ["Friday","Saturday"]
  travel_months?: string[];                 // ["Nov","Dec","Jan","Feb"]
  destination_zone?: string[];              // ["North Goa","South Goa"]
  occasion_tag?: string[];                  // ["honeymoon","anniversary"]

  // Operational toggles / requirements
  partner_property_required?: boolean;
  partner_restaurant_required?: boolean;
  partner_club_required?: boolean;
  partner_driver_required?: boolean;
  partner_experience_required?: boolean;

  // Alcohol/wet days / compliance
  id_check_required?: boolean;
  on_premise_only?: boolean;
  licensed_partner_required?: boolean;
  exclude_dry_days?: boolean;
  max_units_per_guest?: number;

  // Logistics
  max_pickup_radius_km?: number;
}

export interface FreebieValidity {
  start: MongoDate; // required in schema; keep required here
  end: MongoDate;   // required in schema; keep required here
}

export interface Freebie {
  _id?: IDType;                          // not in schema file, but often present from DB
  seq: number;
  name: string;
  details: string;

  // Classification / tags
  guest_type?: string[];
  freebie_type?: string[];               // ["hospitality","experience",...]

  // When this record was created (payload)
  timestamp?: MongoDate;                 // defaults to now on server

  // Rules
  eligibility: FreebieEligibility;
  validity: FreebieValidity;

  // Presentation
  terms_conditions?: string[];
  images?: string[];

  // Mongoose timestamps & misc
  createdAt?: MongoDate;
  updatedAt?: MongoDate;
  __v?: number;
}

/* ==========================================================
// 2) Store State
// ========================================================== */

interface FreebieStoreState {
  freebie: Freebie | null;

  // Setters
  setFreebie: (freebie: Freebie) => void;

  /** Update only parts of the current freebie (safe shallow+one-level merge) */
  updateFreebie: (patch: Partial<Freebie>) => void;

  /** Clear the selected freebie (e.g., when leaving Edit page) */
  clearFreebie: () => void;
}

/* ==========================================================
// 3) Tiny util to shallow-merge top-level and key nested objects
//    (eligibility, validity) so updateFreebie works ergonomically.
// ========================================================== */
function mergeFreebie(prev: Freebie, patch: Partial<Freebie>): Freebie {
  // Merge nested objects one level deep where it helps most
  const mergedEligibility: FreebieEligibility =
    patch.eligibility
      ? { ...prev.eligibility, ...patch.eligibility }
      : prev.eligibility;

  const mergedValidity: FreebieValidity =
    patch.validity
      ? { ...prev.validity, ...patch.validity }
      : prev.validity;

  const { eligibility: _e, validity: _v, ...restPatch } = patch;

  return {
    ...prev,
    ...restPatch,
    eligibility: mergedEligibility,
    validity: mergedValidity,
  };
}

/* ==========================================================
// 4) Zustand Store (persisted)
// ========================================================== */

/**
 * Zustand store for managing a single selected Freebie object,
 * typically used to pass data into an Edit page or preview drawer.
 */
export const useFreebieStore = create<FreebieStoreState>()(
  persist(
    (set, get) => ({
      // Initial
      freebie: null,

      // Actions
      setFreebie: (freebie) => set({ freebie }),

      updateFreebie: (patch) =>
        set((state) => {
          if (!state.freebie) return state; // nothing to update
          return { freebie: mergeFreebie(state.freebie, patch) };
        }),

      clearFreebie: () => set({ freebie: null }),
    }),
    {
      name: "freebie-storage",
      version: 1,

      /**
       * Future-proofing: add migrations when you evolve Freebie shape.
       * Example:
       * migrate: (persisted, fromVersion) => {
       *   if (fromVersion < 2) {
       *     // transform persisted.freebie as needed
       *   }
       *   return persisted as any;
       * },
       */
    }
  )
);

/* ==========================================================
// 5) Optional: convenience selectors (usage: const name = useFreebieName();)
//    Keep in this file or split into a selectors file.
// ========================================================== */
// export const useFreebie = () => useFreebieStore((s) => s.freebie);
// export const useFreebieName = () =>
//   useFreebieStore((s) => s.freebie?.name ?? "");
