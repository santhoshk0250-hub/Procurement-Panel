// store/foodServiceStore.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ==========================================================
   1) Types
   ========================================================== */

export type MongoDate = string | { $date: string };
export type IDType = string | { $oid: string };

export type Category = "breakfast" | "lunch" | "dinner" | "snacks" | "beverages";
export type SpiceLevel = "mild" | "medium" | "hot" | "extra-hot";

export interface ActivitySegregatedImageGroup {
  category: Category;
  urls: string[];
}

export interface DietaryInfo {
  vegetarian: boolean;
  vegan: boolean;
  glutenFree: boolean;
  halal: boolean;
}

/** ✅ DB expects taxes as NUMBER (amount), but UI uses taxesPercent (percentage). */
export interface PriceBreakdown {
  basePrice: number; // amount
  serviceCharges: number; // amount
  taxes: number; // amount
  totalPrice: number; // amount
  markup_min_price: number; // amount
  markup_max_price: number; // amount

  /** optional, UI helper */
  taxesPercent?: number; // percentage
}

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

export interface FoodService {
  _id?: IDType;

  name: string;
  description: string;
  category: Category;
  cuisine: string[];
  ingredients: string[];
  allergens: string[];
  spiceLevel: SpiceLevel;
  dietaryInfo: DietaryInfo;

  // Backward compat (you already have these)
  markup_min_price: number | null;
  markup_max_price: number | null;

  // Backward compat (you already have this)
  price: number;

  // ✅ NEW
  priceBreakdown: PriceBreakdown;

  rating: number;
  reviewCount: number;

  isAvailable: boolean;
  preparationTime: number;

  banner?: string | null;
  images: string[];
  llm_chips?: FAQ[];
  segregated_images?: ActivitySegregatedImageGroup[];

  addons: string[];
  addonsFull?: FoodAddon[];

  isComplete?: boolean;

  createdAt?: MongoDate;
  updatedAt?: MongoDate;
  __v?: number;
}

/** UI form values */
export interface FoodFormUIValues {
  name: string;
  description: string;

  // old field (still allowed)
  price: string | number | "";

  // ✅ NEW: UI breakdown (taxes is percent in UI)
  priceBreakdown?: {
    basePrice: string | number | "";
    serviceCharges: string | number | "";
    taxesPercent: string | number | ""; // percentage in UI
    markup_min_price: string | number | "" | null;
    markup_max_price: string | number | "" | null;
  };

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

  // keep old markups too
  markup_min_price: number | null;
  markup_max_price: number | null;

  bannerUrl?: string | null;
  images: string[];
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
const clamp0 = (n: number) => (Number.isFinite(n) ? Math.max(0, n) : 0);

const round2 = (n: number) => Math.round(n * 100) / 100;

/** ✅ taxesPercent -> taxes amount + total calc */
export const computePriceBreakdown = (args: {
  basePrice: unknown;
  serviceCharges: unknown;
  taxesPercent: unknown;
  markup_min_price: unknown;
  markup_max_price: unknown;
}): PriceBreakdown => {
  const basePrice = clamp0(num(args.basePrice, 0));
  const serviceCharges = clamp0(num(args.serviceCharges, 0));
  const taxesPercent = clamp0(num(args.taxesPercent, 0));

  const taxable = basePrice + serviceCharges;
  const taxes = round2((taxable * taxesPercent) / 100);
  const totalPrice = round2(taxable + taxes);

  const markup_min_price = clamp0(num(args.markup_min_price, 0));
  const markup_max_price = clamp0(num(args.markup_max_price, 0));

  return {
    basePrice,
    serviceCharges,
    taxes,
    totalPrice,
    markup_min_price,
    markup_max_price,
    taxesPercent,
  };
};

export const fromFormUI = (ui: FoodFormUIValues): FoodService => {
  const pb = computePriceBreakdown({
    basePrice: ui.priceBreakdown?.basePrice ?? ui.price ?? 0,
    serviceCharges: ui.priceBreakdown?.serviceCharges ?? 0,
    taxesPercent: ui.priceBreakdown?.taxesPercent ?? 0,
    markup_min_price: ui.priceBreakdown?.markup_min_price ?? ui.markup_min_price ?? 0,
    markup_max_price: ui.priceBreakdown?.markup_max_price ?? ui.markup_max_price ?? 0,
  });

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

    // keep old fields in sync
    markup_min_price: pb.markup_min_price,
    markup_max_price: pb.markup_max_price,
    price: pb.basePrice,

    priceBreakdown: pb,

    rating: Math.min(5, Math.max(0, num(ui.rating, 0))),
    reviewCount: Math.max(0, Math.floor(num(ui.reviewCount, 0))),

    isAvailable: !!ui.isAvailable,
    preparationTime: Math.max(0, Math.floor(num(ui.preparationTime, 0))),

    banner: ui.bannerUrl ?? null,
    images: Array.isArray(ui.images) ? ui.images.slice() : [],

    segregated_images: Array.isArray(ui.segregated_images)
      ? ui.segregated_images.map((g) => ({
          category: g.category,
          urls: Array.isArray(g.urls) ? g.urls.filter(Boolean) : [],
        }))
      : [],

    addons: (ui.addonIds || []).filter(Boolean),
    llm_chips: [],
    isComplete: false,
  };
};

/* ---------- API normalizer ---------- */

export interface FoodAPIItem {
  _id: IDType | string;
  name?: string;
  description?: string;

  price?: number;
  priceBreakdown?: Partial<PriceBreakdown>;

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
  (["breakfast", "lunch", "dinner", "snacks", "beverages"] as const).includes(c as Category)
    ? (c as Category)
    : "breakfast";

const asSpice = (s?: string): SpiceLevel =>
  (["mild", "medium", "hot", "extra-hot"] as const).includes(s as SpiceLevel)
    ? (s as SpiceLevel)
    : "mild";

const normalizePBFromAPI = (x: FoodAPIItem): PriceBreakdown => {
  const pb = x.priceBreakdown ?? {};

  const basePrice = clamp0(
    Number.isFinite(pb.basePrice as number)
      ? (pb.basePrice as number)
      : Number.isFinite(x.price as number)
      ? (x.price as number)
      : 0
  );
  const serviceCharges = clamp0(Number.isFinite(pb.serviceCharges as number) ? (pb.serviceCharges as number) : 0);
  const taxes = clamp0(Number.isFinite(pb.taxes as number) ? (pb.taxes as number) : 0);
  const totalPrice = clamp0(
    Number.isFinite(pb.totalPrice as number) ? (pb.totalPrice as number) : basePrice + serviceCharges + taxes
  );

  const markup_min_price = clamp0(
    Number.isFinite(pb.markup_min_price as number)
      ? (pb.markup_min_price as number)
      : Number.isFinite(x.markup_min_price as number)
      ? (x.markup_min_price as number)
      : 0
  );
  const markup_max_price = clamp0(
    Number.isFinite(pb.markup_max_price as number)
      ? (pb.markup_max_price as number)
      : Number.isFinite(x.markup_max_price as number)
      ? (x.markup_max_price as number)
      : 0
  );

  // taxesPercent may or may not be sent by API
  const taxesPercent = Number.isFinite(pb.taxesPercent as number) ? (pb.taxesPercent as number) : undefined;

  return {
    basePrice,
    serviceCharges,
    taxes,
    totalPrice,
    markup_min_price,
    markup_max_price,
    ...(taxesPercent != null ? { taxesPercent } : {}),
  };
};

export const fromAPI = (x: FoodAPIItem): FoodService => {
  const pb = normalizePBFromAPI(x);

  return {
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

    markup_min_price: pb.markup_min_price,
    markup_max_price: pb.markup_max_price,

    price: pb.basePrice,
    priceBreakdown: pb,

    rating: Number.isFinite(x.rating as number) ? (x.rating as number) : 0,
    reviewCount: Number.isFinite(x.reviewCount as number) ? (x.reviewCount as number) : 0,

    isAvailable: x.isAvailable ?? true,
    preparationTime: Number.isFinite(x.preparationTime as number) ? (x.preparationTime as number) : 0,

    banner: x.banner ?? null,
    images: Array.isArray(x.images) ? x.images.filter(Boolean) : [],

    llm_chips: Array.isArray(x.llm_chips)
      ? x.llm_chips.map((f) => ({
          q: (f.q ?? "").toString(),
          a: (f.a ?? "").toString(),
        }))
      : [],

    segregated_images: Array.isArray(x.segregated_images)
      ? x.segregated_images.map((g) => ({
          category: g.category,
          urls: Array.isArray(g.urls) ? g.urls.filter(Boolean) : [],
        }))
      : [],

    addons: Array.isArray(x.addons) ? x.addons.map((a) => a._id).filter(Boolean) : [],
    addonsFull: Array.isArray(x.addons) ? x.addons.slice() : [],

    isComplete: false,
    createdAt: x.createdAt,
    updatedAt: x.updatedAt,
    __v: x.__v,
  };
};

/* ==========================================================
   3) Store
   ========================================================== */

interface FoodServiceStoreState {
  food: FoodService | null;

  setFood: (food: FoodService) => void;
  patchFood: (patch: Partial<FoodService>) => void;
  clearFood: () => void;

  setFromFormUI: (ui: FoodFormUIValues) => void;
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
      name: "food-service-storage",
      version: 2, // ✅ bump because schema changed
    }
  )
);

/* ==========================================================
   4) Blank
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

  markup_min_price: 0,
  markup_max_price: 0,

  price: 0,
  priceBreakdown: {
    basePrice: 0,
    serviceCharges: 0,
    taxes: 0,
    totalPrice: 0,
    markup_min_price: 0,
    markup_max_price: 0,
    taxesPercent: 0,
  },

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
