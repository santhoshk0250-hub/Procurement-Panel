// store/sightseeingPlaceStore.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ==========================================================
   1) Shared helper types
   ========================================================== */

type MongoDate = string | { $date: string };
type IDType = string | { $oid: string };

// Reuse PlaceType shape from your basic place store if you like,
// or duplicate here if this file is standalone:
export type SightseeingPlaceType =
  | "beach"
  | "fort"
  | "temple"
  | "church"
  | "museum"
  | "area"
  | "viewpoint"
  | "waterfall"
  | "market"
  | "park"
  | "other"
  | (string & {}); // allow custom values on FE

/* ==========================================================
   2) Sub-types that mirror the document structure
   ========================================================== */

export interface PlaceLocation {
  city: string;
  state: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface PlaceHours {
  open?: string;
  close?: string;
  days?: string;
  note?: string;
}

export interface PlaceDuration {
  min?: number;
  max?: number;
  text?: string;
}

export interface PlacePrice {
  type?: string;   // "free", "paid", etc.
  text?: string;   // human readable
  source?: string; // e.g. "official website"
}

export interface PlaceAccessibility {
  wheelchairAccessible?: boolean;
  difficultyLevel?: "easy" | "moderate" | "hard" | (string & {});
}

export interface PlaceItineraryItem {
  time: string;        // "7AM"
  title: string;       // "8PM" (in your sample)
  description: string; // HTML or plain text
}

export interface PlaceNearby {
  name: string;
  distance?: string; // "650m", "2km", etc.
}

export interface PlaceLLMChip {
  q: string;
  a: string; // HTML or plain text
}

/* ==========================================================
   3) Main SightseeingPlace interface
   ========================================================== */

export interface SightseeingPlace {
  _id?: IDType;

  // Core
  name: string;
  type: SightseeingPlaceType | "";
  category: string; // e.g. "nature"
  area: string;

  // Content & copy
  description: string; // HTML main description
  history: string;
  bestTimeToVisit: string;

  // Location & meta
  location: PlaceLocation;
  hours: PlaceHours;
  duration: PlaceDuration;
  price: PlacePrice;

  // Map URLs (both variants – new & legacy)
  mapUrl: string;
  map_url: string;

  // Short/plain text fields (legacy)
  hours_legacy: string;
  estimated_duration: string;
  desc: string;
  price_legacy: string;
  price_source: string;

  // Media
  thumbnail: string;
  images: string[];

  // UX / info chips
  facilities: string[];
  highlights: string[];
  tips: string[];
  accessibility: PlaceAccessibility;
  itinerary: PlaceItineraryItem[];
  nearbyPlaces: PlaceNearby[];
  llm_chips: PlaceLLMChip[];

  // Ratings
  rating: number | null;
  reviewCount: number | null;

  // Timestamps / internal
  createdAt?: MongoDate;
  updatedAt?: MongoDate;
  __v?: number;
}

/* ==========================================================
   4) Initial object (good FE defaults)
   ========================================================== */

export const SIGHTSEEING_PLACE_INITIAL: SightseeingPlace = {
  _id: undefined,

  name: "",
  type: "",
  category: "",
  area: "",

  description: "",
  history: "",
  bestTimeToVisit: "",

  location: {
    city: "",
    state: "",
    country: "",
    latitude: undefined,
    longitude: undefined,
  },

  hours: {
    open: "",
    close: "",
    days: "",
    note: "",
  },

  duration: {
    min: undefined,
    max: undefined,
    text: "",
  },

  price: {
    type: "",
    text: "",
    source: "",
  },

  mapUrl: "",
  map_url: "",

  hours_legacy: "",
  estimated_duration: "",
  desc: "",
  price_legacy: "",
  price_source: "",

  thumbnail: "",
  images: [],

  facilities: [],
  highlights: [],
  tips: [],
  accessibility: {
    wheelchairAccessible: undefined,
    difficultyLevel: "easy",
  },
  itinerary: [],
  nearbyPlaces: [],
  llm_chips: [],

  rating: null,
  reviewCount: null,

  createdAt: undefined,
  updatedAt: undefined,
  __v: undefined,
};

/* ==========================================================
   5) Store shape
   ========================================================== */

interface SightseeingPlaceStoreState {
  sightseeingPlace: SightseeingPlace;

  // Replace entire place (e.g. load from API for edit)
  setSightseeingPlace: (place: SightseeingPlace) => void;

  // Shallow patch (top level only – use dedicated helpers for nested if needed)
  updateSightseeingPlace: (patch: Partial<SightseeingPlace>) => void;

  // Media helpers
  addImage: (url: string) => void;
  removeImageAt: (index: number) => void;
  setImages: (images: string[]) => void;

  // Simple helpers for nested fields that are heavily used
  setLocation: (locationPatch: Partial<PlaceLocation>) => void;
  setHours: (hoursPatch: Partial<PlaceHours>) => void;
  setDuration: (durationPatch: Partial<PlaceDuration>) => void;
  setPrice: (pricePatch: Partial<PlacePrice>) => void;

  // Reset
  clearSightseeingPlace: () => void;
}

/* ==========================================================
   6) Zustand store (persisted)
   ========================================================== */

export const useSightseeingPlaceStore = create<SightseeingPlaceStoreState>()(
  persist(
    (set, get) => ({
      sightseeingPlace: { ...SIGHTSEEING_PLACE_INITIAL },

      setSightseeingPlace: (place) => set({ sightseeingPlace: place }),

      updateSightseeingPlace: (patch) =>
        set({
          sightseeingPlace: { ...get().sightseeingPlace, ...patch },
        }),

      addImage: (url) =>
        set({
          sightseeingPlace: {
            ...get().sightseeingPlace,
            images: [...(get().sightseeingPlace.images || []), url],
          },
        }),

      removeImageAt: (index) =>
        set({
          sightseeingPlace: {
            ...get().sightseeingPlace,
            images: (get().sightseeingPlace.images || []).filter(
              (_, i) => i !== index
            ),
          },
        }),

      setImages: (images) =>
        set({
          sightseeingPlace: { ...get().sightseeingPlace, images },
        }),

      setLocation: (locationPatch) =>
        set({
          sightseeingPlace: {
            ...get().sightseeingPlace,
            location: {
              ...get().sightseeingPlace.location,
              ...locationPatch,
            },
          },
        }),

      setHours: (hoursPatch) =>
        set({
          sightseeingPlace: {
            ...get().sightseeingPlace,
            hours: {
              ...get().sightseeingPlace.hours,
              ...hoursPatch,
            },
          },
        }),

      setDuration: (durationPatch) =>
        set({
          sightseeingPlace: {
            ...get().sightseeingPlace,
            duration: {
              ...get().sightseeingPlace.duration,
              ...durationPatch,
            },
          },
        }),

      setPrice: (pricePatch) =>
        set({
          sightseeingPlace: {
            ...get().sightseeingPlace,
            price: {
              ...get().sightseeingPlace.price,
              ...pricePatch,
            },
          },
        }),

      clearSightseeingPlace: () =>
        set({ sightseeingPlace: { ...SIGHTSEEING_PLACE_INITIAL } }),
    }),
    {
      name: "sightseeing-place-storage",
      version: 1,
    }
  )
);

/* ==========================================================
   7) Example usage
   ========================================================== */
// const name = useSightseeingPlaceStore((s) => s.sightseeingPlace.name);
// const setName = (v: string) =>
//   useSightseeingPlaceStore
//     .getState()
//     .updateSightseeingPlace({ name: v });
