// store/placeStore.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ==========================================================
   1) Types (match your Mongoose schema + timestamps)
   ========================================================== */

// Helper types for Mongo fields (same as your review store)
type MongoDate = string | { $date: string };
type IDType = string | { $oid: string };

// Keep the known backend enum,
// but allow extra strings on the front end if you decide to permit custom types.
// NOTE: Your Mongoose schema currently restricts to the enum below.
export type PlaceType =
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
  | (string & {}); // optional: enables custom values on FE without breaking TS

export interface Place {
  _id?: IDType;

  // Core
  name: string;
  type: PlaceType | "";
  area: string;

  // Optional meta
  hours: string;
  map_url: string;
  estimated_duration: string;

  // Content
  desc: string;
  price: string;
  price_source: string;

  // Media
  images: string[]; // GCS URLs

  // Timestamps / internal
  createdAt?: MongoDate;
  updatedAt?: MongoDate;
  __v?: number;
}

/* A clean initial object mirroring your frontend form defaults */
export const PLACE_INITIAL: Place = {
  name: "",
  type: "",
  area: "",
  hours: "",
  map_url: "",
  estimated_duration: "",
  desc: "",
  price: "",
  price_source: "",
  images: [],
};

/* ==========================================================
   2) Store shape
   ========================================================== */

interface PlaceStoreState {
  place: Place;
  // Set/replace the whole place (e.g., when loading for edit)
  setPlace: (place: Place) => void;

  // Patch update, convenient for form fields
  updatePlace: (patch: Partial<Place>) => void;

  // Media helpers
  addImage: (url: string) => void;
  removeImageAt: (index: number) => void;
  setImages: (images: string[]) => void;

  // Reset to initial
  clearPlace: () => void;
}

/* ==========================================================
   3) Zustand store (persisted to localStorage)
   ========================================================== */

export const usePlaceStore = create<PlaceStoreState>()(
  persist(
    (set, get) => ({
      place: { ...PLACE_INITIAL },

      setPlace: (place) => set({ place }),

      updatePlace: (patch) => set({ place: { ...get().place, ...patch } }),

      addImage: (url) =>
        set({
          place: { ...get().place, images: [...(get().place.images || []), url] },
        }),

      removeImageAt: (index) =>
        set({
          place: {
            ...get().place,
            images: (get().place.images || []).filter((_, i) => i !== index),
          },
        }),

      setImages: (images) => set({ place: { ...get().place, images } }),

      clearPlace: () => set({ place: { ...PLACE_INITIAL } }),
    }),
    {
      name: "place-storage", // localStorage key
      version: 1,
    }
  )
);

/* ==========================================================
   4) (Optional) Selectors for cleaner usage
   ========================================================== */
// Example usage:
// const name = usePlaceStore((s) => s.place.name);
// const setName = (v: string) => usePlaceStore.getState().updatePlace({ name: v });
