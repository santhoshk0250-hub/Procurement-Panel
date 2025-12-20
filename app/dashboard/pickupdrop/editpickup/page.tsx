"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  RouteIcon as Route,
  MapPin,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  Shield,
  Truck,
  Calendar,
  FileText,
  SunMoon,
  Image as ImageIcon,
  Star,
  X,
  Info as InfoIcon,
  HelpCircle,
} from "lucide-react";
import { usePickupDropStore } from "@/store/usepickupdrop";

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

interface VehicleOptionUI {
  vehicleType: VehicleType;
  maxPax: number | "";
  vendorPrice: number | "";
  sellerPrice: number | "";
  currency?: Currency;
  nightCharge?: NightChargeUI;
  surgeCharges: SurgeItem[];
  availabilityStatus?: Availability;
  cancellationPolicy?: string;
  specialConditions?: string;
  serviceCharge?: ServiceCharge;
}

interface RoutePair {
  pickupLocation: string;
  dropLocation: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface TransferRouteFormData {
  routePairs: RoutePair[];
  vehicleOptions: VehicleOptionUI[];
  routeCancellationPolicy?: string;
  routeSpecialConditions?: string;
  faqs: FAQItem[];
}

type NewImage = { file: File; preview: string };
type NewThumbnail = { file: File; preview: string };

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

const BLANK_SURGE: SurgeItem = { mode: "single", date: "", startDate: "", endDate: "", price: "" };
const BLANK_SERVICE: ServiceCharge = { amount: "", currency: "INR", notes: "" };
const BLANK_NIGHT: NightChargeUI = { enabled: false, amount: "", appliesFromHour: 22, appliesToHour: 6 };
const BLANK_FAQ: FAQItem = { question: "", answer: "" };

const n = (v: any) => (v === "" || v == null ? NaN : Number(v));
const isFiniteNum = (v: any) => typeof v === "number" && Number.isFinite(v);
const toNumOrZero = (v: any) => (v === "" || v == null ? 0 : Number(v));

/* =========================
   UI Shell
   ========================= */

const STEPS = [
  { key: "route", label: "Route", icon: <Route className="size-4" /> },
  { key: "vehicles", label: "Vehicles", icon: <Truck className="size-4" /> },
  { key: "surge", label: "Surge Charges", icon: <Calendar className="size-4" /> },
  { key: "images", label: "Images", icon: <ImageIcon className="size-4" /> },
  { key: "policies", label: "Policies", icon: <Shield className="size-4" /> },
  { key: "faqs", label: "FAQs", icon: <HelpCircle className="size-4" /> },
] as const;

type StepKey = (typeof STEPS)[number]["key"];
const LAST_INDEX = STEPS.length - 1;

/* =========================
   Component
   ========================= */

export default function EditTransferRouteMobile() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idFromQuery = searchParams.get("id") || "";
  const route = usePickupDropStore((r: any) => r.route);

  // ------- Build initial form state from store route (fallbacks provided) -------
  const initialForm: TransferRouteFormData = useMemo(() => {
    if (!route) {
      return {
        routePairs: [{ pickupLocation: "", dropLocation: "" }],
        vehicleOptions: [
          {
            vehicleType: "4 SEATER",
            maxPax: 4,
            vendorPrice: "",
            sellerPrice: "",
            currency: "INR",
            nightCharge: { ...BLANK_NIGHT },
            surgeCharges: [],
            availabilityStatus: "available",
            cancellationPolicy: "",
            specialConditions: "",
            serviceCharge: { ...BLANK_SERVICE },
          },
        ],
        routeCancellationPolicy: "",
        routeSpecialConditions: "",
        faqs: [{ ...BLANK_FAQ }],
      };
    }

    // ✅ normalize routePairs from server (new schema) or fallback (old fields)
    const normalizedRoutePairs: RoutePair[] =
      Array.isArray(route.routePairs) && route.routePairs.length > 0
        ? route.routePairs.map((p: any) => ({
            pickupLocation: (p?.pickupLocation || "").trim(),
            dropLocation: (p?.dropLocation || "").trim(),
          }))
        : [
            {
              pickupLocation: (route.pickupLocation || "").trim(),
              dropLocation: (route.dropLocation || "").trim(),
            },
          ];

    // map server doc → UI
    const vopts: VehicleOptionUI[] = (route.vehicleOptions || []).map((o: any) => ({
      vehicleType: (o.vehicleType || "4 SEATER") as VehicleType,
      maxPax: typeof o.maxPax === "number" ? o.maxPax : "",
      vendorPrice: typeof o.vendorBasePrice === "number" ? o.vendorBasePrice : "",
      sellerPrice:
        typeof o.sellerBasePrice === "number"
          ? o.sellerBasePrice
          : typeof o.basePrice === "number"
          ? o.basePrice
          : "",
      currency: (o.currency || "INR") as Currency,
      nightCharge: o.nightCharge
        ? {
            enabled: !!o.nightCharge.enabled,
            amount: typeof o.nightCharge.amount === "number" ? o.nightCharge.amount : "",
            appliesFromHour:
              typeof o.nightCharge.appliesFromHour === "number" ? o.nightCharge.appliesFromHour : 22,
            appliesToHour:
              typeof o.nightCharge.appliesToHour === "number" ? o.nightCharge.appliesToHour : 6,
          }
        : { ...BLANK_NIGHT },
      surgeCharges: Array.isArray(o.specialOverrides)
        ? o.specialOverrides.map((ov: any) => {
            if (ov?.date) {
              const d = new Date(ov.date);
              const ymd = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
                d.getUTCDate()
              ).padStart(2, "0")}`;
              return { mode: "single", date: ymd, price: ov.price ?? "" };
            }
            if (ov?.startDate && ov?.endDate) {
              const sd = new Date(ov.startDate);
              const ed = new Date(ov.endDate);
              const sdY = `${sd.getUTCFullYear()}-${String(sd.getUTCMonth() + 1).padStart(2, "0")}-${String(
                sd.getUTCDate()
              ).padStart(2, "0")}`;
              const edY = `${ed.getUTCFullYear()}-${String(ed.getUTCMonth() + 1).padStart(2, "0")}-${String(
                ed.getUTCDate()
              ).padStart(2, "0")}`;
              return { mode: "range", startDate: sdY, endDate: edY, price: ov.price ?? "" };
            }
            return { ...BLANK_SURGE };
          })
        : [],
      availabilityStatus: (o.availabilityStatus || "available") as Availability,
      cancellationPolicy: o.cancellationPolicy || "",
      specialConditions: o.specialConditions || "",
      serviceCharge: o.serviceCharge
        ? {
            amount: typeof o.serviceCharge.amount === "number" ? o.serviceCharge.amount : "",
            currency: o.serviceCharge.currency || "INR",
            notes: o.serviceCharge.notes || "",
          }
        : { ...BLANK_SERVICE },
    }));

    const faqs: FAQItem[] =
      Array.isArray(route.faqs) && route.faqs.length
        ? route.faqs.map((f: any) => ({
            question: (f?.question || "").trim(),
            answer: (f?.answer || "").trim(),
          }))
        : [{ ...BLANK_FAQ }];

    return {
      routePairs: normalizedRoutePairs,
      vehicleOptions: vopts.length
        ? vopts
        : [
            {
              vehicleType: "4 SEATER",
              maxPax: 4,
              vendorPrice: "",
              sellerPrice: "",
              currency: "INR",
              nightCharge: { ...BLANK_NIGHT },
              surgeCharges: [],
              availabilityStatus: "available",
              cancellationPolicy: "",
              specialConditions: "",
              serviceCharge: { ...BLANK_SERVICE },
            },
          ],
      routeCancellationPolicy: route.routeCancellationPolicy || "",
      routeSpecialConditions: route.routeSpecialConditions || "",
      faqs,
    };
  }, [route]);

  // ---------- Local UI state ----------
  const [data, setData] = useState<TransferRouteFormData>(initialForm);
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [appendImages, setAppendImages] = useState(true); // use ?append=true by default

  const step = STEPS[stepIndex];

  // Images state (existing from store doc; plus newly added)
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string | null>(route?.thumbnailUrl ?? null);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>(
    Array.isArray(route?.images) ? route.images : []
  );

  // Track which existing images user removed
  const [removedExistingImageUrls, setRemovedExistingImageUrls] = useState<string[]>([]);

  const [newThumbnail, setNewThumbnail] = useState<NewThumbnail | null>(null);
  const [newImages, setNewImages] = useState<NewImage[]>([]);

  const thumbInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // hydrate on route change
  useEffect(() => {
    setData(initialForm);
    setExistingThumbnailUrl(route?.thumbnailUrl ?? null);
    setExistingImageUrls(Array.isArray(route?.images) ? route.images : []);
    setRemovedExistingImageUrls([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialForm]);

  // revoke previews on unmount
  useEffect(() => {
    return () => {
      if (newThumbnail?.preview) URL.revokeObjectURL(newThumbnail.preview);
      newImages.forEach((i) => URL.revokeObjectURL(i.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Image handlers ----------
  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (newThumbnail?.preview) URL.revokeObjectURL(newThumbnail.preview);
    setNewThumbnail({ file: f, preview: URL.createObjectURL(f) });
  };

  const clearThumbnail = () => {
    if (newThumbnail?.preview) URL.revokeObjectURL(newThumbnail.preview);
    setNewThumbnail(null);
    setExistingThumbnailUrl(null);
    if (thumbInputRef.current) thumbInputRef.current.value = "";
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setNewImages((prev) => [
      ...prev,
      ...files.map((file) => ({ file, preview: URL.createObjectURL(file) })),
    ]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeNewImage = (index: number) => {
    setNewImages((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return next;
    });
  };

  const removeExistingImage = (index: number) => {
    setExistingImageUrls((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) setRemovedExistingImageUrls((r) => [...r, removed]);
      return next;
    });
  };

  /* ---------- Validation & step helpers ---------- */
  const canContinueRoute =
    data.routePairs.length > 0 &&
    data.routePairs.every((p) => p.pickupLocation.trim() && p.dropLocation.trim());

  const canContinueVehicles = data.vehicleOptions.every((v) => {
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

  const isStepValid = (k: StepKey) => {
    switch (k) {
      case "route":
        return canContinueRoute;
      case "vehicles":
        return canContinueVehicles;
      default:
        return true;
    }
  };

  const canGoNext = isStepValid(step.key);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const setField = <K extends keyof TransferRouteFormData>(k: K, v: TransferRouteFormData[K]) =>
    setData((p) => ({ ...p, [k]: v }));

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
          vehicleType: "4 SEATER",
          maxPax: 4,
          vendorPrice: "",
          sellerPrice: "",
          currency: "INR",
          nightCharge: { ...BLANK_NIGHT },
          surgeCharges: [],
          availabilityStatus: "available",
          cancellationPolicy: "",
          specialConditions: "",
          serviceCharge: { ...BLANK_SERVICE },
        },
      ],
    }));

  const removeOption = (idx: number) =>
    setData((p) => {
      const arr = [...p.vehicleOptions];
      if (arr.length <= 1) {
        arr[0] = {
          vehicleType: "4 SEATER",
          maxPax: 4,
          vendorPrice: "",
          sellerPrice: "",
          currency: "INR",
          nightCharge: { ...BLANK_NIGHT },
          surgeCharges: [],
          availabilityStatus: "available",
          cancellationPolicy: "",
          specialConditions: "",
          serviceCharge: { ...BLANK_SERVICE },
        };
        return { ...p, vehicleOptions: arr };
      }
      arr.splice(idx, 1);
      return { ...p, vehicleOptions: arr };
    });

  const addRoutePair = () =>
    setData((p) => ({
      ...p,
      routePairs: [...p.routePairs, { pickupLocation: "", dropLocation: "" }],
    }));

  const removeRoutePair = (i: number) =>
    setData((p) => {
      if (p.routePairs.length <= 1) return p;
      return { ...p, routePairs: p.routePairs.filter((_, idx) => idx !== i) };
    });

  // FAQ helpers
  const addFaq = () => setData((p) => ({ ...p, faqs: [...(p.faqs || []), { ...BLANK_FAQ }] }));
  const removeFaq = (i: number) =>
    setData((p) => {
      if ((p.faqs?.length || 0) <= 1) return p;
      return { ...p, faqs: (p.faqs || []).filter((_, k) => k !== i) };
    });
  const patchFaq = (i: number, next: Partial<FAQItem>) =>
    setData((p) => ({
      ...p,
      faqs: (p.faqs || []).map((f, k) => (k === i ? { ...f, ...next } : f)),
    }));

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
     Submit (PUT /update/:id)
     ========================= */
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (stepIndex < LAST_INDEX) {
      if (isStepValid(step.key)) goNext();
      return;
    }

    const _id =
      (route?._id && (typeof route._id === "string" ? route._id : route._id.$oid)) || idFromQuery;
    if (!_id) {
      alert("Missing route id to update.");
      return;
    }

    try {
      setSubmitting(true);

      const cookedVehicleOptions = data.vehicleOptions.map((v) => ({
        vehicleType: v.vehicleType,
        maxPax: toNumOrZero(v.maxPax),
        basePrice: toNumOrZero(v.sellerPrice), // UI seller → schema basePrice
        currency: v.currency || "INR",
        vendorBasePrice: toNumOrZero(v.vendorPrice),
        sellerBasePrice: toNumOrZero(v.sellerPrice),
        nightCharge: v.nightCharge?.enabled
          ? {
              amount: toNumOrZero(v.nightCharge.amount),
              appliesFromHour:
                v.nightCharge.appliesFromHour === "" || v.nightCharge.appliesFromHour == null
                  ? 22
                  : Number(v.nightCharge.appliesFromHour),
              appliesToHour:
                v.nightCharge.appliesToHour === "" || v.nightCharge.appliesToHour == null
                  ? 6
                  : Number(v.nightCharge.appliesToHour),
            }
          : undefined,
        specialOverrides: (v.surgeCharges || [])
          .map((r) => cookSurgeToOverride(r, v.currency || "INR"))
          .filter(Boolean) as any[],
        availabilityStatus: v.availabilityStatus || "available",
        cancellationPolicy: v.cancellationPolicy ?? "",
        specialConditions: v.specialConditions ?? "",
        serviceCharge:
          v.serviceCharge && (v.serviceCharge.amount !== "" && v.serviceCharge.amount != null)
            ? {
                amount: toNumOrZero(v.serviceCharge.amount),
                currency: v.serviceCharge.currency || "INR",
                notes: v.serviceCharge.notes ?? "",
              }
            : undefined,
      }));

      const fullPayload = {
        form: data,
        cooked: {
          vehicleOptions: cookedVehicleOptions,
          routePairs: data.routePairs.map((r) => ({
            pickupLocation: r.pickupLocation,
            dropLocation: r.dropLocation,
          })),
          routeCancellationPolicy: data.routeCancellationPolicy ?? "",
          routeSpecialConditions: data.routeSpecialConditions ?? "",
          faqs: (data.faqs || [])
            .map((f) => ({
              question: (f.question || "").trim(),
              answer: (f.answer || "").trim(),
            }))
            .filter((f) => f.question || f.answer),
        },
        media: {
          existingThumbnailUrl: existingThumbnailUrl || null,
          existingImageUrls: existingImageUrls || [],
          removedExistingImageUrls, // server may use this to delete old images
          newThumbnailMeta: newThumbnail
            ? { name: newThumbnail.file.name, size: newThumbnail.file.size, type: newThumbnail.file.type }
            : null,
          newImagesMeta: newImages.map(({ file }) => ({
            name: file.name,
            size: file.size,
            type: file.type,
          })),
        },
      };

      const fd = new FormData();
      fd.append("payload", JSON.stringify(fullPayload));
      if (newThumbnail?.file) fd.append("thumbnail", newThumbnail.file, newThumbnail.file.name);
      if (newImages.length) newImages.forEach(({ file }) => fd.append("images[]", file, file.name));

      const url = `${process.env.NEXT_PUBLIC_API_BASE}pickupdrop/update/${encodeURIComponent(
        _id
      )}${appendImages ? "?append=true" : ""}`;

      const res = await fetch(url, { method: "PUT", body: fd });
      if (!res.ok) throw new Error((await res.text()) || "Failed");

      alert("Transfer route updated successfully! ✅");
      router.push("/dashboard/pickupdrop"); // adjust path if your list page differs
    } catch (err: any) {
      console.error(err);
      alert(`Update failed: ${err?.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  /* ============ Derived for header ============ */
  const titlePickup = data.routePairs[0]?.pickupLocation || "Pickup";
  const titleDrop = data.routePairs[0]?.dropLocation || "Drop";

  /* ============ Render ============ */
  return (
    <div className="flex min-h-screen bg-gray-100 px-0 sm:px-4 md:px-4">
      <div className="w-full max-w-6xl ml-auto rounded-none sm:rounded-2xl bg-white p-0 sm:p-6 md:p-8 shadow-none sm:shadow-lg min-h-screen sm:min-h-0">
        <form className="bg-white rounded-none sm:rounded-2xl shadow-none sm:shadow-md space-y-2 sm:space-y-6" onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-2 sm:mb-6 px-3 sm:px-0 pt-3 sm:pt-0">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="size-9 rounded-lg bg-blue-600 text-white grid place-items-center text-sm font-bold shadow flex-shrink-0">
                {titlePickup[0]?.toUpperCase() || "R"}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">
                  Edit Transfer Route — {titlePickup} → {titleDrop}
                </h1>
                <p className="text-xs text-gray-500 truncate hidden sm:block">
                  Update pickup/drop, vehicles, surge, media, policies & FAQs
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <label className="inline-flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={appendImages}
                  onChange={(e) => setAppendImages(e.target.checked)}
                  disabled={submitting}
                />
                Append images
              </label>
              <div className="group relative">
                <InfoIcon className="size-4 text-gray-400" />
                <div className="hidden group-hover:block absolute right-0 mt-2 w-60 text-xs bg-white border border-gray-200 shadow p-2 rounded">
                  When enabled, newly uploaded images are <b>added</b> to existing ones
                  (<code>?append=true</code>). Otherwise, explicit <code>imageUrls</code> replace existing.
                </div>
              </div>
            </div>
          </div>

          {/* Stepper */}
          <div className="mt-2 sm:mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar px-3 sm:px-0">
            {STEPS.map((r, i) => {
              const active = i === stepIndex;
              const done = i < stepIndex;
              const canJump = i <= stepIndex || STEPS.slice(0, i).every((st) => isStepValid(st.key));
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => canJump && setStepIndex(i)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs whitespace-nowrap ${
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
          <div className="mt-2 sm:mt-3 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden px-3 sm:px-0">
            <div
              className={`h-full transition-all ${submitting ? "bg-blue-400" : "bg-blue-600"}`}
              style={{ width: `${progress}%` }}
            />
          </div>

        {/* Content */}
        <main className="pb-2 sm:pb-6 px-3 sm:px-0">
        {/* ROUTE */}
        {step.key === "route" && (
          <SectionCard
            title="Route Pairs"
            subtitle="Edit pickup → drop row(s) for this route."
            icon={<MapPin className="size-5 text-blue-600" />}
            requiredHint
          >
            <div className="space-y-2 sm:space-y-3">
              <div className="space-y-1.5 sm:space-y-2">
                {data.routePairs.map((row, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-gray-200 p-3 grid grid-cols-1 sm:grid-cols-5 gap-2"
                  >
                    <div className="sm:col-span-2">
                      <Field label="Pickup Location *" required>
                        <input
                          type="text"
                          className="input"
                          value={row.pickupLocation}
                          onChange={(e) => {
                            const next = [...data.routePairs];
                            next[i] = { ...row, pickupLocation: e.target.value };
                            setField("routePairs", next);
                          }}
                          placeholder="DABOLIM AIRPORT"
                          disabled={submitting}
                        />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Drop Location *" required>
                        <input
                          type="text"
                          className="input"
                          value={row.dropLocation}
                          onChange={(e) => {
                            const next = [...data.routePairs];
                            next[i] = { ...row, dropLocation: e.target.value };
                            setField("routePairs", next);
                          }}
                          placeholder="CALANGUTE BEACH"
                          disabled={submitting}
                        />
                      </Field>
                    </div>
                    <div className="sm:col-span-1 flex items-end">
                      <button
                        type="button"
                        onClick={() => removeRoutePair(i)}
                        disabled={submitting || data.routePairs.length <= 1}
                        className="w-full h-12 grid place-items-center rounded-xl border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                        title="Remove row"
                        aria-label="Remove row"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Route Pair button */}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={addRoutePair}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                >
                  <Plus className="size-4" />
                  Add Route Pair
                </button>
              </div>

              <div className="text-xs text-gray-500 flex items-center gap-2">
                <InfoIcon className="size-3.5" /> You can add multiple route pairs; all will be saved.
              </div>
            </div>
          </SectionCard>
        )}

        {/* VEHICLES */}
        {step.key === "vehicles" && (
          <SectionCard
            title="Vehicle Options"
            subtitle="Vendor/Seller price, availability, night charge."
            icon={<Truck className="size-5 text-blue-600" />}
            requiredHint
          >
            <div className="space-y-6">
              {data.vehicleOptions.map((v, idx) => {
                const setType = (vehicleType: VehicleType) => {
                  const choices = VEHICLE_TYPE_TO_MAX_PAX[vehicleType] || [];
                  const autoMax = choices.length ? choices[choices.length - 1] : "";
                  updateOption(idx, { vehicleType, maxPax: autoMax });
                };

                return (
                  <div key={idx} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            updateOption(idx, {
                              availabilityStatus: e.target.value as Availability,
                            })
                          }
                          disabled={submitting}
                        >
                          <option value="available">available</option>
                          <option value="limited">limited</option>
                          <option value="unavailable">unavailable</option>
                          <option value="on-request">on-request</option>
                        </select>
                      </Field>
                    </div>

                    <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/40 p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-3 mb-2">
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
                                nightCharge: { ...(v.nightCharge || { ...BLANK_NIGHT }), enabled: e.target.checked },
                              })
                            }
                            disabled={submitting}
                          />
                          <span className="text-blue-900 font-medium">Enable</span>
                        </label>
                      </div>

                      {v.nightCharge?.enabled && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

        {/* SURGE */}
        {step.key === "surge" && (
          <SurgeChargesSection
            data={data}
            setData={setData}
            submitting={submitting}
            updateOption={updateOption}
          />
        )}

        {/* IMAGES */}
        {step.key === "images" && (
          <SectionCard
            title="Images"
            subtitle="Upload gallery pictures and an optional thumbnail."
            icon={<ImageIcon className="size-5 text-blue-600" />}
          >
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Thumbnail (single)</h3>
            <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50/50 p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="size-8 grid place-items-center bg-blue-100 rounded-lg">
                  <Star className="size-4 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-900">Primary Cover</p>
                  <p className="text-xs text-blue-800/80">This image is used as the cover in listings.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {existingThumbnailUrl || newThumbnail ? (
                  <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-blue-400 bg-white">
                    <img
                      src={newThumbnail?.preview || existingThumbnailUrl || ""}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                      decoding="async"
                      loading="lazy"
                    />
                    <button
                      type="button"
                      onClick={clearThumbnail}
                      className="absolute top-1 right-1 size-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md active:scale-95"
                      title="Remove thumbnail"
                      aria-label="Remove thumbnail"
                      disabled={submitting}
                    >
                      <X className="size-4" strokeWidth={3} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                      <p className="text-white text-[10px] font-medium">THUMBNAIL</p>
                    </div>
                  </div>
                ) : (
                  <label className="block aspect-square">
                    <div className="flex flex-col items-center justify-center w-full h-full px-4 py-3 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer hover:border-blue-500 transition-colors bg-white hover:bg-blue-50">
                      <Star className="size-6 text-blue-400" />
                      <p className="mt-1 text-sm font-medium text-blue-900">Add Thumbnail</p>
                    </div>
                    <input
                      ref={thumbInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailUpload}
                      className="hidden"
                      disabled={submitting}
                    />
                  </label>
                )}
              </div>
            </div>

            <h3 className="text-sm font-semibold text-gray-900 mb-2">Vehicle Images (gallery)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {existingImageUrls.map((url, index) => (
                <div
                  key={url + index}
                  className="relative aspect-square rounded-xl overflow-hidden border border-gray-300 bg-gray-50 shadow-sm"
                >
                  <img
                    src={url}
                    alt={`Existing ${index + 1}`}
                    className="w-full h-full object-cover"
                    decoding="async"
                    loading="lazy"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(index)}
                    className="absolute top-1 right-1 size-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md active:scale-95"
                    title="Remove existing image"
                    aria-label="Remove existing image"
                    disabled={submitting}
                  >
                    <X className="size-4" strokeWidth={3} />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                    <p className="text-white text-[10px] font-medium">EXISTING</p>
                  </div>
                </div>
              ))}

              {newImages.map((image, index) => (
                <div
                  key={image.preview}
                  className="relative aspect-square rounded-xl overflow-hidden border-2 border-dashed border-blue-400 bg-blue-50"
                >
                  <img
                    src={image.preview}
                    alt={`New ${index + 1}`}
                    className="w-full h-full object-cover opacity-80"
                    decoding="async"
                    loading="lazy"
                  />
                  <button
                    type="button"
                    onClick={() => removeNewImage(index)}
                    className="absolute top-1 right-1 size-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md active:scale-95"
                    title="Remove new image"
                    aria-label="Remove new image"
                    disabled={submitting}
                  >
                    <X className="size-4" strokeWidth={3} />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                    <p className="text-white text-[10px] font-medium truncate" title={image.file.name}>
                      NEW
                    </p>
                  </div>
                </div>
              ))}

              <label className="block aspect-square">
                <div className="flex flex-col items-center justify-center w-full h-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 transition-colors bg-white hover:bg-gray-50">
                  <ImageIcon className="size-6 text-gray-400" />
                  <p className="mt-1 text-sm font-medium text-gray-700">Add Image</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={submitting}
                />
              </label>
            </div>
          </SectionCard>
        )}

        {/* POLICIES */}
        {step.key === "policies" && (
          <SectionCard
            title="Policies"
            subtitle="Route-wide policies (vehicle can override)."
            icon={<FileText className="size-5 text-blue-600" />}
          >
            <div className="grid grid-cols-1 gap-4">
              <Field label="Route Cancellation Policy">
                <textarea
                  className="textarea w-full"
                  rows={3}
                  value={data.routeCancellationPolicy || ""}
                  onChange={(e) => setField("routeCancellationPolicy", e.target.value)}
                  placeholder="Enter cancellation rules"
                  disabled={submitting}
                />
              </Field>
              <Field label="Route Special Conditions">
                <textarea
                  className="textarea w-full"
                  rows={3}
                  value={data.routeSpecialConditions || ""}
                  onChange={(e) => setField("routeSpecialConditions", e.target.value)}
                  placeholder="Any conditions that apply to this route"
                  disabled={submitting}
                />
              </Field>
            </div>
          </SectionCard>
        )}

        {/* FAQs */}
        {step.key === "faqs" && (
          <SectionCard
            title="FAQs"
            subtitle="Add common questions and answers travelers may have for this route."
            icon={<HelpCircle className="size-5 text-blue-600" />}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-800">Frequently Asked Questions</p>
              <button
                type="button"
                onClick={addFaq}
                disabled={submitting}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
              >
                <Plus className="size-3.5" />
                Add FAQ
              </button>
            </div>

            {(data.faqs || []).length === 0 && (
              <p className="text-xs text-gray-500">No FAQs yet. Click “Add FAQ”.</p>
            )}

            <div className="space-y-3">
              {(data.faqs || []).map((faq, i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-700">FAQ #{i + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeFaq(i)}
                      disabled={submitting || (data.faqs?.length || 0) <= 1}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50"
                      title="Remove FAQ"
                      aria-label="Remove FAQ"
                    >
                      <Trash2 className="size-3.5" />
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <Field label="Question">
                      <input
                        type="text"
                        className="input"
                        value={faq.question}
                        onChange={(e) => patchFaq(i, { question: e.target.value })}
                        placeholder="e.g., Can we make a midway stop?"
                        disabled={submitting}
                      />
                    </Field>
                    <Field label="Answer">
                      <textarea
                        className="textarea w-full"
                        rows={3}
                        value={faq.answer}
                        onChange={(e) => patchFaq(i, { answer: e.target.value })}
                        placeholder="e.g., Yes, one 10–15 min stop is allowed on request."
                        disabled={submitting}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </main>
        </form>

          {/* Sticky Footer */}
          <div className="sticky bottom-0 z-40 mt-2 sm:mt-6 bg-white rounded-none sm:rounded-xl border-t sm:border border-gray-200 shadow-lg mx-0 sm:mx-0">
            <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="inline-flex items-center gap-2 text-xs text-gray-600 bg-gray-100 rounded-full px-3 py-1.5 font-semibold self-start sm:self-auto">
                <span
                  className={`size-2 rounded-full ${
                    isStepValid(step.key) ? "bg-green-500" : "bg-amber-500"
                  }`}
                />
                {isStepValid(step.key) ? "Looks good" : "Complete required fields"}
              </span>

              <div className="flex w-full sm:w-auto gap-2 sm:ml-auto">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={stepIndex === 0 || submitting}
                  className={`flex-1 sm:flex-none px-4 py-3 text-sm font-medium rounded-xl border touch-manipulation ${
                    stepIndex === 0 || submitting
                      ? "border-gray-200 text-gray-400"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                  }`}
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canGoNext || submitting}
                  className={`flex-1 sm:flex-none px-5 py-3 text-sm font-semibold rounded-xl text-white touch-manipulation transition-colors ${
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

          {/* Local styles */}
          <style jsx>{`
            .input {
              @apply w-full h-12 px-4 py-3 rounded-xl border border-gray-300 bg-white
              shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              text-base leading-none placeholder:text-gray-400 transition-all touch-manipulation;
              -webkit-tap-highlight-color: transparent;
            }
            .textarea {
              @apply w-full min-h-[112px] px-4 py-3 rounded-xl border border-gray-300 bg-white
              shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              text-base placeholder:text-gray-400 transition-all resize-y touch-manipulation;
            }
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            .safe-bottom { padding-bottom: calc(env(safe-area-inset-bottom) + 0.5rem); }
            .suffix { position:absolute; right:12px; top:50%; transform:translateY(-50%); font-size:12px; color:#6b7280; }
          `}</style>
      </div>
    </div>
  );
}

/* ---------- Reusables ---------- */
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
    <section className="mt-2 sm:mt-6 first:mt-0">
      <div className="bg-white rounded-none sm:rounded-xl border border-gray-200 shadow-md overflow-visible">
        <div className="px-3 py-2 sm:px-5 sm:py-4 border-b border-gray-100 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="size-6 sm:size-8 grid place-items-center bg-blue-50 rounded-lg flex-shrink-0">{icon}</div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-gray-900">{title}</h2>
              {subtitle && <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">{subtitle}</p>}
            </div>
          </div>
          {requiredHint && (
            <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap flex-shrink-0">* Required</span>
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
        <span className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-600">*</span>}
        </span>
        {hint && <span className="text-[11px] text-gray-500">{hint}</span>}
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
      <div className="space-y-6">
        {data.vehicleOptions.map((v, idx) => (
          <div key={idx} className="rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
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

            <div className="space-y-3">
              {(v.surgeCharges || []).map((b, i) => (
                <div key={i} className="rounded-lg border border-gray-200 p-3">
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

/* =========================
   Serializer helpers
   ========================= */
function cookSurgeToOverride(b: SurgeItem, fallbackCurrency: string): any | null {
  const currency = fallbackCurrency || "INR";
  const price = b.price === "" || b.price == null ? NaN : Number(b.price);
  if (!isFiniteNum(price)) return null;

  if (b.mode === "single") {
    const single = b.date?.trim();
    if (single) return { label: "Surge", price: Number(price), currency, date: single };
    return null;
  }
  const start = b.startDate?.trim();
  const end = b.endDate?.trim();
  if (start && end) return { label: "Surge", price: Number(price), currency, startDate: start, endDate: end };
  return null;
}
