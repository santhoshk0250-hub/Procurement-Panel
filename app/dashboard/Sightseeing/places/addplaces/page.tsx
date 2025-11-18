"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  MapPin,
  FileText,
  Image as ImageIcon,
  ListChecks,
  Clock,
  Link2,
  IndianRupee,
  Plus,
  X,
  Check,
  HelpCircle
} from "lucide-react";

// Rich text editor deps
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import { EditorState, ContentState, convertFromHTML } from "draft-js";
import { stateToHTML } from "draft-js-export-html";
import { Editor } from "react-draft-wysiwyg";

/* =========================
   Types matching SightseeingPlace schema
   ========================= */

// Allow known types + any custom string
export type PlaceType =
  | "beach"
  | "fort"
  | "temple"
  | "church"
  | "museum"
  | "area"
  | "viewpoint"
  | "waterfall"
  | "market"
  | "park"
  | "other"
  | (string & {});

export type PlaceCategory =
  | "heritage"
  | "popular"
  | "nature"
  | "calm"
  | "urban"
  | "spiritual"
  | "scenic"
  | "mixed"
  | "other"
  | (string & {});

export type PriceType = "free" | "paid" | "mixed" | "";

interface TimelineItem {
  time: string;
  title: string;
  description: string;
}
interface NearbyPlaces {
  name: string;
  distance: string;
}
type FAQ = { q: string; a: string };

// UI state for the form
interface PlaceUI {
  // Core
  name: string;
  type: PlaceType | "";
  category: PlaceCategory | "";
  area: string;

  // Location (SightseeingLocationSchema)
  city: string;
  state: string;
  country: string;
  latitude: string; // store as string in UI, convert to number on submit
  longitude: string;

  // Hours (SightseeingHoursSchema)
  hours_open: string; // hours.open
  hours_close: string; // hours.close
  hours_note: string; // hours.note
  hours_days: string; // hours.days

  // Meta
  map_url: string;

  // Duration (SightseeingDurationSchema)
  duration_min: string; // minutes (min)
  duration_max: string; // minutes (max)
  estimated_duration: string; // duration.text

  bestTimeToVisit: string;

  // Content
  desc: string; // HTML from rich editor -> description
  history: string;

  // Price (SightseeingPriceSchema)
  price_type: PriceType;
  price: string; // price.text
  price_source: string; // price.source

  // Arrays (now stored as arrays in UI)
  facilities: string[];
  highlights: string[];
  tips: string[];
  llm_chips: FAQ[];
  
  // Accessibility (SightseeingAccessibilitySchema)
  accessibility_wheelchair: boolean;
  accessibility_difficulty: string;

  // Ratings
  rating: string; // convert to number
  reviewCount: string; // convert to number

  itinerary: TimelineItem[];
  nearbyPlaces: NearbyPlaces[];

  // Thumbnail (single image)
  thumbnail?: string; // existing thumbnail URL when editing
  newThumbnail?: { file: File; preview: string } | null;
  // Media handling (create/edit)
  existingImages?: string[]; // existing image URLs when editing
  newImages: Array<{ file: File; preview: string }>; // newly added files
}

/* =========================
   Helpers
   ========================= */

const PLACE_TYPES: PlaceType[] = [
  "beach",
  "fort",
  "temple",
  "church",
  "museum",
  "area",
  "viewpoint",
  "waterfall",
  "market",
  "park",
  "other",
];

const CATEGORY_OPTIONS: PlaceCategory[] = [
  "heritage",
  "popular",
  "nature",
  "calm",
  "urban",
  "spiritual",
  "scenic",
  "mixed",
  "other",
];

const BLANK_PLACE: PlaceUI = {
  name: "",
  type: "",
  category: "",
  area: "",
  city: "",
  state: "",
  country: "",
  latitude: "",
  longitude: "",

  hours_open: "",
  hours_close: "",
  hours_note: "",
  hours_days: "",

  map_url: "",
  duration_min: "",
  duration_max: "",
  estimated_duration: "",
  bestTimeToVisit: "",
  desc: "",
  history: "",
  price_type: "",
  price: "",
  price_source: "",
  llm_chips: [{ q: "", a: "" }],
  // arrays
  facilities: [],
  highlights: [],
  tips: [],

  accessibility_wheelchair: false,
  accessibility_difficulty: "",
  rating: "",
  reviewCount: "",
  itinerary: [{ time: "", title: "", description: "" }],
  nearbyPlaces: [{ name: "", distance: "" }],
  thumbnail: undefined,
  newThumbnail: null,
  existingImages: [],
  newImages: [],
};

const STEPS = [
  { key: "details", label: "Details", icon: <FileText className="size-4" /> },
  { key: "llmChips", label: "LLM Chips", icon: <HelpCircle className="size-4" /> },
  { key: "meta", label: "Meta", icon: <ListChecks className="size-4" /> },
  { key: "content", label: "Content", icon: <MapPin className="size-4" /> },
  { key: "media", label: "Media", icon: <ImageIcon className="size-4" /> },
] as const;

type StepKey = (typeof STEPS)[number]["key"];
const LAST_INDEX = STEPS.length - 1;

const initialForm: PlaceUI = { ...BLANK_PLACE };
const sanitizeHtml = (html: string) =>
  html.replace(/[\n\r]/g, "").replace(/>\s+</g, "><");
/* =========================
   Component
   ========================= */

export default function AddPlaceMobile() {
  const router = useRouter();
  const [data, setData] = useState<PlaceUI>(initialForm);
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [addingType, setAddingType] = useState(false);
  const [customType, setCustomType] = useState("");
  const customTypeRef = useRef<HTMLInputElement | null>(null);

  // file input ref to allow opening picker
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const imagesInputRef = useRef<HTMLInputElement | null>(null);

  const step = STEPS[stepIndex];

  // Rich text editor state for desc
  const [editorState, setEditorState] = useState<EditorState>(() =>
    EditorState.createEmpty()
  );

  useEffect(() => {
    if (addingType) customTypeRef.current?.focus();
  }, [addingType]);

  // hydrate the editor if editing an existing HTML description
  useEffect(() => {
    const html = (data.desc || "").trim();
    if (!html) return;
    const blocks = convertFromHTML(html);
    const content = ContentState.createFromBlockArray(
      blocks.contentBlocks,
      blocks.entityMap
    );
    setEditorState(EditorState.createWithContent(content));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
  return () => {
    data.newImages.forEach((i) => i.preview && URL.revokeObjectURL(i.preview));
    if (data.newThumbnail?.preview) {
      URL.revokeObjectURL(data.newThumbnail.preview);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

/* ---------- Thumbnail handling (single image) ---------- */
const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Revoke previous preview if replacing
  if (data.newThumbnail?.preview) {
    URL.revokeObjectURL(data.newThumbnail.preview);
  }

  const preview = URL.createObjectURL(file);
  setPlace({
    newThumbnail: { file, preview },
    // If you were editing and had an existing thumbnail URL, we clear it when new one is chosen
    thumbnail: "",
  });
};

const removeThumbnail = () => {
  if (data.newThumbnail?.preview) {
    URL.revokeObjectURL(data.newThumbnail.preview);
  }
  setPlace({
    newThumbnail: null,
    thumbnail: "",
  });
};



  // revoke previews on unmount
  useEffect(() => {
    return () => {
      data.newImages.forEach((i) => i.preview && URL.revokeObjectURL(i.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setPlace = (next: Partial<PlaceUI>) =>
    setData((p) => ({ ...p, ...next }));

  const canContinueDetails = useMemo(
    () =>
      !!data.name.trim() && !!data.area.trim() && !!data.type && !!data.category,
    [data.name, data.area, data.type, data.category]
  );

  const isValidUrl = (s: string) => /^$|^https?:\/\/.+/i.test(s.trim());

  const canContinueMeta = useMemo(
    () => isValidUrl(data.map_url),
    [data.map_url]
  );

  const isStepValid = (k: StepKey) => {
    switch (k) {
      case "details":
        return canContinueDetails;
      case "meta":
        return canContinueMeta;
      default:
        return true;
    }
  };
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
  const [llmChips, setLlmChips] = useState<FAQ[]>(BLANK_PLACE.llm_chips);
  const [llmChipEditors, setLlmChipEditors] = useState<EditorState[]>(() =>
    BLANK_PLACE.llm_chips.map((c) => htmlToEditorState(c.a))
  );
    const addLlmChip = () => {
      setLlmChips((p) => [...p, { q: "", a: "" }]);
      setLlmChipEditors((p) => [...p, EditorState.createEmpty()]);
    };
    const remLlmChip = (idx: number) => {
      setLlmChips((p) =>
        p.length <= 1 ? [{ q: "", a: "" }] : p.filter((_, i) => i !== idx)
      );
      setLlmChipEditors((p) =>
        p.length <= 1 ? [EditorState.createEmpty()] : p.filter((_, i) => i !== idx)
      );
    };
    const setLlmChip = (idx: number, next: Partial<FAQ>) =>
      setLlmChips((p) => p.map((c, i) => (i === idx ? { ...c, ...next } : c)));
  

  const canGoNext = isStepValid(step.key);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const goNext = () => {
    if (submitting || !canGoNext) return;
    if (stepIndex >= LAST_INDEX) {
      void handleSubmit();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, LAST_INDEX));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goBack = () => {
    if (submitting) return;
    setStepIndex((i) => Math.max(i - 1, 0));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  /* ---------- Images handling ---------- */
  const handleImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const toAdd = files.map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
    }));
    setPlace({ newImages: [...data.newImages, ...toAdd] });
  };

  const removeNewImage = (idx: number) => {
    const item = data.newImages[idx];
    if (item?.preview) URL.revokeObjectURL(item.preview);
    setPlace({
      newImages: data.newImages.filter((_, i) => i !== idx),
    });
  };

  const removeExistingImage = (idx: number) => {
    setPlace({
      existingImages: (data.existingImages || []).filter((_, i) => i !== idx),
    });
  };

  /* ---------- Dynamic type options (supports custom) ---------- */
  const TYPE_OPTIONS = useMemo(() => {
    const base = [...PLACE_TYPES];
    if (data.type && !base.includes(data.type)) {
      base.push(data.type);
    }
    return base;
  }, [data.type]);

  // itinerary handlers
  const addItineraryItem = () =>
    setData((p) => ({
      ...p,
      itinerary: [
        ...p.itinerary,
        { time: "", title: "", description: "" },
      ],
    }));

  const removeItineraryItem = (idx: number) =>
    setData((p) => {
      if (p.itinerary.length <= 1) {
        return {
          ...p,
          itinerary: [{ time: "", title: "", description: "" }],
        };
      }
      return {
        ...p,
        itinerary: p.itinerary.filter((_, i) => i !== idx),
      };
    });

  const updateItineraryItem = (idx: number, next: Partial<TimelineItem>) =>
    setData((p) => ({
      ...p,
      itinerary: p.itinerary.map((it, i) =>
        i === idx ? { ...it, ...next } : it
      ),
    }));

  // nearbyplaces handlers
  const addnearbyplacesItem = () =>
    setData((p) => ({
      ...p,
      nearbyPlaces: [...p.nearbyPlaces, { name: "", distance: "" }],
    }));

  const removenearbyplacesItem = (idx: number) =>
    setData((p) => {
      if (p.nearbyPlaces.length <= 1) {
        return {
          ...p,
          nearbyPlaces: [{ name: "", distance: "" }],
        };
      }
      return {
        ...p,
        nearbyPlaces: p.nearbyPlaces.filter((_, i) => i !== idx),
      };
    });

  const updatenearbyplacesItem = (idx: number, next: Partial<NearbyPlaces>) =>
    setData((p) => ({
      ...p,
      nearbyPlaces: p.nearbyPlaces.map((it, i) =>
        i === idx ? { ...it, ...next } : it
      ),
    }));

  /* ---------- Submit: send JSON + files in one go ---------- */
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (stepIndex < LAST_INDEX) {
      if (isStepValid(step.key)) goNext();
      return;
    }

    try {
      setSubmitting(true);

      // ensure desc is current HTML from the editor
      const descHtml = stateToHTML(editorState.getCurrentContent()).trim();

      // Build payload matching SightseeingPlace schema
      const cooked = {
        name: data.name.trim(),
        type: (data.type || "other").toLowerCase(),
        category: (data.category || "other").toLowerCase(),
        area: data.area.trim(),
        description: descHtml,
        history: data.history.trim(),
        location: {
          city: data.city.trim(),
          state: data.state.trim(),
          country: data.country.trim(),
          latitude: data.latitude ? Number(data.latitude) : undefined,
          longitude: data.longitude ? Number(data.longitude) : undefined,
        },
        hours: {
          open: data.hours_open.trim(),
          close: data.hours_close.trim(),
          days: data.hours_days.trim(),
          note: data.hours_note.trim(),
        },
        mapUrl: data.map_url.trim(),
        duration: {
          min: data.duration_min ? Number(data.duration_min) : undefined,
          max: data.duration_max ? Number(data.duration_max) : undefined,
          text: data.estimated_duration.trim(),
        },
        bestTimeToVisit: data.bestTimeToVisit.trim(),
        price: {
          type: (data.price_type || "mixed") as "free" | "paid" | "mixed",
          text: data.price.trim(),
          source: data.price_source.trim(),
        },
        // already arrays now
        facilities: data.facilities,
        highlights: data.highlights,
        tips: data.tips,
        accessibility: {
          wheelchairAccessible: !!data.accessibility_wheelchair,
          difficultyLevel: data.accessibility_difficulty.trim(),
        },
        itinerary: data.itinerary
          .map((it) => ({
            time: (it.time || "").trim(),
            title: (it.title || "").trim(),
            description: (it.description || "").trim(),
          }))
          .filter((it) => it.time || it.title || it.description),
        nearbyPlaces: data.nearbyPlaces
          .map((it) => ({
            name: (it.name || "").trim(),
            distance: (it.distance || "").trim(),
          }))
          .filter((it) => it.name || it.distance),
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
        rating: data.rating ? Number(data.rating) : undefined,
        reviewCount: data.reviewCount ? Number(data.reviewCount) : undefined,
        images: data.existingImages || [],
        thumbnail: data.thumbnail || undefined, 
      };

      const fd = new FormData();
      fd.append(
        "payload",
        JSON.stringify({
          place: cooked,
          createdAt: new Date().toISOString(),
        })
      );

      // append files (allow multiple)
      for (const item of data.newImages) {
        fd.append("images", item.file, item.file.name);
      }
      if (data.newThumbnail) {
        fd.append("thumbnail", data.newThumbnail.file, data.newThumbnail.file.name);
      }

      const url = `${process.env.NEXT_PUBLIC_API_BASE}sightseeing-places/create`;
      const res = await fetch(url, { method: "POST", body: fd });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Request failed");
      }

      alert("Place created successfully! 🎉");
      router.push("/dashboard/Sightseeing");
    } catch (err: any) {
      console.error(err);
      alert(`An error occurred: ${err?.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  const title = data.name.trim() || "New Place";

  return (
    <form className="min-h-screen bg-gray-50" onSubmit={handleSubmit}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-gray-200">
        <div className="px-4 py-3 sm:px-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-emerald-600 text-white grid place-items-center text-sm font-bold shadow">
              {title[0]?.toUpperCase() || "P"}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-gray-900 truncate">
                Add Place — {title}
              </h1>
              <p className="text-[11px] text-gray-500 truncate">
                Create a sightseeing place
              </p>
            </div>
            <button
              type="button"
              onClick={() => setData(initialForm)}
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
                        : STEPS.slice(0, i).every((st) =>
                            isStepValid(st.key)
                          );
                    if (allPrevValid) setStepIndex(i);
                    if (typeof window !== "undefined") {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
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
        {step.key === "details" && (
          <SectionCard
            title="Basic Details"
            subtitle="Required fields for a place."
            icon={<FileText className="size-5 text-emerald-600" />}
            requiredHint
          >
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Name *" required>
                  <input
                    type="text"
                    className="input"
                    value={data.name}
                    onChange={(e) => setPlace({ name: e.target.value })}
                    placeholder="Place name (e.g., Agonda Beach)"
                    disabled={submitting}
                  />
                </Field>

                <Field label="Type *" required>
                  {!addingType ? (
                    <div className="relative">
                      <select
                        className="input pr-9 capitalize"
                        value={data.type}
                        onChange={(e) => {
                          const val = e.target.value as
                            | PlaceType
                            | "__add__"
                            | "";
                          if (val === "__add__") {
                            setAddingType(true);
                            return;
                          }
                          setPlace({ type: val as PlaceType | "" });
                        }}
                        disabled={submitting}
                      >
                        <option value="">Select type</option>
                        {TYPE_OPTIONS.map((t) => (
                          <option key={t} value={t} className="capitalize">
                            {t}
                          </option>
                        ))}
                        <option value="__add__">➕ Add a custom type…</option>
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-stretch gap-2">
                      <input
                        ref={customTypeRef}
                        type="text"
                        className="input flex-1"
                        placeholder="Type a new category (e.g., canyon)"
                        value={customType}
                        onChange={(e) => setCustomType(e.target.value)}
                        disabled={submitting}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            saveCustomType();
                          } else if (e.key === "Escape") {
                            setCustomType("");
                            setAddingType(false);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={saveCustomType}
                        disabled={submitting || !customType.trim()}
                        className={`size-10 grid place-items-center rounded-full text-white transition ${
                          submitting || !customType.trim()
                            ? "bg-green-300 cursor-not-allowed"
                            : "bg-green-600 hover:bg-green-700 active:bg-green-800"
                        }`}
                        title="Save type"
                        aria-label="Save custom type"
                      >
                        <Check className="size-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomType("");
                          setAddingType(false);
                        }}
                        disabled={submitting}
                        className={`size-10 grid place-items-center rounded-full text-white transition ${
                          submitting
                            ? "bg-red-300 cursor-not-allowed"
                            : "bg-red-600 hover:bg-red-700 active:bg-red-800"
                        }`}
                        title="Cancel"
                        aria-label="Cancel add type"
                      >
                        <X className="size-5" />
                      </button>
                    </div>
                  )}
                  <p className="text-[11px] text-gray-500 mt-2">
                    Can’t find it? Choose{" "}
                    <span className="font-medium">“Add a custom type…”</span>
                  </p>
                </Field>

                <Field label="Category *" required>
                  <select
                    className="input"
                    value={data.category}
                    onChange={(e) =>
                      setPlace({
                        category: e.target.value as PlaceCategory | "",
                      })
                    }
                    disabled={submitting}
                  >
                    <option value="">Select category</option>
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c} className="capitalize">
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Area *" required>
                  <input
                    type="text"
                    className="input"
                    value={data.area}
                    onChange={(e) => setPlace({ area: e.target.value })}
                    placeholder="Area / Region (e.g., South Goa)"
                    disabled={submitting}
                  />
                </Field>
              </div>
            </div>
          </SectionCard>
        )}
          {/* LLM CHIPS */}
                {step.key === "llmChips" && (
                 <SectionCard
                    title="LLM Chips & FAQs"
                    subtitle="Predefined Q&A used by the assistant and on the product page."
                    icon={<HelpCircle className="size-5 text-blue-600" />}
                  >
                    {/* LLM Chips */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-800">
                          LLM chips
                        </span>
                        <button
                          type="button"
                          onClick={addLlmChip}
                          disabled={submitting}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                        >
                          <Plus className="size-3.5" />
                          Add chip
                        </button>
                      </div>
        
                      <div className="space-y-3">
                        {llmChips.map((c, i) => (
                          <div
                            key={`llm-chip-${i}`}
                            className="rounded-xl border border-gray-200 p-3"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-gray-600">
                                Chip #{i + 1}
                              </p>
                              <button
                                type="button"
                                onClick={() => remLlmChip(i)}
                                disabled={submitting}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                              >
                                <X className="size-3.5" />
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
                                  placeholder="What does this activity include?"
                                  disabled={submitting}
                                />
                              </Field>
                              <Field label="Answer / Response">
                                <div className="rounded-xl border border-gray-300 bg-white p-2">
                                  <Editor
                                    editorState={
                                      llmChipEditors[i] || EditorState.createEmpty()
                                    }
                                    onEditorStateChange={(next) =>
                                      setLlmChipEditors((eds) =>
                                        eds.map((ed, idx) => (idx === i ? next : ed))
                                      )
                                    }
                                    toolbar={{
                                      options: ["inline", "list"],
                                      inline: {
                                        options: [
                                          "bold",
                                          "italic",
                                          "underline",
                                          "strikethrough",
                                        ],
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
                    </div> 
                  </SectionCard> 
                )}

        {step.key === "meta" && (
          <SectionCard
            title="Meta & Logistics"
            subtitle="Optional details to help travellers plan."
            icon={<ListChecks className="size-5 text-emerald-600" />}
          >
            <div className="rounded-xl border border-gray-200 p-4 space-y-4">
              {/* Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Open Time"
                  hint='e.g., 09:30 AM (hours.open)'
                >
                  <div className="relative">
                    <input
                      type="text"
                      className="input pr-9"
                      value={data.hours_open}
                      onChange={(e) =>
                        setPlace({ hours_open: e.target.value })
                      }
                      placeholder="09:30 AM"
                      disabled={submitting}
                    />
                    <Clock className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </Field>

                <Field
                  label="Close Time"
                  hint='e.g., 06:00 PM (hours.close)'
                >
                  <div className="relative">
                    <input
                      type="text"
                      className="input pr-9"
                      value={data.hours_close}
                      onChange={(e) =>
                        setPlace({ hours_close: e.target.value })
                      }
                      placeholder="06:00 PM"
                      disabled={submitting}
                    />
                    <Clock className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Days"
                  hint='e.g., "Daily" / "Mon–Fri" (hours.days)'
                >
                  <input
                    type="text"
                    className="input"
                    value={data.hours_days}
                    onChange={(e) =>
                      setPlace({ hours_days: e.target.value })
                    }
                    placeholder="Daily"
                    disabled={submitting}
                  />
                </Field>

                <Field
                  label="Hours (note)"
                  hint='e.g., "Sunday opening at 10:30 AM" (hours.note)'
                >
                  <input
                    type="text"
                    className="input"
                    value={data.hours_note}
                    onChange={(e) =>
                      setPlace({ hours_note: e.target.value })
                    }
                    placeholder="e.g., 9 AM – 6 PM (Sunday 10:30 AM)"
                    disabled={submitting}
                  />
                </Field>
              </div>

              {/* Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field
                  label="Duration Min (minutes)"
                  hint="duration.min"
                >
                  <input
                    type="number"
                    min="0"
                    className="input"
                    value={data.duration_min}
                    onChange={(e) =>
                      setPlace({ duration_min: e.target.value })
                    }
                    placeholder="60"
                    disabled={submitting}
                  />
                </Field>

                <Field
                  label="Duration Max (minutes)"
                  hint="duration.max"
                >
                  <input
                    type="number"
                    min="0"
                    className="input"
                    value={data.duration_max}
                    onChange={(e) =>
                      setPlace({ duration_max: e.target.value })
                    }
                    placeholder="90"
                    disabled={submitting}
                  />
                </Field>

                <Field
                  label="Duration (display text)"
                  hint='duration.text (e.g., "60–90 min")'
                >
                  <input
                    type="text"
                    className="input"
                    value={data.estimated_duration}
                    onChange={(e) =>
                      setPlace({ estimated_duration: e.target.value })
                    }
                    placeholder="60–90 min"
                    disabled={submitting}
                  />
                </Field>
              </div>

              {/* Maps + best time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Google Maps URL" hint="Must start with http(s)://">
                  <div className="relative">
                    <input
                      type="url"
                      className={`input pr-9 ${
                        isValidUrl(data.map_url)
                          ? ""
                          : "ring-2 ring-amber-300"
                      }`}
                      value={data.map_url}
                      onChange={(e) => setPlace({ map_url: e.target.value })}
                      placeholder="https://maps.google.com/..."
                      disabled={submitting}
                    />
                    <Link2 className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </Field>

                <Field label="Best Time to Visit">
                  <input
                    type="text"
                    className="input"
                    value={data.bestTimeToVisit}
                    onChange={(e) =>
                      setPlace({ bestTimeToVisit: e.target.value })
                    }
                    placeholder="e.g., October to March"
                    disabled={submitting}
                  />
                </Field>
              </div>

              {/* Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="City">
                  <input
                    type="text"
                    className="input"
                    value={data.city}
                    onChange={(e) => setPlace({ city: e.target.value })}
                    placeholder="e.g., Calangute"
                    disabled={submitting}
                  />
                </Field>
                <Field label="State">
                  <input
                    type="text"
                    className="input"
                    value={data.state}
                    onChange={(e) => setPlace({ state: e.target.value })}
                    placeholder="e.g., Goa"
                    disabled={submitting}
                  />
                </Field>
                <Field label="Country">
                  <input
                    type="text"
                    className="input"
                    value={data.country}
                    onChange={(e) => setPlace({ country: e.target.value })}
                    placeholder="e.g., India"
                    disabled={submitting}
                  />
                </Field>
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Latitude" hint="Optional">
                  <input
                    type="text"
                    className="input"
                    value={data.latitude}
                    onChange={(e) => setPlace({ latitude: e.target.value })}
                    placeholder="e.g., 15.5448"
                    disabled={submitting}
                  />
                </Field>
                <Field label="Longitude" hint="Optional">
                  <input
                    type="text"
                    className="input"
                    value={data.longitude}
                    onChange={(e) => setPlace({ longitude: e.target.value })}
                    placeholder="e.g., 73.755"
                    disabled={submitting}
                  />
                </Field>
              </div>

              {/* Accessibility */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Wheelchair Accessible?">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPlace({
                          accessibility_wheelchair:
                            !data.accessibility_wheelchair,
                        })
                      }
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium ${
                        data.accessibility_wheelchair
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-gray-300 bg-white text-gray-700"
                      }`}
                      disabled={submitting}
                    >
                      <span
                        className={`size-4 rounded-full border flex items-center justify-center ${
                          data.accessibility_wheelchair
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-gray-300 text-transparent"
                        }`}
                      >
                        <Check className="size-3" />
                      </span>
                      Yes, generally accessible
                    </button>
                  </div>
                </Field>

                <Field
                  label="Difficulty Level"
                  hint="e.g., easy / medium / hard"
                >
                  <select
                    className="input"
                    value={data.accessibility_difficulty}
                    onChange={(e) =>
                      setPlace({
                        accessibility_difficulty: e.target.value,
                      })
                    }
                    disabled={submitting}
                  >
                    <option value="">Select</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </Field>
              </div>

              {/* Ratings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Rating" hint="From 0 to 5">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    className="input"
                    value={data.rating}
                    onChange={(e) => setPlace({ rating: e.target.value })}
                    placeholder="e.g., 4.5"
                    disabled={submitting}
                  />
                </Field>
                <Field label="Review Count">
                  <input
                    type="number"
                    min="0"
                    className="input"
                    value={data.reviewCount}
                    onChange={(e) =>
                      setPlace({ reviewCount: e.target.value })
                    }
                    placeholder="e.g., 320"
                    disabled={submitting}
                  />
                </Field>
              </div>
            </div>
          </SectionCard>
        )}

        {step.key === "content" && (
          <SectionCard
            title="Content"
            subtitle="Describe the place, pricing and visitor info."
            icon={<MapPin className="size-5 text-emerald-600" />}
          >
            <div className="rounded-xl border border-gray-200 p-4 space-y-6">
              <Field label="Description" hint="Rich text supported">
                <div className="rounded-xl border border-gray-300 bg-white shadow-sm">
                  <Editor
                    editorState={editorState}
                    onEditorStateChange={(next) => {
                      setEditorState(next);
                      const html = stateToHTML(next.getCurrentContent());
                      setPlace({ desc: html });
                    }}
                    placeholder="What makes this place special? Atmosphere, history, vibe, etc."
                    toolbar={{
                      options: ["inline", "list", "link", "history"],
                      inline: { options: ["bold", "italic", "underline"] },
                      list: { options: ["unordered", "ordered"] },
                      link: { defaultTargetOption: "_blank" },
                    }}
                    editorClassName="px-4 py-3 min-h-[140px]"
                    toolbarClassName="border-b"
                    wrapperClassName="rounded-xl overflow-hidden"
                    readOnly={submitting}
                  />
                </div>
              </Field>

              <Field
                label="History"
                hint="Shown as a short history paragraph"
              >
                <textarea
                  className="textarea"
                  value={data.history}
                  onChange={(e) => setPlace({ history: e.target.value })}
                  placeholder="Historical context, when it was built, why it matters..."
                  disabled={submitting}
                />
              </Field>

              {/* Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Price Text">
                  <div className="relative">
                    <input
                      type="text"
                      className="input pl-9"
                      value={data.price}
                      onChange={(e) => setPlace({ price: e.target.value })}
                      placeholder="e.g., Free entry, activities extra"
                      disabled={submitting}
                    />
                    <IndianRupee className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </Field>

                <Field label="Price Source">
                  <input
                    type="text"
                    className="input"
                    value={data.price_source}
                    onChange={(e) =>
                      setPlace({ price_source: e.target.value })
                    }
                    placeholder="e.g., Goa Tourism / Ticket counter"
                    disabled={submitting}
                  />
                </Field>
              </div>

              <Field label="Price Type">
                <select
                  className="input"
                  value={data.price_type}
                  onChange={(e) =>
                    setPlace({ price_type: e.target.value as PriceType })
                  }
                  disabled={submitting}
                >
                  <option value="">Select type</option>
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                  <option value="mixed">Mixed (some free, some paid)</option>
                </select>
              </Field>

              {/* Itinerary */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Itinerary
                  </h3>
                  <button
                    type="button"
                    onClick={addItineraryItem}
                    disabled={submitting}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                  >
                    <Plus className="size-3.5" />
                    Add step
                  </button>
                </div>
                <div className="space-y-3">
                  {data.itinerary.map((it, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-gray-200 p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-600">
                          Step #{idx + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeItineraryItem(idx)}
                          disabled={submitting}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                        >
                          <X className="size-3.5" />
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <Field label="Time" className="sm:col-span-1">
                          <input
                            type="text"
                            className="input"
                            value={it.time}
                            onChange={(e) =>
                              updateItineraryItem(idx, {
                                time: e.target.value,
                              })
                            }
                            placeholder="7:00 AM"
                            disabled={submitting}
                          />
                        </Field>
                        <Field label="Title" className="sm:col-span-3">
                          <input
                            type="text"
                            className="input"
                            value={it.title}
                            onChange={(e) =>
                              updateItineraryItem(idx, {
                                title: e.target.value,
                              })
                            }
                            placeholder="Pickup from Hotel"
                            disabled={submitting}
                          />
                        </Field>
                      </div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <Field
                          label="Description"
                          className="sm:col-span-3"
                        >
                          <textarea
                            className="textarea w-full"
                            value={it.description}
                            onChange={(e) =>
                              updateItineraryItem(idx, {
                                description: e.target.value,
                              })
                            }
                            placeholder="Guests are picked up from hotels near Calangute, Baga, Candolim."
                            disabled={submitting}
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nearbyplaces */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Near by Places
                  </h3>
                  <button
                    type="button"
                    onClick={addnearbyplacesItem}
                    disabled={submitting}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                  >
                    <Plus className="size-3.5" />
                    Add step
                  </button>
                </div>
                <div className="space-y-3">
                  {data.nearbyPlaces.map((it, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-gray-200 p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-600">
                          Step #{idx + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => removenearbyplacesItem(idx)}
                          disabled={submitting}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                        >
                          <X className="size-3.5" />
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Name">
                          <input
                            type="text"
                            className="input"
                            value={it.name}
                            onChange={(e) =>
                              updatenearbyplacesItem(idx, {
                                name: e.target.value,
                              })
                            }
                            placeholder="Place name"
                            disabled={submitting}
                          />
                        </Field>

                        <Field label="Distance">
                          <input
                            type="text"
                            className="input"
                            value={it.distance}
                            onChange={(e) =>
                              updatenearbyplacesItem(idx, {
                                distance: e.target.value,
                              })
                            }
                            placeholder="Distance"
                            disabled={submitting}
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lists (chips) */}
              <div className="grid grid-cols-1 gap-4">
                <Field
                  label="Highlights"
                  hint="Add each highlight separately"
                >
                  <TagsInput
                    items={data.highlights}
                    onChange={(items) => setPlace({ highlights: items })}
                    placeholder="e.g., Jeep ride through jungle trails"
                    disabled={submitting}
                  />
                </Field>

                <Field label="Tips" hint="Add each tip separately">
                  <TagsInput
                    items={data.tips}
                    onChange={(items) => setPlace({ tips: items })}
                    placeholder="e.g., Visit early morning"
                    disabled={submitting}
                  />
                </Field>

                <Field
                  label="Facilities"
                  hint="Add each facility separately"
                >
                  <TagsInput
                    items={data.facilities}
                    onChange={(items) => setPlace({ facilities: items })}
                    placeholder="e.g., Parking"
                    disabled={submitting}
                  />
                </Field>
              </div>
            </div>
          </SectionCard>
        )}

        {step.key === "media" && (
          <SectionCard
            title="Images"
            subtitle="Upload one or more images for this place."
            icon={<ImageIcon className="size-5 text-emerald-600" />}
          >
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 sm:p-4">

                  {/* Thumbnail (single cover image) */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-emerald-900 mb-2">
          Thumbnail / Cover Image
        </h4>
        <div className="flex flex-wrap items-center gap-3">
          {data.newThumbnail?.preview || data.thumbnail ? (
            <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-emerald-400 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.newThumbnail?.preview || (data.thumbnail as string)}
                alt="Thumbnail"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={removeThumbnail}
                disabled={submitting}
                className="absolute top-1 right-1 size-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md active:scale-95"
                title="Remove thumbnail"
                aria-label="Remove thumbnail"
              >
                <X className="size-4" strokeWidth={3} />
              </button>
            </div>
          ) : (
            <label className="w-32 h-32">
              <div className="flex flex-col items-center justify-center w-full h-full px-4 py-3 border-2 border-dashed border-emerald-300 rounded-xl cursor-pointer hover:border-emerald-500 transition-colors bg-white hover:bg-emerald-50">
                <ImageIcon className="size-6 text-emerald-500" />
                <p className="mt-1 text-xs font-medium text-emerald-900 text-center">
                  Upload Thumbnail
                </p>
                <p className="text-[10px] text-emerald-800/70 text-center">
                  Recommended 4:3 or 16:9
                </p>
              </div>
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/*"
                onChange={handleThumbnailUpload}
                className="hidden"
                disabled={submitting}
              />
            </label>
          )}

          <p className="text-[11px] text-emerald-900/80 max-w-xs">
            This image will be used as the main cover photo for the place
            (card, listing, etc.).
          </p>
        </div>
      </div>

              {(data.existingImages?.length || 0) > 0 && (
                <>
                  <h4 className="text-xs font-semibold text-emerald-900 mb-2">
                    Existing
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                    {data.existingImages!.map((url, i) => (
                      <div
                        key={`ex-${i}`}
                        className="relative aspect-square rounded-xl overflow-hidden border-2 border-emerald-300 bg-white"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Image ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeExistingImage(i)}
                          className="absolute top-1 right-1 size-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md active:scale-95"
                          title="Remove image"
                          aria-label="Remove existing image"
                          disabled={submitting}
                        >
                          <X className="size-4" strokeWidth={3} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <h4 className="text-xs font-semibold text-emerald-900 mb-2">
                New Uploads
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {data.newImages.map((img, i) => (
                  <div
                    key={i}
                    className="relative aspect-square rounded-xl overflow-hidden border-2 border-emerald-400 bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.preview}
                      alt={`New ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeNewImage(i)}
                      className="absolute top-1 right-1 size-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md active:scale-95"
                      title="Remove new image"
                      aria-label="Remove new image"
                      disabled={submitting}
                    >
                      <X className="size-4" strokeWidth={3} />
                    </button>
                  </div>
                ))}

                {/* Add tile */}
                <label className="block aspect-square">
                  <div className="flex flex-col items-center justify-center w-full h-full px-4 py-3 border-2 border-dashed border-emerald-300 rounded-xl cursor-pointer hover:border-emerald-500 transition-colors bg-white hover:bg-emerald-50">
                    <Plus className="size-6 text-emerald-500" />
                    <p className="mt-1 text-sm font-medium text-emerald-900">
                      Add Images
                    </p>
                    <p className="text-[11px] text-emerald-800/70">
                      JPG/PNG/WebP
                    </p>
                  </div>
                  <input
                    ref={imagesInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImagesUpload}
                    className="hidden"
                    disabled={submitting}
                  />
                </label>
              </div>
            </div>
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
                {isStepValid(step.key)
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
                        <Loader2
                          className="size-4 animate-spin"
                          aria-hidden="true"
                        />
                      )}
                      {submitting ? "Creating..." : "Create Place"}
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

  /* ---------- local helpers ---------- */
  function saveCustomType() {
    const val = customType.trim().toLowerCase();
    if (!val) return;
    setPlace({ type: val });
    setCustomType("");
    setAddingType(false);
  }
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
            <div className="size-8 grid place-items-center bg-emerald-50 rounded-lg">
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

/* ---------- Tag input for highlights/tips/facilities ---------- */
function TagsInput({
  items,
  onChange,
  placeholder,
  disabled,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");

  const addTag = () => {
    const v = value.trim();
    if (!v) return;
    if (items.includes(v)) {
      setValue("");
      return;
    }
    onChange([...items, v]);
    setValue("");
  };

  const removeTag = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!disabled) addTag();
    }
  };

  return (
    <div className="rounded-xl border border-gray-300 bg-white px-3 py-2 shadow-sm">
      <div className="flex items-center gap-2">
        <input
          type="text"
          className="flex-1 border-none outline-none focus:ring-0 text-sm placeholder:text-gray-400"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={addTag}
          disabled={disabled || !value.trim()}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
            disabled || !value.trim()
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-emerald-600 text-white hover:bg-emerald-700"
          }`}
        >
          Add
        </button>
      </div>
      {items.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {items.map((tag, idx) => (
            <span
              key={`${tag}-${idx}`}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-800"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(idx)}
                disabled={disabled}
                className="flex items-center justify-center"
              >
                <X className="size-3 text-gray-500 hover:text-gray-700" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
