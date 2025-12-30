"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  CheckCircle2,
  Loader2,
  FileText,
  ListChecks,
  Clock,
  IndianRupee,
  Plus,
  X,
  Check,
  ChevronDown,
  Search,
  Trash2,
  HelpCircle,
  Image as ImageIcon,
  Users,

} from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useSightseeingPackageStore } from "@/store/usesightpackages";

import TinyMCETextEditor from "@/components/TinyMCETextEditor";


/* =========================
   Types aligned to your schema / sample docs
   ========================= */

type ObjId = string;

interface PlaceLite {
  _id: ObjId;
  name: string;
  images?: string[];
}

interface SegregatedImageGroup {
  id: string;
  category: string;
  existingImages: string[]; // URLs from backend
  images: ImageFile[];      // newly uploaded files
}

type FAQ = { q: string; a: string };

interface BlockoutSurcharge {
  id: string; // local uid for rendering
  mode: "single" | "range";
  amount: number | "" | null;
  start_date: string; // yyyy-mm-dd
  end_date?: string; // yyyy-mm-dd
  currency?: "INR";
}

interface WhyChooseItem {
  title: string;
  description: string;
  icon: string;
}

interface TimedBlock {
  time: string;
  title: string;
  description: string;
}

interface ExpectationItem {
  title: string;
  description: string;
}

interface PriceBreakdownUI {
  basePrice: number | "" | null;
  serviceCharges: number | "" | null;
  taxes: number | "" | null;
  markup_min_price?: number | "" | null; // ✅ NEW
  markup_max_price?: number | "" | null; // ✅ NEW
  totalPrice: number | "" | null;
}

interface SightseeingPackageUI {
  // Core
  tour_name: string; // maps to title
  vehicle_type: string;

  destination: string;
  category: string;

  // Pax & duration
  min_pax: number | "";
  max_pax: number | "";
  duration_hours: number | "";
  markup_min_price?: number | null;
  markup_max_price?: number | null;

  // Timings
  regular_timings: string;
  alternative_timings: string;

  // Places
  places_to_visit_names: string[];
  place_ids: ObjId[];

  // Commercials
  inclusions: string[];
  exclusions: string[];

  // Pricing (internal)
  vendor_charge: number | "" | null;
  seller_charge: number | "" | null;

  // Multi surcharges
  blockout_surcharges: BlockoutSurcharge[];

  
  description: string;
  thumbnail: string;
  images: string[];
  guestImages: string[];   // 👈 NEW
  videoUrls: string[];
  highlights: string[];
  whyChoose: WhyChooseItem[];
  itinerary: TimedBlock[];
  operationProcess: TimedBlock[];
  whatToExpect: ExpectationItem[];

  // Pickup & ops
  pickupType: string;
  pickupAreas: string[];
  meetingTime: string;
  operatingHours: string;
  bestTimeToVisit: string;
  seasonalAvailability: string;
  groupSize: string;
  minParticipants: number | "";
  maxParticipants: number | "";
  accessibility: string;
  fitnessLevel: string;

  goodToKnow: string[];
  whatToBring: string[];
  voucherInfo: string[];
  languages: string[];

  // Pricing breakdown
  priceBreakdown: PriceBreakdownUI;

  // Cancellation & policies
  cancellationPolicyShort: string;
  cancellationDetails: string[];
  rating: number | "" | null;
  reviewCount: number | "" | null;
  bookedCount: number | "" | null;
  instantConfirmation: boolean;
  freeCancellation: boolean;

  operatedBy: string;

  // LLM chips
  llm_chips?: FAQ[];

  // Notes
  special_mentions: string;
  notes: string;

  // Frontend-only media fields
  thumbnailFile?: File | null;
  guestImagesFiles?: File[];
  galleryImagesFiles?: File[];
  videoFiles?: File[];
}
interface ImageFile {
  file: File;
  preview: string;
}
/* =========================
   Helpers & Constants
   ========================= */

// Vehicle type options (for "coach" tours – walking/boat can still be free text)


const VEHICLE_TYPES = [
  "4 Seater",
  "7 Seater",
  "13 Seater",
  "17–20 Seater",
  "20–30 Seater",
  "30–40 Seater",
] as const;

const CATEGORY_OPTIONS = [
  "family",
  "friends",
  "bachelor's",
  "couple",
] as const;

const getSelectedCategories = (category: string) =>
  category
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

const toggleCategory = (
  currentValue: string,
  cat: string
): string => {
  const selected = getSelectedCategories(currentValue);
  const exists = selected.includes(cat);
  const next = exists
    ? selected.filter((c) => c !== cat)
    : [...selected, cat];
  return next.join(", ");
};

const VEHICLE_PAX_PRESETS: Record<string, { min: number; max: number }> = {
  "4 Seater": { min: 1, max: 4 },
  "7 Seater": { min: 5, max: 7 },
  "13 Seater": { min: 10, max: 13 },

  "17–20 Seater": { min: 15, max: 20 },
  "17-20 Seater": { min: 15, max: 20 },

  "20–30 Seater": { min: 20, max: 30 },
  "20-30 Seater": { min: 20, max: 30 },

  "30–40 Seater": { min: 30, max: 40 },
  "30-40 Seater": { min: 30, max: 40 },
};

function derivePaxFromVehicleType(label: string): { min: number; max: number } | null {
  const s = (label || "").trim();
  if (VEHICLE_PAX_PRESETS[s]) return VEHICLE_PAX_PRESETS[s];

  const range = s.match(/(\d+)\s*[-–]\s*(\d+)\s*Seater/i);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    if (!Number.isNaN(a) && !Number.isNaN(b)) return { min: Math.min(a, b), max: Math.max(a, b) };
  }

  const single = s.match(/(\d+)\s*Seater/i);
  if (single) {
    const max = Number(single[1]);
    if (!Number.isNaN(max)) {
      const min = max <= 4 ? 1 : Math.max(1, max - 3);
      return { min, max };
    }
  }

  return null;
}

// Same loose regex as schema (frontend validation hint only)
const TIME_RANGE_REGEX =
  /^([0-1]?\d|2[0-3])\s?(am|pm)?\s?(-|to)\s?([0-1]?\d|2[0-3])\s?(am|pm)?$/i;

  function mapDocToForm(doc: any): SightseeingPackageUI {
  const llm_chips: FAQ[] = (doc.llm_chips ?? []) as FAQ[];

  // 🔧 Normalise place_ids to string[]
  const normalizedPlaceIds: string[] = Array.isArray(doc.place_ids)
    ? doc.place_ids
        .map((p: any) =>
          typeof p === "string" ? p : p?._id
        )
        .filter(Boolean)
    : (doc.placesToVisit?.map((p: any) => p.placeId || p._id).filter(Boolean) ?? []);

  // 🔧 Normalise place names too
  const normalizedPlaceNames: string[] =
    doc.places_to_visit_names ??
    (Array.isArray(doc.placesToVisit)
      ? doc.placesToVisit.map((p: any) => p.name).filter(Boolean)
      : Array.isArray(doc.place_ids)
      ? doc.place_ids.map((p: any) => p.name).filter(Boolean)
      : []);

  return {
    // core
    tour_name: doc.title ?? "",
    vehicle_type: doc.vehicle_type ?? doc.vehicleType ?? "",
    destination: doc.destination ?? "",
    category: Array.isArray(doc.category) ? doc.category.join(", ") : (doc.category ?? ""),

    // pax & duration
    min_pax: doc.min_pax ?? "",
    max_pax: doc.max_pax ?? "",
    duration_hours: doc.duration_hours ?? doc.duration ?? "",

    // timings
    regular_timings: doc.regular_timings ?? doc.regularTimings ?? "",
    alternative_timings: doc.alternative_timings ?? doc.alternativeTimings ?? "",

    // ✅ FIXED: places
    places_to_visit_names: normalizedPlaceNames,
    place_ids: normalizedPlaceIds,

    // ...rest of your existing mapping
    inclusions: doc.inclusions ?? [],
    exclusions: doc.exclusions ?? [],
    vendor_charge: doc.vendor_charge ?? "",
    seller_charge: doc.seller_charge ?? "",
    blockout_surcharges:
      (doc.blockout_surcharges ?? []).map((s: any) => ({
        id: uid(),
        mode: s.mode ?? "range",
        amount: s.amount ?? "",
        start_date: s.start_date ?? "",
        end_date: s.end_date ?? "",
        currency: s.currency ?? "INR",
      })) ?? [],
    description: doc.description ?? "",
    thumbnail: doc.thumbnail ?? "",
    images: doc.images ?? [],
    guestImages: doc.guestImages ?? [],
    videoUrls: doc.videos ?? [],
    highlights: doc.highlights ?? [],
    whyChoose: doc.whyChoose ?? [],
    itinerary: doc.itinerary ?? [],
    operationProcess: doc.operationProcess ?? [],
    whatToExpect: doc.whatToExpect ?? [],
    pickupType: doc.pickupType ?? "",
    pickupAreas: doc.pickupAreas ?? [],
    meetingTime: doc.meetingTime ?? "",
    operatingHours: doc.operatingHours ?? "",
    bestTimeToVisit: doc.bestTimeToVisit ?? "",
    seasonalAvailability: doc.seasonalAvailability ?? "",
    groupSize: doc.groupSize ?? "",
    minParticipants: doc.minParticipants ?? "",
    maxParticipants: doc.maxParticipants ?? "",
    accessibility: doc.accessibility ?? "",
    fitnessLevel: doc.fitnessLevel ?? "",
    goodToKnow: doc.goodToKnow ?? [],
    whatToBring: doc.whatToBring ?? [],
    voucherInfo: doc.voucherInfo ?? [],
    languages: doc.languages ?? [],
    priceBreakdown: {
      basePrice: doc.priceBreakdown?.basePrice ?? "",
      serviceCharges: doc.priceBreakdown?.serviceCharges ?? "",
      taxes: doc.priceBreakdown?.taxes ?? "",
      totalPrice: doc.priceBreakdown?.totalPrice ?? "",
      markup_min_price:
        doc.priceBreakdown?.markup_min_price ?? doc.markup_min_price ?? "", // fallback
      markup_max_price:
        doc.priceBreakdown?.markup_max_price ?? doc.markup_max_price ?? "", // fallback
    },
    cancellationPolicyShort: doc.cancellationPolicyShort ?? "",
    cancellationDetails: doc.cancellationDetails ?? [],
    rating: doc.rating ?? "",
    reviewCount: doc.reviewCount ?? "",
    bookedCount: doc.bookedCount ?? "",
    instantConfirmation: doc.instantConfirmation ?? true,
    freeCancellation: doc.freeCancellation ?? true,
    operatedBy: doc.operatedBy ?? "",
    llm_chips,
    special_mentions: doc.special_mentions ?? "",
    notes: doc.notes ?? "",
    thumbnailFile: null,
    guestImagesFiles: [],
    galleryImagesFiles: [],
    videoFiles: [],
  };
}



const BLANK: SightseeingPackageUI = {
  // core
  tour_name: "",
  vehicle_type: "",
  destination: "",
  category: "",

  // pax & duration
  min_pax: "",
  max_pax: "",
  duration_hours: "",

  // timings
  regular_timings: "",
  alternative_timings: "",

  // places
  places_to_visit_names: [],
  place_ids: [],

  // commercials
  inclusions: [],
  exclusions: [],
  vendor_charge: "",
  seller_charge: "",
  blockout_surcharges: [],

  // extended content
  description: "",
  thumbnail: "",
  images: [],
  guestImages: [],   // 👈 NEW
  videoUrls: [], 
  highlights: [],
  whyChoose: [],
  itinerary: [],
  operationProcess: [],
  whatToExpect: [],

  // pickup & ops
  pickupType: "",
  pickupAreas: [],
  meetingTime: "",
  operatingHours: "",
  bestTimeToVisit: "",
  seasonalAvailability: "",
  groupSize: "",
  minParticipants: "",
  maxParticipants: "",
  accessibility: "",
  fitnessLevel: "",

  goodToKnow: [],
  whatToBring: [],
  voucherInfo: [],
  languages: [],

  priceBreakdown: {
    basePrice: "",
    serviceCharges: "",
    taxes: "",
    totalPrice: "",
    markup_min_price: null, // ✅ NEW
    markup_max_price: null, // ✅ NEW
  },

  cancellationPolicyShort: "",
  cancellationDetails: [],
  rating: "",
  reviewCount: "",
  bookedCount: "",
  instantConfirmation: true,
  freeCancellation: true,

  operatedBy: "",

  llm_chips: [],
  special_mentions: "",
  notes: "",

  // media files
  thumbnailFile: null,
  guestImagesFiles: [],
  galleryImagesFiles: [],
  videoFiles: [],
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// Steps
const STEPS = [
  { key: "details", label: "Details", icon: <FileText className="size-4" /> },
  { key: "llmChips", label: "LLM Chips", icon: <HelpCircle className="size-4" /> },
  { key: "experience", label: "Experience", icon: <Users className="size-4" /> },
  { key: "schedule", label: "Timings & Places", icon: <Clock className="size-4" /> },
  { key: "commerce", label: "Inclusions & Pricing", icon: <ListChecks className="size-4" /> },
  { key: "media", label: "Media", icon: <ImageIcon className="size-4" /> },
   { key: "segregatedMedia", label: "Segregated Images", icon: <ImageIcon className="size-4" /> },
] as const;

type StepKey = (typeof STEPS)[number]["key"];
const LAST_INDEX = STEPS.length - 1;

const sanitizeHtml = (html: string) =>
  html
    .replace(/[\n\r]/g, "")
    .replace(/>\s+</g, "><");

/* =========================
   Local utils
   ========================= */

function cleanTime(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function numOrDefault(v: number | "" | null, d: number) {
  if (v === "" || v == null || Number.isNaN(Number(v))) return d;
  return Number(v);
}

function numOrNull(v: number | "" | null) {
  if (v === "" || v == null || Number.isNaN(Number(v))) return null;
  return Number(v);
}

function emptyToNull(v: string) {
  return v === "" ? null : Number(v);
}

function TagComposer({
  label,
  values,
  onAdd,
  onRemove,
  placeholder,
  disabled,
}: {
  label: string;
  values: string[];
  onAdd: (v: string) => void;
  onRemove: (idx: number) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-[11px] text-gray-400">{values.length} added</span>
      </div>
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder={placeholder || "Type & press Enter"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const v = draft.trim();
              if (!v) return;
              onAdd(v);
              setDraft("");
            }
          }}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => {
            const v = draft.trim();
            if (!v) return;
            onAdd(v);
            setDraft("");
          }}
          disabled={disabled}
          className="px-3 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300"
        >
          Add
        </button>
      </div>
      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {values.map((v, i) => (
            <span
              key={`${v}-${i}`}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-full border border-gray-300 bg-gray-50"
            >
              {v}
              <button
                type="button"
                className="ml-1 rounded-full p-0.5 hover:bg-gray-200"
                onClick={() => onRemove(i)}
                disabled={disabled}
                aria-label={`Remove ${v}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================
   Component
   ========================= */

export default function EditSightseeingPackageMobile() {
  const router = useRouter();
  const storepkg = useSightseeingPackageStore((s: any) => s.sightseeingPackage);
const [originalDoc, setOriginalDoc] = useState<SightseeingPackageUI | null>(null);
const [form, setForm] = useState<SightseeingPackageUI>({ ...BLANK });

  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Places data
  const [places, setPlaces] = useState<PlaceLite[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(true);

  const [doc] = useState<SightseeingPackageUI | null>(null);

  const step = STEPS[stepIndex];


     // segregated images (category-wise)
  
          const [segregatedGroups, setSegregatedGroups] = useState<SegregatedImageGroup[]>(() => {
            
           const seg = storepkg?.segregated_images; // depend on your API key
           if (Array.isArray(seg) && seg.length > 0) {
             return seg.map((g: any, idx: number) => ({
               id: `seg-${idx}`,
               category: g.category || "",
               existingImages: Array.isArray(g.urls) ? g.urls : [],
               images: [], // no local uploads initially
             }));
           }
           return [{ id: "seg-0", category: "", existingImages: [], images: [] }];
         });
  
    
    const addSegGroup = () => {
    setSegregatedGroups((prev) => [
      ...prev,
      {
        id: `seg-${prev.length}`,
        category: "",
        existingImages: [],
        images: [],
      },
    ]);
  };
  
  const removeSegGroup = (id: string) => {
    setSegregatedGroups((prev) => {
      const toRemove = prev.find((g) => g.id === id);
      toRemove?.images.forEach((img) => URL.revokeObjectURL(img.preview));
  
      const next = prev.filter((g) => g.id !== id);
      return next.length
        ? next
        : [{ id: "seg-0", category: "", existingImages: [], images: [] }];
    });
  };
  
    
      const updateSegGroupCategory = (id: string, category: string) => {
        setSegregatedGroups((prev) =>
          prev.map((g) => (g.id === id ? { ...g, category } : g))
        );
      };
    
      const handleSegImagesUpload = (
        id: string,
        e: React.ChangeEvent<HTMLInputElement>
      ) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        if (!files.length) return;
        const mapped: ImageFile[] = files.map((file) => ({
          file,
          preview: URL.createObjectURL(file),
        }));
        setSegregatedGroups((prev) =>
          prev.map((g) =>
            g.id === id ? { ...g, images: [...g.images, ...mapped] } : g
          )
        );
        e.target.value = "";
      };
    
      const removeSegImage = (groupId: string, idx: number) => {
        setSegregatedGroups((prev) =>
          prev.map((g) => {
            if (g.id !== groupId) return g;
            const img = g.images[idx];
            if (img?.preview) URL.revokeObjectURL(img.preview);
            return {
              ...g,
              images: g.images.filter((_, i) => i !== idx),
            };
          })
        );
      };
  
      const removeExistingSegImage = (groupId: string, url: string) => {
    setSegregatedGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, existingImages: g.existingImages.filter((u) => u !== url) }
          : g
      )
    );
  };
  
  

// after defining htmlToEditorState
const [llmChips, setLlmChips] = useState<FAQ[]>([{ q: "", a: "" }]);


// load from store
useEffect(() => {
  if (!storepkg) return;

  const mapped = mapDocToForm(storepkg);
  setOriginalDoc(mapped);
  setForm(mapped);

  const chips =
    mapped.llm_chips && mapped.llm_chips.length
      ? mapped.llm_chips
      : [{ q: "", a: "" }];

  setLlmChips(chips);
}, [storepkg]);



   const addStrItem =
    (key: keyof SightseeingPackageUI) =>
    (v: string) =>
      setForm((p) => ({
        ...p,
        [key]: [...(p[key] as string[]), v],
      }));

  const remStrItem =
    (key: keyof SightseeingPackageUI) =>
    (i: number) =>
      setForm((p) => ({
        ...p,
        [key]: (p[key] as string[]).filter((_, idx) => idx !== i),
      }));

 const addLlmChip = () => {
  setLlmChips((p) => [...p, { q: "", a: "" }]);
};

const remLlmChip = (idx: number) => {
  setLlmChips((p) =>
    p.length <= 1 ? [{ q: "", a: "" }] : p.filter((_, i) => i !== idx)
  );
};

const setLlmChip = (idx: number, next: Partial<FAQ>) =>
  setLlmChips((p) => p.map((c, i) => (i === idx ? { ...c, ...next } : c)));


  /* ---------- Fetch places (ALL pages) ---------- */
  useEffect(() => {
    let mounted = true;

    const fetchAll = async () => {
      setLoadingPlaces(true);
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE || "/";
        const fetchPlaces = async (pageNum: number) => {
          const res = await axios.get(`${base}sightseeing-places/fetch?page=${pageNum}`);
          const fetched: any[] = res.data.items || res.data.data || [];
          const totalPages = res.data.totalPages ?? res.data.pagination?.pages ?? 1;
          return { items: fetched as PlaceLite[], pages: Number(totalPages) || 1 };
        };

        const first = await fetchPlaces(1);
        let all: PlaceLite[] = first.items || [];
        const pages = first.pages || 1;
        if (pages > 1) {
          const rest = await Promise.all(
            Array.from({ length: pages - 1 }, (_, i) => fetchPlaces(i + 2))
          );
          for (const r of rest) all = all.concat(r.items || []);
        }
        const dedup = Array.from(new Map(all.map((p) => [p._id, p])).values());
        if (mounted) setPlaces(dedup);
      } catch (e) {
        console.error("Failed to load places:", e);
        if (mounted) setPlaces([]);
      } finally {
        if (mounted) setLoadingPlaces(false);
      }
    };

    fetchAll();
    return () => {
      mounted = false;
    };
  }, []);

  /* ---------- Derived ---------- */
  const title = form.tour_name.trim() || "New Sightseeing Package";

  const canContinueDetails = useMemo(() => {
    const hasCore = form.tour_name.trim() && form.vehicle_type.trim();
    const minOk = form.min_pax !== "" && Number(form.min_pax) >= 0;
    const maxOk =
      form.max_pax !== "" &&
      Number(form.max_pax) >= 0 &&
      (form.min_pax === "" || Number(form.max_pax) >= Number(form.min_pax));
    const durOk =
      form.duration_hours !== "" &&
      Number(form.duration_hours) >= 1 &&
      Number(form.duration_hours) <= 24;
    return !!(hasCore && minOk && maxOk && durOk);
  }, [form.tour_name, form.vehicle_type, form.min_pax, form.max_pax, form.duration_hours]);


  const canContinueSchedule = useMemo(() => {
    const hasRegularTimings = form.regular_timings.trim().length > 0;
    const hasPlaces = form.place_ids.length > 0;
    return hasRegularTimings && hasPlaces;
  }, [form.regular_timings, form.place_ids]);

  const canContinueCommerce = useMemo(() => true, []);

  const isStepValid = (k: StepKey) => {
    switch (k) {
      case "details":
        return canContinueDetails;
      case "schedule":
        return canContinueSchedule;
      case "commerce":
        return canContinueCommerce;
      default:
        return true;
    }
  };

  const canGoNext = isStepValid(step.key);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const canSubmit =
    stepIndex === LAST_INDEX &&
    STEPS.every((s) => isStepValid(s.key)) &&
    !!form.tour_name.trim();

  /* ---------- Nav ---------- */
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

  /* ---------- Mutators ---------- */
  const set = (patch: Partial<SightseeingPackageUI>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const addChip = (
    key:
      | "inclusions"
      | "exclusions"
      | "places_to_visit_names"
      | "highlights"
      | "pickupAreas"
      | "goodToKnow"
      | "whatToBring"
      | "voucherInfo"
      | "languages"
      | "images"
      | "cancellationDetails",
    value: string
  ) => {
    const v = value.trim();
    if (!v) return;
    const arr = (form as any)[key] as string[];
    set({ [key]: Array.from(new Set([...(arr || []), v])) } as any);
  };

  const removeChip = (
    key:
      | "inclusions"
      | "exclusions"
      | "places_to_visit_names"
      | "highlights"
      | "pickupAreas"
      | "goodToKnow"
      | "whatToBring"
      | "voucherInfo"
      | "languages"
      | "images"
      | "cancellationDetails",
    idx: number
  ) => {
    const arr = [...((form as any)[key] as string[])];
    arr.splice(idx, 1);
    set({ [key]: arr } as any);
  };

  // When user selects place IDs from dropdown, also keep names in sync
  const syncPlacesToNames = (ids: ObjId[]) => {
    const names = places
      .filter((p) => ids.includes(p._id))
      .map((p) => p.name);
    set({ place_ids: ids, places_to_visit_names: names });
  };

  /* ---------- Media handlers ---------- */

  const handleGalleryImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    set({
      galleryImagesFiles: [...(form.galleryImagesFiles || []), ...files],
    });
  };

  const removeGalleryImage = (idx: number) => {
    const next = [...(form.galleryImagesFiles || [])];
    next.splice(idx, 1);
    set({ galleryImagesFiles: next });
  };

  const handleGuestImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    set({
      guestImagesFiles: [...(form.guestImagesFiles || []), ...files],
    });
  };

  const removeGuestImage = (idx: number) => {
    const next = [...(form.guestImagesFiles || [])];
    next.splice(idx, 1);
    set({ guestImagesFiles: next });
  };

  const handleVideosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    set({
      videoFiles: [...(form.videoFiles || []), ...files],
    });
  };

  const removeVideo = (idx: number) => {
    const next = [...(form.videoFiles || [])];
    next.splice(idx, 1);
    set({ videoFiles: next });
  };

  /* ---------- Submit ---------- */
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (stepIndex < LAST_INDEX) {
      if (isStepValid(step.key)) goNext();
      return;
    }

    try {
      setSubmitting(true);

      const placesToVisit = form.place_ids
        .map((id) => {
          const p = places.find((pl) => pl._id === id);
          if (!p) return null;
          return { name: p.name, placeId: id };
        })
        .filter(Boolean) as { name: string; placeId: string }[];

      const cooked: Record<string, any> = {
        // original internal fields
        tour_name: form.tour_name.trim(),
        vehicle_type: form.vehicle_type.trim(),
        min_pax: numOrDefault(form.min_pax, 1),
        max_pax: numOrDefault(form.max_pax, 1),
        category: getSelectedCategories(form.category),
        duration_hours: numOrDefault(form.duration_hours, 1),
        regular_timings: form.regular_timings.trim(),
        alternative_timings: form.alternative_timings.trim(),
        inclusions: form.inclusions,
        exclusions: form.exclusions,
     llm_chips: llmChips
  .map((c) => ({
    q: (c.q || "").trim(),
    a: sanitizeHtml((c.a || "").trim()),
  }))
  .filter((c) => c.q || c.a),
        vendor_charge: numOrNull(form.vendor_charge),
        seller_charge: numOrNull(form.seller_charge),
        blockout_surcharges: form.blockout_surcharges
          .filter((s) => s.amount != null && s.amount !== "" && s.start_date)
          .map((s) => ({
            mode: s.mode,
            amount: Number(s.amount),
            currency: "INR",
            start_date: s.start_date,
            end_date: s.mode === "range" ? s.end_date || s.start_date : s.start_date,
          })),
        special_mentions: form.special_mentions.trim(),
        notes: form.notes.trim(),

        title: form.tour_name.trim(),
        destination: form.destination.trim(),
        vehicleType: form.vehicle_type.trim(),
        duration: numOrDefault(form.duration_hours, 1),
        regularTimings: form.regular_timings.trim(),
        alternativeTimings: form.alternative_timings.trim(),
        description: form.description.trim(),
        thumbnail: form.thumbnail.trim(),
        images: form.images,
         guestImages: form.guestImages,   // 👈 NEW
        videos: form.videoUrls,          
        placesToVisit,
        highlights: form.highlights,
        whyChoose: form.whyChoose
          .map((w) => ({
            title: w.title.trim(),
            description: w.description.trim(),
            icon: w.icon.trim(),
          }))
          .filter((w) => w.title || w.description || w.icon),
        itinerary: form.itinerary
          .map((b) => ({
            time: b.time.trim(),
            title: b.title.trim(),
            description: b.description.trim(),
          }))
          .filter((b) => b.time || b.title || b.description),
        operationProcess: form.operationProcess
          .map((b) => ({
            time: b.time.trim(),
            title: b.title.trim(),
            description: b.description.trim(),
          }))
          .filter((b) => b.time || b.title || b.description),
        whatToExpect: form.whatToExpect
          .map((b) => ({
            title: b.title.trim(),
            description: b.description.trim(),
          }))
          .filter((b) => b.title || b.description),
    segregated_images: segregatedGroups
  .map((g) => ({
    category: g.category.trim(),
    // match DB shape: { category, urls: string[] }
    urls: g.existingImages,
    // later you can also append uploaded files here once backend supports it
  }))
  .filter((g) => g.category || g.urls.length > 0),
        pickupType: form.pickupType.trim(),
        pickupAreas: form.pickupAreas,
        meetingTime: form.meetingTime.trim(),
        goodToKnow: form.goodToKnow,
        whatToBring: form.whatToBring,
        operatingHours: form.operatingHours.trim(),
        bestTimeToVisit: form.bestTimeToVisit.trim(),
        seasonalAvailability: form.seasonalAvailability.trim(),
        groupSize: form.groupSize.trim(),
        minParticipants: numOrDefault(form.minParticipants, 0),
        maxParticipants: numOrDefault(form.maxParticipants, 0),
        accessibility: form.accessibility.trim(),
        fitnessLevel: form.fitnessLevel.trim(),
        priceBreakdown: {
  basePrice: numOrNull(form.priceBreakdown.basePrice),
  serviceCharges: numOrNull(form.priceBreakdown.serviceCharges),
  taxes: numOrNull(form.priceBreakdown.taxes),
  markup_min_price: numOrNull(form.priceBreakdown.markup_min_price as any),
  markup_max_price: numOrNull(form.priceBreakdown.markup_max_price as any),
  totalPrice: numOrNull(form.priceBreakdown.totalPrice),
},

        voucherInfo: form.voucherInfo,
        languages: form.languages,
        cancellationPolicyShort: form.cancellationPolicyShort.trim(),
        cancellationDetails: form.cancellationDetails,
        rating: form.rating == null || form.rating === "" ? 0 : Number(form.rating),
        reviewCount: numOrDefault(form.reviewCount, 0),
        bookedCount: numOrDefault(form.bookedCount, 0),
        instantConfirmation: form.instantConfirmation,
        freeCancellation: form.freeCancellation,
        operatedBy: form.operatedBy.trim(),
      };

      const fd = new FormData();
      fd.append("payload", JSON.stringify({ ...cooked }));

      // Attach media files
      if (form.thumbnailFile) {
        fd.append("thumbnail", form.thumbnailFile);
      }

      (form.guestImagesFiles || []).forEach((file) => {
        fd.append("guestImages", file);
      });

      (form.galleryImagesFiles || []).forEach((file) => {
        fd.append("galleryImages", file);
      });

      (form.videoFiles || []).forEach((file) => {
        fd.append("videos", file);
      });
segregatedGroups.forEach((group, gIdx) => {
        group.images.forEach((img) => {
          // backend can use field name + index to know which category it belongs to
          fd.append(`segregated_images_${gIdx}`, img.file);
        });
      });
      const base = process.env.NEXT_PUBLIC_API_BASE || "/";
            const id = storepkg?._id; // or from router params
      if (!id) throw new Error("Package ID missing");
      const url = `${base.replace(/\/$/, "")}/packages/packages/update/${id}`;
      const res = await fetch(url, { method: "PATCH", body: fd });
      if (!res.ok) throw new Error((await res.text()) || "Request failed");

      alert("Sightseeing package created successfully! 🎉");
      router.push("/dashboard/Sightseeing?tab=packages");
    } catch (err: any) {
      console.error(err);
      alert(`An error occurred: ${err?.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================
     Render
     ========================= */

  return (
    <form className="min-h-screen bg-gray-50" >
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-gray-200">
        <div className="px-4 py-3 sm:px-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-emerald-600 text-white grid place-items-center text-sm font-bold shadow">
              {(form.tour_name[0] || "S").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-gray-900 truncate">
                Edit Sightseeing Package — {title}
              </h1>
              <p className="text-[11px] text-gray-500 truncate">
                Update details for this sightseeing package
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...BLANK })}
              disabled={submitting}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
                submitting
                  ? "border-gray-200 text-gray-400"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
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
                    const allPrevValid =
                      i <= stepIndex
                        ? true
                        : STEPS.slice(0, i).every((st) => isStepValid(st.key));
                    if (allPrevValid) setStepIndex(i);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs whitespace-nowrap ${
                    active
                      ? "bg-emerald-50 border-emerald-500 text-emerald-700"
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
            <div
              className={`h-full transition-all ${
                submitting ? "bg-emerald-400" : "bg-emerald-600"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto p-4 sm:p-6 pb-36 lg:pb-64">
        {/* DETAILS STEP */}
        {step.key === "details" && (
          <>
            <SectionCard
              title="Basic Details"
              subtitle="Required fields for the package."
              icon={<FileText className="size-5 text-emerald-600" />}
              requiredHint
            >
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Tour Name *" required>
                    <input
                      type="text"
                      className="input"
                      value={form.tour_name}
                      onChange={(e) => set({ tour_name: e.target.value })}
                      placeholder='e.g., "South Goa Sightseeing Tour"'
                      disabled={submitting}
                    />
                  </Field>

              

                  <Field label="Destination">
                    <input
                      type="text"
                      className="input"
                      value={form.destination}
                      onChange={(e) => set({ destination: e.target.value })}
                      placeholder="e.g., Goa"
                      disabled={submitting}
                    />
                  </Field>

                  <Field label="Vehicle Type *" required>
                    <select
                      className="input"
                      value={form.vehicle_type}
                      onChange={(e) => {
                        const val = e.target.value;
                        const derived = derivePaxFromVehicleType(val);
                        set({
                          vehicle_type: val,
                          ...(derived ? { min_pax: derived.min, max_pax: derived.max } : {}),
                        });
                      }}
                      disabled={submitting}
                    >
                      <option value="">Select vehicle type</option>
                      {VEHICLE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Min Pax *" required>
                    <input
                      type="number"
                      className="input"
                      min={0}
                      value={form.min_pax}
                      onChange={(e) =>
                        set({
                          min_pax: e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      placeholder="e.g., 1"
                      disabled={submitting}
                    />
                  </Field>

                  <Field label="Max Pax *" required>
                    <input
                      type="number"
                      className="input"
                      min={0}
                      value={form.max_pax}
                      onChange={(e) =>
                        set({
                          max_pax: e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      placeholder="e.g., 17"
                      disabled={submitting}
                    />
                  </Field>

                  <Field label="Duration (hours) *" required>
                    <input
                      type="number"
                      className="input"
                      min={1}
                      max={24}
                      value={form.duration_hours}
                      onChange={(e) =>
                        set({
                          duration_hours:
                            e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      placeholder="e.g., 7"
                      disabled={submitting}
                    />
                  </Field>
    <Field label="Markup Min Price (₹)">
  <div className="relative">
    <input
      type="number"
      className="input pl-9"
      min={0}
      value={form.priceBreakdown.markup_min_price ?? ""}
      onChange={(e) =>
        set({
          priceBreakdown: {
            ...form.priceBreakdown,
            markup_min_price: emptyToNull(e.target.value),
          },
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
      value={form.priceBreakdown.markup_max_price ?? ""}
      onChange={(e) =>
        set({
          priceBreakdown: {
            ...form.priceBreakdown,
            markup_max_price: emptyToNull(e.target.value),
          },
        })
      }
      placeholder="e.g., 500"
      disabled={submitting}
    />
    <IndianRupee className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
  </div>
</Field>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Product Meta & Content"
              subtitle="Destination, categories, description, and highlights."
              icon={<FileText className="size-5 text-blue-600" />}
            >
              <div className="space-y-4">
              <Field label="Category" required>
                            <div className="flex flex-wrap gap-2">
                              {CATEGORY_OPTIONS.map((cat) => {
                                const selected = getSelectedCategories(form.category).includes(cat);
              
                                return (
                                  <label
                                    key={cat}
                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs cursor-pointer ${
                                      selected
                                        ? "bg-blue-600 border-blue-600 text-white"
                                        : "bg-white border-gray-300 text-gray-700"
                                    }`}
                                  >
                                  <input
                                      type="checkbox"
                                      className="sr-only"
                                      checked={selected}
                                      onChange={() =>
                                        set({
                                          category: toggleCategory(form.category, cat),
                                        })
                                      }
                                      disabled={submitting}
                                    />

                                    <span className="inline-flex items-center justify-center">
                                      {selected ? (
                                        <Check className="size-3.5" />
                                      ) : (
                                        <span className="size-3.5 rounded border border-current" />
                                      )}
                                    </span>
                                    <span className="uppercase">{cat}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </Field>

                <Field label="Description (Rich Text)">
                                <TinyMCETextEditor
                                  value={form.description}
                                  onChange={(html) => set({ description: html })}
                                  disabled={submitting}
                                  height={260}
                                />
                              </Field>

              </div>
            </SectionCard>
          </>
        )}

        {/* LLM CHIPS STEP */}
        {step.key === "llmChips" && (
          <SectionCard
            title="LLM Chips"
            subtitle="Predefined Q&A snippets for the assistant."
            icon={<HelpCircle className="size-5 text-blue-600" />}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-800">Chips</span>
              <button
                type="button"
                onClick={addLlmChip}
                disabled={submitting}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
              >
                <Plus className="size-3.5" />
                Add Chip
              </button>
            </div>

            <div className="space-y-3">
              {llmChips.map((c, i) => (
                <div key={`llm-chip-${i}`} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-600">Chip #{i + 1}</p>
                    <button
                      type="button"
                      onClick={() => remLlmChip(i)}
                      disabled={submitting}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                    >
                      <Trash2 className="size-3.5" />
                      Remove
                    </button>
                  </div>
                  <div className="space-y-3">
                    <Field label="Question / Prompt">
                      <input
                        type="text"
                        className="input w-full"
                        value={c.q}
                        onChange={(e) => setLlmChip(i, { q: e.target.value })}
                        placeholder="e.g., Do you offer Jain or vegan meals?"
                        disabled={submitting}
                      />
                    </Field>
                    <Field label="Answer / Response">
                      <div className="rounded-xl border border-gray-300 bg-white p-2">
<TinyMCETextEditor
  value={llmChips[i]?.a || ""}
  disabled={submitting}
  onChange={(html: string) => setLlmChip(i, { a: html })}
/>

                      </div>
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* SCHEDULE STEP */}
        {step.key === "schedule" && (
          <SectionCard
            title="Timings & Places"
            subtitle="Enter time ranges and choose places (multi-select)."
            icon={<Clock className="size-5 text-emerald-600" />}
          >
            <div className="rounded-xl border border-gray-200 p-4 space-y-6">
              {/* Timings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Regular Timings" hint="e.g., 9:00 AM - 5:00 PM">
                  <div className="relative">
                    <input
                      type="text"
                      className={`input pr-9 ${
                        !form.regular_timings ||
                        TIME_RANGE_REGEX.test(cleanTime(form.regular_timings))
                          ? ""
                          : "ring-2 ring-amber-300"
                      }`}
                      value={form.regular_timings}
                      onChange={(e) => set({ regular_timings: e.target.value })}
                      placeholder="9:00 AM - 5:00 PM"
                      disabled={submitting}
                    />
                    <Clock className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </Field>

                <Field label="Alternative Timings" hint="Optional">
                  <div className="relative">
                    <input
                      type="text"
                      className={`input pr-9 ${
                        !form.alternative_timings ||
                        TIME_RANGE_REGEX.test(cleanTime(form.alternative_timings))
                          ? ""
                          : "ring-2 ring-amber-300"
                      }`}
                      value={form.alternative_timings}
                      onChange={(e) => set({ alternative_timings: e.target.value })}
                      placeholder="1:00 PM - 7:00 PM"
                      disabled={submitting}
                    />
                    <Clock className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </Field>
              </div>

              {/* Places multi-select */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="block text-sm font-medium text-gray-700">
                    Select Places
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {loadingPlaces ? "Loading…" : `${places.length} available`}
                  </span>
                </div>

                <MultiSelectDropdown
                  placeholder={loadingPlaces ? "Loading places…" : "Select places"}
                  disabled={loadingPlaces || submitting}
                  options={places.map((p) => ({ value: p._id, label: p.name }))}
                  selected={form.place_ids}
                  onChange={(ids) => syncPlacesToNames(ids)}
                />

                {/* Selected chips */}
                <div className="mt-3 rounded-xl bg-gray-100 p-3">
                  <div className="flex flex-wrap gap-2">
                    {form.place_ids.length === 0 ? (
                      <span className="text-xs text-gray-500">No places selected</span>
                    ) : (
                      places
                        .filter((p) => form.place_ids.includes(p._id))
                        .map((p) => (
                          <span
                            key={p._id}
                            className="inline-flex items-center gap-2 text-sm bg-gray-200 text-gray-900 px-3 py-1.5 rounded-lg"
                          >
                            {p.name}
                            <button
                              type="button"
                              onClick={() => {
                                const next = form.place_ids.filter((id) => id !== p._id);
                                syncPlacesToNames(next);
                              }}
                              className="-mr-1.5 rounded hover:opacity-80"
                              aria-label={`Remove ${p.name}`}
                              disabled={submitting}
                            >
                              <X className="size-4 text-pink-500" />
                            </button>
                          </span>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {/* COMMERCE STEP */}
        {step.key === "commerce" && (
          <>
            {/* Inclusions & pricing / surcharges / notes */}
            <SectionCard
              title="Inclusions, Exclusions & Pricing"
              subtitle="Add inclusions/exclusions, base charges, and block-out surcharges."
              icon={<ListChecks className="size-5 text-emerald-600" />}
            >
              <div className="rounded-xl border border-gray-200 p-4 space-y-6">

                {/* Base charges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Vendor Charge (₹)">
                    <div className="relative">
                      <input
                        type="number"
                        className="input pl-9"
                        value={form.vendor_charge ?? ""}
                        onChange={(e) => set({ vendor_charge: emptyToNull(e.target.value) })}
                        placeholder="e.g., 2500"
                        disabled={submitting}
                      />
                      <IndianRupee className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </Field>
                  <Field label="Seller Charge (₹)">
                    <div className="relative">
                      <input
                        type="number"
                        className="input pl-9"
                        value={form.seller_charge ?? ""}
                        onChange={(e) => set({ seller_charge: emptyToNull(e.target.value) })}
                        placeholder="e.g., 500"
                        disabled={submitting}
                      />
                      <IndianRupee className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </Field>
                </div>

                {/* Block-out surcharges */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="block text-sm font-medium text-gray-700">
                      Block-out Surcharges
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        set({
                          blockout_surcharges: [
                            ...form.blockout_surcharges,
                            {
                              id: uid(),
                              mode: "range",
                              amount: "",
                              start_date: "",
                              end_date: "",
                              currency: "INR",
                            },
                          ],
                        })
                      }
                      disabled={submitting}
                      className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <Plus className="size-4" />
                      Add
                    </button>
                  </div>

                  {form.blockout_surcharges.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No surcharges added. Click <strong>Add</strong> to create one.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {form.blockout_surcharges.map((s, idx) => (
                        <div
                          key={s.id}
                          className="rounded-xl border border-gray-200 overflow-hidden"
                        >
                          <div className="flex items-center justify-between px-3 py-2 bg-amber-50 border-b border-amber-100">
                            <span className="text-xs font-semibold text-amber-800">
                              Surcharge #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const next = [...form.blockout_surcharges];
                                next.splice(idx, 1);
                                set({ blockout_surcharges: next });
                              }}
                              className="text-xs text-red-600 hover:underline inline-flex items-center gap-1"
                              disabled={submitting}
                            >
                              <X className="size-3" />
                              Remove
                            </button>
                          </div>

                          <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
                            {/* Mode */}
                            <div className="sm:col-span-2">
                              <div className="flex items-center gap-4">
                                <label className="inline-flex items-center gap-2 text-sm">
                                  <input
                                    type="radio"
                                    className="accent-emerald-600"
                                    checked={s.mode === "single"}
                                    onChange={() => {
                                      const next = [...form.blockout_surcharges];
                                      next[idx] = { ...s, mode: "single", end_date: undefined };
                                      set({ blockout_surcharges: next });
                                    }}
                                  />
                                  Single date
                                </label>
                                <label className="inline-flex items-center gap-2 text-sm">
                                  <input
                                    type="radio"
                                    className="accent-emerald-600"
                                    checked={s.mode === "range"}
                                    onChange={() => {
                                      const next = [...form.blockout_surcharges];
                                      next[idx] = {
                                        ...s,
                                        mode: "range",
                                        end_date: s.end_date || "",
                                      };
                                      set({ blockout_surcharges: next });
                                    }}
                                  />
                                  Date range
                                </label>
                              </div>
                            </div>

                            {/* Amount */}
                            <div className="sm:col-span-1">
                              <div className="relative">
                                <input
                                  type="number"
                                  className="input pl-9"
                                  value={s.amount ?? ""}
                                  onChange={(e) => {
                                    const next = [...form.blockout_surcharges];
                                    next[idx] = {
                                      ...s,
                                      amount: emptyToNull(e.target.value),
                                    };
                                    set({ blockout_surcharges: next });
                                  }}
                                  placeholder="Amount"
                                  disabled={submitting}
                                />
                                <IndianRupee className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              </div>
                            </div>

                            {/* Currency (locked INR) */}
                            <div className="sm:col-span-1 flex items-center">
                              <span className="text-xs text-gray-500">INR</span>
                            </div>

                            {/* Dates */}
                            <div className="sm:col-span-2">
                              <Field label={s.mode === "single" ? "Date" : "Start date"}>
                                <input
                                  type="date"
                                  className="input"
                                  value={s.start_date}
                                  onChange={(e) => {
                                    const next = [...form.blockout_surcharges];
                                    next[idx] = { ...s, start_date: e.target.value };
                                    set({ blockout_surcharges: next });
                                  }}
                                  disabled={submitting}
                                />
                              </Field>
                            </div>

                            {s.mode === "range" && (
                              <div className="sm:col-span-2">
                                <Field label="End date">
                                  <input
                                    type="date"
                                    className="input"
                                    value={s.end_date || ""}
                                    onChange={(e) => {
                                      const next = [...form.blockout_surcharges];
                                      next[idx] = { ...s, end_date: e.target.value };
                                      set({ blockout_surcharges: next });
                                    }}
                                    disabled={submitting}
                                  />
                                </Field>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Special Mentions">
                    <textarea
                      className="textarea"
                      rows={3}
                      value={form.special_mentions}
                      onChange={(e) => set({ special_mentions: e.target.value })}
                      placeholder="Any special notes (e.g., festival surcharges, seasonal changes)…"
                      disabled={submitting}
                    />
                  </Field>
                  <Field label="Internal Notes">
                    <textarea
                      className="textarea"
                      rows={3}
                      value={form.notes}
                      onChange={(e) => set({ notes: e.target.value })}
                      placeholder="Internal notes…"
                      disabled={submitting}
                    />
                  </Field>
                </div>
              </div>
            </SectionCard>

            {/* Pickup & preparation */}
            <SectionCard
              title="Pickup & Preparation"
              subtitle="Pickup info, good to know, and what to bring."
              icon={<Clock className="size-5 text-blue-600" />}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Pickup Type" hint='e.g., "self", "commonPoint", "jettyPoint"'>
                    <input
                      type="text"
                      className="input"
                      value={form.pickupType}
                      onChange={(e) => set({ pickupType: e.target.value })}
                      disabled={submitting}
                    />
                  </Field>

                  <Field label="Meeting Time">
                    <input
                      type="text"
                      className="input"
                      value={form.meetingTime}
                      onChange={(e) => set({ meetingTime: e.target.value })}
                      placeholder="e.g., 9:00 AM"
                      disabled={submitting}
                    />
                  </Field>
                </div>
              </div>
            </SectionCard>

            {/* Experience content & policies */}
            <SectionCard
              title="Experience Details & Policies"
              subtitle="Itinerary, what to expect, pricing breakdown, and policies."
              icon={<ListChecks className="size-5 text-blue-600" />}
            >
              <div className="space-y-6">
                {/* Operations & seasonality */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Operating Hours">
                    <input
                      type="text"
                      className="input"
                      value={form.operatingHours}
                      onChange={(e) => set({ operatingHours: e.target.value })}
                      placeholder="e.g., 9:00 AM – 6:00 PM"
                      disabled={submitting}
                    />
                  </Field>
                  <Field label="Best Time to Visit">
                    <input
                      type="text"
                      className="input"
                      value={form.bestTimeToVisit}
                      onChange={(e) => set({ bestTimeToVisit: e.target.value })}
                      placeholder="e.g., October to March"
                      disabled={submitting}
                    />
                  </Field>
                  <Field label="Seasonal Availability">
                    <input
                      type="text"
                      className="input"
                      value={form.seasonalAvailability}
                      onChange={(e) => set({ seasonalAvailability: e.target.value })}
                      placeholder="e.g., Year-round"
                      disabled={submitting}
                    />
                  </Field>
                  <Field label="Group Size (label)">
                    <input
                      type="text"
                      className="input"
                      value={form.groupSize}
                      onChange={(e) => set({ groupSize: e.target.value })}
                      placeholder='e.g., "10 - 20"'
                      disabled={submitting}
                    />
                  </Field>
                  <Field label="Min Participants">
                    <input
                      type="number"
                      className="input"
                      value={form.minParticipants ?? ""}
                      onChange={(e) =>
                        set({
                          minParticipants:
                            e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      placeholder="e.g., 5"
                      disabled={submitting}
                    />
                  </Field>
                  <Field label="Max Participants">
                    <input
                      type="number"
                      className="input"
                      value={form.maxParticipants ?? ""}
                      onChange={(e) =>
                        set({
                          maxParticipants:
                            e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      placeholder="e.g., 20"
                      disabled={submitting}
                    />
                  </Field>
                  <Field label="Accessibility">
                    <input
                      type="text"
                      className="input"
                      value={form.accessibility}
                      onChange={(e) => set({ accessibility: e.target.value })}
                      placeholder="e.g., Not wheelchair accessible"
                      disabled={submitting}
                    />
                  </Field>
                  <Field label="Fitness Level">
                    <input
                      type="text"
                      className="input"
                      value={form.fitnessLevel}
                      onChange={(e) => set({ fitnessLevel: e.target.value })}
                      placeholder="e.g., Easy / Moderate"
                      disabled={submitting}
                    />
                  </Field>
                </div>

                {/* Price breakdown */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">
                    Price Breakdown (per person/package)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <Field label="Base Price (₹)">
                      <input
                        type="number"
                        className="input"
                        value={form.priceBreakdown.basePrice ?? ""}
                        onChange={(e) =>
                          set({
                            priceBreakdown: {
                              ...form.priceBreakdown,
                              basePrice: emptyToNull(e.target.value),
                            },
                          })
                        }
                        placeholder="e.g., 1499"
                        disabled={submitting}
                      />
                    </Field>
                    <Field label="Service Charges (₹)">
                      <input
                        type="number"
                        className="input"
                        value={form.priceBreakdown.serviceCharges ?? ""}
                        onChange={(e) =>
                          set({
                            priceBreakdown: {
                              ...form.priceBreakdown,
                              serviceCharges: emptyToNull(e.target.value),
                            },
                          })
                        }
                        placeholder="e.g., 40"
                        disabled={submitting}
                      />
                    </Field>
                    <Field label="Taxes (₹)">
                      <input
                        type="number"
                        className="input"
                        value={form.priceBreakdown.taxes ?? ""}
                        onChange={(e) =>
                          set({
                            priceBreakdown: {
                              ...form.priceBreakdown,
                              taxes: emptyToNull(e.target.value),
                            },
                          })
                        }
                        placeholder="e.g., 0"
                        disabled={submitting}
                      />
                    </Field>
                    <Field label="Total Price (₹)">
                      <input
                        type="number"
                        className="input"
                        value={form.priceBreakdown.totalPrice ?? ""}
                        onChange={(e) =>
                          set({
                            priceBreakdown: {
                              ...form.priceBreakdown,
                              totalPrice: emptyToNull(e.target.value),
                            },
                          })
                        }
                        placeholder="e.g., 1539"
                        disabled={submitting}
                      />
                    </Field>
                  </div>
                </div>

                {/* Content blocks: Why Choose, Itinerary, Operation, What to Expect */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-800">Why Choose</h3>
                  <div className="space-y-3">
                    {form.whyChoose.map((w, idx) => (
                      <div
                        key={`why-${idx}`}
                        className="border border-gray-200 rounded-xl p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-600">
                            Card #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              set({
                                whyChoose: form.whyChoose.filter((_, i) => i !== idx),
                              })
                            }
                            disabled={submitting}
                            className="text-xs text-red-600 inline-flex items-center gap-1"
                          >
                            <X className="size-3" />
                            Remove
                          </button>
                        </div>
                        <Field label="Title">
                          <input
                            type="text"
                            className="input"
                            value={w.title}
                            onChange={(e) => {
                              const next = [...form.whyChoose];
                              next[idx] = { ...w, title: e.target.value };
                              set({ whyChoose: next });
                            }}
                            placeholder="e.g., Comfort & Convenience"
                            disabled={submitting}
                          />
                        </Field>
                        <Field label="Description">
                          <textarea
                            className="textarea"
                            rows={2}
                            value={w.description}
                            onChange={(e) => {
                              const next = [...form.whyChoose];
                              next[idx] = { ...w, description: e.target.value };
                              set({ whyChoose: next });
                            }}
                            placeholder="Explain why this tour is special…"
                            disabled={submitting}
                          />
                        </Field>
                        <Field label="Icon Key">
                          <input
                            type="text"
                            className="input"
                            value={w.icon}
                            onChange={(e) => {
                              const next = [...form.whyChoose];
                              next[idx] = { ...w, icon: e.target.value };
                              set({ whyChoose: next });
                            }}
                            placeholder="e.g., comfort, guide, history"
                            disabled={submitting}
                          />
                        </Field>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        set({
                          whyChoose: [
                            ...form.whyChoose,
                            { title: "", description: "", icon: "" },
                          ],
                        })
                      }
                      disabled={submitting}
                      className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50"
                    >
                      <Plus className="size-3.5" />
                      Add Why Choose Card
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-800">Itinerary</h3>
                  <div className="space-y-3">
                    {form.itinerary.map((b, idx) => (
                      <div
                        key={`iti-${idx}`}
                        className="border border-gray-200 rounded-xl p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-600">
                            Stop #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              set({
                                itinerary: form.itinerary.filter((_, i) => i !== idx),
                              })
                            }
                            disabled={submitting}
                            className="text-xs text-red-600 inline-flex items-center gap-1"
                          >
                            <X className="size-3" />
                            Remove
                          </button>
                        </div>
                        <Field label="Time">
                          <input
                            type="text"
                            className="input"
                            value={b.time}
                            onChange={(e) => {
                              const next = [...form.itinerary];
                              next[idx] = { ...b, time: e.target.value };
                              set({ itinerary: next });
                            }}
                            placeholder="e.g., 9:00 AM"
                            disabled={submitting}
                          />
                        </Field>
                        <Field label="Title">
                          <input
                            type="text"
                            className="input"
                            value={b.title}
                            onChange={(e) => {
                              const next = [...form.itinerary];
                              next[idx] = { ...b, title: e.target.value };
                              set({ itinerary: next });
                            }}
                            placeholder="e.g., Pickup"
                            disabled={submitting}
                          />
                        </Field>
                        <Field label="Description">
                          <textarea
                            className="textarea"
                            rows={2}
                            value={b.description}
                            onChange={(e) => {
                              const next = [...form.itinerary];
                              next[idx] = { ...b, description: e.target.value };
                              set({ itinerary: next });
                            }}
                            placeholder="Describe what happens in this slot…"
                            disabled={submitting}
                          />
                        </Field>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        set({
                          itinerary: [...form.itinerary, { time: "", title: "", description: "" }],
                        })
                      }
                      disabled={submitting}
                      className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50"
                    >
                      <Plus className="size-3.5" />
                      Add Itinerary Block
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-800">Operation Process</h3>
                  <div className="space-y-3">
                    {form.operationProcess.map((b, idx) => (
                      <div
                        key={`op-${idx}`}
                        className="border border-gray-200 rounded-xl p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-600">
                            Step #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              set({
                                operationProcess: form.operationProcess.filter(
                                  (_, i) => i !== idx
                                ),
                              })
                            }
                            disabled={submitting}
                            className="text-xs text-red-600 inline-flex items-center gap-1"
                          >
                            <X className="size-3" />
                            Remove
                          </button>
                        </div>
                        <Field label="Time">
                          <input
                            type="text"
                            className="input"
                            value={b.time}
                            onChange={(e) => {
                              const next = [...form.operationProcess];
                              next[idx] = { ...b, time: e.target.value };
                              set({ operationProcess: next });
                            }}
                            placeholder="e.g., 8:45 AM"
                            disabled={submitting}
                          />
                        </Field>
                        <Field label="Title">
                          <input
                            type="text"
                            className="input"
                            value={b.title}
                            onChange={(e) => {
                              const next = [...form.operationProcess];
                              next[idx] = { ...b, title: e.target.value };
                              set({ operationProcess: next });
                            }}
                            placeholder="e.g., Guide Reporting"
                            disabled={submitting}
                          />
                        </Field>
                        <Field label="Description">
                          <textarea
                            className="textarea"
                            rows={2}
                            value={b.description}
                            onChange={(e) => {
                              const next = [...form.operationProcess];
                              next[idx] = { ...b, description: e.target.value };
                              set({ operationProcess: next });
                            }}
                            placeholder="Describe the internal process…"
                            disabled={submitting}
                          />
                        </Field>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        set({
                          operationProcess: [
                            ...form.operationProcess,
                            { time: "", title: "", description: "" },
                          ],
                        })
                      }
                      disabled={submitting}
                      className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50"
                    >
                      <Plus className="size-3.5" />
                      Add Operation Step
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-800">What to Expect</h3>
                  <div className="space-y-3">
                    {form.whatToExpect.map((b, idx) => (
                      <div
                        key={`exp-${idx}`}
                        className="border border-gray-200 rounded-xl p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-600">
                            Point #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              set({
                                whatToExpect: form.whatToExpect.filter((_, i) => i !== idx),
                              })
                            }
                            disabled={submitting}
                            className="text-xs text-red-600 inline-flex items-center gap-1"
                          >
                            <X className="size-3" />
                            Remove
                          </button>
                        </div>
                        <Field label="Title">
                          <input
                            type="text"
                            className="input"
                            value={b.title}
                            onChange={(e) => {
                              const next = [...form.whatToExpect];
                              next[idx] = { ...b, title: e.target.value };
                              set({ whatToExpect: next });
                            }}
                            placeholder="e.g., Historical Exploration"
                            disabled={submitting}
                          />
                        </Field>
                        <Field label="Description">
                          <textarea
                            className="textarea"
                            rows={2}
                            value={b.description}
                            onChange={(e) => {
                              const next = [...form.whatToExpect];
                              next[idx] = { ...b, description: e.target.value };
                              set({ whatToExpect: next });
                            }}
                            placeholder="Explain what guests will experience…"
                            disabled={submitting}
                          />
                        </Field>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        set({
                          whatToExpect: [
                            ...form.whatToExpect,
                            { title: "", description: "" },
                          ],
                        })
                      }
                      disabled={submitting}
                      className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50"
                    >
                      <Plus className="size-3.5" />
                      Add Expectation Point
                    </button>
                  </div>
                </div>


                <Field label="Short Cancellation Policy">
                  <input
                    type="text"
                    className="input"
                    value={form.cancellationPolicyShort}
                    onChange={(e) => set({ cancellationPolicyShort: e.target.value })}
                    placeholder="e.g., Free cancellation 24 hours before"
                    disabled={submitting}
                  />
                </Field>

                {/* Ratings & counts */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Rating (0–5)">
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      max={5}
                      className="input"
                      value={form.rating ?? ""}
                      onChange={(e) =>
                        set({
                          rating: e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      placeholder="e.g., 4.7"
                      disabled={submitting}
                    />
                  </Field>
                  <Field label="Review Count">
                    <input
                      type="number"
                      className="input"
                      value={form.reviewCount ?? ""}
                      onChange={(e) =>
                        set({
                          reviewCount:
                            e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      placeholder="e.g., 98"
                      disabled={submitting}
                    />
                  </Field>
                  <Field label="Booked Count">
                    <input
                      type="number"
                      className="input"
                      value={form.bookedCount ?? ""}
                      onChange={(e) =>
                        set({
                          bookedCount:
                            e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      placeholder="e.g., 740"
                      disabled={submitting}
                    />
                  </Field>
                </div>

                {/* Flags & operator */}
                <div className="flex flex-wrap items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      className="accent-emerald-600"
                      checked={form.instantConfirmation}
                      onChange={(e) =>
                        set({
                          instantConfirmation: e.target.checked,
                        })
                      }
                      disabled={submitting}
                    />
                    Instant Confirmation
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      className="accent-emerald-600"
                      checked={form.freeCancellation}
                      onChange={(e) =>
                        set({
                          freeCancellation: e.target.checked,
                        })
                      }
                      disabled={submitting}
                    />
                    Free Cancellation
                  </label>
                </div>

                <Field label="Operated By">
                  <input
                    type="text"
                    className="input"
                    value={form.operatedBy}
                    onChange={(e) => set({ operatedBy: e.target.value })}
                    placeholder="e.g., Goa Heritage Walks"
                    disabled={submitting}
                  />
                </Field>
              </div>
            </SectionCard>
          </>
        )}

        {step.key === "experience" && (
          <SectionCard
            title="Experience Content"
            subtitle="Highlights, inclusions, expectations and important notes."
            icon={<Users className="size-5 text-blue-600" />}
          >
            <div className="space-y-6">
              <TagComposer
                label="Highlights"
                values={form.highlights}
                onAdd={addStrItem("highlights")}
                onRemove={remStrItem("highlights")}
                placeholder="e.g., Jeep ride through jungle trails"
                disabled={submitting}
              />

              <TagComposer
                label="Languages"
                values={form.languages}
                onAdd={addStrItem("languages")}
                onRemove={remStrItem("languages")}
                placeholder="e.g., English, Hindi"
                disabled={submitting}
              />

              <TagComposer
                label="Inclusions"
                values={form.inclusions}
                onAdd={addStrItem("inclusions")}
                onRemove={remStrItem("inclusions")}
                placeholder="e.g., Jeep Safari, Forest Entry Fee"
                disabled={submitting}
              />

              <TagComposer
                label="Exclusions"
                values={form.exclusions}
                onAdd={addStrItem("exclusions")}
                onRemove={remStrItem("exclusions")}
                placeholder="e.g., Meals, Personal Expenses"
                disabled={submitting}
              />

              <TagComposer
                label="What to bring"
                values={form.whatToBring}
                onAdd={addStrItem("whatToBring")}
                onRemove={remStrItem("whatToBring")}
                placeholder="e.g., Water bottle, Towel, Swimwear"
                disabled={submitting}
              />

              <TagComposer
                label="Good to know"
                values={form.goodToKnow}
                onAdd={addStrItem("goodToKnow")}
                onRemove={remStrItem("goodToKnow")}
                placeholder="e.g., Wear comfortable shoes"
                disabled={submitting}
              />
              <TagComposer
                label="Voucher info"
                values={form.voucherInfo}
                onAdd={addStrItem("voucherInfo")}
                onRemove={remStrItem("voucherInfo")}
                placeholder="e.g., Mobile voucher accepted"
                disabled={submitting}
              />   
              <TagComposer
                label="Pickup areas"
                values={form.pickupAreas}
                onAdd={addStrItem("pickupAreas")}
                onRemove={remStrItem("pickupAreas")}
                placeholder="e.g., Calangute, Candolim, Baga"
                disabled={submitting}
              />
               <TagComposer
                label="cancellation Details"
                values={form.cancellationDetails}
                onAdd={addStrItem("cancellationDetails")}
                onRemove={remStrItem("cancellationDetails")}
                placeholder="e.g., write cancellation Details"
                disabled={submitting}
              />  
                
            </div>
          </SectionCard>
        )}

        {/* MEDIA STEP (last tab) */}
      {step.key === "media" && (
  <SectionCard
    title="Media"
    subtitle="Thumbnail, gallery, guest images and videos."
    icon={<ImageIcon className="size-5 text-purple-600" />}
  >
    <div className="space-y-6">
      {/* Thumbnail (required) */}
      <div className="rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-800">
              Thumbnail (required)
            </p>
            <p className="text-xs text-gray-500">
              Main image shown in cards and listings.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)]">
          <label className="relative flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl py-6 px-4 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40 transition">
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={(e) => {
                const files = e.target.files ? Array.from(e.target.files) : [];
                set({ thumbnailFile: files[0] ?? null });
              }}
              disabled={submitting}
            />
            <Plus className="size-5 text-gray-500" />
            <span className="text-xs font-medium text-gray-700">
              {form.thumbnailFile ? "Change thumbnail" : "Add Thumbnail"}
            </span>
            <span className="text-[11px] text-gray-400">
              JPG / PNG, recommended 1280×720
            </span>
          </label>

          {(form.thumbnailFile || form.thumbnail) && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="size-10 rounded-md overflow-hidden bg-gray-200 flex items-center justify-center text-[10px] text-gray-500">
                  <img
                    src={
                      form.thumbnailFile
                        ? URL.createObjectURL(form.thumbnailFile)
                        : form.thumbnail
                    }
                    alt="Thumbnail preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-xs text-gray-700 truncate">
                  {form.thumbnailFile
                    ? form.thumbnailFile.name
                    : "Existing thumbnail"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => set({ thumbnailFile: null, thumbnail: "" })}
                className="text-[11px] text-red-600 hover:underline"
                disabled={submitting}
              >
                Remove
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main gallery images */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          Gallery images
        </h3>
        <div className="mb-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {/* Existing gallery URLs from backend */}
          {(form.images || []).map((url, idx) => (
            <div
              key={`existing-gallery-${idx}`}
              className="relative aspect-square rounded-xl overflow-hidden border border-gray-300 bg-gray-50 shadow-sm"
            >
              <img
                src={url}
                alt={`Gallery image ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() =>
                  set({
                    images: form.images.filter((_, i) => i !== idx),
                  })
                }
                className="absolute top-1 right-1 size-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md active:scale-95"
                title="Remove existing image"
                aria-label="Remove existing image"
                disabled={submitting}
              >
                <X className="size-4" strokeWidth={3} />
              </button>
            </div>
          ))}

          {/* Newly added gallery files */}
          {(form.galleryImagesFiles || []).map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="relative aspect-square rounded-xl overflow-hidden border border-gray-300 bg-gray-50 shadow-sm"
            >
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeGalleryImage(idx)}
                className="absolute top-1 right-1 size-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md active:scale-95"
                title="Remove image"
                aria-label="Remove image"
                disabled={submitting}
              >
                <X className="size-4" strokeWidth={3} />
              </button>
            </div>
          ))}

          {/* Add more images */}
          <label className="block aspect-square">
            <div className="flex flex-col items-center justify-center w-full h-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 transition-colors bg-white hover:bg-gray-50">
              <ImageIcon className="size-6 text-gray-400" />
              <p className="mt-1 text-sm font-medium text-gray-700">
                Add Image
              </p>
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleGalleryImagesChange}
              className="hidden"
              disabled={submitting}
            />
          </label>
        </div>
      </div>

      {/* Guest images */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          Guest images
        </h3>
        <div className="mb-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {/* Existing guest image URLs from backend */}
          {(form.guestImages || []).map((url, idx) => (
            <div
              key={`existing-guest-${idx}`}
              className="relative aspect-square rounded-xl overflow-hidden border border-gray-300 bg-gray-50 shadow-sm"
            >
              <img
                src={url}
                alt={`Guest image ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() =>
                  set({
                    guestImages: form.guestImages.filter((_, i) => i !== idx),
                  })
                }
                className="absolute top-1 right-1 size-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md active:scale-95"
                title="Remove existing guest image"
                aria-label="Remove existing guest image"
                disabled={submitting}
              >
                <X className="size-4" strokeWidth={3} />
              </button>
            </div>
          ))}

          {/* Newly added guest image files */}
          {(form.guestImagesFiles || []).map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="relative aspect-square rounded-xl overflow-hidden border border-gray-300 bg-gray-50 shadow-sm"
            >
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeGuestImage(idx)}
                className="absolute top-1 right-1 size-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md active:scale-95"
                title="Remove guest image"
                aria-label="Remove guest image"
                disabled={submitting}
              >
                <X className="size-4" strokeWidth={3} />
              </button>
            </div>
          ))}

          {/* Add guest images */}
          <label className="block aspect-square">
            <div className="flex flex-col items-center justify-center w-full h-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 transition-colors bg-white hover:bg-gray-50">
              <ImageIcon className="size-6 text-gray-400" />
              <p className="mt-1 text-sm font-medium text-gray-700">
                Add Guest Image
              </p>
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleGuestImagesChange}
              className="hidden"
              disabled={submitting}
            />
          </label>
        </div>
      </div>

      {/* Videos */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Videos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {/* Existing video URLs from backend */}
          {(form.videoUrls || []).map((url, idx) => (
            <div
              key={`existing-video-${idx}`}
              className="relative rounded-xl overflow-hidden border border-gray-300 bg-black"
            >
              <video
                src={url}
                className="w-full h-full"
                controls
                preload="metadata"
              />
              <button
                type="button"
                onClick={() =>
                  set({
                    videoUrls: form.videoUrls.filter((_, i) => i !== idx),
                  })
                }
                className="absolute top-1 right-1 size-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md active:scale-95"
                title="Remove existing video"
                aria-label="Remove existing video"
                disabled={submitting}
              >
                <X className="size-4" strokeWidth={3} />
              </button>
            </div>
          ))}

          {/* Newly added video files */}
          {(form.videoFiles || []).map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="relative rounded-xl overflow-hidden border border-gray-300 bg-black"
            >
              <video
                src={URL.createObjectURL(file)}
                className="w-full h-full"
                controls
                preload="metadata"
              />
              <button
                type="button"
                onClick={() => removeVideo(idx)}
                className="absolute top-1 right-1 size-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md active:scale-95"
                title="Remove video"
                aria-label="Remove video"
                disabled={submitting}
              >
                <X className="size-4" strokeWidth={3} />
              </button>
            </div>
          ))}

          {/* Add videos */}
          <label className="block">
            <div className="flex flex-col items-center justify-center w-full h-full min-h-[120px] px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 transition-colors bg-white hover:bg-gray-50">
              <ImageIcon className="size-6 text-gray-400" />
              <p className="mt-1 text-sm font-medium text-gray-700">
                Add Video
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                MP4 / MOV / WEBM
              </p>
            </div>
            <input
              type="file"
              accept="video/*"
              multiple
              onChange={handleVideosChange}
              className="hidden"
              disabled={submitting}
            />
          </label>
        </div>
      </div>
    </div>
  </SectionCard>
)}
 {step.key === "segregatedMedia" && (
                  <SectionCard
                    title="Segregated Images"
                    subtitle="Group images by category (e.g., Nature, Waterfall, Guest Images)."
                    icon={<ImageIcon className="size-5 text-blue-600" />}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Categories & Images
                      </h3>
                      <button
                        type="button"
                        onClick={addSegGroup}
                        disabled={submitting}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                      >
                        <Plus className="size-3.5" />
                        Add Category
                      </button>
                    </div>
        
                    <div className="space-y-4">
                      {segregatedGroups.map((group, idx) => (
                        <div
                          key={group.id}
                          className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 sm:p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-semibold text-gray-700">
                              Category #{idx + 1}
                            </p>
                            <button
                              type="button"
                              onClick={() => removeSegGroup(group.id)}
                              disabled={submitting}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                            >
                              <X className="size-3.5" />
                              Remove
                            </button>
                          </div>
        
                          <Field label="Category name" required>
                            <input
                              type="text"
                              className="input"
                              value={group.category}
                              onChange={(e) =>
                                updateSegGroupCategory(group.id, e.target.value)
                              }
                              placeholder="e.g., nature, waterfall, guest_images"
                              disabled={submitting}
                            />
                          </Field>
        
                         <div className="mt-3">
  <p className="text-xs font-semibold text-gray-700 mb-1.5">
    Images ({group.existingImages.length + group.images.length})
  </p>
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
    {/* Existing URLs from backend */}
    {group.existingImages.map((url) => (
      <div
        key={url}
        className="relative aspect-square rounded-xl overflow-hidden border border-gray-300 bg-gray-50 shadow-sm"
      >
        <img src={url} alt="Existing" className="w-full h-full object-cover" />
        <button
          type="button"
          onClick={() => removeExistingSegImage(group.id, url)}
          className="absolute top-1 right-1 size-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md active:scale-95"
          title="Remove image"
          aria-label="Remove image"
          disabled={submitting}
        >
          <X className="size-4" strokeWidth={3} />
        </button>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
          <p className="text-white text-[10px] font-medium">EXISTING</p>
        </div>
      </div>
    ))}

    {/* Newly uploaded (local) files */}
    {group.images.map((img, imgIdx) => (
      <div
        key={img.preview}
        className="relative aspect-square rounded-xl overflow-hidden border-2 border-dashed border-blue-400 bg-blue-50"
      >
        <img
          src={img.preview}
          alt={`Segregated ${idx + 1}-${imgIdx + 1}`}
          className="w-full h-full object-cover opacity-80"
        />
        <button
          type="button"
          onClick={() => removeSegImage(group.id, imgIdx)}
          className="absolute top-1 right-1 size-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md active:scale-95"
          title="Remove image"
          aria-label="Remove image"
          disabled={submitting}
        >
          <X className="size-4" strokeWidth={3} />
        </button>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
          <p className="text-white text-[10px] font-medium truncate">NEW</p>
        </div>
      </div>
    ))}

    {/* Uploader */}
    <label className="block aspect-square">
      <div className="flex flex-col items-center justify-center w-full h-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 transition-colors bg-white hover:bg-gray-50">
        <ImageIcon className="size-6 text-gray-400" />
        <p className="mt-1 text-sm font-medium text-gray-700">Add Image</p>
      </div>
      <input
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleSegImagesUpload(group.id, e)}
        disabled={submitting}
      />
    </label>
  </div>
</div>

                        </div>
                      ))}
                    </div>
                  </SectionCard>
                )}

      </main>

      {/* Bottom bar */}
      <div className="fixed bottom-0 right-0 left-0 lg:left-64 z-40 bg-gray-50/95 backdrop-blur safe-bottom pt-2">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-2">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-900/5">
            <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="inline-flex items-center gap-2 text-xs text-gray-600 bg-gray-100 rounded-full px-3 py-1.5 font-semibold self-start sm:self-auto">
                <span
                  className={`size-2 rounded-full ${
                    isStepValid(step.key as StepKey) ? "bg-green-500" : "bg-amber-500"
                  }`}
                />
                {isStepValid(step.key as StepKey)
                  ? "Looks good"
                  : "Complete required fields"}
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
                >
                  Back
                </button>

                {stepIndex < LAST_INDEX ? (
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!isStepValid(step.key as StepKey) || submitting}
                    className={`flex-1 sm:flex-none px-5 py-3 text-sm font-semibold rounded-xl text-white ${
                      !isStepValid(step.key as StepKey) || submitting
                        ? "bg-blue-300 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                    }`}
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={!canSubmit || submitting}
                    className={`flex-1 sm:flex-none px-5 py-3 text-sm font-semibold rounded-xl text-white ${
                      !canSubmit || submitting
                        ? "bg-blue-300"
                        : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                    {submitting && <Loader2 className="size-4 animate-spin" />}
                    {submitting ? "Updating..." : "Update Package"}
                  </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Local styles */}
      <style jsx>{`
        .input {
          @apply w-full h-12 px-4 py-3 rounded-xl border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-[16px] leading-none placeholder:text-gray-400 transition-all;
          -webkit-tap-highlight-color: transparent;
        }
        .textarea {
          @apply w-full min-h-[112px] px-4 py-3 rounded-xl border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-[16px] placeholder:text-gray-400 transition-all resize-y;
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
      `}</style>
    </form>
  );
}

/* ------------------------------ Reusables ------------------------------ */

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
            <div className="size-8 grid place-items-center bg-blue-50 rounded-lg">
              {icon}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{title}</h2>
              {subtitle && (
                <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
              )}
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

/* ------------------------------ ChipInput ------------------------------ */

function ChipInput({
  value,
  placeholder,
  disabled,
  onAdd,
  onRemove,
}: {
  value: string[];
  placeholder?: string;
  disabled?: boolean;
  onAdd: (v: string) => void;
  onRemove: (idx: number) => void;
}) {
  const [input, setInput] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const v = input.trim();
      if (v) {
        onAdd(v);
        setInput("");
      }
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      onRemove(value.length - 1);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2">
      {value.map((chip, idx) => (
        <span
          key={`${chip}-${idx}`}
          className="inline-flex items-center gap-1.5 text-xs bg-gray-100 text-gray-800 px-2.5 py-1 rounded-full"
        >
          {chip}
          <button
            type="button"
            onClick={() => onRemove(idx)}
            disabled={disabled}
            className="hover:text-red-600"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        className="flex-1 min-w-[80px] border-none outline-none text-sm py-1"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}

/* ------------------------------ MultiSelectDropdown ------------------------------ */

interface MultiSelectOption {
  value: string;
  label: string;
}

function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder,
  disabled,
}: {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(query.toLowerCase())
  );

  const toggleValue = (v: string) => {
    if (selected.includes(v)) {
      onChange(selected.filter((x) => x !== v));
    } else {
      onChange([...selected, v]);
    }
  };

  const labelSummary =
    selected.length === 0
      ? placeholder || "Select"
      : selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label ?? placeholder
      : `${selected.length} selected`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="input !h-10 flex items-center justify-between text-left"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
      >
        <span className={selected.length === 0 ? "text-gray-400" : ""}>
          {labelSummary}
        </span>
        <ChevronDown className="size-4 text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-hidden">
          <div className="p-2 border-b border-gray-100 flex items-center gap-1">
            <Search className="size-4 text-gray-400 shrink-0" />
            <input
              type="text"
              className="w-full text-xs outline-none border-none"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-52 overflow-y-auto text-sm">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-500">No options</div>
            ) : (
              filtered.map((opt) => {
                const active = selected.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleValue(opt.value)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs ${
                      active ? "bg-emerald-50 text-emerald-700" : "hover:bg-gray-50"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {active && <Check className="size-3.5" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
