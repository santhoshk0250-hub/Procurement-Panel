// store/useNightlifeStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

/* =========================
 * Types (UI / Server)
 * ========================= */

export type NightVenueType =
  | "Bar & Club"
  | "Nightclub"
  | "Bar Street"
  | "Lounge"
  | "Pub"
  | (string & {});

export type NightAmenity = { name: string; details?: string };
export type Music = { name: string; details?: string };

/** UI shape kept in Zustand (form state) */
export interface NightlifeUI {
  // Core
  _id?: string;
  name: string;
  type: NightVenueType | "";
  hours: string;
  estimated_duration: string;
  desc: string; // HTML
  price: string;
  price_source: string;
  age_restriction?: string;

  // Lists
  music_type: string[];
  amenities: NightAmenity[];

  // Media (UI-specific)
  existingImages?: string[]; // server images already stored (URLs)
  newImages: Array<{ file: File; preview: string }>;

  existingThumbnail?: string; // server thumbnail URL
  newThumbnail?: { file: File; preview: string } | null;

  // Optional server metadata (kept for convenience)
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

/** Server payload shape (what your API returns/accepts) */
export type NightlifeDoc = {
  _id?: string;
  name: string;
  type: string;
  hours: string;
  estimated_duration: string;
  desc: string;
  price: string;
  price_source: string;
  age_restriction?: string;
  music_type?: string[];
  amenities?: string[]; // on server, amenities are plain strings
  images?: string[]; // server images
  thumbnail?: string; // server thumbnail
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
};

/* =========================
 * Mappers
 * ========================= */

/** Normalize anything weird into a clean string[] */
function normalizeStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === "string" && val.trim().length) return [val];
  return [];
}

/** Map server -> UI form */
export function toFormData(doc: NightlifeDoc): NightlifeUI {
  const music_type = normalizeStringArray(doc.music_type);
  const amenitiesStrings = normalizeStringArray(doc.amenities);
  const images = normalizeStringArray(doc.images);

  return {
    _id: doc._id,
    name: doc.name ?? "",
    type: (doc.type as NightVenueType) ?? "",
    hours: doc.hours ?? "",
    estimated_duration: doc.estimated_duration ?? "",
    desc: doc.desc ?? "",
    price: doc.price ?? "",
    price_source: doc.price_source ?? "",
    age_restriction: doc.age_restriction ?? "",

    music_type,
    amenities: amenitiesStrings.map((n) => ({ name: n })),

    existingImages: images,
    newImages: [],

    existingThumbnail: doc.thumbnail ?? "",
    newThumbnail: null,

    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    __v: doc.__v,
  };
}

/**
 * Map UI form -> server payload.
 * - Pass in any URLs you got after uploading `newImages`.
 * - If you uploaded a new thumbnail, pass its URL via `newThumbnailUrl`.
 */
export function toServerPayload(
  data: NightlifeUI,
  uploadedImageUrls: string[] = [],
  newThumbnailUrl?: string
): NightlifeDoc {
  const mergedImages = [
    ...(data.existingImages ?? []),
    ...(uploadedImageUrls ?? []),
  ];

  return {
    _id: data._id,
    name: data.name,
    type: data.type,
    hours: data.hours,
    estimated_duration: data.estimated_duration,
    desc: data.desc,
    price: data.price,
    price_source: data.price_source,
    age_restriction: data.age_restriction,
    music_type: data.music_type,
    amenities: data.amenities.map((a) => a.name),
    images: mergedImages,
    thumbnail: newThumbnailUrl
      ? newThumbnailUrl
      : (data.existingThumbnail ?? ""),
  };
}

/* =========================
 * Blank form state
 * ========================= */

const BLANK: NightlifeUI = {
  name: "",
  type: "",
  hours: "",
  estimated_duration: "",
  desc: "",
  price: "",
  price_source: "",
  age_restriction: "",
  music_type: [],
  amenities: [],
  existingImages: [],
  newImages: [],
  existingThumbnail: "",
  newThumbnail: null,
};

/* =========================
 * Store
 * ========================= */

type NightlifeStore = {
  data: NightlifeUI;

  // hydration & updates
  hydrateFromServer: (doc: NightlifeDoc) => void;
  setData: (next: Partial<NightlifeUI>) => void;
  reset: () => void;

  // media helpers
  addNewImages: (files: File[]) => void;
  removeNewImage: (index: number) => void;
  removeExistingImage: (index: number) => void;
  setNewThumbnail: (file: File | null) => void;
  clearExistingThumbnail: () => void;

  // amenities & music
  addAmenity: (name: string) => void;
  removeAmenity: (index: number) => void;
  addMusic: (name: string) => void;
  removeMusic: (index: number) => void;
};

export const useNightlifeStore = create<NightlifeStore>()(
  persist(
    (set, get) => ({
      data: { ...BLANK },

      /** Use this when you load a doc from your API */
      hydrateFromServer: (doc) =>
        set(() => ({
          // overwrite to avoid stray keys (like server `images`) lingering
          data: { ...BLANK, ...toFormData(doc) },
        })),

      /** Use this for local, partial form updates */
      setData: (next) =>
        set((s) => ({ data: { ...s.data, ...next } })),

      reset: () => {
        const { data } = get();
        // Revoke previews to avoid leaks
        data.newImages.forEach((i) => i.preview && URL.revokeObjectURL(i.preview));
        if (data.newThumbnail?.preview) URL.revokeObjectURL(data.newThumbnail.preview);
        set({ data: { ...BLANK } });
      },

      /* ---------- Media ---------- */
      addNewImages: (files) =>
        set((s) => ({
          data: {
            ...s.data,
            newImages: [
              ...s.data.newImages,
              ...files.map((f) => ({ file: f, preview: URL.createObjectURL(f) })),
            ],
          },
        })),

      removeNewImage: (index) =>
        set((s) => {
          const item = s.data.newImages[index];
          if (item?.preview) URL.revokeObjectURL(item.preview);
          const next = s.data.newImages.filter((_, i) => i !== index);
          return { data: { ...s.data, newImages: next } };
        }),

      removeExistingImage: (index) =>
        set((s) => ({
          data: {
            ...s.data,
            existingImages: (s.data.existingImages || []).filter((_, i) => i !== index),
          },
        })),

      setNewThumbnail: (file) =>
        set((s) => {
          // cleanup old preview
          if (s.data.newThumbnail?.preview) URL.revokeObjectURL(s.data.newThumbnail.preview);
          if (!file) return { data: { ...s.data, newThumbnail: null } };
          return {
            data: {
              ...s.data,
              newThumbnail: { file, preview: URL.createObjectURL(file) },
            },
          };
        }),

      clearExistingThumbnail: () =>
        set((s) => ({ data: { ...s.data, existingThumbnail: "" } })),

      /* ---------- Amenities ---------- */
      addAmenity: (name) =>
        set((s) => ({
          data: {
            ...s.data,
            amenities: [...s.data.amenities, { name: name.trim() }],
          },
        })),

      removeAmenity: (index) =>
        set((s) => {
          const next = [...s.data.amenities];
          next.splice(index, 1);
          return { data: { ...s.data, amenities: next } };
        }),

      /* ---------- Music ---------- */
      addMusic: (name) =>
        set((s) => ({
          data: {
            ...s.data,
            music_type: [...s.data.music_type, name.trim()],
          },
        })),

      removeMusic: (index) =>
        set((s) => {
          const next = [...s.data.music_type];
          next.splice(index, 1);
          return { data: { ...s.data, music_type: next } };
        }),
    }),
    {
      name: "nightlife-draft", // keeps draft across navigation/refresh
      partialize: (state) => ({ data: state.data }), // only persist form data
      version: 1,
    }
  )
);



