// store/foodServiceStore.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ==========================================================
   1) Types
   ========================================================== */

// Helper types (kept consistent with your activity store)
export type MongoDate = string | { $date: string };
export type IDType = string | { $oid: string };

// Domain enums (mirror your form)
export type Category = "breakfast" | "lunch" | "dinner" | "snacks" | "beverages";
export type SpiceLevel = "mild" | "medium" | "hot" | "extra-hot";

export interface ActivitySegregatedImageGroup {
  category: Category; // or string if your backend is more flexible
  urls: string[]; // image URLs stored in DB
}

export interface DietaryInfo {
  vegetarian: boolean;
  vegan: boolean;
  glutenFree: boolean;
  halal: boolean;
}

/** Full addon object as returned by your API */
export interface FoodAddon {
  _id: string;
  name: string;
  description?: string;
  price?: number;
  category?: string;
  isAvailable?: boolean;
  image?: string;
  createdAt?: MongoDate;
  updatedAt?: MongoDate;
  __v?: number;
}

export interface FAQ {
  q: string;
  a: string;
}

/**
 * Store entity (what edit pages read/write).
 * - `addons` keeps only addon IDs for submit.
 * - `addonsFull` keeps full objects for rich edit UI.
 */
export interface FoodService {
  _id?: IDType;

  // Core
  name: string;
  description: string; // HTML from WYSIWYG
  category: Category;
  cuisine: string[];
  ingredients: string[];
  allergens: string[];
  spiceLevel: SpiceLevel;
  dietaryInfo: DietaryInfo;
  markup_min_price: number;
  markup_max_price: number;
  // Pricing / ratings
  price: number; // in INR
  rating: number; // 0..5
  reviewCount: number; // >= 0

  // Ops
  isAvailable: boolean;
  preparationTime: number; // minutes

  // Media
  banner?: string | null; // persisted URL (null if not set)
  images: string[]; // persisted URLs
  llm_chips?: FAQ[];
  segregated_images?: ActivitySegregatedImageGroup[];

  // Relations
  addons: string[]; // ObjectId strings (for submit)
  addonsFull?: FoodAddon[]; // Full addon objects (for edit UI)

  // Convenience flag for your UI (optional)
  isComplete?: boolean;

  // Mongoose meta
  createdAt?: MongoDate;
  updatedAt?: MongoDate;
  __v?: number;
}

/** UI form values (unchanged, just extended) */
export interface FoodFormUIValues {
  name: string;
  description: string; // HTML
  price: string | number | ""; // UI keeps as string, we’ll coerce
  category: Category | "";
  cuisineTags: string[];
  ingredients: string[];
  allergens: string[];
  spiceLevel: SpiceLevel;
  dietaryInfo: DietaryInfo;
  isAvailable: boolean;
  preparationTime: string | number | "";
  rating?: number | "";
  reviewCount?: number | "";
  addonIds: string[];
  markup_min_price: number | null;
markup_max_price: number | null;
  // Media in the UI are handled via Files; the store keeps only URLs
  bannerUrl?: string | null;
  images: string[]; // existing URLs only
  segregated_images?: ActivitySegregatedImageGroup[];
}

/* ==========================================================
   2) Helpers
   ========================================================== */

const num = (v: unknown, fallback = 0) => {
  if (v === "" || v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const fromFormUI = (ui: FoodFormUIValues): FoodService => {
  return {
    name: ui.name.trim(),
    description: (ui.description || "").trim(),
    category: (ui.category || "breakfast") as Category,
    cuisine: (ui.cuisineTags || []).map((s) => s.trim()).filter(Boolean),
    ingredients: (ui.ingredients || []).map((s) => s.trim()).filter(Boolean),
    allergens: (ui.allergens || []).map((s) => s.trim()).filter(Boolean),
    spiceLevel: ui.spiceLevel,
    dietaryInfo: {
      vegetarian: !!ui.dietaryInfo?.vegetarian,
      vegan: !!ui.dietaryInfo?.vegan,
      glutenFree: !!ui.dietaryInfo?.glutenFree,
      halal: !!ui.dietaryInfo?.halal,
    },
    markup_min_price: Math.max(0, num(ui.markup_min_price, 0)),
    markup_max_price: Math.max(0, num(ui.markup_max_price, 0)),
    price: Math.max(0, num(ui.price, 0)),
    rating: Math.min(5, Math.max(0, num(ui.rating, 0))),
    reviewCount: Math.max(0, Math.floor(num(ui.reviewCount, 0))),

    isAvailable: !!ui.isAvailable,
    preparationTime: Math.max(0, Math.floor(num(ui.preparationTime, 0))),

    banner: ui.bannerUrl ?? null,
    images: Array.isArray(ui.images) ? ui.images.slice() : [],

    // segregated images from UI
    segregated_images: Array.isArray(ui.segregated_images)
      ? ui.segregated_images.map((g) => ({
          category: g.category,
          urls: Array.isArray(g.urls) ? g.urls.filter(Boolean) : [],
        }))
      : [],

    addons: (ui.addonIds || []).filter(Boolean),
    llm_chips: [],
    isComplete: false, // you can toggle this from the UI
  };
};

/* ---------- API normalizer (new) ---------- */

export interface FoodAPIItem {
  _id: IDType | string;
  name?: string;
  description?: string;
  price?: number;
  banner?: string | null;
  images?: string[];
  category?: string;
  cuisine?: string[];
  ingredients?: string[];
  allergens?: string[];
  rating?: number;
  reviewCount?: number;
  isAvailable?: boolean;
  preparationTime?: number;
  spiceLevel?: SpiceLevel | string;
  dietaryInfo?: Partial<DietaryInfo>;
  addons?: FoodAddon[];
  llm_chips?: FAQ[];
  segregated_images?: ActivitySegregatedImageGroup[];
markup_min_price?: number;
markup_max_price?: number;
  createdAt?: MongoDate;
  updatedAt?: MongoDate;
  __v?: number;
}

const asCategory = (c?: string): Category =>
  (["breakfast", "lunch", "dinner", "snacks", "beverages"] as const).includes(
    c as Category
  )
    ? (c as Category)
    : "breakfast";

const asSpice = (s?: string): SpiceLevel =>
  (["mild", "medium", "hot", "extra-hot"] as const).includes(s as SpiceLevel)
    ? (s as SpiceLevel)
    : "mild";

export const fromAPI = (x: FoodAPIItem): FoodService => ({
  _id: x._id,
  name: (x.name ?? "").trim(),
  description: (x.description ?? "").trim(),
  category: asCategory(x.category),
  cuisine: Array.isArray(x.cuisine) ? x.cuisine.filter(Boolean) : [],
  ingredients: Array.isArray(x.ingredients) ? x.ingredients.filter(Boolean) : [],
  allergens: Array.isArray(x.allergens) ? x.allergens.filter(Boolean) : [],
  spiceLevel: asSpice(x.spiceLevel as string),

  dietaryInfo: {
    vegetarian: !!x.dietaryInfo?.vegetarian,
    vegan: !!x.dietaryInfo?.vegan,
    glutenFree: !!x.dietaryInfo?.glutenFree,
    halal: !!x.dietaryInfo?.halal,
  },
    markup_min_price: Number.isFinite(x.markup_min_price as number) ? (x.markup_min_price as number) : 0,
    markup_max_price: Number.isFinite(x.markup_max_price as number) ? (x.markup_max_price as number) : 0,

  price: Number.isFinite(x.price as number) ? (x.price as number) : 0,
  rating: Number.isFinite(x.rating as number) ? (x.rating as number) : 0,
  reviewCount: Number.isFinite(x.reviewCount as number)
    ? (x.reviewCount as number)
    : 0,

  isAvailable: x.isAvailable ?? true,
  preparationTime: Number.isFinite(x.preparationTime as number)
    ? (x.preparationTime as number)
    : 0,

  banner: x.banner ?? null,
  images: Array.isArray(x.images) ? x.images.filter(Boolean) : [],

  llm_chips: Array.isArray(x.llm_chips)
    ? x.llm_chips.map((f) => ({
        q: (f.q ?? "").toString(),
        a: (f.a ?? "").toString(),
      }))
    : [],

  // normalized segregated_images from API
  segregated_images: Array.isArray(x.segregated_images)
    ? x.segregated_images.map((g) => ({
        category: g.category,
        urls: Array.isArray(g.urls) ? g.urls.filter(Boolean) : [],
      }))
    : [],

  // keep both ids and full objects
  addons: Array.isArray(x.addons) ? x.addons.map((a) => a._id).filter(Boolean) : [],
  addonsFull: Array.isArray(x.addons) ? x.addons.slice() : [],

  isComplete: false,

  createdAt: x.createdAt,
  updatedAt: x.updatedAt,
  __v: x.__v,
});

/* ==========================================================
   3) Store
   ========================================================== */

interface FoodServiceStoreState {
  food: FoodService | null;

  /** Replace the entire food record (e.g., when loading for edit). */
  setFood: (food: FoodService) => void;

  /** Partial update helper for small UI edits. */
  patchFood: (patch: Partial<FoodService>) => void;

  /** Clear the stored entity. */
  clearFood: () => void;

  /** Set from UI form values (safe coercions + trimming). */
  setFromFormUI: (ui: FoodFormUIValues) => void;

  /** Set directly from API item (keeps addonsFull) */
  setFromAPI: (api: FoodAPIItem) => void;
}

export const useFoodServiceStore = create<FoodServiceStoreState>()(
  persist(
    (set, get) => ({
      food: null,

      setFood: (food) => set({ food }),

      patchFood: (patch) => {
        const current = get().food;
        if (!current) {
          set({ food: patch as FoodService });
          return;
        }
        set({ food: { ...current, ...patch } });
      },

      clearFood: () => set({ food: null }),

      setFromFormUI: (ui) => set({ food: fromFormUI(ui) }),

      setFromAPI: (api) => set({ food: fromAPI(api) }),
    }),
    {
      name: "food-service-storage", // localStorage key
      version: 1,
    }
  )
);

/* ==========================================================
   4) Optional: Initial blank (creator utility)
   ========================================================== */

export const BLANK_FOOD_SERVICE: FoodService = {
  name: "",
  description: "",
  category: "breakfast",
  cuisine: [],
  ingredients: [],
  allergens: [],
  spiceLevel: "mild",
  dietaryInfo: {
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    halal: false,
  },

  markup_min_price: null,
  markup_max_price: null,

  price: 0,
  rating: 0,
  reviewCount: 0,

  isAvailable: true,
  preparationTime: 0,

  banner: null,
  images: [],
  segregated_images: [],

  addons: [],
  isComplete: false,
};
