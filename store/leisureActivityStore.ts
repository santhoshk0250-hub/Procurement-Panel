import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ==========================================================
   1) Types
   ========================================================== */

// Helper types for Mongo fields (kept consistent with your review store)
export type MongoDate = string | { $date: string };
export type IDType = string | { $oid: string };

// Mirrors the surcharge shape used by the *new* backend Activity schema
// and AddActivityFormMobile payload
export type ActivitySurcharge = {
  windowType: "single" | "range";
  singleDate?: string; // "YYYY-MM-DD" when windowType = "single"
  startDate?: string;  // "YYYY-MM-DD" when windowType = "range"
  endDate?: string;    // "YYYY-MM-DD" when windowType = "range"
  amount: number;      // surcharge value
  currency: string;    // e.g. "INR"
};

export interface FAQ {
  q: string;
  a: string; // HTML
}

/* ---------- Extra types for product-style activity data ---------- */

export interface ActivityLocation {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface ActivityWhyChoose {
  title: string;
  description: string;
  icon?: string;
}

export interface ActivityItineraryItem {
  time?: string;
  title: string;
  description?: string;
  duration?: string;
}

export interface ActivityOperationProcessItem {
  time?: string;
  title: string;
  description?: string;
  duration?: string;
}

export interface ActivityExpectationItem {
  title: string;
  description?: string;
}

export interface ActivityPriceBreakdown {
  basePrice: number;
  serviceCharges: number;
  taxes: number;
  totalPrice: number;
}

export interface ActivitySegregatedImageGroup {
  category: string;
  urls: string[]; // image URLs stored in DB
}

/* ==========================================================
   Activity model (store)
   ========================================================== */

// Matches the updated Activity mongoose schema (plus some legacy fields kept optional)
export interface LeisureActivitydata {
  _id?: IDType;

  /** Product / catalog identifiers */
  id?: string;          // e.g. "LEI001"
  productId?: string;   // any extra product code if needed
  externalId?: string;  // other external ID

  /* ---------- Core fields ---------- */

  // New schema fields
  title: string;                // main title used everywhere
  description: string;          // HTML from WYSIWYG
  destination: string;

  // Legacy field (optional) kept for older code that may still use it
  name?: string;

  // Media
  thumbnail?: string | null;    // backend `thumbnail`
  guest_images?: string[];      // backend `guest_images`
  images: string[];
  videos: string[];

  // Legacy coverImage kept optional (e.g. old dashboards)
  coverImage?: string | null;

  category?: string;            // "adventure", "leisure", etc.

  /* ---------- Pricing & Tax ---------- */

  vendorPrice: number;

  // Main selling price (schema: price)
  price: number;

  // Legacy alias from older code (optional)
  sellingPrice?: number;

  childPrice?: number;
  seniorPrice?: number;
  infantPrice?: number;

  // Extra note like "Senior discount available"
  priceNote?: string;

  // Flat service charges (also reflected in priceBreakdown)
  serviceCharges?: number;

  // Matches ActivityPriceBreakdownSchema
  priceBreakdown?: ActivityPriceBreakdown;

  taxRate: number;
  taxIncluded: boolean;

  // New surcharges schema (replaces old dateSurcharges)
  surcharges?: ActivitySurcharge[];

  // Legacy array kept optional if any very old data still references it
  dateSurcharges?: never;

  /* ---------- Operational Schedule ---------- */

  operatingDays: string[]; // e.g., ["Mon","Tue",...]
  openTime: string;        // "HH:mm"
  closeTime: string;       // "HH:mm"
  duration: number;        // numeric value
  durationType: "min" | "hrs";

  timeSlots?: string[];    // ["7:00 AM", "9:00 AM"]
  operatingHours?: string; // "6:00 AM – 6:00 PM"
  bestTimeToVisit?: string;
  seasonalAvailability?: string;

  /* ---------- Logistics / Pickup ---------- */

  pickupLocation: string;
  dropLocation: string;

  pickupType?: "hotel" | "meetup" | "self";
  pickupAreas?: string[];
  meetupLocation?: string;
  meetupAddress?: string;
  meetingTime?: string;

  /* ---------- Location object ---------- */

  location?: ActivityLocation;

  /* ---------- Group & accessibility ---------- */

  groupSize?: string;           // e.g. "Private", "Up to 20"
  minParticipants?: number;
  maxParticipants?: number;
  accessibility?: string;
  fitnessLevel?: string;
  healthRestrictions?: string;

  /* ---------- Experience Content ---------- */

  extendedDescription?: string;

  // In the schema: highlights: [String]
  highlights?: string[];

  whyChoose?: ActivityWhyChoose[];
  itinerary?: ActivityItineraryItem[];
  operationProcess?: ActivityOperationProcessItem[];
  whatToExpect?: ActivityExpectationItem[];

  inclusions?: string[];
  exclusions?: string[];

  // Fitness & safety
  safetyRequirements?: string[];
  goodToKnow?: string[];
  whatToBring?: string[];

  // Vouchers & languages
  voucherInfo?: string[];
  languages?: string[];

  /* ---------- Policy & Cancellation ---------- */

  cancellationPolicyShort?: string;
  cancellationDetails?: string[];

  /* ---------- Ratings / Booking Stats ---------- */

  rating?: number;
  reviewCount?: number;
  bookedCount?: number;
  instantConfirmation?: boolean;
  freeCancellation?: boolean;
  operatedBy?: string;

  /* ---------- LLM / FAQ Content ---------- */

  llm_chips?: FAQ[];
  faqs?: FAQ[];

      segregated_images?: ActivitySegregatedImageGroup[];
  

  /* ---------- Internal Flags ---------- */

  isComplete: boolean;

  // Mongoose meta
  createdAt?: MongoDate;
  updatedAt?: MongoDate;
  __v?: number;
}

/* ==========================================================
   2) Zustand Store (Persisted)
   ========================================================== */

interface LeisureActivity {
  activity: LeisureActivitydata | null;

  /** Sets the activity data (e.g., when navigating to an edit page). */
  setActivity: (activity: LeisureActivitydata) => void;

  /** Partial update helper (for small edits in-place). */
  patchActivity: (patch: Partial<LeisureActivitydata>) => void;

  /** Clears the stored activity (e.g., on cancel/back). */
  clearActivity: () => void;
}

export const useLeisureActivityStore = create<LeisureActivity>()(
  persist(
    (set, get) => ({
      activity: null,

      setActivity: (activity) => set({ activity }),

      patchActivity: (patch) => {
        const current = get().activity;
        if (!current) {
          // If there is no existing activity, treat patch as a new one
          set({ activity: patch as LeisureActivitydata });
          return;
        }
        set({ activity: { ...current, ...patch } });
      },

      clearActivity: () => set({ activity: null }),
    }),
    {
      name: "leisureactivity-storage", // key in localStorage
      version: 1,
    }
  )
);
