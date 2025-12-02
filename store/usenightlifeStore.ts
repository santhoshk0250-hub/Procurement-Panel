// store/useNightlifePackageStore.ts

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
  duration?: string;
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

export interface NightlifeSurcharge {
  windowType: "single" | "range" | (string & {});
  amount: number;
  currency: string;
  singleDate?: string;
  startDate?: string;
  endDate?: string;
}

export interface ExtraChargeItem {
  label: string;
  amount: number;
}

export interface NightlifeLLMChip {
  q: string;
  a: string; // HTML
}

export interface NightlifeFAQ {
  q: string;
  a: string; // HTML
}

/* ==========================================================
   2) Main NightlifePackage interface
   ========================================================== */

export interface NightlifePackage {
  _id?: IDType;
  id?: string;

  // Core identity
  title: string;
  destination: string;
  type?: string; // club, pubcrawl, etc.

  // Descriptions
  description: string; // rich HTML
  descriptionShort: string; // card short description
  descriptionLong: string; // long plain description
  extendedDescription: string;

  // Pricing & tax
  vendorPrice?: number;
  price?: number;
  taxRate?: number;
  taxIncluded: boolean;
  serviceCharges?: number;
  priceBreakdown?: PriceBreakdown;
  extraCharges?: Record<string, number>; // vipTable -> amount etc.

  // Schedule & timings
  openTime: string;
  closeTime: string;
  duration?: number;
  durationType: "min" | "hrs";
  operatingDays: ("Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun")[];
  operatingHours?: string; // "openTime – closeTime"
  timeSlots: string[];
  timing?: string; // human readable
  dateAvailable?: string;

  // Logistics / pickup
  pickupType: "hotel" | "meetup" | "self";
  pickupAreas: string[];
  meetupLocation?: string;
  meetupAddress?: string;
  meetingTime?: string;

  // Capacity & participants
  groupSize: string;
  minParticipants?: number;
  maxParticipants?: number;
  ageLimit: string;
  capacity?: number;
  genderRatioRule: string;

  // Location
  address: string; // listing address
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
  };

  // Tags / content
  highlights: string[];
  languages: string[];
  inclusions: string[];
  exclusions: string[];
  goodToKnow: string[];
  whatToBring: string[];
  safetyRequirements: string[];
  voucherInfo: string[];
  eventCategory: string[];
  musicType: string[];
  bestFor: string[];
  generalInstructions: string[];
  dressCode: string;

  // Experience blocks
  whatToExpect: ExpectBlock[];
  whyChoose: WhyChooseBlock[];

  fitnessLevel: string;
  healthRestrictions: string;
  bestTimeToVisit: string;
  seasonalAvailability: string;
  accessibility: string;
  priceNote: string;

  // Itinerary & ops
  itinerary: TimeBlock[];
  operationProcess: TimeBlock[];

  // Cancellation
  cancellationPolicyShort: string;
  cancellationDetails: string[];

  // Ratings & stats
  rating: number | null;
  reviewCount: number | null;
  bookedCount: number | null;
  instantConfirmation: boolean;
  freeCancellation: boolean;
  operatedBy: string;

  // LLM chips & FAQs
  llm_chips: NightlifeLLMChip[];
  faqs: NightlifeFAQ[];

  // Surcharges
  surcharges: NightlifeSurcharge[];

  // Media
  thumbnail: string;
  images: string[];       // main gallery
  guestImages: string[];
  videos: string[];

  // Misc
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

export const NIGHTLIFE_PACKAGE_INITIAL: NightlifePackage = {
  _id: undefined,
  id: "",

  title: "",
  destination: "",
  type: "",

  description: "",
  descriptionShort: "",
  descriptionLong: "",
  extendedDescription: "",

  vendorPrice: undefined,
  price: undefined,
  taxRate: undefined,
  taxIncluded: false,
  serviceCharges: undefined,
  priceBreakdown: {
    basePrice: undefined,
    serviceCharges: undefined,
    taxes: undefined,
    totalPrice: undefined,
  },
  extraCharges: {},

  openTime: "",
  closeTime: "",
  duration: undefined,
  durationType: "hrs",
  operatingDays: [],
  operatingHours: "",
  timeSlots: [],
  timing: "",
  dateAvailable: "",

  pickupType: "meetup",
  pickupAreas: [],
  meetupLocation: "",
  meetupAddress: "",
  meetingTime: "",

  groupSize: "",
  minParticipants: undefined,
  maxParticipants: undefined,
  ageLimit: "",
  capacity: undefined,
  genderRatioRule: "",

  address: "",
  location: {
    address: "",
    city: "",
    state: "",
    country: "",
  },

  highlights: [],
  languages: [],
  inclusions: [],
  exclusions: [],
  goodToKnow: [],
  whatToBring: [],
  safetyRequirements: [],
  voucherInfo: [],
  eventCategory: [],
  musicType: [],
  bestFor: [],
  generalInstructions: [],
  dressCode: "",

  whatToExpect: [],
  whyChoose: [],

  fitnessLevel: "",
  healthRestrictions: "",
  bestTimeToVisit: "",
  seasonalAvailability: "",
  accessibility: "",
  priceNote: "",

  itinerary: [],
  operationProcess: [],

  cancellationPolicyShort: "Full refund up to 48 hours before Night life",
  cancellationDetails: [],

  rating: null,
  reviewCount: null,
  bookedCount: null,
  instantConfirmation: false,
  freeCancellation: false,
  operatedBy: "",

  llm_chips: [],
  faqs: [],

  surcharges: [],

  thumbnail: "",
  images: [],
  guestImages: [],
  videos: [],

  special_mentions: "",
  notes: "",

  createdAt: undefined,
  updatedAt: undefined,
  __v: undefined,
};

/* ==========================================================
   4) Store shape
   ========================================================== */

interface NightlifePackageStoreState {
  nightlife: NightlifePackage;

  // Replace entire package (load for edit)
  setNightlife: (pkg: NightlifePackage) => void;

  // Alias to keep API similar to sightseeing
  setPackage: (pkg: NightlifePackage) => void;

  // Shallow patch (top-level only)
  updateNightlife: (patch: Partial<NightlifePackage>) => void;
  updatePackage: (patch: Partial<NightlifePackage>) => void;

  // Media helpers
  setThumbnail: (url: string) => void;

  addImage: (url: string) => void;
  removeImageAt: (index: number) => void;
  setImages: (images: string[]) => void;

  addGuestImage: (url: string) => void;
  removeGuestImageAt: (index: number) => void;
  setGuestImages: (images: string[]) => void;

  addVideo: (url: string) => void;
  removeVideoAt: (index: number) => void;
  setVideos: (videos: string[]) => void;

  // Array helpers
  setInclusions: (items: string[]) => void;
  setExclusions: (items: string[]) => void;
  setHighlights: (items: string[]) => void;

  setLLMChips: (chips: NightlifeLLMChip[] ) => void;

  // Reset
  clearNightlife: () => void;
  clearPackage: () => void;
}

/* ==========================================================
   5) Zustand store (persisted)
   ========================================================== */

export const useNightlifePackageStore =
  create<NightlifePackageStoreState>()(
    persist(
      (set, get) => ({
        nightlife: { ...NIGHTLIFE_PACKAGE_INITIAL },

        setNightlife: (pkg) =>
          set({
            nightlife: {
              ...NIGHTLIFE_PACKAGE_INITIAL,
              ...pkg,
            },
          }),

        setPackage: (pkg) =>
          set({
            nightlife: {
              ...NIGHTLIFE_PACKAGE_INITIAL,
              ...pkg,
            },
          }),

        updateNightlife: (patch) =>
          set({
            nightlife: {
              ...get().nightlife,
              ...patch,
            },
          }),

        updatePackage: (patch) =>
          set({
            nightlife: {
              ...get().nightlife,
              ...patch,
            },
          }),

        // Media helpers
        setThumbnail: (url) =>
          set({
            nightlife: {
              ...get().nightlife,
              thumbnail: url,
            },
          }),

        addImage: (url) =>
          set({
            nightlife: {
              ...get().nightlife,
              images: [...(get().nightlife.images || []), url],
            },
          }),

        removeImageAt: (index) =>
          set({
            nightlife: {
              ...get().nightlife,
              images: (get().nightlife.images || []).filter(
                (_, i) => i !== index
              ),
            },
          }),

        setImages: (images) =>
          set({
            nightlife: {
              ...get().nightlife,
              images,
            },
          }),

        addGuestImage: (url) =>
          set({
            nightlife: {
              ...get().nightlife,
              guestImages: [
                ...(get().nightlife.guestImages || []),
                url,
              ],
            },
          }),

        removeGuestImageAt: (index) =>
          set({
            nightlife: {
              ...get().nightlife,
              guestImages: (get().nightlife.guestImages || []).filter(
                (_, i) => i !== index
              ),
            },
          }),

        setGuestImages: (images) =>
          set({
            nightlife: {
              ...get().nightlife,
              guestImages: images,
            },
          }),

        addVideo: (url) =>
          set({
            nightlife: {
              ...get().nightlife,
              videos: [...(get().nightlife.videos || []), url],
            },
          }),

        removeVideoAt: (index) =>
          set({
            nightlife: {
              ...get().nightlife,
              videos: (get().nightlife.videos || []).filter(
                (_, i) => i !== index
              ),
            },
          }),

        setVideos: (videos) =>
          set({
            nightlife: {
              ...get().nightlife,
              videos,
            },
          }),

        setInclusions: (items) =>
          set({
            nightlife: {
              ...get().nightlife,
              inclusions: items,
            },
          }),

        setExclusions: (items) =>
          set({
            nightlife: {
              ...get().nightlife,
              exclusions: items,
            },
          }),

        setHighlights: (items) =>
          set({
            nightlife: {
              ...get().nightlife,
              highlights: items,
            },
          }),

        setLLMChips: (chips) =>
          set({
            nightlife: {
              ...get().nightlife,
              llm_chips: chips,
            },
          }),

        clearNightlife: () =>
          set({ nightlife: { ...NIGHTLIFE_PACKAGE_INITIAL } }),

        clearPackage: () =>
          set({ nightlife: { ...NIGHTLIFE_PACKAGE_INITIAL } }),
      }),
      {
        name: "nightlife-package-storage",
        version: 1,
      }
    )
  );

/* ==========================================================
   6) Example usage
   ========================================================== */
// const nightlife = useNightlifePackageStore((s) => s.nightlife);
// const setPackage = useNightlifePackageStore((s) => s.setPackage);
// const updateNightlife = useNightlifePackageStore((s) => s.updateNightlife);
