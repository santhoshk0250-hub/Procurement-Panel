// store/usesightseeingPackageStore.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ==========================================================
   1) Shared helper types
   ========================================================== */

export type MongoDate = string | { $date: string };
export type IDType = string | { $oid: string };

export interface TimeBlock {
  time: string;
  title: string;
  description: string;
}

export interface WhyChooseBlock {
  title: string;
  description: string;
  icon?: string;
}

export interface ExpectBlock {
  title: string;
  description: string;
}

export interface PriceBreakdown {
  basePrice?: number;
  serviceCharges?: number;
  taxes?: number;
  totalPrice?: number;
}

export interface BlockoutSurcharge {
  mode: "single" | "range" | (string & {});
  amount: number;
  currency: string;
  start_date: string;
  end_date: string;
}

export interface PlaceRef {
  name: string;
  placeId?: IDType;
}

export interface PackageLLMChip {
  q: string;
  a: string; // HTML or plain text
}

/* ==========================================================
   2) Main SightseeingPackage interface
   ========================================================== */

export interface SightseeingPackage {
  _id?: IDType;

  // Core IDs
  id?: string;

  // Naming (support both legacy + new)
  tour_name?: string;
  title: string;

  destination: string;

  // Vehicle & pax
  vehicle_type?: string;
  vehicleType?: string;
  min_pax?: number;
  max_pax?: number;
  minParticipants?: number;
  maxParticipants?: number;

  // Duration & timings
  duration_hours?: number;
  regular_timings?: string;
  alternative_timings?: string;
  operatingHours?: string;

  // Category / tags
  category: string[];

  // Places
  place_ids?: IDType[];
  placesToVisit: PlaceRef[];

  // Content
  description: string;

  highlights: string[];
  whyChoose: WhyChooseBlock[];
  whatToExpect: ExpectBlock[];

  itinerary: TimeBlock[];
  operationProcess: TimeBlock[];

  goodToKnow: string[];
  whatToBring: string[];

  bestTimeToVisit: string;
  seasonalAvailability: string;
  groupSize: string;
  accessibility: string;
  fitnessLevel: string;

  // Pricing
  vendor_charge?: number;
  seller_charge?: number;

  priceBreakdown?: PriceBreakdown;
  blockout_surcharges: BlockoutSurcharge[];

  // Inclusions / exclusions
  inclusions: string[];
  exclusions: string[];

  // Pickup
  pickupType: string;
  pickupAreas: string[];
  meetingTime: string;

  // Media
  thumbnail: string;
  images: string[];
  guestImages: string[];
  galleryImages: string[];
  videos: string[];

  // Voucher / language
  voucherInfo: string[];
  languages: string[];

  // Cancellation
  cancellationPolicyShort: string;
  cancellationDetails: string[];

  // Booking flags / stats
  instantConfirmation: boolean;
  freeCancellation: boolean;
  operatedBy: string;

  rating: number | null;
  reviewCount: number | null;
  bookedCount: number | null;

  // LLM FAQ
  llm_chips: PackageLLMChip[];

  // Misc notes
  special_mentions?: string | null;
  notes?: string | null;

  // Timestamps / internal
  createdAt?: MongoDate;
  updatedAt?: MongoDate;
  __v?: number;
}

/* ==========================================================
   3) Initial object (good FE defaults)
   ========================================================== */

export const SIGHTSEEING_PACKAGE_INITIAL: SightseeingPackage = {
  _id: undefined,

  id: "",
  tour_name: "",
  title: "",
  destination: "",

  vehicle_type: "",
  vehicleType: "",
  min_pax: 1,
  max_pax: 4,
  minParticipants: 1,
  maxParticipants: 4,

  duration_hours: undefined,
  regular_timings: "",
  alternative_timings: "",
  operatingHours: "",

  category: [],

  place_ids: [],
  placesToVisit: [],

  description: "",

  highlights: [],
  whyChoose: [],
  whatToExpect: [],

  itinerary: [],
  operationProcess: [],

  goodToKnow: [],
  whatToBring: [],

  bestTimeToVisit: "",
  seasonalAvailability: "",
  groupSize: "",
  accessibility: "",
  fitnessLevel: "",

  vendor_charge: undefined,
  seller_charge: undefined,

  priceBreakdown: {
    basePrice: undefined,
    serviceCharges: undefined,
    taxes: undefined,
    totalPrice: undefined,
  },
  blockout_surcharges: [],

  inclusions: [],
  exclusions: [],

  pickupType: "",
  pickupAreas: [],
  meetingTime: "",

  thumbnail: "",
  images: [],
  guestImages: [],
  galleryImages: [],
  videos: [],

  voucherInfo: [],
  languages: [],

  cancellationPolicyShort: "",
  cancellationDetails: [],

  instantConfirmation: false,
  freeCancellation: false,
  operatedBy: "",

  rating: null,
  reviewCount: null,
  bookedCount: null,

  llm_chips: [],

  special_mentions: "",
  notes: "",

  createdAt: undefined,
  updatedAt: undefined,
  __v: undefined,
};

/* ==========================================================
   4) Store shape
   ========================================================== */

interface SightseeingPackageStoreState {
  sightseeingPackage: SightseeingPackage;

  // Replace entire package (load for edit)
  setSightseeingPackage: (pkg: SightseeingPackage) => void;

  // Alias to match your dashboard: const { setPackage } = useSightseeingPackageStore();
  setPackage: (pkg: SightseeingPackage) => void;

  // Shallow patch (top-level only)
  updatePackage: (patch: Partial<SightseeingPackage>) => void;

  // Media helpers
  addImage: (url: string) => void;
  removeImageAt: (index: number) => void;
  setImages: (images: string[]) => void;

  addGuestImage: (url: string) => void;
  removeGuestImageAt: (index: number) => void;
  setGuestImages: (images: string[]) => void;

  addGalleryImage: (url: string) => void;
  removeGalleryImageAt: (index: number) => void;
  setGalleryImages: (images: string[]) => void;

  // Array helpers
  setInclusions: (items: string[]) => void;
  setExclusions: (items: string[]) => void;

  // Reset
  clearPackage: () => void;
}

/* ==========================================================
   5) Zustand store (persisted)
   ========================================================== */

export const useSightseeingPackageStore =
  create<SightseeingPackageStoreState>()(
    persist(
      (set, get) => ({
        sightseeingPackage: { ...SIGHTSEEING_PACKAGE_INITIAL },

        setSightseeingPackage: (pkg) =>
          set({ sightseeingPackage: { ...SIGHTSEEING_PACKAGE_INITIAL, ...pkg } }),

        setPackage: (pkg) =>
          set({ sightseeingPackage: { ...SIGHTSEEING_PACKAGE_INITIAL, ...pkg } }),

        updatePackage: (patch) =>
          set({
            sightseeingPackage: {
              ...get().sightseeingPackage,
              ...patch,
            },
          }),

        // Media helpers
        addImage: (url) =>
          set({
            sightseeingPackage: {
              ...get().sightseeingPackage,
              images: [...(get().sightseeingPackage.images || []), url],
            },
          }),

        removeImageAt: (index) =>
          set({
            sightseeingPackage: {
              ...get().sightseeingPackage,
              images: (get().sightseeingPackage.images || []).filter(
                (_, i) => i !== index
              ),
            },
          }),

        setImages: (images) =>
          set({
            sightseeingPackage: {
              ...get().sightseeingPackage,
              images,
            },
          }),

        addGuestImage: (url) =>
          set({
            sightseeingPackage: {
              ...get().sightseeingPackage,
              guestImages: [
                ...(get().sightseeingPackage.guestImages || []),
                url,
              ],
            },
          }),

        removeGuestImageAt: (index) =>
          set({
            sightseeingPackage: {
              ...get().sightseeingPackage,
              guestImages: (get().sightseeingPackage.guestImages || []).filter(
                (_, i) => i !== index
              ),
            },
          }),

        setGuestImages: (images) =>
          set({
            sightseeingPackage: {
              ...get().sightseeingPackage,
              guestImages: images,
            },
          }),

        addGalleryImage: (url) =>
          set({
            sightseeingPackage: {
              ...get().sightseeingPackage,
              galleryImages: [
                ...(get().sightseeingPackage.galleryImages || []),
                url,
              ],
            },
          }),

        removeGalleryImageAt: (index) =>
          set({
            sightseeingPackage: {
              ...get().sightseeingPackage,
              galleryImages: (
                get().sightseeingPackage.galleryImages || []
              ).filter((_, i) => i !== index),
            },
          }),

        setGalleryImages: (images) =>
          set({
            sightseeingPackage: {
              ...get().sightseeingPackage,
              galleryImages: images,
            },
          }),

        setInclusions: (items) =>
          set({
            sightseeingPackage: {
              ...get().sightseeingPackage,
              inclusions: items,
            },
          }),

        setExclusions: (items) =>
          set({
            sightseeingPackage: {
              ...get().sightseeingPackage,
              exclusions: items,
            },
          }),

        clearPackage: () =>
          set({ sightseeingPackage: { ...SIGHTSEEING_PACKAGE_INITIAL } }),
      }),
      {
        name: "sightseeing-package-storage",
        version: 1,
      }
    )
  );

/* ==========================================================
   6) Example usage
   ========================================================== */
// const pkg = useSightseeingPackageStore((s) => s.sightseeingPackage);
// const setPackage = useSightseeingPackageStore((s) => s.setPackage);
