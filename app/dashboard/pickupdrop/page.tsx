"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  RouteIcon as Route,
  MapPin,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  Truck,
  Calendar,
  SunMoon,
  Image as ImageIcon,
  X,
  Info as InfoIcon,
  IndianRupee,
} from "lucide-react";
import { Button } from "@mui/material";
import { AddCircleOutline } from "@mui/icons-material";
import Link from "next/link";
import TinyMCETextEditor from "@/components/TinyMCETextEditor";



/* =========================
   Types (UI shape)
   ========================= */

type Currency = string;
type Availability = "available" | "limited" | "unavailable" | "on-request";

type VehicleType =
  | "4 SEATER"
  | "7 SEATER"
  | "13 SEATER"
  | "17-20 SEATER"
  | "20-30 SEATER"
  | "30-40 SEATER";

interface NightChargeUI {
  enabled?: boolean;
  amount?: number | "";
  appliesFromHour?: number | "";
  appliesToHour?: number | "";
}

interface SurgeItem {
  mode: "single" | "range";
  date?: string;
  startDate?: string;
  endDate?: string;
  price: number | "";
}

interface ServiceCharge {
  amount?: number | "";
  currency?: Currency;
  notes?: string;
}

type NewImage = { file: File; preview: string };

interface RatingsUI {
  average?: number | "";
  totalReviews?: number | "";
}

interface VehicleOptionUI {
  vehiclename?: string;
  vehicleType: VehicleType;
  maxPax: number | "";
  vendorPrice: number | "";
  sellerPrice: number | "";
  chargePerKm?: number | "";
  currency?: Currency;
  nightCharge?: NightChargeUI;
  surgeCharges: SurgeItem[];
  availabilityStatus?: Availability;
  specialConditions?: string;
  serviceCharge?: ServiceCharge;

  // extra fields from API
  vehicleId?: string;
  description?: string; // ✅ store HTML
  minimumDistanceKm?: number | "";
  minimumCharge?: number | "";
  year?: number | "";
  fuelType?: string;
  transmission?: string;
  markup_min_price?: number;
  markup_max_price?: number;
  ratings?: RatingsUI;
  amenities?: string[];
  safetyFeatures?: string[];

  // images per vehicle option
  imagesExisting: string[];
  imagesRemovedExisting: string[];
  imagesNew: NewImage[];
}

interface TransferRouteFormData {
  pickups: string[];
  drops: string[];
  vehicleOptions: VehicleOptionUI[];
}

/* =========================
   Constants & helpers
   ========================= */

const VEHICLE_TYPE_OPTIONS: VehicleType[] = [
  "4 SEATER",
  "7 SEATER",
  "13 SEATER",
  "17-20 SEATER",
  "20-30 SEATER",
  "30-40 SEATER",
];

const VEHICLE_TYPE_TO_MAX_PAX: Record<VehicleType, number[]> = {
  "4 SEATER": [4],
  "7 SEATER": [7],
  "13 SEATER": [13],
  "17-20 SEATER": Array.from({ length: 4 }, (_, i) => 17 + i),
  "20-30 SEATER": Array.from({ length: 11 }, (_, i) => 20 + i),
  "30-40 SEATER": Array.from({ length: 11 }, (_, i) => 30 + i),
};

const BLANK_SURGE: SurgeItem = {
  mode: "single",
  date: "",
  startDate: "",
  endDate: "",
  price: "",
};
const BLANK_SERVICE: ServiceCharge = { amount: "", currency: "INR", notes: "" };
const BLANK_NIGHT: NightChargeUI = {
  enabled: false,
  amount: "",
  appliesFromHour: 22,
  appliesToHour: 6,
};
const BLANK_RATINGS: RatingsUI = { average: "", totalReviews: "" };

const n = (v: any) => (v === "" || v == null ? NaN : Number(v));
const isFiniteNum = (v: any) => typeof v === "number" && Number.isFinite(v);
const toNumOrZero = (v: any) => (v === "" || v == null ? 0 : Number(v));

const uniq = (arr: string[]) =>
  Array.from(new Set(arr.map((s) => (s || "").trim()).filter(Boolean)));

/* =========================
   Date + Overrides mappers
   ========================= */

/** Accepts Mongo-style { $date: string }, ISO string, Date, or undefined. Returns YYYY-MM-DD or "" */
function normalizeToYMD(input: any): string {
  try {
    if (!input) return "";
    // Mongo { $date: "..." }
    if (typeof input === "object" && "$date" in (input || {})) {
      const d = new Date((input as any).$date);
      return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
    }
    // Plain Date
    if (input instanceof Date) {
      return Number.isNaN(input.getTime()) ? "" : input.toISOString().slice(0, 10);
    }
    // ISO string or date-like string
    if (typeof input === "string") {
      const d = new Date(input);
      return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
    }
    return "";
  } catch {
    return "";
  }
}

/** Convert a backend specialOverride item into a SurgeItem for the UI */
function overrideToSurgeItem(ov: any): SurgeItem | null {
  if (!ov || typeof ov !== "object") return null;

  const label = (ov.label || "").toLowerCase();
  const priceVal = ov.price === "" || ov.price == null ? NaN : Number(ov.price);

  if (!Number.isFinite(priceVal)) return null;

  if (label === "single") {
    const ymd =
      normalizeToYMD((ov as any).date) || normalizeToYMD((ov as any).startDate);
    if (!ymd) return null;
    return { mode: "single", date: ymd, price: Number(priceVal) };
  }

  if (label === "range") {
    const start = normalizeToYMD((ov as any).startDate);
    const end = normalizeToYMD((ov as any).endDate);
    if (!start || !end) return null;
    return { mode: "range", startDate: start, endDate: end, price: Number(priceVal) };
  }

  return null;
}

/** Build backend specialOverride from a UI surge item */
function cookSurgeToOverride(b: SurgeItem, currency: string) {
  const price = b.price === "" || b.price == null ? NaN : Number(b.price);
  if (!Number.isFinite(price)) return null;

  const cur = currency || "INR";
  if (b.mode === "single") {
    const d = (b.date || "").trim();
    if (!d) return null;
    return { label: "single", price: Number(price), currency: cur, startDate: d };
  }
  const start = (b.startDate || "").trim();
  const end = (b.endDate || "").trim();
  if (!start || !end) return null;
  return { label: "range", price: Number(price), currency: cur, startDate: start, endDate: end };
}

/* =========================
   Component
   ========================= */
export default function EditTransferRouteMobile() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idFromQuery = searchParams.get("id") || "690c7d5bdafce6ed45e1d04d";

  // ------- Load existing doc via API (no store) -------
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [doc, setDoc] = useState<any | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!idFromQuery) {
        setLoadErr("Missing id in query");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE}pickupdrop/${encodeURIComponent(
            idFromQuery
          )}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(await res.text());
        const payload = await res.json();
        if (isMounted) {
          setDoc(payload?.data || null);
          setLoadErr(null);
        }
      } catch (e: any) {
        if (isMounted) setLoadErr(e?.message || "Failed to fetch transfer");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [idFromQuery]);

  // ------- Build initial form state from fetched doc -------
  const initialForm: TransferRouteFormData = useMemo(() => {
    const d = doc;
    if (!d) {
      return {
        pickups: [""],
        drops: [""],
        vehicleOptions: [
          {
            vehiclename: "",
            vehicleType: "4 SEATER",
            maxPax: 4,
            vendorPrice: "",
            sellerPrice: "",
            chargePerKm: "",
            currency: "INR",
            nightCharge: { ...BLANK_NIGHT },
            surgeCharges: [],
            availabilityStatus: "available",
            specialConditions: "",
            serviceCharge: { ...BLANK_SERVICE },

            vehicleId: "",
            description: "",

            minimumDistanceKm: "",
            minimumCharge: "",
            year: "",
            fuelType: "",
            transmission: "",
            ratings: { ...BLANK_RATINGS },
            amenities: [],
            safetyFeatures: [],

            imagesExisting: [],
            imagesRemovedExisting: [],
            imagesNew: [],
          },
        ],
      };
    }

    const pickups: string[] =
      Array.isArray(d.pickups) && d.pickups.length ? d.pickups.map(String) : [""];

    const drops: string[] =
      Array.isArray(d.drops) && d.drops.length ? d.drops.map(String) : [""];

    const vopts: VehicleOptionUI[] = (d.vehicleOptions || []).map((o: any) => {
      const desc = o?.description || "";
      return {
        vehicleId: o?.vehicleId || "",
        vehiclename: o?.vehiclename || "",
        vehicleType: (o?.vehicleType || "4 SEATER") as VehicleType,
        maxPax: typeof o?.maxPax === "number" ? o.maxPax : "",
        vendorPrice: typeof o?.vendorBasePrice === "number" ? o.vendorBasePrice : "",
        sellerPrice:
          typeof o?.sellerBasePrice === "number"
            ? o.sellerBasePrice
            : typeof o?.basePrice === "number"
            ? o.basePrice
            : "",
        chargePerKm: typeof o?.chargePerKm === "number" ? o.chargePerKm : "",
        currency: (o?.currency || "INR") as Currency,

        minimumDistanceKm:
          typeof o?.minimumDistanceKm === "number" ? o.minimumDistanceKm : "",
        minimumCharge: typeof o?.minimumCharge === "number" ? o.minimumCharge : "",
        description: desc,
        year: typeof o?.year === "number" ? o.year : "",
        fuelType: o?.fuelType || "",
        transmission: o?.transmission || "",
       markup_min_price: o?.markup_min_price ?? null,
markup_max_price: o?.markup_max_price ?? null,
        nightCharge: o?.nightCharge
          ? {
              enabled: true,
              amount: typeof o.nightCharge.amount === "number" ? o.nightCharge.amount : "",
              appliesFromHour:
                typeof o.nightCharge.appliesFromHour === "number"
                  ? o.nightCharge.appliesFromHour
                  : 22,
              appliesToHour:
                typeof o.nightCharge.appliesToHour === "number"
                  ? o.nightCharge.appliesToHour
                  : 6,
            }
          : { ...BLANK_NIGHT },

        surgeCharges: Array.isArray(o?.specialOverrides)
          ? (o.specialOverrides.map(overrideToSurgeItem).filter(Boolean) as SurgeItem[])
          : [],

        availabilityStatus: (o?.availabilityStatus || "available") as Availability,
        specialConditions: (o as any)?.specialConditions || "",
        serviceCharge: (o as any)?.serviceCharge
          ? {
              amount:
                typeof (o as any).serviceCharge.amount === "number"
                  ? (o as any).serviceCharge.amount
                  : "",
              currency: (o as any).serviceCharge.currency || "INR",
              notes: (o as any).serviceCharge.notes || "",
            }
          : { ...BLANK_SERVICE },

        ratings: o?.ratings
          ? {
              average: typeof o.ratings.average === "number" ? o.ratings.average : "",
              totalReviews:
                typeof o.ratings.totalReviews === "number" ? o.ratings.totalReviews : "",
            }
          : { ...BLANK_RATINGS },

        amenities: Array.isArray(o?.amenities) ? o.amenities.map(String) : [],
        safetyFeatures: Array.isArray(o?.safetyFeatures) ? o.safetyFeatures.map(String) : [],

        imagesExisting: Array.isArray(o?.images) ? o.images : [],
        imagesRemovedExisting: [],
        imagesNew: [],
      };
    });

    if (!vopts.length) {
      return {
        pickups,
        drops,
        vehicleOptions: [
          {
            vehiclename: "",
            vehicleType: "4 SEATER",
            maxPax: 4,
            vendorPrice: "",
            sellerPrice: "",
            chargePerKm: "",
            currency: "INR",
            nightCharge: { ...BLANK_NIGHT },
            surgeCharges: [],
            availabilityStatus: "available",
            specialConditions: "",
            serviceCharge: { ...BLANK_SERVICE },

            vehicleId: "",
            description: "",

            minimumDistanceKm: "",
            minimumCharge: "",
            year: "",
            fuelType: "",
            transmission: "",
            ratings: { ...BLANK_RATINGS },
            amenities: [],
            safetyFeatures: [],

            imagesExisting: [],
            imagesRemovedExisting: [],
            imagesNew: [],
          },
        ],
      };
    }

    return { pickups, drops, vehicleOptions: vopts };
  }, [doc]);

  // ---------- Local UI state ----------
  const [data, setData] = useState<TransferRouteFormData>(initialForm);
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [appendImages, setAppendImages] = useState(true);

  const step = STEPS[stepIndex];

  useEffect(() => {
    setData(initialForm);
  }, [initialForm]);

  useEffect(() => {
    return () => {
      data.vehicleOptions.forEach((v) =>
        v.imagesNew.forEach((ni) => ni.preview && URL.revokeObjectURL(ni.preview))
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Helpers ---------- */
  const setField = <K extends keyof TransferRouteFormData>(
    k: K,
    v: TransferRouteFormData[K]
  ) => setData((p) => ({ ...p, [k]: v }));

  // PICKUPS
  const addPickup = () => setField("pickups", [...data.pickups, ""]);
  const updatePickupAt = (i: number, val: string) => {
    const next = [...data.pickups];
    next[i] = val;
    setField("pickups", next);
  };
  const clearPickupAt = (i: number) => updatePickupAt(i, "");
  const removePickupAt = (i: number) => {
    if (data.pickups.length <= 1) return;
    const next = data.pickups.filter((_, idx) => idx !== i);
    setField("pickups", next);
  };

  // DROPS
  const addDrop = () => setField("drops", [...data.drops, ""]);
  const updateDropAt = (i: number, val: string) => {
    const next = [...data.drops];
    next[i] = val;
    setField("drops", next);
  };
  const clearDropAt = (i: number) => updateDropAt(i, "");
  const removeDropAt = (i: number) => {
    if (data.drops.length <= 1) return;
    const next = data.drops.filter((_, idx) => idx !== i);
    setField("drops", next);
  };

  // Vehicles
  const updateOption = (idx: number, next: Partial<VehicleOptionUI>) =>
    setData((p) => {
      const arr = [...p.vehicleOptions];
      arr[idx] = { ...arr[idx], ...next };
      return { ...p, vehicleOptions: arr };
    });

  const addOption = () =>
    setData((p) => ({
      ...p,
      vehicleOptions: [
        ...p.vehicleOptions,
        {
          vehiclename: "",
          vehicleType: "4 SEATER",
          maxPax: 4,
          vendorPrice: "",
          sellerPrice: "",
          chargePerKm: "",
          currency: "INR",
          nightCharge: { ...BLANK_NIGHT },
          surgeCharges: [],
          availabilityStatus: "available",
          specialConditions: "",
          serviceCharge: { ...BLANK_SERVICE },

          vehicleId: "",
          description: "",

          minimumDistanceKm: "",
          minimumCharge: "",
          year: "",
          fuelType: "",
          transmission: "",
          ratings: { ...BLANK_RATINGS },
          amenities: [],
          safetyFeatures: [],

          imagesExisting: [],
          imagesRemovedExisting: [],
          imagesNew: [],
        },
      ],
    }));

  const removeOption = (idx: number) =>
    setData((p) => {
      const arr = [...p.vehicleOptions];
      if (arr.length <= 1) {
        arr[0] = {
          vehiclename: "",
          vehicleType: "4 SEATER",
          maxPax: 4,
          vendorPrice: "",
          sellerPrice: "",
          chargePerKm: "",
          currency: "INR",
          nightCharge: { ...BLANK_NIGHT },
          surgeCharges: [],
          availabilityStatus: "available",
          specialConditions: "",
          serviceCharge: { ...BLANK_SERVICE },

          vehicleId: "",
          description: "",

          minimumDistanceKm: "",
          minimumCharge: "",
          year: "",
          fuelType: "",
          transmission: "",
          ratings: { ...BLANK_RATINGS },
          amenities: [],
          safetyFeatures: [],

          imagesExisting: [],
          imagesRemovedExisting: [],
          imagesNew: [],
        };
        return { ...p, vehicleOptions: arr };
      }
      arr[idx]?.imagesNew?.forEach((ni) => ni.preview && URL.revokeObjectURL(ni.preview));
      arr.splice(idx, 1);
      return { ...p, vehicleOptions: arr };
    });

  /* ---------- Per-vehicle images handlers ---------- */
  const handleVehicleImageUpload = (
    idx: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    updateOption(idx, {
      imagesNew: [
        ...(data.vehicleOptions[idx].imagesNew || []),
        ...files.map((file) => ({ file, preview: URL.createObjectURL(file) })),
      ],
    });
    e.currentTarget.value = "";
  };

  const removeVehicleNewImage = (idx: number, i: number) => {
    const opt = data.vehicleOptions[idx];
    const next = [...(opt.imagesNew || [])];
    const [removed] = next.splice(i, 1);
    if (removed?.preview) URL.revokeObjectURL(removed.preview);
    updateOption(idx, { imagesNew: next });
  };

  const removeVehicleExistingImage = (idx: number, i: number) => {
    const opt = data.vehicleOptions[idx];
    const nextExisting = [...(opt.imagesExisting || [])];
    const [removed] = nextExisting.splice(i, 1);
    updateOption(idx, {
      imagesExisting: nextExisting,
      imagesRemovedExisting: removed
        ? [...(opt.imagesRemovedExisting || []), removed]
        : opt.imagesRemovedExisting || [],
    });
  };

  /* ---------- Validation & step helpers ---------- */
  const isStepValid = (k: StepKey) => {
    switch (k) {
      case "route": {
        const hasPickup = data.pickups.some((p) => p.trim());
        const hasDrop = data.drops.some((d) => d.trim());
        return hasPickup && hasDrop;
      }
      case "vehicles": {
        return data.vehicleOptions.every((v) => {
          const max = n(v.maxPax);
          const vendor = n(v.vendorPrice);
          const seller = n(v.sellerPrice);
          return (
            v.vehicleType &&
            isFiniteNum(max) &&
            isFiniteNum(vendor) &&
            isFiniteNum(seller) &&
            max >= 1 &&
            vendor >= 0 &&
            seller >= 0
          );
        });
      }
      default:
        return true;
    }
  };

  const canGoNext = isStepValid(step.key);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const goNext = () => {
    if (submitting || !canGoNext) return;
    if (stepIndex >= LAST_INDEX) {
      void handleSubmit();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, LAST_INDEX));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goBack = () => {
    if (submitting) return;
    setStepIndex((i) => Math.max(i - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* =========================
     Submit (PATCH /pickupdrop/:id)
     ========================= */
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (stepIndex < LAST_INDEX) {
      if (isStepValid(step.key)) goNext();
      return;
    }

    const _id =
      (doc?._id && (typeof doc._id === "string" ? doc._id : doc._id.$oid)) ||
      idFromQuery;
    if (!_id) {
      alert("Missing route id to update.");
      return;
    }

    try {
      setSubmitting(true);

      const pickups = uniq(data.pickups);
      const drops = uniq(data.drops);

      const cookedVehicleOptions = data.vehicleOptions.map((v) => {
        const currency = v.currency || "INR";
        const overrides = (v.surgeCharges || [])
          .map((b) => cookSurgeToOverride(b, currency))
          .filter(Boolean) as any[];

        return {
          vehicleId: v.vehicleId || undefined,
          vehiclename: v.vehiclename || "",
          vehicleType: v.vehicleType,
          maxPax: toNumOrZero(v.maxPax),
          basePrice: toNumOrZero(v.sellerPrice),
          currency,
          vendorBasePrice: toNumOrZero(v.vendorPrice),
          sellerBasePrice: toNumOrZero(v.sellerPrice),
          chargePerKm: toNumOrZero(v.chargePerKm),
          minimumDistanceKm: toNumOrZero(v.minimumDistanceKm),
          minimumCharge: toNumOrZero(v.minimumCharge),
          description: v.description || "", // ✅ TinyMCE HTML
          year: toNumOrZero(v.year),
          fuelType: v.fuelType || undefined,
          transmission: v.transmission || undefined,
          markup_min_price: v.markup_min_price ?? null,
           markup_max_price: v.markup_max_price ?? null,
          nightCharge:
            v.nightCharge?.enabled
              ? {
                  enabled: true,
                  amount: toNumOrZero(v.nightCharge.amount),
                  appliesFromHour:
                    v.nightCharge.appliesFromHour === "" ||
                    v.nightCharge.appliesFromHour == null
                      ? 22
                      : Number(v.nightCharge.appliesFromHour),
                  appliesToHour:
                    v.nightCharge.appliesToHour === "" ||
                    v.nightCharge.appliesToHour == null
                      ? 6
                      : Number(v.nightCharge.appliesToHour),
                }
              : undefined,
          specialOverrides: overrides,
          availabilityStatus: (v.availabilityStatus as any) || "available",

          ratings: v.ratings
            ? {
                average: toNumOrZero(v.ratings.average),
                totalReviews: toNumOrZero(v.ratings.totalReviews),
              }
            : undefined,

          amenities: v.amenities && v.amenities.length ? v.amenities : undefined,
          safetyFeatures:
            v.safetyFeatures && v.safetyFeatures.length ? v.safetyFeatures : undefined,
        };
      });

      const fd = new FormData();
      fd.append("pickups", JSON.stringify(pickups));
      fd.append("drops", JSON.stringify(drops));
      fd.append("vehicleOptions", JSON.stringify(cookedVehicleOptions));

      // ---- Per-vehicle images payload ----
      data.vehicleOptions.forEach((v, idx) => {
        const keptExisting = (v.imagesExisting || []).filter(
          (u) => !(v.imagesRemovedExisting || []).includes(u)
        );

        if (appendImages) {
          fd.append(
            `vehicleOptions[${idx}][existingImages]`,
            JSON.stringify(keptExisting)
          );
        } else {
          fd.append(`vehicleOptions[${idx}][imagesJson]`, JSON.stringify(keptExisting));
        }

        (v.imagesNew || []).forEach(({ file }) => {
          fd.append(`vehicleOptions[${idx}][images[]]`, file, file.name);
        });
      });

      const url = `${process.env.NEXT_PUBLIC_API_BASE}pickupdrop/${encodeURIComponent(
        _id
      )}`;
      const res = await fetch(url, { method: "PATCH", body: fd });
      if (!res.ok) throw new Error((await res.text()) || "Failed");

      alert("Transfer updated successfully! ✅");
      router.push("/dashboard/pickupdrop");
    } catch (err: any) {
      console.error(err);
      alert(`Update failed: ${err?.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  /* ============ Derived for header ============ */
  const titlePickup =
    data.pickups.find((p) => p.trim()) || data.pickups[0] || "Pickup";
  const titleDrop =
    data.drops.find((d) => d.trim()) || data.drops[0] || "Drop";

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="flex items-center gap-2 text-gray-600 text-sm">
          <Loader2 className="size-4 animate-spin" /> Loading transfer…
        </div>
      </div>
    );
  }
  if (loadErr) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="text-red-600 text-sm">Failed to load: {loadErr}</div>
      </div>
    );
  }

  /* ============ Render ============ */
  return (
    <form className="min-h-screen bg-gray-50" onSubmit={handleSubmit}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-gray-200">
        <div className="px-2 py-2 sm:px-6 sm:py-3 w-full sm:max-w-3xl sm:mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                Edit Transfer Route — {titlePickup} → {titleDrop}
              </h1>
              <p className="text-[10px] sm:text-[11px] text-gray-500 truncate">
                Update pickup/drop, vehicles, images, surge,
              </p>

              <Button
                href="/dashboard/services?type=pick-and-drop"
                component={Link as any}
                variant="outlined"
                startIcon={<AddCircleOutline />}
                fullWidth
                aria-label="Add services"
                sx={{
                  display: { xs: "flex", sm: "none" },
                  mt: 1,
                  borderRadius: 2,
                  textTransform: "none",
                  py: 1,
                  fontSize: "0.75rem",
                }}
              >
                Add Services
              </Button>
            </div>

            <Button
              href="/dashboard/services?type=pick-and-drop"
              component={Link as any}
              variant="contained"
              color="primary"
              size="medium"
              startIcon={<AddCircleOutline />}
              aria-label="Add services"
              sx={{
                display: { xs: "none", sm: "inline-flex" },
                borderRadius: 999,
                textTransform: "none",
                px: 2.5,
                height: 40,
                boxShadow: "none",
                ":hover": { boxShadow: "none" },
              }}
            >
              Add Services
            </Button>
          </div>

          {/* Stepper */}
          <div className="mt-2 sm:mt-3 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
            {STEPS.map((r, i) => {
              const active = i === stepIndex;
              const done = i < stepIndex;
              const canJump =
                i <= stepIndex || STEPS.slice(0, i).every((st) => isStepValid(st.key));
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => canJump && setStepIndex(i)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border text-xs whitespace-nowrap ${
                    active
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : done
                      ? "bg-green-50 border-green-500 text-green-700"
                      : "bg-white border-gray-200 text-gray-700"
                  }`}
                  disabled={submitting || !canJump}
                >
                  <span className="grid place-items-center">
                    {done ? <CheckCircle2 className="size-4" /> : r.icon}
                  </span>
                  {r.label}
                </button>
              );
            })}
          </div>

          {/* Progress */}
          <div className="mt-2 sm:mt-3 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                submitting ? "bg-blue-400" : "bg-blue-600"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="w-full sm:max-w-3xl sm:mx-auto p-2 sm:p-6 pb-36 lg:pb-64">
        {/* ROUTE */}
        {step.key === "route" && (
          <>
            <SectionCard
              title="Route"
              subtitle="Manage pickup and drop lists independently. They’ll be flattened to arrays when saved."
              icon={<MapPin className="size-5 text-blue-600" />}
              requiredHint
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
                {/* PICKUPS */}
                <div className="rounded-xl border border-gray-200">
                  <div className="px-2 py-1.5 sm:px-3 sm:py-2 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-xs sm:text-sm font-semibold text-gray-800 inline-flex items-center gap-1.5 sm:gap-2">
                      <MapPin className="size-3.5 sm:size-4 text-blue-600" /> Pickups
                    </p>

                    <button
                      type="button"
                      onClick={addPickup}
                      disabled={submitting}
                      className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                    >
                      <Plus className="size-3.5" />
                      Add pickup
                    </button>
                  </div>

                  <div className="p-2 sm:p-3 space-y-1.5 sm:space-y-2">
                    {data.pickups.map((val, i) => (
                      <div
                        key={`pickup-${i}`}
                        className="grid grid-cols-12 gap-1.5 sm:gap-2 items-end"
                      >
                        <div className="col-span-9">
                          <Field
                            label={i === 0 ? "Pickup Location *" : "Pickup Location"}
                            required={i === 0}
                          >
                            <input
                              type="text"
                              className="input"
                              value={val}
                              onChange={(e) => updatePickupAt(i, e.target.value)}
                              placeholder={i === 0 ? "DABOLIM AIRPORT" : "Another pickup"}
                              disabled={submitting}
                            />
                          </Field>
                        </div>
                        <div className="col-span-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => clearPickupAt(i)}
                            disabled={submitting}
                            className="w-full h-12 grid place-items-center rounded-xl border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                            title="Clear pickup value"
                            aria-label="Clear pickup value"
                          >
                            <X className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removePickupAt(i)}
                            disabled={submitting || data.pickups.length <= 1}
                            className="w-full h-12 grid place-items-center rounded-xl border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                            title="Remove pickup row"
                            aria-label="Remove pickup row"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* DROPS */}
                <div className="rounded-xl border border-gray-200">
                  <div className="px-2 py-1.5 sm:px-3 sm:py-2 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-xs sm:text-sm font-semibold text-gray-800 inline-flex items-center gap-1.5 sm:gap-2">
                      <Route className="size-3.5 sm:size-4 text-emerald-600" /> Drops
                    </p>
                    <button
                      type="button"
                      onClick={addDrop}
                      disabled={submitting}
                      className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold rounded-lg border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                    >
                      <Plus className="size-3.5" />
                      Add drop
                    </button>
                  </div>

                  <div className="p-2 sm:p-3 space-y-1.5 sm:space-y-2">
                    {data.drops.map((val, i) => (
                      <div
                        key={`drop-${i}`}
                        className="grid grid-cols-12 gap-1.5 sm:gap-2 items-end"
                      >
                        <div className="col-span-9">
                          <Field
                            label={i === 0 ? "Drop Location *" : "Drop Location"}
                            required={i === 0}
                          >
                            <input
                              type="text"
                              className="input"
                              value={val}
                              onChange={(e) => updateDropAt(i, e.target.value)}
                              placeholder={i === 0 ? "CALANGUTE BEACH" : "Another drop"}
                              disabled={submitting}
                            />
                          </Field>
                        </div>
                        <div className="col-span-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => clearDropAt(i)}
                            disabled={submitting}
                            className="w-full h-12 grid place-items-center rounded-xl border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                            title="Clear drop value"
                            aria-label="Clear drop value"
                          >
                            <X className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeDropAt(i)}
                            disabled={submitting || data.drops.length <= 1}
                            className="w-full h-12 grid place-items-center rounded-xl border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                            title="Remove drop row"
                            aria-label="Remove drop row"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-2 sm:mt-3 text-xs text-gray-500 flex items-center gap-1.5 sm:gap-2">
                <InfoIcon className="size-3.5" />
                Pickups and drops are edited independently. On save, they’re flattened into{" "}
                <code>pickups[]</code> and <code>drops[]</code>.
              </div>
            </SectionCard>
          </>
        )}

        {/* VEHICLES */}
        {step.key === "vehicles" && (
          <SectionCard
            title="Vehicle Options"
            subtitle="Prices, availability and night charge."
            icon={<Truck className="size-5 text-blue-600" />}
            requiredHint
          >
            <div className="space-y-4 sm:space-y-6">
              {data.vehicleOptions.map((v, idx) => {
                const setType = (vehicleType: VehicleType) => {
                  const choices = VEHICLE_TYPE_TO_MAX_PAX[vehicleType] || [];
                  const autoMax = choices.length ? choices[choices.length - 1] : "";
                  updateOption(idx, { vehicleType, maxPax: autoMax });
                };

                return (
                  <div key={idx} className="rounded-xl border border-gray-200 p-2 sm:p-4">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <p className="text-sm font-semibold text-gray-800">Option #{idx + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeOption(idx)}
                        disabled={submitting}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                      >
                        <Trash2 className="size-3.5" />
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <Field label="Vehicle Name">
                        <input
                          type="text"
                          className="input"
                          value={v.vehiclename || ""}
                          onChange={(e) => updateOption(idx, { vehiclename: e.target.value })}
                          disabled={submitting}
                          placeholder="Swift / Innova / Tempo, etc."
                        />
                      </Field>

                      <Field label="Vehicle Type *" required>
                        <select
                          className="input"
                          value={v.vehicleType}
                          onChange={(e) => setType(e.target.value as VehicleType)}
                          disabled={submitting}
                        >
                          {VEHICLE_TYPE_OPTIONS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Max Persons *" required>
                        <select
                          className="input"
                          value={v.maxPax === "" ? "" : Number(v.maxPax)}
                          onChange={(e) =>
                            updateOption(idx, {
                              maxPax: e.target.value === "" ? "" : Number(e.target.value),
                            })
                          }
                          disabled={submitting}
                        >
                          <option value="">Select</option>
                          {(VEHICLE_TYPE_TO_MAX_PAX[v.vehicleType] || []).map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="chargePerKm *" required>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            inputMode="decimal"
                            className="input"
                            value={v.chargePerKm === "" ? "" : Number(v.chargePerKm)}
                            onChange={(e) =>
                              updateOption(idx, {
                                chargePerKm: e.target.value === "" ? "" : Number(e.target.value),
                              })
                            }
                            placeholder="charge per km"
                            disabled={submitting}
                          />
                          <span className="suffix">{v.currency || "INR"}</span>
                        </div>
                      </Field>

                      <Field label="Vendor Price *" required>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            inputMode="decimal"
                            className="input"
                            value={v.vendorPrice === "" ? "" : Number(v.vendorPrice)}
                            onChange={(e) =>
                              updateOption(idx, {
                                vendorPrice: e.target.value === "" ? "" : Number(e.target.value),
                              })
                            }
                            placeholder="vendor amount"
                            disabled={submitting}
                          />
                          <span className="suffix">{v.currency || "INR"}</span>
                        </div>
                      </Field>

                      <Field label="Seller Price *" required>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            inputMode="decimal"
                            className="input"
                            value={v.sellerPrice === "" ? "" : Number(v.sellerPrice)}
                            onChange={(e) =>
                              updateOption(idx, {
                                sellerPrice: e.target.value === "" ? "" : Number(e.target.value),
                              })
                            }
                            placeholder="seller amount"
                            disabled={submitting}
                          />
                          <span className="suffix">{v.currency || "INR"}</span>
                        </div>
                      </Field>

                      <Field label="Availability">
                        <select
                          className="input"
                          value={v.availabilityStatus || "available"}
                          onChange={(e) =>
                            updateOption(idx, { availabilityStatus: e.target.value as Availability })
                          }
                          disabled={submitting}
                        >
                          <option value="available">available</option>
                          <option value="limited">limited</option>
                          <option value="unavailable">unavailable</option>
                          <option value="on-request">on-request</option>
                        </select>
                      </Field>

                      <Field label="Minimum Distance (km)">
                        <input
                          type="number"
                          min={0}
                          className="input"
                          value={v.minimumDistanceKm === "" ? "" : Number(v.minimumDistanceKm as any)}
                          onChange={(e) =>
                            updateOption(idx, {
                              minimumDistanceKm: e.target.value === "" ? "" : Number(e.target.value),
                            })
                          }
                          placeholder="e.g. 10"
                          disabled={submitting}
                        />
                      </Field>

                      <Field label="Minimum Charge">
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            className="input"
                            value={v.minimumCharge === "" ? "" : Number(v.minimumCharge as any)}
                            onChange={(e) =>
                              updateOption(idx, {
                                minimumCharge: e.target.value === "" ? "" : Number(e.target.value),
                              })
                            }
                            placeholder="e.g. 400"
                            disabled={submitting}
                          />
                          <span className="suffix">{v.currency || "INR"}</span>
                        </div>
                      </Field>

                      <Field label="Model Year">
                        <input
                          type="number"
                          min={1990}
                          max={2100}
                          className="input"
                          value={v.year === "" ? "" : Number(v.year as any)}
                          onChange={(e) =>
                            updateOption(idx, { year: e.target.value === "" ? "" : Number(e.target.value) })
                          }
                          placeholder="2022"
                          disabled={submitting}
                        />
                      </Field>

                      <Field label="Fuel Type">
                        <input
                          type="text"
                          className="input"
                          value={v.fuelType || ""}
                          onChange={(e) => updateOption(idx, { fuelType: e.target.value })}
                          placeholder="Petrol / Diesel / CNG / EV"
                          disabled={submitting}
                        />
                      </Field>

                      <Field label="Transmission">
                        <input
                          type="text"
                          className="input"
                          value={v.transmission || ""}
                          onChange={(e) => updateOption(idx, { transmission: e.target.value })}
                          placeholder="Manual / Automatic"
                          disabled={submitting}
                        />
                      </Field>

                       <Field label="Markup Min Price (₹)">
  <div className="relative">
    <input
      type="number"
      className="input pl-9"
      min={0}
      value={v.markup_min_price ?? ""}
      onChange={(e) =>
        updateOption(idx, {
          markup_min_price: e.target.value === "" ? null : Number(e.target.value),
        })
      }
      placeholder="e.g., 200"
      disabled={submitting}
    />
    <IndianRupee className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
  </div>
</Field>

<Field label="Markup Max Price (₹)">
  <div className="relative">
    <input
      type="number"
      className="input pl-9"
      min={0}
      value={v.markup_max_price ?? ""}
      onChange={(e) =>
        updateOption(idx, {
          markup_max_price: e.target.value === "" ? null : Number(e.target.value),
        })
      }
      placeholder="e.g., 500"
      disabled={submitting}
    />
    <IndianRupee className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
  </div>
</Field>


                      {/* DESCRIPTION (TinyMCE) */}
                      <Field
                        label="Vehicle Description"
                        className="sm:col-span-2"
                        hint="Shown in product card details."
                      >
                        <TinyMCETextEditor
                          value={v.description || ""}
                          disabled={submitting}
                          onChange={(html) => updateOption(idx, { description: html })}
                        />
                      </Field>

                      {/* RATINGS */}
                      <Field label="Average Rating">
                        <input
                          type="number"
                          min={0}
                          max={5}
                          step={0.1}
                          className="input"
                          value={
                            v.ratings?.average === "" || v.ratings?.average == null
                              ? ""
                              : Number(v.ratings.average as any)
                          }
                          onChange={(e) =>
                            updateOption(idx, {
                              ratings: {
                                ...(v.ratings || {}),
                                average: e.target.value === "" ? "" : Number(e.target.value),
                              },
                            })
                          }
                          placeholder="4.6"
                          disabled={submitting}
                        />
                      </Field>

                      <Field label="Total Reviews">
                        <input
                          type="number"
                          min={0}
                          className="input"
                          value={
                            v.ratings?.totalReviews === "" || v.ratings?.totalReviews == null
                              ? ""
                              : Number(v.ratings.totalReviews as any)
                          }
                          onChange={(e) =>
                            updateOption(idx, {
                              ratings: {
                                ...(v.ratings || {}),
                                totalReviews: e.target.value === "" ? "" : Number(e.target.value),
                              },
                            })
                          }
                          placeholder="87"
                          disabled={submitting}
                        />
                      </Field>

                      {/* AMENITIES / SAFETY FEATURES */}
                      <Field
                        label="Amenities"
                        className="sm:col-span-2"
                        hint="Comma separated, e.g. AC, Bluetooth Music, Phone Charger"
                      >
                        <input
                          type="text"
                          className="input w-full"
                          value={(v.amenities || []).join(", ")}
                          onChange={(e) =>
                            updateOption(idx, {
                              amenities: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          disabled={submitting}
                        />
                      </Field>

                      <Field
                        label="Safety Features"
                        className="sm:col-span-2"
                        hint="Comma separated, e.g. Airbags, ABS, GPS Tracking"
                      >
                        <input
                          type="text"
                          className="input w-full"
                          value={(v.safetyFeatures || []).join(", ")}
                          onChange={(e) =>
                            updateOption(idx, {
                              safetyFeatures: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          disabled={submitting}
                        />
                      </Field>
                    </div>

                    {/* Night Charges */}
                    <div className="mt-3 sm:mt-4 rounded-lg border border-blue-200 bg-blue-50/40 p-2 sm:p-4">
                      <div className="flex items-center justify-between gap-2 sm:gap-3 mb-2">
                        <p className="text-sm font-semibold text-blue-900 inline-flex items-center gap-2">
                          <SunMoon className="size-4" /> Night Charges
                        </p>
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="size-4"
                            checked={!!v.nightCharge?.enabled}
                            onChange={(e) =>
                              updateOption(idx, {
                                nightCharge: {
                                  ...(v.nightCharge || { ...BLANK_NIGHT }),
                                  enabled: e.target.checked,
                                },
                              })
                            }
                            disabled={submitting}
                          />
                          <span className="text-blue-900 font-medium">Enable</span>
                        </label>
                      </div>

                      {v.nightCharge?.enabled && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                          <Field label="Amount">
                            <input
                              type="number"
                              min={0}
                              inputMode="decimal"
                              className="input"
                              value={v.nightCharge?.amount === "" ? "" : Number(v.nightCharge?.amount as any)}
                              onChange={(e) =>
                                updateOption(idx, {
                                  nightCharge: {
                                    ...(v.nightCharge || {}),
                                    amount: e.target.value === "" ? "" : Number(e.target.value),
                                  },
                                })
                              }
                              placeholder="enter amount"
                              disabled={submitting}
                            />
                          </Field>
                          <Field label="From Hour (0-23)">
                            <input
                              type="number"
                              min={0}
                              max={23}
                              className="input"
                              value={
                                v.nightCharge?.appliesFromHour === "" || v.nightCharge?.appliesFromHour == null
                                  ? ""
                                  : Number(v.nightCharge?.appliesFromHour)
                              }
                              onChange={(e) =>
                                updateOption(idx, {
                                  nightCharge: {
                                    ...(v.nightCharge || {}),
                                    appliesFromHour: e.target.value === "" ? "" : Number(e.target.value),
                                  },
                                })
                              }
                              disabled={submitting}
                            />
                          </Field>
                          <Field label="To Hour (0-23)">
                            <input
                              type="number"
                              min={0}
                              max={23}
                              className="input"
                              value={
                                v.nightCharge?.appliesToHour === "" || v.nightCharge?.appliesToHour == null
                                  ? ""
                                  : Number(v.nightCharge?.appliesToHour)
                              }
                              onChange={(e) =>
                                updateOption(idx, {
                                  nightCharge: {
                                    ...(v.nightCharge || {}),
                                    appliesToHour: e.target.value === "" ? "" : Number(e.target.value),
                                  },
                                })
                              }
                              disabled={submitting}
                            />
                          </Field>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={addOption}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
              >
                <Plus className="size-4" />
                Add Vehicle Option
              </button>
            </div>
          </SectionCard>
        )}

        {/* IMAGES */}
        {step.key === "images" && (
          <SectionCard
            title="Images"
            subtitle="Manage galleries per vehicle option. No thumbnail."
            icon={<ImageIcon className="size-5 text-blue-600" />}
          >
            <div className="space-y-4 sm:space-y-6">
              {data.vehicleOptions.map((v, idx) => (
                <div
                  key={`images-${idx}`}
                  className="rounded-xl border border-gray-200 p-2 sm:p-4"
                >
                  <div className="flex items-center justify-between gap-2 sm:gap-3 mb-2">
                    <p className="text-sm font-semibold text-gray-900">
                      Vehicle Option #{idx + 1} {v.vehiclename ? `— ${v.vehiclename}` : ""}
                    </p>
                    <label className="block">
                      <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 cursor-pointer text-xs font-semibold">
                        <ImageIcon className="size-3.5" />
                        Add Images
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        disabled={submitting}
                        onChange={(e) => handleVehicleImageUpload(idx, e)}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                    {(v.imagesExisting || []).map((url, i) => (
                      <div
                        key={`ex-${idx}-${i}-${url}`}
                        className="relative aspect-square rounded-xl overflow-hidden border border-gray-300 bg-gray-50 shadow-sm"
                      >
                        <img
                          src={url}
                          alt={`Existing ${i + 1}`}
                          className="w-full h-full object-cover"
                          decoding="async"
                          loading="lazy"
                        />
                        <button
                          type="button"
                          onClick={() => removeVehicleExistingImage(idx, i)}
                          className="absolute top-1 right-1 size-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md active:scale-95"
                          title="Remove existing image"
                          aria-label="Remove existing image"
                          disabled={submitting}
                        >
                          <X className="size-4" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                          <p className="text-white text-[10px] font-medium">EXISTING</p>
                        </div>
                      </div>
                    ))}

                    {(v.imagesNew || []).map((image, i) => (
                      <div
                        key={`new-${idx}-${i}-${image.preview}`}
                        className="relative aspect-square rounded-xl overflow-hidden border-2 border-dashed border-blue-400 bg-blue-50"
                      >
                        <img
                          src={image.preview}
                          alt={`New ${i + 1}`}
                          className="w-full h-full object-cover opacity-80"
                          decoding="async"
                          loading="lazy"
                        />
                        <button
                          type="button"
                          onClick={() => removeVehicleNewImage(idx, i)}
                          className="absolute top-1 right-1 size-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md active:scale-95"
                          title="Remove new image"
                          aria-label="Remove new image"
                          disabled={submitting}
                        >
                          <X className="size-4" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                          <p className="text-white text-[10px] font-medium truncate">NEW</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="mt-2 text-[11px] text-gray-500">
                    Images belong to this vehicle option only. Use the “Append images” toggle in the
                    header to control whether uploads are merged or treated as a full replacement on
                    update.
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* SURGE */}
        {step.key === "surge" && (
          <SurgeChargesSection
            data={data}
            setData={setData}
            submitting={submitting}
            updateOption={updateOption}
          />
        )}
      </main>

      {/* Sticky Footer */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-gray-50/95 backdrop-blur safe-bottom pt-1 sm:pt-2">
        <div className="mx-auto w-full sm:max-w-3xl px-2 sm:px-6 pb-1 sm:pb-2">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-900/5">
            <div className="p-2 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <span className="inline-flex items-center gap-1.5 sm:gap-2 text-xs text-gray-600 bg-gray-100 rounded-full px-2 sm:px-3 py-1 sm:py-1.5 font-semibold self-start sm:self-auto">
                <span
                  className={`size-2 rounded-full ${
                    isStepValid(step.key) ? "bg-green-500" : "bg-amber-500"
                  }`}
                />
                {isStepValid(step.key) ? "Looks good" : "Complete required fields"}
              </span>

              <div className="flex w-full sm:w-auto gap-1.5 sm:gap-2 sm:ml-auto">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={stepIndex === 0 || submitting}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-3 text-sm font-medium rounded-xl border ${
                    stepIndex === 0 || submitting
                      ? "border-gray-200 text-gray-400"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canGoNext || submitting}
                  className={`flex-1 sm:flex-none px-3 sm:px-5 py-2 sm:py-3 text-sm font-semibold rounded-xl text-white ${
                    !canGoNext || submitting
                      ? "bg-blue-300 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                  }`}
                  aria-busy={submitting ? "true" : "false"}
                >
                  {stepIndex < LAST_INDEX ? (
                    "Continue"
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                      {submitting ? "Updating..." : "Update Route"}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Local styles */}
      <style jsx>{`
        .input {
          @apply w-full h-12 px-4 py-3 rounded-xl border border-gray-300 bg-white
          shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          text-[16px] leading-none placeholder:text-gray-400 transition-all;
          -webkit-tap-highlight-color: transparent;
        }
        .textarea {
          @apply w-full min-h-[112px] px-4 py-3 rounded-xl border border-gray-300 bg-white
          shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          text-[16px] placeholder:text-gray-400 transition-all resize-y;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .safe-bottom {
          padding-bottom: calc(env(safe-area-inset-bottom) + 0.5rem);
        }
        .suffix {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 12px;
          color: #6b7280;
        }

        /* Optional: tighter toolbar like your screenshot */
        :global(.tox .tox-toolbar__group) {
          padding: 4px 6px !important;
        }
        :global(.tox .tox-tbtn) {
          width: 30px !important;
          height: 30px !important;
        }
        :global(.tox .tox-edit-area__iframe) {
          background: white !important;
        }
          /* ✅ TinyMCE responsive UI */
  :global(.tox) {
    border: none !important;
  }

  :global(.tox .tox-editor-header) {
    border-bottom: 1px solid #e5e7eb !important; /* gray-200 */
  }

  :global(.tox .tox-toolbar__primary) {
    padding: 6px !important;
  }

  /* ✅ Buttons compact + nice on mobile */
  :global(.tox .tox-tbtn) {
    width: 32px !important;
    height: 32px !important;
  }

  /* ✅ Make editor content padding consistent */
  :global(.tox .tox-edit-area__iframe) {
    background: white !important;
  }

  /* ✅ Fix text starting position (top-left) */
  :global(.tox-edit-area) {
    padding: 0 !important;
  }

  /* ✅ Mobile tweaks */
  @media (max-width: 640px) {
    :global(.tox .tox-toolbar__primary) {
      padding: 4px !important;
    }
    :global(.tox .tox-tbtn) {
      width: 28px !important;
      height: 28px !important;
    }
  }
      `}</style>
    </form>
  );
}

/* ---------- Reusables ---------- */
const STEPS = [
  { key: "route", label: "Route", icon: <Route className="size-4" /> },
  { key: "vehicles", label: "Vehicles", icon: <Truck className="size-4" /> },
  { key: "images", label: "Images", icon: <ImageIcon className="size-4" /> },
  { key: "surge", label: "Surge Charges", icon: <Calendar className="size-4" /> },
] as const;

type StepKey = (typeof STEPS)[number]["key"];
const LAST_INDEX = STEPS.length - 1;

function SectionCard({
  title,
  subtitle,
  requiredHint,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  requiredHint?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-3 sm:mt-6 first:mt-0">
      <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-visible">
        <div className="px-2 py-2 sm:px-5 sm:py-4 border-b border-gray-100 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="size-7 sm:size-8 grid place-items-center bg-blue-50 rounded-lg">
              {icon}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900">{title}</h2>
              {subtitle && (
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          {requiredHint && (
            <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">
              * Required
            </span>
          )}
        </div>
        <div className="p-2 sm:p-5">{children}</div>
      </div>
    </section>
  );
}

function Field({
  label,
  required,
  hint,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <div className="flex items-center justify-between">
        <span className="block text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">
          {label} {required && <span className="text-red-600">*</span>}
        </span>
        {hint && <span className="text-[10px] sm:text-[11px] text-gray-500">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

/* ---------- Surge Section ---------- */
function SurgeChargesSection({
  data,
  setData,
  submitting,
  updateOption,
}: {
  data: TransferRouteFormData;
  setData: React.Dispatch<React.SetStateAction<TransferRouteFormData>>;
  submitting: boolean;
  updateOption: (idx: number, next: Partial<VehicleOptionUI>) => void;
}) {
  const add = (idx: number) =>
    updateOption(idx, {
      surgeCharges: [...(data.vehicleOptions[idx].surgeCharges || []), { ...BLANK_SURGE }],
    });

  const remove = (idx: number, i: number) =>
    updateOption(idx, {
      surgeCharges: (data.vehicleOptions[idx].surgeCharges || []).filter((_, k) => k !== i),
    });

  const patch = (idx: number, i: number, next: Partial<SurgeItem>) =>
    updateOption(idx, {
      surgeCharges: (data.vehicleOptions[idx].surgeCharges || []).map((b, k) =>
        k === i ? { ...b, ...next } : b
      ),
    });

  return (
    <SectionCard
      title="Surge Charges"
      subtitle="Choose Single/Range and set a surge price for each window."
      icon={<Calendar className="size-5 text-blue-600" />}
    >
      <div className="space-y-4 sm:space-y-6">
        {data.vehicleOptions.map((v, idx) => (
          <div key={idx} className="rounded-xl border border-gray-200 p-2 sm:p-4">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <p className="text-sm font-semibold text-gray-800">Vehicle Option #{idx + 1}</p>
              <button
                type="button"
                onClick={() => add(idx)}
                disabled={submitting}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
              >
                <Plus className="size-3.5" />
                Add Surge
              </button>
            </div>

            {(!v.surgeCharges || v.surgeCharges.length === 0) && (
              <p className="text-xs text-gray-500">No surge windows yet.</p>
            )}

            <div className="space-y-2 sm:space-y-3">
              {(v.surgeCharges || []).map((b, i) => (
                <div key={i} className="rounded-lg border border-gray-200 p-2 sm:p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-700">Surge #{i + 1}</span>
                    <button
                      type="button"
                      onClick={() => remove(idx, i)}
                      disabled={submitting}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                    >
                      <Trash2 className="size-3.5" />
                      Remove
                    </button>
                  </div>

                  <div className="mb-3 flex items-center gap-4">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`mode-${idx}-${i}`}
                        value="single"
                        checked={b.mode === "single"}
                        onChange={() => patch(idx, i, { mode: "single", startDate: "", endDate: "" })}
                        disabled={submitting}
                      />
                      Single date
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`mode-${idx}-${i}`}
                        value="range"
                        checked={b.mode === "range"}
                        onChange={() => patch(idx, i, { mode: "range", date: "" })}
                        disabled={submitting}
                      />
                      Date range
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                    {b.mode === "single" ? (
                      <Field label="Date">
                        <input
                          type="date"
                          className="input"
                          value={b.date || ""}
                          onChange={(e) => patch(idx, i, { date: e.target.value })}
                          disabled={submitting}
                        />
                      </Field>
                    ) : (
                      <>
                        <Field label="Start date">
                          <input
                            type="date"
                            className="input"
                            value={b.startDate || ""}
                            onChange={(e) => patch(idx, i, { startDate: e.target.value })}
                            disabled={submitting}
                          />
                        </Field>
                        <Field label="End date">
                          <input
                            type="date"
                            className="input"
                            value={b.endDate || ""}
                            min={b.startDate || undefined}
                            onChange={(e) => patch(idx, i, { endDate: e.target.value })}
                            disabled={submitting}
                          />
                        </Field>
                      </>
                    )}

                    <Field label="Price *">
                      <input
                        type="number"
                        min={0}
                        inputMode="decimal"
                        className="input"
                        value={b.price === "" ? "" : Number(b.price)}
                        onChange={(e) =>
                          patch(idx, i, { price: e.target.value === "" ? "" : Number(e.target.value) })
                        }
                        placeholder="amount"
                        disabled={submitting}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
