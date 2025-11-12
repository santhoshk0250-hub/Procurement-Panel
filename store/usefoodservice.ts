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

  // Pricing / ratings
  price: number;          // in INR
  rating: number;         // 0..5
  reviewCount: number;    // >= 0

  // Ops
  isAvailable: boolean;
  preparationTime: number; // minutes

  // Media
  banner?: string | null;  // persisted URL (null if not set)
  images: string[];        // persisted URLs

  // Relations
  addons: string[];          // ObjectId strings (for submit)
  addonsFull?: FoodAddon[];  // Full addon objects (for edit UI)

  // Convenience flag for your UI (optional)
  isComplete?: boolean;

  // Mongoose meta
  createdAt?: MongoDate;
  updatedAt?: MongoDate;
  __v?: number;
}

/** UI form values (unchanged) */
export interface FoodFormUIValues {
  name: string;
  description: string;  // HTML
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
  // Media in the UI are handled via Files; the store keeps only URLs
  bannerUrl?: string | null;
  images: string[]; // existing URLs only
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

    price: Math.max(0, num(ui.price, 0)),
    rating: Math.min(5, Math.max(0, num(ui.rating, 0))),
    reviewCount: Math.max(0, Math.floor(num(ui.reviewCount, 0))),

    isAvailable: !!ui.isAvailable,
    preparationTime: Math.max(0, Math.floor(num(ui.preparationTime, 0))),

    banner: ui.bannerUrl ?? null,
    images: Array.isArray(ui.images) ? ui.images.slice() : [],

    addons: (ui.addonIds || []).filter(Boolean),

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
  addons?: FoodAddon[];     // full objects from API
  createdAt?: MongoDate;
  updatedAt?: MongoDate;
  __v?: number;
}

const asCategory = (c?: string): Category =>
  (["breakfast","lunch","dinner","snacks","beverages"] as const).includes(c as Category)
    ? (c as Category)
    : "breakfast";

const asSpice = (s?: string): SpiceLevel =>
  (["mild","medium","hot","extra-hot"] as const).includes(s as SpiceLevel)
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

  price: Number.isFinite(x.price as number) ? (x.price as number) : 0,
  rating: Number.isFinite(x.rating as number) ? (x.rating as number) : 0,
  reviewCount: Number.isFinite(x.reviewCount as number) ? (x.reviewCount as number) : 0,

  isAvailable: x.isAvailable ?? true,
  preparationTime: Number.isFinite(x.preparationTime as number) ? (x.preparationTime as number) : 0,

  banner: x.banner ?? null,
  images: Array.isArray(x.images) ? x.images.filter(Boolean) : [],

  // keep both ids and full objects
  addons: Array.isArray(x.addons) ? x.addons.map(a => a._id).filter(Boolean) : [],
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
  dietaryInfo: { vegetarian: false, vegan: false, glutenFree: false, halal: false },

  price: 0,
  rating: 0,
  reviewCount: 0,

  isAvailable: true,
  preparationTime: 0,

  banner: null,
  images: [],

  addons: [],
  isComplete: false,
};
