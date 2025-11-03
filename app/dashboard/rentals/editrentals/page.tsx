// app/dashboard/vehicles/EditRentalFormMobile.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Car,
  IndianRupee,
  Gauge,
  MapPin,
  Image as ImageIcon,
  X,
  CheckCircle2,
  Loader2,
  Star,
  Plus,
  Trash2,
} from "lucide-react";
import { useVehicleStore } from "@/store/rentalStore";

/* ---------- Types ---------- */
interface Pricing {
  oneDay: string;
  twoDays: string;
  threePlusPerDay: string;
  currency?: string;
  minDaysIfApplicable?: string;
}
interface Deposits {
  security: string;
  currency?: string;
}
interface Fuel {
  type?: string | null;
  status?: string | null;
}

/* Multi-surge (UI row) */
type SurgeMode = "single" | "range";
interface SurgeItem {
  id: string;                  // UI-only
  mode: SurgeMode;
  startDate: string;           // YYYY-MM-DD
  endDate: string;             // YYYY-MM-DD (same as start if single)
  amount: number | "";
  currency?: string;
}

/* FAQs (UI row) */
interface FaqItem {
  id: string;                  // UI-only
  question: string;
  answer: string;
}

interface VehicleFormData {
  _id?: string;
  vehicleId: string;
  vehicleType: string;
  seaterCapacity: string;
  variant?: string | null;

  images: string[];
  thumbnailUrl?: string | null;

  pricing: Pricing;
  vendorPricing: Pricing;
  sellerPricing: Pricing;

  mileage?: string;
  distanceLimitPerDay?: string;

  deposits: Deposits;
  rating?: number | "";

  pickupLocations?: string;
  dropLocations?: string;

  cancellationPolicy?: string | null;
  supportInfo?: string | null;

  speedLimit?: string;
  collectingProcedure?: string;
  handoverProcedure?: string;
  termsAndConditions: string;

  fuel?: Fuel;
  maxKmPerDay?: number | "";
  reviewsLink?: string | null;

  /* NEW: multi-surge & faqs */
  surges: SurgeItem[];
  faqs: FaqItem[];
}

interface ImageFile {
  file: File;
  preview: string;
}

/* ---------- Blank state ---------- */
const blankPricing: Pricing = {
  oneDay: "",
  twoDays: "",
  threePlusPerDay: "",
  currency: "INR",
  minDaysIfApplicable: "",
};

const initialBlankState: VehicleFormData = {
  vehicleId: "",
  vehicleType: "",
  seaterCapacity: "",
  variant: "",
  images: [],
  thumbnailUrl: null,

  pricing: { ...blankPricing },
  vendorPricing: { ...blankPricing },
  sellerPricing: { ...blankPricing },

  mileage: "",
  distanceLimitPerDay: "",

  deposits: { security: "", currency: "INR" },
  rating: "",
  pickupLocations: "",
  dropLocations: "",

  cancellationPolicy: "",
  supportInfo: "",
  speedLimit: "",
  collectingProcedure: "",
  handoverProcedure: "",
  termsAndConditions: "",
  fuel: { type: "", status: "" },
  maxKmPerDay: "",
  reviewsLink: "",

  /* NEW */
  surges: [],
  faqs: [],
};

/* ---------- Steps (FAQs added after Locations) ---------- */
const STEPS = [
  { key: "basic", label: "Basic", icon: <Car className="size-4" /> },
  { key: "pricing", label: "Pricing", icon: <IndianRupee className="size-4" /> },
  { key: "specs", label: "Specs", icon: <Gauge className="size-4" /> },
  { key: "locs", label: "Locations", icon: <MapPin className="size-4" /> },
  { key: "faqs", label: "FAQs", icon: <Star className="size-4" /> }, // NEW step
  { key: "images", label: "Images", icon: <ImageIcon className="size-4" /> },
] as const;

type StepKey = (typeof STEPS)[number]["key"];
const LAST_INDEX = STEPS.length - 1;

/* ---------- Presets ---------- */
const TWO_WHEELER_VARIANTS = ["Dio", "Activa", "Jupyter", "Fascino", "Aprilla", "Vespa"] as const;
const FOUR_WHEELER_4_SEATER_VARIANTS = ["swift", "balano", "Old Model Thar", "New Model Thar"] as const;
const FOUR_WHEELER_7_SEATER_VARIANTS = ["ertiga", "innova"] as const;

/* ---------- Helpers ---------- */
const n = (v: string | number | "" | null | undefined) =>
  v === "" || v == null ? NaN : Number(v);
const isFiniteNum = (v: any) => typeof v === "number" && Number.isFinite(v);

/** Normalize any date-ish value to `YYYY-MM-DD` (UTC) */
const toYMD = (v?: string | Date | null): string => {
  if (!v) return "";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v as any);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const uid = () => Math.random().toString(36).slice(2, 10);

/* Optional: textarea autosize */
const autosize = (el: HTMLTextAreaElement | null) => {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
};

export default function EditRentalFormMobile() {
  const router = useRouter();
  const { vehicle } = useVehicleStore() as { vehicle: any | null | undefined };

  const [formData, setFormData] = useState<VehicleFormData>(initialBlankState);

  // gallery
  const [newImages, setNewImages] = useState<ImageFile[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [removedImageUrls, setRemovedImageUrls] = useState<string[]>([]);

  // thumbnail
  const [newThumbnail, setNewThumbnail] = useState<ImageFile | null>(null);
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const thumbInputRef = useRef<HTMLInputElement | null>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];

  const [submitting, setSubmitting] = useState(false);

  // custom variant
  const [customVariantMode, setCustomVariantMode] = useState(false);
  const [customVariant, setCustomVariant] = useState("");

  // dynamic lists for pickup & drop
  const [pickupList, setPickupList] = useState<string[]>([""]);
  const [dropList, setDropList] = useState<string[]>([""]);

  /* ---------- Hydrate from store ---------- */
  useEffect(() => {
    if (!vehicle) return;

    const asStr = (v: any) =>
      v === null || v === undefined || Number.isNaN(v) ? "" : String(v);

    const toPricingStr = (p?: any): Pricing => ({
      oneDay: asStr(p?.oneDay),
      twoDays: asStr(p?.twoDays),
      threePlusPerDay: asStr(p?.threePlusPerDay),
      currency: p?.currency || "INR",
      minDaysIfApplicable: p?.minDaysIfApplicable == null ? "" : asStr(p?.minDaysIfApplicable),
    });

    // Hydrate surges from either array or legacy single
    const incomingSurgeArray: any[] = Array.isArray(vehicle?.surgeCharges) ? vehicle.surgeCharges : [];
    const incomingSurgeSingle: any = vehicle?.surgeCharge;

    const mergedSurges: SurgeItem[] = [
      ...incomingSurgeArray.map((x) => ({
        id: uid(),
        mode: (x?.mode === "range" ? "range" : "single") as SurgeMode,
        startDate: toYMD(x?.startDate ?? x?.endDate),
        endDate: toYMD(x?.endDate ?? x?.startDate),
        amount: typeof x?.amount === "number" ? x.amount : (x?.amount ? Number(x.amount) : ""),
        currency: x?.currency || vehicle?.pricing?.currency || vehicle?.sellerPricing?.currency || "INR",
      })),
      ...(incomingSurgeSingle
        ? [
            {
              id: uid(),
              mode: (incomingSurgeSingle?.mode === "range" ? "range" : "single") as SurgeMode,
              startDate: toYMD(incomingSurgeSingle?.startDate ?? incomingSurgeSingle?.endDate),
              endDate: toYMD(incomingSurgeSingle?.endDate ?? incomingSurgeSingle?.startDate),
              amount:
                typeof incomingSurgeSingle?.amount === "number"
                  ? incomingSurgeSingle.amount
                  : incomingSurgeSingle?.amount
                  ? Number(incomingSurgeSingle.amount)
                  : "",
              currency:
                incomingSurgeSingle?.currency ||
                vehicle?.pricing?.currency ||
                vehicle?.sellerPricing?.currency ||
                "INR",
            },
          ]
        : []),
    ];

    // De-duplicate identical pairs if both provided
    const seen = new Set<string>();
    const surges = mergedSurges.filter((s) => {
      const key = `${s.mode}|${s.startDate}|${s.endDate}|${s.amount}|${s.currency || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Hydrate FAQs
    const faqsFromDoc: FaqItem[] = Array.isArray(vehicle?.faqs)
      ? vehicle.faqs.map((f: any) => ({
          id: uid(),
          question: (f?.question || "").trim(),
          answer: (f?.answer || "").trim(),
        }))
      : [];

    const hydrated: VehicleFormData = {
      _id: vehicle._id,
      vehicleId: vehicle.vehicleId || "",
      vehicleType: vehicle.vehicleType || "",
      seaterCapacity: vehicle.seaterCapacity || "",
      variant: vehicle.variant || "",
      images: vehicle.images || [],
      thumbnailUrl: vehicle.thumbnailUrl ?? null,

      pricing: toPricingStr(vehicle?.pricing || vehicle?.sellerPricing),
      vendorPricing: toPricingStr(vehicle?.vendorPricing),
      sellerPricing: toPricingStr(vehicle?.sellerPricing || vehicle?.pricing),

      mileage: vehicle.mileage || "",
      distanceLimitPerDay: vehicle.distanceLimitPerDay || "",

      deposits: {
        security: asStr(vehicle.deposits?.security),
        currency: vehicle.deposits?.currency || "INR",
      },

      rating: asStr(vehicle.rating) as any,
      pickupLocations: vehicle.pickupLocations || "",
      dropLocations: vehicle.dropLocations || "",

      cancellationPolicy: vehicle.cancellationPolicy || "",
      supportInfo: vehicle.supportInfo || "",
      speedLimit: vehicle.speedLimit || "",
      collectingProcedure: vehicle.collectingProcedure || "",
      handoverProcedure: vehicle.handoverProcedure || "",
      termsAndConditions: vehicle.termsAndConditions || "",
      fuel: { type: vehicle.fuel?.type || "", status: vehicle.fuel?.status || "" },
      maxKmPerDay: asStr(vehicle.maxKmPerDay) as any,
      reviewsLink: vehicle.reviewsLink || "",

      /* NEW */
      surges,
      faqs: faqsFromDoc,
    };

    setFormData(hydrated);

    // hydrate lists
    if (hydrated.pickupLocations && hydrated.pickupLocations.trim()) {
      setPickupList(
        hydrated.pickupLocations.split("\n").map((s) => s.trim()).filter(Boolean)
      );
    } else {
      setPickupList([""]);
    }
    if (hydrated.dropLocations && hydrated.dropLocations.trim()) {
      setDropList(hydrated.dropLocations.split("\n").map((s) => s.trim()).filter(Boolean));
    } else {
      setDropList([""]);
    }

    // images
    setExistingImageUrls(hydrated.images || []);
    setExistingThumbnailUrl(hydrated.thumbnailUrl || null);
    setRemovedImageUrls([]);
  }, [vehicle]);

  /* ---------- Updaters ---------- */
  const onText = (name: keyof VehicleFormData, val: any) =>
    setFormData((p) => ({ ...p, [name]: val }));

  const onPricing = (k: keyof Pricing, val: any) =>
    setFormData((p: any) => ({ ...p, pricing: { ...(p.pricing || {}), [k]: val } }));

  const onVendorPricing = (k: keyof Pricing, val: any) =>
    setFormData((p: any) => ({ ...p, vendorPricing: { ...(p.vendorPricing || {}), [k]: val } }));

  const onSellerPricing = (k: keyof Pricing, val: any) =>
    setFormData((p: any) => {
      const nextSeller = { ...(p.sellerPricing || {}), [k]: val };
      const nextPricing = { ...(p.pricing || {}), [k]: val };
      return { ...p, sellerPricing: nextSeller, pricing: nextPricing };
    });

  const onDeposits = (k: keyof Deposits, val: any) =>
    setFormData((p: any) => ({ ...p, deposits: { ...(p.deposits || {}), [k]: val } }));

  const onFuel = (k: keyof Fuel, val: any) =>
    setFormData((p) => ({ ...p, fuel: { ...(p.fuel || {}), [k]: val } }));

  /* ---------- Surge list helpers ---------- */
  const addSurge = () =>
    setFormData((p) => ({
      ...p,
      surges: [
        ...(p.surges || []),
        {
          id: uid(),
          mode: "single",
          startDate: "",
          endDate: "",
          amount: "",
          currency: p.pricing?.currency || "INR",
        },
      ],
    }));

  const removeSurge = (id: string) =>
    setFormData((p) => ({ ...p, surges: (p.surges || []).filter((s) => s.id !== id) }));

  const updateSurge = (id: string, patch: Partial<SurgeItem>) =>
    setFormData((p) => ({
      ...p,
      surges: (p.surges || []).map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));

  /* ---------- FAQs helpers ---------- */
  const addFaq = () =>
    setFormData((p) => ({
      ...p,
      faqs: [...(p.faqs || []), { id: uid(), question: "", answer: "" }],
    }));

  const removeFaq = (id: string) =>
    setFormData((p) => ({ ...p, faqs: (p.faqs || []).filter((f) => f.id !== id) }));

  const updateFaq = (id: string, patch: Partial<FaqItem>) =>
    setFormData((p) => ({
      ...p,
      faqs: (p.faqs || []).map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));

  /* ---------- Images: gallery ---------- */
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    const mapped = files.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setNewImages((prev) => [...prev, ...mapped]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeNewImage = (index: number) => {
    setNewImages((prev) => {
      URL.revokeObjectURL(prev[index]?.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeExistingImage = (index: number) => {
    setExistingImageUrls((prev) => {
      const url = prev[index];
      if (url) setRemovedImageUrls((r) => [...r, url]);
      return prev.filter((_, i) => i !== index);
    });
  };

  /* ---------- Images: thumbnail (single) ---------- */
  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (newThumbnail?.preview) URL.revokeObjectURL(newThumbnail.preview);
    setNewThumbnail({ file, preview: URL.createObjectURL(file) });
    setExistingThumbnailUrl(null);
    if (thumbInputRef.current) thumbInputRef.current.value = "";
  };

  const clearThumbnail = () => {
    if (newThumbnail?.preview) URL.revokeObjectURL(newThumbnail.preview);
    setNewThumbnail(null);
    setExistingThumbnailUrl(null);
  };

  /* ---------- Auto defaults & conditional UX ---------- */
  useEffect(() => {
    if (formData.vehicleType === "2 wheeler") {
      if (formData.seaterCapacity !== "2 seater") {
        setFormData((p) => ({ ...p, seaterCapacity: "2 seater" }));
      }
    }
  }, [formData.vehicleType, formData.seaterCapacity]);

  useEffect(() => {
    setCustomVariantMode(false);
    setCustomVariant("");
  }, [formData.vehicleType, formData.seaterCapacity]);

  /* ---------- Validation ---------- */
  const isStepValid = (k: StepKey): boolean => {
    const d = formData;
    switch (k) {
      case "basic":
        return d.vehicleType.trim().length > 0;
      case "pricing": {
        const depSec = n(d.deposits?.security);
        return isFiniteNum(depSec);
      }
      case "specs":
      case "locs":
      case "faqs":
      case "images":
      default:
        return true;
    }
  };

  const requiredOk = useMemo(() => {
    const d = formData;
    const oneDay = n(d.pricing?.oneDay);
    const twoDays = n(d.pricing?.twoDays);
    const threePlus = n(d.pricing?.threePlusPerDay);
    return (
      d.vehicleType.trim().length > 0 &&
      isFiniteNum(oneDay) &&
      isFiniteNum(twoDays) &&
      isFiniteNum(threePlus) &&
      oneDay >= 0 &&
      twoDays >= 0 &&
      threePlus >= 0
    );
  }, [formData]);

  /* ---------- Nav ---------- */
  const canGoNext = isStepValid(step.key);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const goNext = () => {
    if (submitting) return;
    if (!canGoNext) return;
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

  /* ---------- Submit (Update) ---------- */
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (stepIndex < LAST_INDEX) {
      if (isStepValid(step.key)) goNext();
      return;
    }

    try {
      setSubmitting(true);

      const toProcessed = (p?: Pricing) =>
        p
          ? {
              oneDay: Number(p.oneDay || 0),
              twoDays: Number(p.twoDays || 0),
              threePlusPerDay: Number(p.threePlusPerDay || 0),
              currency: p.currency || "INR",
              minDaysIfApplicable:
                p.minDaysIfApplicable === "" || p.minDaysIfApplicable == null
                  ? undefined
                  : Number(p.minDaysIfApplicable),
            }
          : undefined;

      const processedVendorPricing = toProcessed(formData.vendorPricing);
      const processedSellerPricing = toProcessed(formData.sellerPricing);

      const processedDeposits = {
        security: Number(formData.deposits.security || 0),
        currency: formData.deposits.currency || "INR",
      };

      // surges (array) -> filter incomplete rows; keep strings as YYYY-MM-DD
      const cleanedSurges = (formData.surges || [])
        .map((s) => ({
          mode: (s.mode === "range" ? "range" : "single") as SurgeMode,
          startDate: s.startDate || "",
          endDate: (s.mode === "single" ? s.startDate : s.endDate) || "",
          amount: s.amount === "" ? "" : Number(s.amount),
          currency: s.currency || formData.pricing.currency || "INR",
        }))
        .filter(
          (s) =>
            s.startDate &&
            s.endDate &&
            s.amount !== "" &&
            Number.isFinite(Number(s.amount)) &&
            Number(s.amount) >= 0
        )
        .map((s) => ({
          mode: s.mode,
          startDate: s.startDate,
          endDate: s.endDate,
          amount: Number(s.amount),
          currency: s.currency,
        }));

      // faqs -> trim empties
      const cleanedFaqs = (formData.faqs || [])
        .map((f) => ({
          question: (f.question || "").trim(),
          answer: (f.answer || "").trim(),
        }))
        .filter((f) => f.question.length > 0 || f.answer.length > 0);

      // join pickup/drop
      const joinedPickup = pickupList.map((s) => s.trim()).filter(Boolean).join("\n");
      const joinedDrop = dropList.map((s) => s.trim()).filter(Boolean).join("\n");

      const processedData: any = {
        ...formData,
        deposits: processedDeposits,
        rating:
          formData.rating === "" || formData.rating === null ? null : Number(formData.rating),
        maxKmPerDay:
          formData.maxKmPerDay === "" || formData.maxKmPerDay === null
            ? null
            : Number(formData.maxKmPerDay),

        images: existingImageUrls,
        pickupLocations: joinedPickup,
        dropLocations: joinedDrop,
        thumbnailUrl: existingThumbnailUrl ?? undefined,

        // NEW payloads
        surgeCharges: cleanedSurges,
        faqs: cleanedFaqs,
      };

      // keep price books
      if (processedVendorPricing) processedData.vendorPricing = processedVendorPricing;
      if (processedSellerPricing) processedData.sellerPricing = processedSellerPricing;

      // Optional: mirror single legacy if exactly one surge row
      if (cleanedSurges.length === 1) {
        processedData.surgeCharge = cleanedSurges[0];
      } else {
        processedData.surgeCharge = null; // signal clear for legacy if your API handles it
      }

      const submitFormData = new FormData();
      submitFormData.append("data", JSON.stringify(processedData));
      submitFormData.append("images_keep", JSON.stringify(existingImageUrls));
      submitFormData.append("images_removed", JSON.stringify(removedImageUrls));

      newImages.forEach((img) => submitFormData.append("images", img.file));

      if (newThumbnail?.file) {
        submitFormData.append("thumbnail", newThumbnail.file);
      }
      if (existingThumbnailUrl !== null) {
        submitFormData.append("thumbnail_keep", existingThumbnailUrl || "");
      }

      submitFormData.append(
        "images_change_summary",
        JSON.stringify({
          kept_count: existingImageUrls.length,
          removed_count: removedImageUrls.length,
          added_count: newImages.length,
          thumbnail_changed:
            !!newThumbnail ||
            (vehicle?.thumbnailUrl && !existingThumbnailUrl) ||
            (!!existingThumbnailUrl && existingThumbnailUrl !== vehicle?.thumbnailUrl),
        })
      );

      const id = formData._id || vehicle?._id;
      const url = `${process.env.NEXT_PUBLIC_API_BASE}rentals/update/${id}`;
      const response = await fetch(url, { method: "PUT", body: submitFormData });

      if (response.ok) {
        alert("Vehicle updated successfully! 🎉");
        router.push("/dashboard/rentals");
      } else {
        const errorText = await response.text();
        console.error("Update failed:", errorText);
        alert(`Failed to update vehicle: ${errorText}`);
      }
    } catch (err) {
      console.error("Update failed:", err);
      alert(`An error occurred during update: ${(err as Error)?.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Prevent Enter before last step ---------- */
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && stepIndex < LAST_INDEX) {
      e.preventDefault();
      if (!submitting && isStepValid(step.key)) goNext();
    }
  };

  const resetAll = () => {
    if (submitting) return;
    if (vehicle) {
      setStepIndex(0);
      setNewImages([]);
      setRemovedImageUrls([]);
      setExistingImageUrls(vehicle.images || []);
      setExistingThumbnailUrl(vehicle.thumbnailUrl || null);
      router.refresh?.();
    } else {
      setFormData(initialBlankState);
      setNewImages([]);
      setExistingImageUrls([]);
      setRemovedImageUrls([]);
      setExistingThumbnailUrl(null);
      setPickupList([""]);
      setDropList([""]);
    }
  };

  /* ---------- Variant helpers ---------- */
  const getVariantOptions = (): string[] => {
    if (formData.vehicleType === "2 wheeler") return [...TWO_WHEELER_VARIANTS];
    if (formData.vehicleType === "4 wheeler") {
      if (formData.seaterCapacity === "7 seater") return [...FOUR_WHEELER_7_SEATER_VARIANTS];
      return [...FOUR_WHEELER_4_SEATER_VARIANTS];
    }
    return [];
  };
  const variantOptions = getVariantOptions();
  const showVariantSelect =
    formData.vehicleType === "2 wheeler" || formData.vehicleType === "4 wheeler";
  const currentVariantNotInList =
    formData.variant && formData.variant.trim().length > 0 && !variantOptions.includes(formData.variant as any);

  /* ---------- Dynamic list helpers ---------- */
  const addPickup = () => setPickupList((p) => [...p, ""]);
  const addDrop = () => setDropList((p) => [...p, ""]);
  const removePickup = (i: number) =>
    setPickupList((p) => (p.length <= 1 ? [""] : p.filter((_, idx) => idx !== i)));
  const removeDrop = (i: number) =>
    setDropList((p) => (p.length <= 1 ? [""] : p.filter((_, idx) => idx !== i)));
  const updatePickup = (i: number, val: string) =>
    setPickupList((p) => p.map((v, idx) => (idx === i ? val : v)));
  const updateDrop = (i: number, val: string) =>
    setDropList((p) => p.map((v, idx) => (idx === i ? val : v)));

  if (vehicle === undefined) {
    return <div className="p-6 text-sm text-gray-600">Loading vehicle…</div>;
  }
  if (!vehicle) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          No vehicle selected to edit. Go back and pick a vehicle first.
        </div>
      </div>
    );
  }

  return (
    <form className="min-h-screen bg-gray-50" onSubmit={handleSubmit} onKeyDown={handleFormKeyDown}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-gray-200">
        <div className="px-4 py-3 sm:px-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-blue-600 text-white grid place-items-center text-sm font-bold shadow">
              {formData.vehicleType?.[0]?.toUpperCase() || "V"}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-gray-900 truncate">
                Edit Vehicle — {formData.variant || formData.vehicleId || "Untitled"}
              </h1>
              <p className="text-[11px] text-gray-500 truncate">Update and save your changes</p>
            </div>
            <button
              type="button"
              onClick={resetAll}
              disabled={submitting}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
                submitting ? "border-gray-200 text-gray-400" : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Reset
            </button>
          </div>

          {/* Stepper */}
          <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {STEPS.map((s, i) => {
              const active = i === stepIndex;
              const done = i < stepIndex;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    if (submitting) return;
                    if (i <= stepIndex) setStepIndex(i);
                    else {
                      const allPrevValid = STEPS.slice(0, i).every((st) => isStepValid(st.key));
                      if (allPrevValid) setStepIndex(i);
                    }
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs whitespace-nowrap ${
                    active
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : done
                      ? "bg-green-50 border-green-500 text-green-700"
                      : "bg-white border-gray-200 text-gray-700"
                  }`}
                  disabled={submitting}
                >
                  <span className="grid place-items-center">
                    {done ? <CheckCircle2 className="size-4" /> : s.icon}
                  </span>
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Progress */}
          <div className="mt-3 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full transition-all ${submitting ? "bg-blue-400" : "bg-blue-600"}`} style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto p-4 sm:p-6 pb-36">
        {step.key === "basic" && (
          <SectionCard
            title="Basic Information"
            subtitle="Vehicle identity, type, and capacity."
            icon={<Car className="size-5 text-blue-600" />}
            requiredHint
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Vehicle Type" required>
                <div className="relative z-50">
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => onText("vehicleType", e.target.value)}
                    className="input"
                    disabled={submitting}
                  >
                    <option value="">Select type</option>
                    <option value="2 wheeler">2 wheeler</option>
                    <option value="4 wheeler">4 wheeler</option>
                  </select>
                </div>
              </Field>

              <Field label="Seater Capacity" required>
                <div className="relative z-50">
                  <select
                    value={formData.seaterCapacity}
                    onChange={(e) => onText("seaterCapacity", e.target.value)}
                    className="input"
                    disabled={submitting}
                  >
                    <option value="">Seater Capacity</option>
                    <option value="2 seater">2 seater</option>
                    <option value="4 seater">4 seater</option>
                    <option value="7 seater">7 seater</option>
                  </select>
                </div>
              </Field>

              <Field label="Variant">
                {(() => {
                  const show = formData.vehicleType === "2 wheeler" || formData.vehicleType === "4 wheeler";
                  const options = getVariantOptions();
                  const customNotInList =
                    formData.variant && formData.variant.trim().length > 0 && !options.includes(formData.variant);

                  return show ? (
                    !customVariantMode ? (
                      <div className="relative z-50">
                        <select
                          value={formData.variant || ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "__custom") {
                              setCustomVariantMode(true);
                              setCustomVariant("");
                              onText("variant", "");
                            } else {
                              setCustomVariantMode(false);
                              onText("variant", v);
                            }
                          }}
                          className="input sm:col-span-2"
                          disabled={submitting}
                        >
                          <option value="">Select variant</option>
                          {customNotInList && <option value={formData.variant!}>{formData.variant}</option>}
                          {options.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                          <option value="__custom">+ Add new variant…</option>
                        </select>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="input flex-1"
                          placeholder="Type new variant name"
                          autoComplete="off"
                          value={customVariant}
                          onChange={(e) => setCustomVariant(e.target.value)}
                          disabled={submitting}
                        />
                        <button
                          type="button"
                          className={`px-4 py-3 text-sm font-semibold rounded-xl text-white ${
                            customVariant.trim().length === 0 || submitting
                              ? "bg-blue-300 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                          }`}
                          onClick={() => {
                            const v = customVariant.trim();
                            if (v.length === 0) return;
                            onText("variant", v);
                            setCustomVariantMode(false);
                          }}
                          disabled={customVariant.trim().length === 0 || submitting}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="px-4 py-3 text-sm font-medium rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
                          onClick={() => {
                            setCustomVariantMode(false);
                            setCustomVariant("");
                          }}
                          disabled={submitting}
                        >
                          Cancel
                        </button>
                      </div>
                    )
                  ) : (
                    <input
                      type="text"
                      autoCapitalize="words"
                      autoComplete="off"
                      value={formData.variant || ""}
                      onChange={(e) => onText("variant", e.target.value)}
                      className="input sm:col-span-2"
                      placeholder="Swift / Innova / Thar"
                      disabled={submitting}
                    />
                  );
                })()}
              </Field>
            </div>
          </SectionCard>
        )}

        {step.key === "pricing" && (
          <SectionCard
            title="Pricing & Deposits"
            subtitle="Adjust rental rates and charges."
            icon={<IndianRupee className="size-5 text-blue-600" />}
            requiredHint
          >
            {/* Vendor vs Seller price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-200 p-3 sm:p-4">
                <p className="text-sm font-semibold text-gray-800 mb-3">Vendor Price</p>
                <div className="grid grid-cols-1 gap-3">
                  <Field label="1 day *">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={formData.vendorPricing?.oneDay || ""}
                      onChange={(e) => onVendorPricing("oneDay", e.target.value)}
                      className="input"
                      placeholder="enter amount"
                      disabled={submitting}
                    />
                  </Field>
                  <Field label="2 days *">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={formData.vendorPricing?.twoDays || ""}
                      onChange={(e) => onVendorPricing("twoDays", e.target.value)}
                      className="input"
                      placeholder="enter amount"
                      disabled={submitting}
                    />
                  </Field>
                  <Field label="3+ per day *">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={formData.vendorPricing?.threePlusPerDay || ""}
                      onChange={(e) => onVendorPricing("threePlusPerDay", e.target.value)}
                      className="input"
                      placeholder="enter amount"
                      disabled={submitting}
                    />
                  </Field>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-3 sm:p-4">
                <p className="text-sm font-semibold text-gray-800 mb-3">Seller Price</p>
                <div className="grid grid-cols-1 gap-3">
                  <Field label="1 day *">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={formData.sellerPricing?.oneDay || ""}
                      onChange={(e) => onSellerPricing("oneDay", e.target.value)}
                      className="input"
                      placeholder="enter amount"
                      disabled={submitting}
                    />
                  </Field>
                  <Field label="2 days *">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={formData.sellerPricing?.twoDays || ""}
                      onChange={(e) => onSellerPricing("twoDays", e.target.value)}
                      className="input"
                      placeholder="enter amount"
                      disabled={submitting}
                    />
                  </Field>
                  <Field label="3+ per day *">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={formData.sellerPricing?.threePlusPerDay || ""}
                      onChange={(e) => onSellerPricing("threePlusPerDay", e.target.value)}
                      className="input"
                      placeholder="enter amount"
                      disabled={submitting}
                    />
                  </Field>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Field label="Currency">
                <input
                  type="text"
                  autoCapitalize="characters"
                  autoComplete="off"
                  value={formData.pricing.currency || "INR"}
                  onChange={(e) => {
                    onPricing("currency", e.target.value);
                    onVendorPricing("currency", e.target.value);
                    onSellerPricing("currency", e.target.value);
                    // also apply to new surges being added
                    setFormData((p) => ({
                      ...p,
                      surges: (p.surges || []).map((s) => ({ ...s, currency: e.target.value })),
                    }));
                  }}
                  className="input"
                  disabled={submitting}
                />
              </Field>
              <Field label="Security Deposit *">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={formData.deposits.security}
                  onChange={(e) => onDeposits("security", e.target.value)}
                  className="input"
                  placeholder="enter amount"
                  disabled={submitting}
                />
              </Field>
            </div>

            {/* Multiple Surge Charges */}
            <section className="mt-4 rounded-xl border border-amber-300 bg-amber-50">
              <div className="px-3 sm:px-4 py-3 border-b border-amber-200 flex items-center justify-between">
                <p className="text-sm font-semibold text-amber-900">Surge Charges</p>
                <button
                  type="button"
                  onClick={addSurge}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-amber-400 text-amber-900 bg-amber-100 hover:bg-amber-200"
                  disabled={submitting}
                  title="Add surge"
                >
                  <Plus className="size-3.5" />
                  Add
                </button>
              </div>

              <div className="p-3 sm:p-4 space-y-4">
                {(formData.surges || []).length === 0 && (
                  <p className="text-xs text-amber-800">No surge rows yet. Click <b>Add</b> to create one.</p>
                )}

                {(formData.surges || []).map((s) => (
                  <div key={s.id} className="rounded-lg bg-white border border-amber-200 p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-amber-900">Surge</p>
                      <button
                        type="button"
                        onClick={() => removeSurge(s.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                        disabled={submitting}
                        title="Remove this surge"
                      >
                        <Trash2 className="size-3.5" />
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Surge window">
                        <div className="flex gap-3">
                          <label className="inline-flex items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name={`surgeMode-${s.id}`}
                              value="single"
                              checked={s.mode === "single"}
                              onChange={() =>
                                updateSurge(s.id, { mode: "single", endDate: s.startDate || "" })
                              }
                              disabled={submitting}
                            />
                            Single date
                          </label>
                          <label className="inline-flex items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name={`surgeMode-${s.id}`}
                              value="range"
                              checked={s.mode === "range"}
                              onChange={() => updateSurge(s.id, { mode: "range" })}
                              disabled={submitting}
                            />
                            Date range
                          </label>
                        </div>
                      </Field>

                      <Field label="Surge amount">
                        <div className="relative">
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            className="input"
                            placeholder="enter amount"
                            value={s.amount === "" ? "" : Number(s.amount as any)}
                            onChange={(e) =>
                              updateSurge(s.id, {
                                amount: e.target.value === "" ? "" : Number(e.target.value),
                              })
                            }
                            disabled={submitting}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                            {s.currency || formData.pricing.currency || "INR"}
                          </span>
                        </div>
                      </Field>

                      <Field label={s.mode === "single" ? "Date" : "Start date"}>
                        <input
                          type="date"
                          className="input"
                          value={s.startDate}
                          onChange={(e) =>
                            updateSurge(s.id, {
                              startDate: e.target.value,
                              endDate: s.mode === "single" ? e.target.value : s.endDate,
                            })
                          }
                          disabled={submitting}
                        />
                      </Field>

                      {s.mode === "range" && (
                        <Field label="End date">
                          <input
                            type="date"
                            className="input"
                            value={s.endDate}
                            min={s.startDate || undefined}
                            onChange={(e) => updateSurge(s.id, { endDate: e.target.value })}
                            disabled={submitting}
                          />
                        </Field>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </SectionCard>
        )}

        {step.key === "specs" && (
          <SectionCard
            title="Specifications & Limits"
            subtitle="Mileage, distance caps, speed and fuel."
            icon={<Gauge className="size-5 text-blue-600" />}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Mileage (text)">
                <input
                  type="text"
                  autoCapitalize="words"
                  autoComplete="off"
                  value={formData.mileage || ""}
                  onChange={(e) => onText("mileage", e.target.value)}
                  className="input"
                  placeholder="8 kmpl / 10 kmpl"
                  disabled={submitting}
                />
              </Field>
              <Field label="Distance limit per day (text)">
                <input
                  type="text"
                  autoCapitalize="none"
                  autoComplete="off"
                  value={formData.distanceLimitPerDay || ""}
                  onChange={(e) => onText("distanceLimitPerDay", e.target.value)}
                  className="input"
                  placeholder="40 km / 200 kms"
                  disabled={submitting}
                />
              </Field>
              <Field label="Speed limit">
                <input
                  type="text"
                  autoCapitalize="none"
                  autoComplete="off"
                  value={formData.speedLimit || ""}
                  onChange={(e) => onText("speedLimit", e.target.value)}
                  className="input"
                  placeholder="100 - 140 km/h"
                  disabled={submitting}
                />
              </Field>
              <Field label="Max KM/day (numeric)">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={formData.maxKmPerDay === "" ? "" : Number(formData.maxKmPerDay)}
                  onChange={(e) =>
                    onText("maxKmPerDay", e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="input"
                  placeholder="250"
                  disabled={submitting}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Field label="Fuel type">
                <input
                  type="text"
                  autoCapitalize="words"
                  autoComplete="off"
                  value={formData.fuel?.type || ""}
                  onChange={(e) => onFuel("type", e.target.value)}
                  className="input"
                  placeholder="Petrol / Diesel"
                  disabled={submitting}
                />
              </Field>
              <Field label="Fuel status">
                <input
                  type="text"
                  autoCapitalize="words"
                  autoComplete="off"
                  value={formData.fuel?.status || ""}
                  onChange={(e) => onFuel("status", e.target.value)}
                  className="input"
                  placeholder="1 ltr fixed / Full Tank"
                  disabled={submitting}
                />
              </Field>
            </div>
          </SectionCard>
        )}

        {step.key === "locs" && (
          <SectionCard
            title="Procedures & Locations"
            subtitle="Pickup, drop, collection & handover."
            icon={<MapPin className="size-5 text-blue-600" />}
          >
            {/* Pickup locations (dynamic) */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Pickup locations</label>
                <button
                  type="button"
                  onClick={addPickup}
                  disabled={submitting}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 active:bg-blue-200"
                >
                  <Plus className="size-3.5" />
                  Add
                </button>
              </div>

              <div className="space-y-2">
                {pickupList.map((val, idx) => (
                  <div key={`pickup-${idx}`} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => updatePickup(idx, e.target.value)}
                      className="input flex-1"
                      placeholder="e.g., North Goa: Calangute, Baga..."
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      onClick={() => removePickup(idx)}
                      disabled={submitting}
                      className="size-10 grid place-items-center rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
                      title="Remove"
                      aria-label="Remove pickup location row"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <Field label="Collecting procedure" className="mt-4">
              <textarea
                autoCapitalize="sentences"
                autoComplete="off"
                value={formData.collectingProcedure || ""}
                onChange={(e) => {
                  onText("collectingProcedure", e.target.value);
                  autosize(e.currentTarget);
                }}
                className="textarea w-full"
                rows={3}
                disabled={submitting}
                placeholder="enter collecting procedure"
              />
            </Field>

            <Field label="Handover procedure" className="mt-4">
              <textarea
                autoCapitalize="sentences"
                autoComplete="off"
                value={formData.handoverProcedure || ""}
                onChange={(e) => {
                  onText("handoverProcedure", e.target.value);
                  autosize(e.currentTarget);
                }}
                className="textarea w-full"
                rows={3}
                disabled={submitting}
                placeholder="enter handover procedure"
              />
            </Field>

            <Field label="Terms & conditions" className="mt-4">
              <textarea
                autoCapitalize="sentences"
                autoComplete="off"
                value={formData.termsAndConditions || ""}
                onChange={(e) => {
                  onText("termsAndConditions", e.target.value);
                  autosize(e.currentTarget);
                }}
                className="textarea w-full"
                rows={4}
                disabled={submitting}
                placeholder="enter terms and conditions"
              />
            </Field>
          </SectionCard>
        )}

        {/* NEW: Dedicated FAQs step (moved out of Locations) */}
        {step.key === "faqs" && (
          <SectionCard
            title="FAQs"
            subtitle="Add common questions and answers customers ask."
            icon={<Star className="size-5 text-blue-600" />}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-800">Frequently Asked Questions</p>
              <button
                type="button"
                onClick={addFaq}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                disabled={submitting}
                title="Add FAQ"
              >
                <Plus className="size-3.5" />
                Add
              </button>
            </div>

            {(formData.faqs || []).length === 0 && (
              <p className="text-xs text-gray-500">No FAQ rows yet. Click <b>Add</b> to create one.</p>
            )}

            <div className="space-y-3">
              {(formData.faqs || []).map((f) => (
                <div key={f.id} className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-800">FAQ</p>
                    <button
                      type="button"
                      onClick={() => removeFaq(f.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                      disabled={submitting}
                      title="Remove FAQ"
                    >
                      <Trash2 className="size-3.5" />
                      Remove
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3">
                    <Field label="Question">
                      <input
                        type="text"
                        className="input w-full"
                        value={f.question}
                        onChange={(e) => updateFaq(f.id, { question: e.target.value })}
                        placeholder="e.g., What documents are required?"
                        disabled={submitting}
                      />
                    </Field>
                    <Field label="Answer">
                      <textarea
                        className="textarea w-full"
                        rows={3}
                        value={f.answer}
                        onChange={(e) => updateFaq(f.id, { answer: e.target.value })}
                        placeholder="e.g., Valid driving license and government ID."
                        disabled={submitting}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {step.key === "images" && (
          <SectionCard
            title="Images"
            subtitle="Manage gallery pictures and the thumbnail."
            icon={<ImageIcon className="size-5 text-blue-600" />}
          >
            {/* Thumbnail */}
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Thumbnail (single)</h3>

            <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50/50 p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="size-8 grid place-items-center bg-blue-100 rounded-lg">
                  <Star className="size-4 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-900">Primary Cover</p>
                  <p className="text-xs text-blue-800/80">Used as the cover in listings.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {(existingThumbnailUrl || newThumbnail) ? (
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

            {/* Gallery */}
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Vehicle Images (gallery)</h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {existingImageUrls.map((url, index) => (
                <div
                  key={url}
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

            {removedImageUrls.length > 0 && (
              <p className="mt-3 text-xs text-gray-500">
                {removedImageUrls.length} image(s) will be removed on save.
              </p>
            )}
          </SectionCard>
        )}
      </main>

      {/* Sticky step navigation */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-gray-50/95 backdrop-blur safe-bottom pt-2">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-2">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-900/5">
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
                  className={`flex-1 sm:flex-none px-4 py-3 text-sm font-medium rounded-xl border ${
                    stepIndex === 0 || submitting
                      ? "border-gray-200 text-gray-400"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                  aria-disabled={stepIndex === 0 || submitting}
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canGoNext || submitting}
                  className={`flex-1 sm:flex-none px-5 py-3 text-sm font-semibold rounded-xl text-white ${
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
                      {submitting ? "Saving..." : "Update Vehicle"}
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
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .safe-bottom { padding-bottom: calc(env(safe-area-inset-bottom) + 0.5rem); }
      `}</style>
    </form>
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
    <section className="mt-6 first:mt-0">
      <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-visible">
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-8 grid place-items-center bg-blue-50 rounded-lg">{icon}</div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{title}</h2>
              {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {requiredHint && (
            <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">
              * Required
            </span>
          )}
        </div>
        <div className="p-4 sm:p-5">{children}</div>
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
