// store/sightseeingPackageStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ==========================================================
   1) Types (match your Mongoose schema + timestamps)
   ========================================================== */

// Helpers for Mongo-ish values (compatible with dumps you might hydrate from)
type MongoDate = string | { $date: string };
type IDType = string | { $oid: string };

export interface FAQ {
  q: string;
  a: string;
}

export interface SightseeingPackage {
  // Core
  tour_name: string;
  vehicle_type: string;

  // Pax & duration
  min_pax: number;
  max_pax: number;
  duration_hours: number;

  // Timings (loose human-readable range strings)
  regular_timings: string;
  alternative_timings: string;

  // Places (names are denormalized for display; ids reference places collection)
  places_to_visit_names: string[];
  place_ids: IDType[];

  // Commercials
  inclusions: string[];
  exclusions: string[];
  llm_chips?: FAQ[];
  // Pricing (nullable in DB)
  price_regular: number | null;
  price_block_out: number | null;
  price_block_out_special: number | null;
  service_charge: number | null;

  // Notes
  special_mentions: string;
  notes: string;

  // Timestamps / internal (optional when editing/creating)
  createdAt?: MongoDate;
  updatedAt?: MongoDate;
  __v?: number;
}

/* Clean initial object mirroring your form defaults */
export const SIGHTSEEING_INITIAL: SightseeingPackage = {
  tour_name: "",
  vehicle_type: "",

  min_pax: 1,
  max_pax: 1,
  duration_hours: 1,

  regular_timings: "",
  alternative_timings: "",

  places_to_visit_names: [],
  place_ids: [],

  inclusions: [],
  exclusions: [],
llm_chips: [],
  price_regular: null,
  price_block_out: null,
  price_block_out_special: null,
  service_charge: null,

  special_mentions: "",
  notes: "",
};

/* ==========================================================
   2) Store shape
   ========================================================== */

interface SightseeingPackageStoreState {
  pkg: SightseeingPackage;

  // Replace the whole package (e.g., when loading for edit)
  setPackage: (pkg: SightseeingPackage) => void;

  // Patch updates (convenient for form fields)
  updatePackage: (patch: Partial<SightseeingPackage>) => void;

  // Pax & duration helpers
  setPax: (min: number, max: number) => void;
  setDuration: (hours: number) => void;

  // Timings helpers
  setTimings: (regular: string, alternative?: string) => void;

  // Places helpers
  setPlaceIds: (ids: IDType[]) => void;
  addPlaceId: (id: IDType) => void;
  removePlaceId: (id: IDType) => void;

  setPlaceNames: (names: string[]) => void;
  addPlaceName: (name: string) => void;
  removePlaceNameAt: (index: number) => void;

  // Commercials helpers
  setInclusions: (arr: string[]) => void;
  addInclusion: (v: string) => void;
  removeInclusionAt: (index: number) => void;

  setExclusions: (arr: string[]) => void;
  addExclusion: (v: string) => void;
  removeExclusionAt: (index: number) => void;

  // Pricing helpers
  setPrices: (p: {
    price_regular?: number | null;
    price_block_out?: number | null;
    price_block_out_special?: number | null;
    service_charge?: number | null;
  }) => void;

  // Notes
  setNotes: (notes: string) => void;
  setSpecialMentions: (txt: string) => void;

  setLlmChips: (chips: FAQ[]) => void;
  addLlmChip: (chip: FAQ) => void;
  updateLlmChipAt: (index: number, patch: Partial<FAQ>) => void;
  removeLlmChipAt: (index: number) => void;

  // Reset
  clearPackage: () => void;

  // Derived (optional convenience)
  isSharing: () => boolean;
}

/* ==========================================================
   3) Zustand store (persisted to localStorage)
   ========================================================== */

export const useSightseeingPackageStore = create<SightseeingPackageStoreState>()(
  persist(
    (set, get) => ({
      pkg: { ...SIGHTSEEING_INITIAL },

      setPackage: (pkg) => set({ pkg }),

      updatePackage: (patch) => set({ pkg: { ...get().pkg, ...patch } }),

      setPax: (min, max) =>
        set({ pkg: { ...get().pkg, min_pax: min, max_pax: Math.max(min, max) } }),

      setDuration: (hours) =>
        set({ pkg: { ...get().pkg, duration_hours: Math.min(Math.max(1, hours), 24) } }),

      setTimings: (regular, alternative = get().pkg.alternative_timings) =>
        set({
          pkg: {
            ...get().pkg,
            regular_timings: (regular || "").trim(),
            alternative_timings: (alternative || "").trim(),
          },
        }),

      /* ---------- Places ---------- */
      setPlaceIds: (ids) => set({ pkg: { ...get().pkg, place_ids: dedup(ids) } }),

      addPlaceId: (id) =>
        set({
          pkg: {
            ...get().pkg,
            place_ids: dedup([...(get().pkg.place_ids || []), id]),
          },
        }),

      removePlaceId: (id) =>
        set({
          pkg: {
            ...get().pkg,
            place_ids: (get().pkg.place_ids || []).filter((x) => toStr(x) !== toStr(id)),
          },
        }),

      setPlaceNames: (names) =>
        set({
          pkg: { ...get().pkg, places_to_visit_names: dedupStr(names) },
        }),

      addPlaceName: (name) =>
        set({
          pkg: {
            ...get().pkg,
            places_to_visit_names: dedupStr([...(get().pkg.places_to_visit_names || []), name]),
          },
        }),

      removePlaceNameAt: (index) =>
        set({
          pkg: {
            ...get().pkg,
            places_to_visit_names: (get().pkg.places_to_visit_names || []).filter(
              (_v, i) => i !== index
            ),
          },
        }),

      /* ---------- Commercials ---------- */
      setInclusions: (arr) =>
        set({ pkg: { ...get().pkg, inclusions: dedupStr(arr) } }),

      addInclusion: (v) =>
        set({
          pkg: { ...get().pkg, inclusions: dedupStr([...(get().pkg.inclusions || []), v]) },
        }),

      removeInclusionAt: (index) =>
        set({
          pkg: {
            ...get().pkg,
            inclusions: (get().pkg.inclusions || []).filter((_, i) => i !== index),
          },
        }),

      setExclusions: (arr) =>
        set({ pkg: { ...get().pkg, exclusions: dedupStr(arr) } }),

      addExclusion: (v) =>
        set({
          pkg: { ...get().pkg, exclusions: dedupStr([...(get().pkg.exclusions || []), v]) },
        }),

      removeExclusionAt: (index) =>
        set({
          pkg: {
            ...get().pkg,
            exclusions: (get().pkg.exclusions || []).filter((_, i) => i !== index),
          },
        }),

      /* ---------- Pricing ---------- */
      setPrices: (p) =>
        set({
          pkg: {
            ...get().pkg,
            price_regular:
              "price_regular" in p ? nullableNum(p.price_regular) : get().pkg.price_regular,
            price_block_out:
              "price_block_out" in p ? nullableNum(p.price_block_out) : get().pkg.price_block_out,
            price_block_out_special:
              "price_block_out_special" in p
                ? nullableNum(p.price_block_out_special)
                : get().pkg.price_block_out_special,
            service_charge:
              "service_charge" in p ? nullableNum(p.service_charge) : get().pkg.service_charge,
          },
        }),

      /* ---------- Notes ---------- */
      setNotes: (notes) => set({ pkg: { ...get().pkg, notes } }),
      setSpecialMentions: (txt) => set({ pkg: { ...get().pkg, special_mentions: txt } }),

         /* ---------- LLM chips ---------- */
      setLlmChips: (chips) =>
        set({
          pkg: {
            ...get().pkg,
            llm_chips: chips.map((c) => ({
              q: (c.q ?? "").toString(),
              a: (c.a ?? "").toString(),
            })),
          },
        }),

      addLlmChip: (chip) =>
        set({
          pkg: {
            ...get().pkg,
            llm_chips: [
              ...(get().pkg.llm_chips || []),
              {
                q: (chip.q ?? "").toString(),
                a: (chip.a ?? "").toString(),
              },
            ],
          },
        }),

      updateLlmChipAt: (index, patch) =>
        set({
          pkg: {
            ...get().pkg,
            llm_chips: (get().pkg.llm_chips || []).map((c, i) =>
              i === index
                ? {
                    q:
                      patch.q !== undefined
                        ? patch.q.toString()
                        : c.q,
                    a:
                      patch.a !== undefined
                        ? patch.a.toString()
                        : c.a,
                  }
                : c
            ),
          },
        }),

      removeLlmChipAt: (index) =>
        set({
          pkg: {
            ...get().pkg,
            llm_chips: (get().pkg.llm_chips || []).filter(
              (_c, i) => i !== index
            ),
          },
        }),

      /* ---------- Reset ---------- */
      clearPackage: () => set({ pkg: { ...SIGHTSEEING_INITIAL } }),

      /* ---------- Derived ---------- */
      isSharing: () => /sharing/i.test(get().pkg.tour_name || ""),
    }),
    {
      name: "sightseeing-package-storage", // localStorage key
      version: 1,
    }
  )
);

/* ==========================================================
   4) Utilities
   ========================================================== */

function toStr(id: IDType) {
  return typeof id === "string" ? id : id?.$oid ?? "";
}
function dedup<T>(arr: T[]) {
  return Array.from(new Map(arr.map((v) => [JSON.stringify(v), v])).values());
}
function dedupStr(arr: string[]) {
  return Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean)));
}
function nullableNum(v: number | null | undefined) {
  if (v === null || typeof v === "number") return v;
  return typeof v === "undefined" ? null : Number(v);
}

/* ==========================================================
   5) (Optional) Selectors for cleaner usage
   ========================================================== */
// Example usage in components:
// const tourName = useSightseeingPackageStore((s) => s.pkg.tour_name);
// const addInclusion = useSightseeingPackageStore((s) => s.addInclusion);
// useSightseeingPackageStore.getState().updatePackage({ tour_name: "North Goa (Sharing)" });
