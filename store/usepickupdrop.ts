import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ==========================================================
   1) Types aligned to models/TransferRoute.js
   ========================================================== */

export type IDType = string | { $oid: string };
export type MongoDate = string | { $date: string };

export type Currency = "INR" | (string & {});

export interface ServiceCharge {
  amount: number;                 // required if present
  currency?: Currency;            // defaults to INR on server
  notes?: string;
}

export interface NightCharge {
  enabled: boolean;
  amount?: number;                // required when enabled=true
  appliesFromHour?: number;       // 0..23 (server defaults: 22→6)
  appliesToHour?: number;         // 0..23
}

/** Client keeps dates as YYYY-MM-DD; server converts to Date */
export interface SpecialOverride {
  label?: string;                 // defaults to "Surge"
  price: number;
  currency?: Currency;

  // single-date mode
  date?: string;                  // YYYY-MM-DD

  // range mode
  startDate?: string;             // YYYY-MM-DD
  endDate?: string;               // YYYY-MM-DD
}

export type Availability =
  | "available"
  | "limited"
  | "unavailable"
  | "on-request";

export interface VehicleOption {
  vehicleType:
    | "4 SEATER"
    | "7 SEATER"
    | "13 SEATER"
    | "17-20 SEATER"
    | "20-30 SEATER"
    | "30-40 SEATER";
  maxPax: number;

  basePrice: number;
  currency?: Currency;

  vendorBasePrice?: number;
  sellerBasePrice?: number;

  nightCharge?: NightCharge;

  specialOverrides?: SpecialOverride[];

  availabilityStatus?: Availability;
  cancellationPolicy?: string;
  specialConditions?: string;

  serviceCharge?: ServiceCharge;
}

export interface TransferRoute {
  _id?: IDType;

  pickupLocation: string;
  dropLocation: string;

  vehicleOptions: VehicleOption[];

  // route-wide policies
  routeCancellationPolicy?: string;
  routeSpecialConditions?: string;

  // media
  images: string[];
  thumbnailUrl?: string | null;

  createdAt?: MongoDate;
  updatedAt?: MongoDate;
}

/* ==========================================================
   2) Defaults & Helpers
   ========================================================== */

const CURRENCY_DEFAULT: Currency = "INR";

export const newBlankVehicleOption = (): VehicleOption => ({
  vehicleType: "4 SEATER",
  maxPax: 4,
  basePrice: 0,
  currency: CURRENCY_DEFAULT,
  vendorBasePrice: 0,
  sellerBasePrice: 0,
  nightCharge: { enabled: false, amount: undefined, appliesFromHour: 22, appliesToHour: 6 },
  specialOverrides: [],
  availabilityStatus: "available",
  cancellationPolicy: "",
  specialConditions: "",
  serviceCharge: undefined,
});

export const newBlankRoute = (): TransferRoute => ({
  pickupLocation: "",
  dropLocation: "",
  vehicleOptions: [newBlankVehicleOption()],
  routeCancellationPolicy: "",
  routeSpecialConditions: "",
  images: [],
  thumbnailUrl: null,
});

/** Coercions mirroring `fromClientPayload` (server will also re-validate) */
export function toServerPayload(r: TransferRoute) {
  const coerceNightCharge = (nc?: NightCharge) => {
    if (!nc || !nc.enabled) return undefined;
    const from = Number.isFinite(Number(nc.appliesFromHour)) ? Number(nc.appliesFromHour) : 22;
    const to = Number.isFinite(Number(nc.appliesToHour)) ? Number(nc.appliesToHour) : 6;
    return {
      enabled: true,
      amount: Number(nc.amount || 0),
      appliesFromHour: Math.min(23, Math.max(0, from)),
      appliesToHour: Math.min(23, Math.max(0, to)),
    };
  };

  const ymd = (s?: string) => (s && s.trim() ? s : undefined);

  const coerceOverrides = (v: VehicleOption, fallbackCurrency?: Currency) => {
    const cur = (v.currency || fallbackCurrency || CURRENCY_DEFAULT).toUpperCase() as Currency;
    const list = Array.isArray(v.specialOverrides) ? v.specialOverrides : [];
    return list
      .map((o) => {
        const price = Number(o.price || 0);
        if (!(price >= 0)) return null;

        // single-date
        if (ymd(o.date)) {
          return {
            label: o.label || "Surge",
            price,
            currency: (o.currency || cur).toUpperCase(),
            date: ymd(o.date),
          };
        }

        // range
        if (ymd(o.startDate) && ymd(o.endDate)) {
          return {
            label: o.label || "Surge",
            price,
            currency: (o.currency || cur).toUpperCase(),
            startDate: ymd(o.startDate),
            endDate: ymd(o.endDate),
          };
        }

        return null;
      })
      .filter(Boolean) as SpecialOverride[];
  };

  const vopts = (r.vehicleOptions || []).map((v) => {
    const currency = (v.currency || CURRENCY_DEFAULT).toUpperCase() as Currency;
    const basePrice = Number(
      v.basePrice ?? v.sellerBasePrice ?? 0
    );
    const vendorBasePrice = Number(v.vendorBasePrice ?? 0);
    const sellerBasePrice = Number(v.sellerBasePrice ?? basePrice ?? 0);

    const serviceCharge =
      v.serviceCharge && (v.serviceCharge.amount || v.serviceCharge.amount === 0)
        ? {
            amount: Number(v.serviceCharge.amount || 0),
            currency: (v.serviceCharge.currency || currency || CURRENCY_DEFAULT).toUpperCase() as Currency,
            notes: v.serviceCharge.notes || undefined,
          }
        : undefined;

    return {
      vehicleType: v.vehicleType,
      maxPax: Number(v.maxPax || 0),

      basePrice,
      currency,
      vendorBasePrice,
      sellerBasePrice,

      nightCharge: coerceNightCharge(v.nightCharge),

      specialOverrides: coerceOverrides(v, currency),

      availabilityStatus: (v.availabilityStatus || "available") as Availability,
      cancellationPolicy: v.cancellationPolicy || undefined,
      specialConditions: v.specialConditions || undefined,

      serviceCharge,
    };
  });

  return {
    pickupLocation: r.pickupLocation,
    dropLocation: r.dropLocation,
    vehicleOptions: vopts,
    routeCancellationPolicy: r.routeCancellationPolicy || undefined,
    routeSpecialConditions: r.routeSpecialConditions || undefined,
    // media handled separately by upload flow; include if needed
    images: r.images,
    thumbnailUrl: r.thumbnailUrl ?? null,
  };
}

/* ==========================================================
   3) Store API
   ========================================================== */

interface PickupDropStore {
  route: TransferRoute;

  setRoute: (r: TransferRoute) => void;
  patchRoute: (patch: Partial<TransferRoute>) => void;
  clearRoute: () => void;

  // vehicleOptions ops
  addVehicleOption: (opt?: Partial<VehicleOption>) => void;
  updateVehicleOption: (index: number, patch: Partial<VehicleOption>) => void;
  removeVehicleOption: (index: number) => void;

  // special overrides
  addOverride: (vIndex: number, o?: Partial<SpecialOverride>) => void;
  updateOverride: (vIndex: number, oIndex: number, patch: Partial<SpecialOverride>) => void;
  removeOverride: (vIndex: number, oIndex: number) => void;

  // night charge
  setNightCharge: (vIndex: number, nc: NightCharge) => void;

  // service charge
  setServiceCharge: (vIndex: number, sc?: ServiceCharge) => void;

  // media
  setThumbnailUrl: (url: string | null) => void;
  setImages: (urls: string[]) => void;

  // policies
  setRoutePolicies: (policy: { routeCancellationPolicy?: string; routeSpecialConditions?: string }) => void;
}

/* ==========================================================
   4) Store
   ========================================================== */

export const usePickupDropStore = create<PickupDropStore>()(
  persist(
    (set, get) => ({
      route: newBlankRoute(),

      setRoute: (r) => set({ route: { ...r } }),

      patchRoute: (patch) => set({ route: { ...get().route, ...patch } }),

      clearRoute: () => set({ route: newBlankRoute() }),

      addVehicleOption: (opt) =>
        set({
          route: {
            ...get().route,
            vehicleOptions: [...(get().route.vehicleOptions || []), { ...newBlankVehicleOption(), ...opt }],
          },
        }),

      updateVehicleOption: (index, patch) =>
        set({
          route: {
            ...get().route,
            vehicleOptions: (get().route.vehicleOptions || []).map((v, i) =>
              i === index ? { ...v, ...patch } : v
            ),
          },
        }),

      removeVehicleOption: (index) =>
        set({
          route: {
            ...get().route,
            vehicleOptions: (get().route.vehicleOptions || []).filter((_, i) => i !== index),
          },
        }),

      addOverride: (vIndex, o) =>
        set({
          route: {
            ...get().route,
            vehicleOptions: (get().route.vehicleOptions || []).map((v, i) =>
              i === vIndex
                ? {
                    ...v,
                    specialOverrides: [...(v.specialOverrides || []), { label: "Surge", price: 0, ...o }],
                  }
                : v
            ),
          },
        }),

      updateOverride: (vIndex, oIndex, patch) =>
        set({
          route: {
            ...get().route,
            vehicleOptions: (get().route.vehicleOptions || []).map((v, i) =>
              i === vIndex
                ? {
                    ...v,
                    specialOverrides: (v.specialOverrides || []).map((ov, j) =>
                      j === oIndex ? { ...ov, ...patch } : ov
                    ),
                  }
                : v
            ),
          },
        }),

      removeOverride: (vIndex, oIndex) =>
        set({
          route: {
            ...get().route,
            vehicleOptions: (get().route.vehicleOptions || []).map((v, i) =>
              i === vIndex
                ? { ...v, specialOverrides: (v.specialOverrides || []).filter((_, j) => j !== oIndex) }
                : v
            ),
          },
        }),

      setNightCharge: (vIndex, nc) =>
        set({
          route: {
            ...get().route,
            vehicleOptions: (get().route.vehicleOptions || []).map((v, i) =>
              i === vIndex ? { ...v, nightCharge: { ...v.nightCharge, ...nc } } : v
            ),
          },
        }),

      setServiceCharge: (vIndex, sc) =>
        set({
          route: {
            ...get().route,
            vehicleOptions: (get().route.vehicleOptions || []).map((v, i) =>
              i === vIndex ? { ...v, serviceCharge: sc } : v
            ),
          },
        }),

      setThumbnailUrl: (url) =>
        set({ route: { ...get().route, thumbnailUrl: url } }),

      setImages: (urls) =>
        set({ route: { ...get().route, images: Array.isArray(urls) ? urls : [] } }),

      setRoutePolicies: ({ routeCancellationPolicy, routeSpecialConditions }) =>
        set({
          route: {
            ...get().route,
            routeCancellationPolicy:
              routeCancellationPolicy !== undefined ? routeCancellationPolicy : get().route.routeCancellationPolicy,
            routeSpecialConditions:
              routeSpecialConditions !== undefined ? routeSpecialConditions : get().route.routeSpecialConditions,
          },
        }),
    }),
    {
      name: "pickupdrop-storage-v1",
      version: 1,
      partialize: (state) => ({ route: state.route }),
    }
  )
);
