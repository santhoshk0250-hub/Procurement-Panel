import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ==========================================================
   1) Shared helper types (same as Activity store)
   ========================================================== */

export type MongoDate = string | { $date: string };
export type IDType = string | { $oid: string };

/* ==========================================================
   2) Tour Manager specific types
   ========================================================== */

export interface TourManagerGalleryItem {
  tag: string;
  /** API currently returns `url`, controller may use `imageUrl` */
  url?: string;
  imageUrl?: string;
  index?: number;
}

export interface TourManagerProfileItem {
  name: string;
  experience?: string;
  description?: string;
  /** API currently returns `profilePic`, controller may use `profilePicUrl` */
  profilePic?: string;
  profilePicUrl?: string;
  index?: number;
}

export interface TourManagerPriceBreakdown {
  basePrice: number;
  serviceCharges?: number;
  taxes?: number;
  totalPrice: number;
  priceNote?: string;
   markup_min_price?: number;
  markup_max_price?: number;
}

export interface TourManagerTimings {
  from?: string; // e.g. "08:00 AM"
  to?: string;   // e.g. "07:00 PM"
}

export interface TourManagerOperationStep {
  time?: string;
  title?: string;
  description?: string; // HTML
}

/* ==========================================================
   3) Tour Manager model (store)
   ========================================================== */

export interface TourManager {
  _id?: IDType;

  /** Auto code like TM001, TM002… */
  managerId?: string;

  /** "tour-manager", "tour-guide", etc. */
  slug: string;

  /** Main title, e.g. "Goa Tour Manager" */
  title: string;

  /** Short description HTML (from rich text) */
  description: string;

  /** Full general info HTML */
  general_info?: string;

  /** Gallery with tags */
  gallery?: TourManagerGalleryItem[];

  /** Language pairs: [["Hindi","English"],["Tamil","Hindi"], ...] */
  language?: string[][];

  /** Price breakdown object */
  price_breakdown?: TourManagerPriceBreakdown;

  /** Timings object with 12h strings */
  timings?: TourManagerTimings;

  /** Operation process steps (HTML descriptions) */
  operationProcess?: TourManagerOperationStep[];

  /** Chips-type arrays */
  inclusions?: string[];
  exclusions?: string[];

  /** Tour manager / guide profiles */
  tourManagerProfiles?: TourManagerProfileItem[];

  /** Ratings */
  rating?: number;
  reviewCount?: number;

  /** Mongoose meta */
  createdAt?: MongoDate;
  updatedAt?: MongoDate;
  __v?: number;
}

/* ==========================================================
   4) Zustand Store (Persisted)
   ========================================================== */

interface TourManagerStoreState {
  /** The currently selected tour manager / guide (for edit page etc.) */
  tourManager: TourManager | null;

  /** Set directly from API response (list item or detail). */
  setFromAPI: (apiItem: Partial<TourManager>) => void;

  /** Partial update helper (for editing in-place). */
  patchTourManager: (patch: Partial<TourManager>) => void;

  /** Clear stored tour manager (e.g. when leaving edit page). */
  clearTourManager: () => void;
}

export const useTourManagerStore = create<TourManagerStoreState>()(
  persist(
    (set, get) => ({
      tourManager: null,

      setFromAPI: (apiItem) => {
        if (!apiItem) return;

        // Normalise some fields lightly so UI can rely on them
        const normalised: TourManager = {
          slug: apiItem.slug ?? "tour-manager",
          title: apiItem.title ?? "",
          description: apiItem.description ?? "",
          ...apiItem,
        } as TourManager;

        set({ tourManager: normalised });
      },

      patchTourManager: (patch) => {
        const current = get().tourManager;
        if (!current) {
          // If nothing in store yet, treat patch as full object
          if (!patch.slug) patch.slug = "tour-manager";
          if (!patch.title) patch.title = "";
          if (!patch.description) patch.description = "";
          set({ tourManager: patch as TourManager });
          return;
        }
        set({ tourManager: { ...current, ...patch } });
      },

      clearTourManager: () => set({ tourManager: null }),
    }),
    {
      name: "tour-manager-storage", // key in localStorage
      version: 1,
    }
  )
);
