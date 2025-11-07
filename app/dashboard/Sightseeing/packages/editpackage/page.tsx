// app/dashboard/SightseeingPackages/EditSightseeingPackageMobile.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  FileText,
  ListChecks,
  Clock,
  IndianRupee,
  Plus,
  X,
  ChevronDown,
  Search,
} from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useSightseeingPackageStore } from "@/store/usesightpackages";

/* =========================
   Types (aligned with Add form + legacy bridge)
   ========================= */

type ObjId = string;

interface PlaceLite {
  _id: ObjId;
  name: string;
  images?: string[];
}

type BlockoutMode = "single" | "range";
interface BlockoutSurcharge {
  id: string;                 // local uid for rendering only
  mode: BlockoutMode;         // "single" | "range"
  amount: number | "" | null; // INR
  start_date: string;         // yyyy-mm-dd
  end_date?: string;          // yyyy-mm-dd (required when mode === "range")
  currency?: "INR";           // locked INR
}

interface SightseeingPackageUI {
  // Core
  tour_name: string;
  vehicle_type: string;
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

  // Pricing (new model)
  vendor_charge: number | "" | null;
  seller_charge: number | "" | null;
  blockout_surcharges: BlockoutSurcharge[];
  service_charge: number | "" | null;

  // Notes
  special_mentions: string;
  notes: string;

  _id?: string;
}

/* =========================
   Helpers & Constants
   ========================= */

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

function derivePaxFromVehicleType(label: string) {
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

const TIME_RANGE_REGEX =
  /^([0-1]?\d|2[0-3])\s?(am|pm)?\s?(-|to)\s?([0-1]?\d|2[0-3])\s?(am|pm)?$/i;

const BLANK: SightseeingPackageUI = {
  tour_name: "",
  vehicle_type: "",
  min_pax: "",
  max_pax: "",
  duration_hours: "",
  regular_timings: "",
  alternative_timings: "",
  places_to_visit_names: [],
  place_ids: [],
  inclusions: [],
  exclusions: [],
  vendor_charge: "",
  seller_charge: "",
  blockout_surcharges: [],
  service_charge: "",
  special_mentions: "",
  notes: "",
};

const STEPS = [
  { key: "details", label: "Details", icon: <FileText className="size-4" /> },
  { key: "schedule", label: "Timings & Places", icon: <Clock className="size-4" /> },
  { key: "commerce", label: "Inclusions & Pricing", icon: <ListChecks className="size-4" /> },
] as const;
type StepKey = (typeof STEPS)[number]["key"];
const LAST_INDEX = STEPS.length - 1;

/* ---------- ID & Date utils ---------- */

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function normalizeId(v: any): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    if (v.$oid) return String(v.$oid);
    if (v._id) return normalizeId(v._id);
  }
  return String(v);
}
const HEX24 = /^[a-f0-9]{24}$/i;
function asHex24OrEmpty(v: any): string {
  const s = normalizeId(v);
  return HEX24.test(s) ? s : "";
}
function ensureStringIds(arr: any[]): string[] {
  return (arr || []).map((x) => normalizeId(x));
}

/**
 * Convert any DB date (e.g. "2025-11-11T00:00:00.000+00:00" or Date) to
 * a string acceptable by <input type="date"> => "YYYY-MM-DD".
 * - If the input already begins with YYYY-MM-DD, return that slice.
 * - Else try new Date(...) and fallback safely.
 */
function dateOnly(d: any): string {
  if (!d) return "";
  const s = String(d);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1]; // already ISO-like; first 10 chars are enough for date input
  try {
    const iso = new Date(s).toISOString(); // UTC ISO
    return iso.slice(0, 10);
  } catch {
    return "";
  }
}

function numOrNull(v: number | "" | null) {
  if (v === "" || v == null) return null;
  return Number(v);
}
function emptyToNull(v: string) {
  return v === "" ? null : Number(v);
}
function cleanTime(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/* =========================
   Component
   ========================= */

export default function EditSightseeingPackageMobile() {
  const router = useRouter();
  const storepkg = useSightseeingPackageStore((s: any) => s.pkg);

  const [form, setForm] = useState<SightseeingPackageUI>({ ...BLANK });
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [places, setPlaces] = useState<PlaceLite[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(true);

  const step = STEPS[stepIndex];

  /* ---------- Seed from store (with legacy fallbacks + DATE NORMALIZATION) ---------- */
  useEffect(() => {
    if (!storepkg) return;

    // Prepare blockout surcharges (normalize date strings to "YYYY-MM-DD")
    const legacyBlockouts: BlockoutSurcharge[] = Array.isArray(storepkg?.blockout_surcharges)
      ? (storepkg.blockout_surcharges as any[]).map((s: any) => ({
          id: uid(),
          mode: (s?.mode === "range" ? "range" : "single") as BlockoutMode,
          amount: typeof s?.amount === "number" || s?.amount == null ? s?.amount : "",
          start_date: dateOnly(s?.start_date),
          end_date: s?.mode === "range" ? dateOnly(s?.end_date) : undefined,
          currency: "INR",
        }))
      : (() => {
          // If old single prices exist, synthesize a single surcharge row
          const amount =
            typeof storepkg?.price_block_out === "number"
              ? storepkg.price_block_out
              : typeof storepkg?.price_block_out_special === "number"
              ? storepkg.price_block_out_special
              : null;
          return amount == null
            ? []
            : [
                {
                  id: uid(),
                  mode: "single" as BlockoutMode,
                  amount,
                  start_date: "", // let user pick
                  end_date: undefined,
                  currency: "INR",
                },
              ];
        })();

    setForm({
      _id: normalizeId(storepkg?._id),
      tour_name: storepkg?.tour_name ?? "",
      vehicle_type: storepkg?.vehicle_type ?? "",
      min_pax: typeof storepkg?.min_pax === "number" ? storepkg.min_pax : "",
      max_pax: typeof storepkg?.max_pax === "number" ? storepkg.max_pax : "",
      duration_hours:
        typeof storepkg?.duration_hours === "number" ? storepkg.duration_hours : "",
      regular_timings: storepkg?.regular_timings ?? "",
      alternative_timings: storepkg?.alternative_timings ?? "",
      places_to_visit_names: Array.isArray(storepkg?.places_to_visit_names)
        ? storepkg.places_to_visit_names
        : [],
      place_ids: Array.isArray(storepkg?.place_ids)
        ? ensureStringIds(storepkg.place_ids)
        : [],
      inclusions: Array.isArray(storepkg?.inclusions) ? storepkg.inclusions : [],
      exclusions: Array.isArray(storepkg?.exclusions) ? storepkg.exclusions : [],

      // New fields, prefer new -> fallback to legacy
      vendor_charge:
        typeof storepkg?.vendor_charge === "number" || storepkg?.vendor_charge === null
          ? storepkg.vendor_charge
          : typeof storepkg?.price_regular === "number"
          ? storepkg.price_regular
          : "",
      seller_charge:
        typeof storepkg?.seller_charge === "number" || storepkg?.seller_charge === null
          ? storepkg.seller_charge
          : "",

      blockout_surcharges: legacyBlockouts,
      service_charge:
        typeof storepkg?.service_charge === "number" || storepkg?.service_charge === null
          ? storepkg.service_charge
          : "",

      special_mentions: storepkg?.special_mentions ?? "",
      notes: storepkg?.notes ?? "",
    });
  }, [storepkg]);

  /* ---------- Fetch places (normalize IDs) ---------- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingPlaces(true);
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE || "/";
        const getPage = async (page: number) => {
          const res = await axios.get(`${base}sightseeing/fetch?page=${page}`);
          const items: any[] = res.data.items || res.data.data || [];
          const pages = res.data.totalPages ?? res.data.pagination?.pages ?? 1;
          return { items, pages: Number(pages) || 1 };
        };
        const first = await getPage(1);
        let all: PlaceLite[] = first.items || [];
        if (first.pages > 1) {
          const rest = await Promise.all(
            Array.from({ length: first.pages - 1 }, (_, i) => getPage(i + 2))
          );
          for (const r of rest) all = all.concat(r.items || []);
        }
        const normalized = (all || []).map((p: any) => ({
          _id: asHex24OrEmpty(p?._id) || normalizeId(p?._id),
          name: p?.name ?? "",
          images: p?.images,
        }));
        const dedup = Array.from(new Map(normalized.map((p) => [p._id, p])).values());
        if (mounted) setPlaces(dedup);
      } catch (e) {
        console.error("Failed to load places:", e);
        if (mounted) setPlaces([]);
      } finally {
        if (mounted) setLoadingPlaces(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /* ---------- Fill names if only IDs present ---------- */
  useEffect(() => {
    if (!loadingPlaces && form.place_ids.length > 0 && form.places_to_visit_names.length === 0) {
      const names = places.filter((p) => form.place_ids.includes(p._id)).map((p) => p.name);
      setForm((prev) => ({ ...prev, places_to_visit_names: names }));
    }
  }, [loadingPlaces, places, form.place_ids, form.places_to_visit_names.length]);

  /* ---------- Derived ---------- */
  const title = form.tour_name.trim() || "Edit Sightseeing Package";

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
    const ok1 = !form.regular_timings || TIME_RANGE_REGEX.test(cleanTime(form.regular_timings));
    const ok2 =
      !form.alternative_timings ||
      TIME_RANGE_REGEX.test(cleanTime(form.alternative_timings));
    const hasPlaces = form.place_ids.length > 0;
    return ok1 && ok2 && hasPlaces;
  }, [form.regular_timings, form.alternative_timings, form.place_ids]);

  const isStepValid = (k: StepKey) =>
    k === "details" ? canContinueDetails : k === "schedule" ? canContinueSchedule : true;

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
    key: "inclusions" | "exclusions" | "places_to_visit_names",
    value: string
  ) => {
    const v = value.trim();
    if (!v) return;
    set({ [key]: Array.from(new Set([...(form[key] as string[]), v])) } as any);
  };
  const removeChip = (
    key: "inclusions" | "exclusions" | "places_to_visit_names",
    idx: number
  ) => {
    const arr = [...(form[key] as string[])];
    arr.splice(idx, 1);
    set({ [key]: arr } as any);
  };

  const syncPlacesToNames = (ids: string[]) => {
    let cleanIds = (ids || []).map((x) => normalizeId(x));
    const anyBad = cleanIds.some((x) => x === "[object Object]" || !HEX24.test(x));
    if (anyBad) {
      const names =
        form.places_to_visit_names?.length
          ? form.places_to_visit_names
          : places.filter((p) => cleanIds.includes(p._id)).map((p) => p.name);
      cleanIds = places.filter((p) => names.includes(p.name)).map((p) => p._id);
    }
    const names = places.filter((p) => cleanIds.includes(p._id)).map((p) => p.name);
    set({ place_ids: cleanIds, places_to_visit_names: names });
  };

  /* ---------- Submit (PUT) ---------- */
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (stepIndex < LAST_INDEX) {
      if (isStepValid(step.key)) goNext();
      return;
    }

    try {
      setSubmitting(true);

      // Final guard for place ids
      let ids = ensureStringIds(form.place_ids);
      const invalid = ids.filter((x) => !HEX24.test(x));
      if (invalid.length > 0 || ids.length === 0) {
        const fromNames = places
          .filter((p) => form.places_to_visit_names.includes(p.name))
          .map((p) => p._id);
        ids = fromNames;
      }

      const cooked: Record<string, any> = {
        tour_name: form.tour_name.trim(),
        vehicle_type: form.vehicle_type.trim(),
        min_pax: form.min_pax === "" ? 1 : Number(form.min_pax),
        max_pax: form.max_pax === "" ? 1 : Number(form.max_pax),
        duration_hours: form.duration_hours === "" ? 1 : Number(form.duration_hours),
        regular_timings: form.regular_timings.trim(),
        alternative_timings: form.alternative_timings.trim(),
        place_ids: ids,
        places_to_visit_names: form.places_to_visit_names,
        inclusions: form.inclusions,
        exclusions: form.exclusions,

        vendor_charge: numOrNull(form.vendor_charge),
        seller_charge: numOrNull(form.seller_charge),
        blockout_surcharges: (form.blockout_surcharges || [])
          .filter((s) => s.amount != null && s.amount !== "" && s.start_date)
          .map((s) => ({
            mode: s.mode,
            amount: Number(s.amount),
            currency: "INR",
            start_date: s.start_date, // already "YYYY-MM-DD"
            end_date: s.mode === "range" ? s.end_date || s.start_date : s.start_date,
          })),
        // service_charge: numOrNull(form.service_charge),

        special_mentions: form.special_mentions.trim(),
        notes: form.notes.trim(),
      };

      const fd = new FormData();
      fd.append("payload", JSON.stringify(cooked));

      const base = process.env.NEXT_PUBLIC_API_BASE || "/";
      const id = form._id || normalizeId(storepkg?._id);
      const url = `${base.replace(/\/$/, "")}/packages/packages/${id}`;

      const res = await fetch(url, { method: "PUT", body: fd });
      if (!res.ok) throw new Error((await res.text()) || "Request failed");

      alert("Sightseeing package updated successfully! 🎉");
      router.push("/dashboard/Sightseeing?tab=packages");
    } catch (err: any) {
      console.error(err);
      alert(`An error occurred: ${err?.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="min-h-screen bg-gray-50" onSubmit={handleSubmit}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
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
                Update the existing sightseeing package
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...BLANK, _id: form._id })}
              disabled={submitting}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
                submitting ? "border-gray-200 text-gray-400" : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Reset (keep id)
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
                    const allPrevValid = i <= stepIndex ? true : STEPS.slice(0, i).every((st) => isStepValid(st.key));
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
            <div className={`h-full transition-all ${submitting ? "bg-emerald-400" : "bg-emerald-600"}`} style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto p-4 sm:p-6 pb-36">
        {/* Details */}
        {step.key === "details" && (
          <SectionCard
            title="Basic Details"
            subtitle="Update core information."
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
                    placeholder='e.g., "North Goa Sightseeing (Sharing)"'
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
                      set({ vehicle_type: val, ...(derived ? { min_pax: derived.min, max_pax: derived.max } : {}) });
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
                    onChange={(e) => set({ min_pax: e.target.value === "" ? "" : Number(e.target.value) })}
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
                    onChange={(e) => set({ max_pax: e.target.value === "" ? "" : Number(e.target.value) })}
                    placeholder="e.g., 7"
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
                    onChange={(e) => set({ duration_hours: e.target.value === "" ? "" : Number(e.target.value) })}
                    placeholder="e.g., 6"
                    disabled={submitting}
                  />
                </Field>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Timings & Places */}
        {step.key === "schedule" && (
          <SectionCard
            title="Timings & Places"
            subtitle="Edit time ranges and modify places (multi-select)."
            icon={<Clock className="size-5 text-emerald-600" />}
          >
            <div className="rounded-xl border border-gray-200 p-4 space-y-6">
              {/* Timings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Regular Timings" hint="e.g., 10 am - 6 pm">
                  <div className="relative">
                    <input
                      type="text"
                      className="input pr-9"
                      value={form.regular_timings}
                      onChange={(e) => set({ regular_timings: e.target.value })}
                      placeholder="10 am - 6 pm"
                      disabled={submitting}
                    />
                    <Clock className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </Field>

                <Field label="Alternative Timings" hint="Optional">
                  <div className="relative">
                    <input
                      type="text"
                      className="input pr-9"
                      value={form.alternative_timings}
                      onChange={(e) => set({ alternative_timings: e.target.value })}
                      placeholder="2 pm - 8 pm"
                      disabled={submitting}
                    />
                    <Clock className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </Field>
              </div>

              {/* Places */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="block text-sm font-medium text-gray-700">Select Places</span>
                  <span className="text-[11px] text-gray-500">{loadingPlaces ? "Loading…" : `${places.length} available`}</span>
                </div>

                <MultiSelectDropdown
                  placeholder={loadingPlaces ? "Loading places…" : "Select places"}
                  disabled={loadingPlaces || submitting}
                  options={places.map((p) => ({ value: p._id, label: p.name }))} // values are string IDs
                  selected={form.place_ids}
                  onChange={syncPlacesToNames}
                  triggerPreviewNames={
                    form.places_to_visit_names?.length
                      ? form.places_to_visit_names
                      : places.filter((p) => form.place_ids.includes(p._id)).map((p) => p.name)
                  }
                />

                {/* Selected chips */}
                <div className="mt-3 rounded-xl bg-gray-100 p-3">
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const displayNames =
                        form.places_to_visit_names?.length > 0
                          ? form.places_to_visit_names
                          : places.filter((p) => form.place_ids.includes(p._id)).map((p) => p.name);

                      if (displayNames.length === 0) {
                        return <span className="text-xs text-gray-500">No places selected</span>;
                      }

                      return displayNames.map((name, idx) => {
                        const found = places.find((p) => p.name === name);
                        const id = found?._id ?? form.place_ids[idx];

                        return (
                          <span
                            key={`${name}-${id || idx}`}
                            className="inline-flex items-center gap-2 text-sm bg-gray-200 text-gray-900 px-3 py-1.5 rounded-lg"
                          >
                            {name}
                            <button
                              type="button"
                              onClick={() => {
                                if (id) {
                                  const next = form.place_ids.filter((x) => x !== id);
                                  syncPlacesToNames(next);
                                } else {
                                  const nextNames = [...(form.places_to_visit_names || [])];
                                  const nextIds = [...form.place_ids];
                                  nextNames.splice(idx, 1);
                                  nextIds.splice(idx, 1);
                                  set({ places_to_visit_names: nextNames, place_ids: nextIds });
                                }
                              }}
                              className="-mr-1.5 rounded hover:opacity-80"
                              aria-label={`Remove ${name}`}
                              disabled={submitting}
                            >
                              <X className="size-4 text-pink-500" />
                            </button>
                          </span>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Commerce */}
        {step.key === "commerce" && (
          <SectionCard
            title="Inclusions, Exclusions & Pricing"
            subtitle="Update services, base charges, and block-out surcharges."
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

              {/* Block-out surcharges (multi) */}
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
                      <div key={s.id} className="rounded-xl border border-gray-200 overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 bg-amber-50 border-b border-amber-100">
                          <span className="text-xs font-semibold text-amber-800">Surge #{idx + 1}</span>
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
                                    next[idx] = { ...s, mode: "range", end_date: s.end_date || "" };
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
                                  next[idx] = { ...s, amount: emptyToNull(e.target.value) };
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
                                value={dateOnly(s.start_date)}
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
                                  value={dateOnly(s.end_date)}
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

              {/* Notes & service charge */}
              {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Service Charge (₹)">
                  <div className="relative">
                    <input
                      type="number"
                      className="input pl-9"
                      value={form.service_charge ?? ""}
                      onChange={(e) => set({ service_charge: emptyToNull(e.target.value) })}
                      placeholder="e.g., 200"
                      disabled={submitting}
                    />
                    <IndianRupee className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </Field>
                <div />
              </div> */}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Special Mentions">
                  <textarea
                    className="textarea"
                    rows={3}
                    value={form.special_mentions}
                    onChange={(e) => set({ special_mentions: e.target.value })}
                    placeholder="Any special notes…"
                    disabled={submitting}
                  />
                </Field>
                <Field label="Notes">
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
        )}
      </main>

      {/* Sticky step nav */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-gray-50/95 backdrop-blur safe-bottom pt-2">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-2">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-900/5">
            <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="inline-flex items-center gap-2 text-xs text-gray-600 bg-gray-100 rounded-full px-3 py-1.5 font-semibold self-start sm:self-auto">
                <span className={`size-2 rounded-full ${isStepValid(step.key) ? "bg-green-500" : "bg-amber-500"}`} />
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
                      {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                      {submitting ? "Updating..." : "Update Package"}
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
   Reusable bits
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
            <div className="size-8 grid place-items-center bg-emerald-50 rounded-lg">{icon}</div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{title}</h2>
              {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {requiredHint && <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">* Required</span>}
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
            disabled || !draft.trim() ? "bg-green-300 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 active:bg-green-800"
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
   MultiSelectDropdown (IDs are strings only)
   ========================= */

type OptVal = string;

function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder = "Select",
  disabled = false,
  triggerPreviewNames,
}: {
  options: { value: OptVal; label: string }[];
  selected: OptVal[];
  onChange: (ids: OptVal[]) => void;
  placeholder?: string;
  disabled?: boolean;
  triggerPreviewNames?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selectedFromNames = useMemo(() => {
    if (!triggerPreviewNames?.length) return new Set<string>();
    const wanted = new Set(triggerPreviewNames.map((s) => s.trim().toLowerCase()));
    const vals = options.filter((o) => wanted.has(o.label.trim().toLowerCase())).map((o) => o.value);
    return new Set(vals);
  }, [options, triggerPreviewNames]);

  const effectiveSelected = useMemo(() => {
    const s = new Set<string>((selected ?? []).map((x) => String(x)));
    for (const v of selectedFromNames) s.add(String(v));
    return Array.from(s);
  }, [selected, selectedFromNames]);

  const selectedSet = useMemo(() => new Set(effectiveSelected), [effectiveSelected]);

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

  const toggle = (id: OptVal) => {
    const set = new Set(effectiveSelected);
    const key = String(id);
    set.has(key) ? set.delete(key) : set.add(key);
    onChange(Array.from(set).map((x) => x).filter(Boolean));
  };

  const closedPreview =
    triggerPreviewNames?.length
      ? (() => {
          const names = triggerPreviewNames!;
          const preview = names.slice(0, 3).join(", ");
          return names.length > 3 ? `${preview} +${names.length - 3}` : preview;
        })()
      : effectiveSelected.length
      ? `${effectiveSelected.length} selected`
      : undefined;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`input flex items-center justify-between ${disabled ? "cursor-not-allowed" : ""}`}
      >
        <span className="truncate text-left">
          {effectiveSelected.length === 0 ? <span className="text-gray-400">{placeholder}</span> : closedPreview}
        </span>
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="p-2 border-b border-gray-100">
            {effectiveSelected.length > 0 && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mb-2 px-3 py-1.5 text-xs rounded-lg bg-emerald-100 text-emerald-700 font-medium hover:bg-emerald-200"
              >
                {effectiveSelected.length} selected ✓
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
                const isChecked = selectedSet.has(String(o.value));
                const checkboxId = `opt-${String(o.value).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
                return (
                  <label
                    key={String(o.value)}
                    htmlFor={checkboxId}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg cursor-pointer ${
                      isChecked ? "bg-emerald-50 text-emerald-900" : "hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-sm">{o.label}</span>
                    <input
                      id={checkboxId}
                      type="checkbox"
                      className="size-5 rounded border-gray-300 accent-emerald-600"
                      checked={isChecked}
                      onChange={() => toggle(o.value)}
                    />
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
