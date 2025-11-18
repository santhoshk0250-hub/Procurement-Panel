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
} from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";

import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import { Editor } from "react-draft-wysiwyg";
import { EditorState, ContentState, convertFromHTML } from "draft-js";
import { stateToHTML } from "draft-js-export-html";

/* =========================
   Types aligned to your schema / sample docs
   ========================= */

type ObjId = string;

interface PlaceLite {
  _id: ObjId;
  name: string;
  images?: string[];
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
  totalPrice: number | "" | null;
}

interface SightseeingPackageUI {
  // Core
  tour_name: string; // maps to title
  vehicle_type: string;

  // Id/code & destination
  code: string; // maps to "id" (e.g., SIGHT003)
  destination: string;

  // Pax & duration
  min_pax: number | "";
  max_pax: number | "";
  duration_hours: number | "";

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

  // Extended content / meta (from sample docs)
  category: string[];
  description: string;
  thumbnail: string;
  images: string[];
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

const BLANK: SightseeingPackageUI = {
  // core
  tour_name: "",
  vehicle_type: "",
  code: "",
  destination: "",

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
  category: [],
  description: "",
  thumbnail: "",
  images: [],
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
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// Steps
const STEPS = [
  { key: "details", label: "Details", icon: <FileText className="size-4" /> },
  { key: "llmChips", label: "LLM Chips", icon: <HelpCircle className="size-4" /> },
  { key: "schedule", label: "Timings & Places", icon: <Clock className="size-4" /> },
  { key: "commerce", label: "Inclusions & Pricing", icon: <ListChecks className="size-4" /> },
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

/* =========================
   Component
   ========================= */

export default function AddSightseeingPackageMobile() {
  const router = useRouter();
  const [form, setForm] = useState<SightseeingPackageUI>({ ...BLANK });
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Places data
  const [places, setPlaces] = useState<PlaceLite[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(true);

  const [doc] = useState<SightseeingPackageUI | null>(null);

  const step = STEPS[stepIndex];

  const htmlToEditorState = (html?: string) => {
    const safe = (html ?? "").trim();
    if (!safe) return EditorState.createEmpty();
    const blocks = convertFromHTML(safe);
    const content = ContentState.createFromBlockArray(
      blocks.contentBlocks,
      blocks.entityMap
    );
    return EditorState.createWithContent(content);
  };

  // LLM chips
  const [llmChips, setLlmChips] = useState<FAQ[]>(
    doc?.llm_chips && doc.llm_chips.length ? doc.llm_chips : [{ q: "", a: "" }]
  );

  const [llmChipEditors, setLlmChipEditors] = useState<EditorState[]>(() =>
    (doc?.llm_chips && doc.llm_chips.length ? doc.llm_chips : [{ q: "", a: "" }]).map(
      (c) => htmlToEditorState(c.a)
    )
  );

  const addLlmChip = () => {
    setLlmChips((p) => [...p, { q: "", a: "" }]);
    setLlmChipEditors((p) => [...p, EditorState.createEmpty()]);
  };

  const remLlmChip = (idx: number) => {
    setLlmChips((p) => (p.length <= 1 ? [{ q: "", a: "" }] : p.filter((_, i) => i !== idx)));
    setLlmChipEditors((p) =>
      p.length <= 1 ? [EditorState.createEmpty()] : p.filter((_, i) => i !== idx)
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
          const res = await axios.get(`${base}sightseeing/fetch?page=${pageNum}`);
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
    const ok1 =
      !form.regular_timings || TIME_RANGE_REGEX.test(cleanTime(form.regular_timings));
    const ok2 =
      !form.alternative_timings ||
      TIME_RANGE_REGEX.test(cleanTime(form.alternative_timings));
    const hasPlaces = form.place_ids.length > 0;
    return ok1 && ok2 && hasPlaces;
  }, [form.regular_timings, form.alternative_timings, form.place_ids]);

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
      | "category"
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
      | "category"
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
        duration_hours: numOrDefault(form.duration_hours, 1),
        regular_timings: form.regular_timings.trim(),
        alternative_timings: form.alternative_timings.trim(),
        place_ids: form.place_ids,
        places_to_visit_names: form.places_to_visit_names,
        inclusions: form.inclusions,
        exclusions: form.exclusions,
        llm_chips: llmChips
          .map((c, idx) => {
            const editor = llmChipEditors[idx] || EditorState.createEmpty();
            const content = editor.getCurrentContent();
            const hasText = content.hasText();
            const rawHtml = stateToHTML(content);
            const html = hasText ? sanitizeHtml(rawHtml) : "";
            return {
              q: (c.q || "").trim(),
              a: html.trim(),
            };
          })
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

        // fields matching your sample docs
        id: form.code.trim(), // SIGHT00X
        title: form.tour_name.trim(),
        destination: form.destination.trim(),
        vehicleType: form.vehicle_type.trim(),
        duration: numOrDefault(form.duration_hours, 1),
        regularTimings: form.regular_timings.trim(),
        alternativeTimings: form.alternative_timings.trim(),
        category: form.category,
        description: form.description.trim(),
        thumbnail: form.thumbnail.trim(),
        images: form.images,
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

      const base = process.env.NEXT_PUBLIC_API_BASE || "/";
      const url = `${base.replace(/\/$/, "")}/packages/packages/create`;
      const res = await fetch(url, { method: "POST", body: fd });
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
    <form className="min-h-screen bg-gray-50" onSubmit={handleSubmit}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-gray-200">
        <div className="px-4 py-3 sm:px-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-emerald-600 text-white grid place-items-center text-sm font-bold shadow">
              {(form.tour_name[0] || "S").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-gray-900 truncate">
                Add Sightseeing Package — {title}
              </h1>
              <p className="text-[11px] text-gray-500 truncate">
                Create a new sightseeing package
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
      <main className="max-w-3xl mx-auto p-4 sm:p-6 pb-36">
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

                  <Field label="Internal Code (ID)">
                    <input
                      type="text"
                      className="input"
                      value={form.code}
                      onChange={(e) => set({ code: e.target.value })}
                      placeholder='e.g., "SIGHT002"'
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
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Product Meta & Content"
              subtitle="Destination, categories, description, and media."
              icon={<FileText className="size-5 text-blue-600" />}
            >
              <div className="space-y-4">
                <Field label="Categories">
                  <ChipInput
                    value={form.category}
                    placeholder='Type and press Enter (e.g., "heritage", "family")'
                    disabled={submitting}
                    onAdd={(v) => addChip("category", v)}
                    onRemove={(idx) => removeChip("category", idx)}
                  />
                </Field>

                <Field label="Description">
                  <textarea
                    className="textarea"
                    rows={4}
                    value={form.description}
                    onChange={(e) => set({ description: e.target.value })}
                    placeholder="Short product description shown to users…"
                    disabled={submitting}
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Thumbnail URL">
                    <input
                      type="text"
                      className="input"
                      value={form.thumbnail}
                      onChange={(e) => set({ thumbnail: e.target.value })}
                      placeholder="https://…"
                      disabled={submitting}
                    />
                  </Field>

                  <Field label="Images URLs">
                    <ChipInput
                      value={form.images}
                      placeholder="Paste image URL and press Enter"
                      disabled={submitting}
                      onAdd={(v) => addChip("images", v)}
                      onRemove={(idx) => removeChip("images", idx)}
                    />
                  </Field>
                </div>

                <Field label="Highlights">
                  <ChipInput
                    value={form.highlights}
                    placeholder='e.g., "UNESCO Heritage Monuments"'
                    disabled={submitting}
                    onAdd={(v) => addChip("highlights", v)}
                    onRemove={(idx) => removeChip("highlights", idx)}
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
                        <Editor
                          editorState={llmChipEditors[i] || EditorState.createEmpty()}
                          onEditorStateChange={(next) =>
                            setLlmChipEditors((eds) =>
                              eds.map((ed, idx) => (idx === i ? next : ed))
                            )
                          }
                          toolbar={{
                            options: ["inline", "list"],
                            inline: {
                              options: ["bold", "italic", "underline", "strikethrough"],
                            },
                            list: { options: ["unordered", "ordered"] },
                          }}
                          toolbarClassName="border-b"
                          wrapperClassName="rounded-xl overflow-hidden"
                          editorClassName="min-h-[100px] px-3"
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
                {/* Inclusions / Exclusions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Inclusions">
                    <ChipInput
                      value={form.inclusions}
                      placeholder='Type and press Enter (e.g., "AC coach")'
                      disabled={submitting}
                      onAdd={(v) => addChip("inclusions", v)}
                      onRemove={(i) => removeChip("inclusions", i)}
                    />
                  </Field>
                  <Field label="Exclusions">
                    <ChipInput
                      value={form.exclusions}
                      placeholder='Type and press Enter (e.g., "Lunch")'
                      disabled={submitting}
                      onAdd={(v) => addChip("exclusions", v)}
                      onRemove={(i) => removeChip("exclusions", i)}
                    />
                  </Field>
                </div>

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

                <Field label="Pickup Areas">
                  <ChipInput
                    value={form.pickupAreas}
                    placeholder='e.g., "Old Goa Church Complex"'
                    disabled={submitting}
                    onAdd={(v) => addChip("pickupAreas", v)}
                    onRemove={(idx) => removeChip("pickupAreas", idx)}
                  />
                </Field>

                <Field label="Good to Know">
                  <ChipInput
                    value={form.goodToKnow}
                    placeholder='e.g., "Wear comfortable walking shoes"'
                    disabled={submitting}
                    onAdd={(v) => addChip("goodToKnow", v)}
                    onRemove={(idx) => removeChip("goodToKnow", idx)}
                  />
                </Field>

                <Field label="What to Bring">
                  <ChipInput
                    value={form.whatToBring}
                    placeholder='e.g., "Water bottle", "Cap/Hat"'
                    disabled={submitting}
                    onAdd={(v) => addChip("whatToBring", v)}
                    onRemove={(idx) => removeChip("whatToBring", idx)}
                  />
                </Field>
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
                          itinerary: [
                            ...form.itinerary,
                            { time: "", title: "", description: "" },
                          ],
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

                {/* Vouchers, languages & cancellation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Voucher Info">
                    <ChipInput
                      value={form.voucherInfo}
                      placeholder='e.g., "Mobile voucher accepted"'
                      disabled={submitting}
                      onAdd={(v) => addChip("voucherInfo", v)}
                      onRemove={(idx) => removeChip("voucherInfo", idx)}
                    />
                  </Field>
                  <Field label="Languages">
                    <ChipInput
                      value={form.languages}
                      placeholder='e.g., "English", "Hindi"'
                      disabled={submitting}
                      onAdd={(v) => addChip("languages", v)}
                      onRemove={(idx) => removeChip("languages", idx)}
                    />
                  </Field>
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

                <Field label="Cancellation Details">
                  <ChipInput
                    value={form.cancellationDetails}
                    placeholder='e.g., "No refund within 24 hours"'
                    disabled={submitting}
                    onAdd={(v) => addChip("cancellationDetails", v)}
                    onRemove={(idx) => removeChip("cancellationDetails", idx)}
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
      </main>

      {/* Sticky step nav */}
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
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canGoNext || submitting}
                  className={`flex-1 sm:flex-none px-5 py-3 text-sm font-semibold rounded-xl text-white ${
                    !canGoNext || submitting
                      ? "bg-emerald-300 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
                  }`}
                  aria-busy={submitting ? "true" : "false"}
                >
                  {stepIndex < LAST_INDEX ? (
                    "Continue"
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      {submitting && (
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      )}
                      {submitting ? "Creating..." : "Create Package"}
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
          @apply w-full h-12 px-4 py-3 rounded-xl border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-[16px] leading-none placeholder:text-gray-400 transition-all;
          -webkit-tap-highlight-color: transparent;
        }
        .textarea {
          @apply w-full min-h-[120px] px-4 py-3 rounded-xl border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-[16px] placeholder:text-gray-400 transition-all resize-y;
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

/* =========================
   Reusable components
   ========================= */

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
            <div className="size-8 grid place-items-center bg-emerald-50 rounded-lg">
              {icon}
            </div>
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
  onAdd: (val: string) => void;
  onRemove: (idx: number) => void;
}) {
  const [draft, setDraft] = useState("");

  const submit = () => {
    const v = draft.trim();
    if (!v) return;
    onAdd(v);
    setDraft("");
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((v, i) => (
          <span
            key={`${v}-${i}`}
            className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-1 rounded-lg"
          >
            {v}
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="ml-1 p-0.5 rounded-md hover:bg-emerald-100"
              aria-label={`Remove ${v}`}
              disabled={disabled}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>

      <div className="flex items-stretch gap-2">
        <input
          type="text"
          className="input flex-1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !draft.trim()}
          className={`size-12 grid place-items-center rounded-xl text-white transition ${
            disabled || !draft.trim()
              ? "bg-green-300 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700 active:bg-green-800"
          }`}
          title="Add"
          aria-label="Add chip"
        >
          <Plus className="size-5" />
        </button>
      </div>
    </div>
  );
}

/* =========================
   MultiSelectDropdown
   ========================= */

function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder = "Select",
  disabled = false,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter((o) => o.label.toLowerCase().includes(s));
  }, [q, options]);

  const toggle = (id: string) => {
    const setSel = new Set(selected);
    if (setSel.has(id)) setSel.delete(id);
    else setSel.add(id);
    onChange(Array.from(setSel));
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`input flex items-center justify-between ${
          disabled ? "cursor-not-allowed" : ""
        }`}
      >
        <span className="truncate text-left">
          {selected.length === 0 ? (
            <span className="text-gray-400">{placeholder}</span>
          ) : (
            `${selected.length} selected`
          )}
        </span>
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="p-2 border-b border-gray-100">
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mb-2 px-3 py-1.5 text-xs rounded-lg bg-emerald-100 text-emerald-700 font-medium hover:bg-emerald-200"
              >
                {selected.length} selected ✓
              </button>
            )}

            <div className="relative">
              <input
                type="search"
                className="input h-10 pr-8"
                placeholder="Search places…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <Search className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="px-2.5 py-1 text-xs rounded-lg border border-gray-300 hover:bg-gray-50"
                onClick={() => onChange(filtered.map((o) => o.value))}
              >
                Select all
              </button>
              <button
                type="button"
                className="px-2.5 py-1 text-xs rounded-lg border border-gray-300 hover:bg-gray-50"
                onClick={() => onChange([])}
              >
                Clear
              </button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="text-sm text-gray-500 p-2">No matches</div>
            ) : (
              filtered.map((o) => {
                const active = selected.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => toggle(o.value)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left ${
                      active ? "bg-emerald-50 text-emerald-900" : "hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-sm">{o.label}</span>
                    <span
                      className={`size-5 rounded border ${
                        active
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-gray-300 text-transparent"
                      } grid place-items-center`}
                    >
                      <Check className="size-4" />
                    </span>
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
