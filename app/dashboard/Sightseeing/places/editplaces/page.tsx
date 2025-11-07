"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
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
} from "lucide-react";
import { usePlaceStore } from "@/store/usesightseeingplace";

// Rich text editor deps
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import { EditorState, ContentState, convertFromHTML } from "draft-js";
import { stateToHTML } from "draft-js-export-html";
import { Editor } from "react-draft-wysiwyg";


/* =========================
   Types (same shape as Add)
   ========================= */

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

interface PlaceUI {
  // Core
  _id?: string | { $oid: string };
  name: string;
  type: PlaceType | "";
  area: string;

  // Optional meta
  hours: string;
  map_url: string;
  estimated_duration: string;

  // Content
  desc: string; // HTML from rich editor
  price: string;
  price_source: string;
  source_citation?: string;

  // Media handling
  existingImages?: string[]; // images already saved on the doc
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

const BLANK_PLACE: PlaceUI = {
  name: "",
  type: "",
  area: "",
  hours: "",
  map_url: "",
  estimated_duration: "",
  desc: "",
  price: "",
  price_source: "",
  source_citation: "",
  existingImages: [],
  newImages: [],
};

const STEPS = [
  { key: "details", label: "Details", icon: <FileText className="size-4" /> },
  { key: "meta", label: "Meta", icon: <ListChecks className="size-4" /> },
  { key: "content", label: "Content", icon: <MapPin className="size-4" /> },
  { key: "media", label: "Media", icon: <ImageIcon className="size-4" /> },
] as const;

type StepKey = (typeof STEPS)[number]["key"];
const LAST_INDEX = STEPS.length - 1;

/* =========================
   Component
   ========================= */

export default function EditPlaceMobile() {
  const router = useRouter();

  // Pull the selected place from your store
  const storePlace = usePlaceStore((s: any) => s.place);

  // Normalize _id from store (string or {$oid})
  const normalizedId =
    typeof storePlace?._id === "string"
      ? storePlace._id
      : (storePlace?._id?.$oid as string | undefined);

  // Initialize state from store; if no store data, show a small hint + back link
  const [data, setData] = useState<PlaceUI>(() => {
    if (!storePlace || !storePlace.name) return { ...BLANK_PLACE };
    return {
      _id: normalizedId,
      name: storePlace.name ?? "",
      type: (storePlace.type ?? "") as PlaceType | "",
      area: storePlace.area ?? "",
      hours: storePlace.hours ?? "",
      map_url: storePlace.map_url ?? "",
      estimated_duration: storePlace.estimated_duration ?? "",
      desc: storePlace.desc ?? "",
      price: storePlace.price ?? "",
      price_source: storePlace.price_source ?? "",
      source_citation: storePlace.source_citation ?? "",
      existingImages: Array.isArray(storePlace.images) ? storePlace.images : [],
      newImages: [],
    };
  });

  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [addingType, setAddingType] = useState(false);
  const [customType, setCustomType] = useState("");
  const customTypeRef = useRef<HTMLInputElement | null>(null);
  const imagesInputRef = useRef<HTMLInputElement | null>(null);

  const step = STEPS[stepIndex];

  // Rich text editor state for desc
  const [editorState, setEditorState] = useState<EditorState>(() => EditorState.createEmpty());

  useEffect(() => {
    if (addingType) customTypeRef.current?.focus();
  }, [addingType]);

  // hydrate the editor with existing HTML when editing
  useEffect(() => {
    const html = (data.desc || "").trim();
    if (!html) return;
    const blocks = convertFromHTML(html);
    const content = ContentState.createFromBlockArray(blocks.contentBlocks, blocks.entityMap);
    setEditorState(EditorState.createWithContent(content));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // revoke previews on unmount
  useEffect(() => {
    return () => {
      data.newImages.forEach((i) => i.preview && URL.revokeObjectURL(i.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setPlace = (next: Partial<PlaceUI>) => setData((p) => ({ ...p, ...next }));

  const canContinueDetails = useMemo(
    () => !!data.name.trim() && !!data.area.trim() && !!data.type,
    [data.name, data.area, data.type]
  );

  const isValidUrl = (s: string) => /^$|^https?:\/\/.+/i.test(s.trim());
  const canContinueMeta = useMemo(() => isValidUrl(data.map_url), [data.map_url]);

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

  /* ---------- Images handling ---------- */
  const handleImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const toAdd = files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }));
    setPlace({ newImages: [...data.newImages, ...toAdd] });
  };

  const removeNewImage = (idx: number) => {
    const item = data.newImages[idx];
    if (item?.preview) URL.revokeObjectURL(item.preview);
    setPlace({ newImages: data.newImages.filter((_, i) => i !== idx) });
  };

  const removeExistingImage = (idx: number) => {
    setPlace({ existingImages: (data.existingImages || []).filter((_, i) => i !== idx) });
  };

  /* ---------- Dynamic type options (supports custom) ---------- */
  const TYPE_OPTIONS = useMemo(() => {
    const base = [...PLACE_TYPES];
    if (data.type && !base.includes(data.type)) base.push(data.type);
    return base;
  }, [data.type]);

  /* ---------- Submit: PUT existing doc ---------- */
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (stepIndex < LAST_INDEX) {
      if (isStepValid(step.key)) goNext();
      return;
    }

    if (!normalizedId) {
      alert("No place selected for editing.");
      return;
    }

    try {
      setSubmitting(true);

      // ensure desc is current HTML from the editor
      const descHtml = stateToHTML(editorState.getCurrentContent()).trim();

      // Build payload (server merges images with current unless imagesReplace=true)
      const cooked = {
        name: data.name.trim(),
        type: (data.type || "other").toLowerCase(),
        area: data.area.trim(),
        hours: data.hours.trim(),
        map_url: data.map_url.trim(),
        estimated_duration: data.estimated_duration.trim(),
        desc: descHtml,
        price: data.price.trim(),
        price_source: data.price_source.trim(),
        source_citation: (data.source_citation || "").trim(),
        images: data.existingImages || [], // keep only those not removed in UI
      };

      const fd = new FormData();
      fd.append("payload", JSON.stringify({ place: cooked })); // compatible with your server
      for (const item of data.newImages) {
        // server accepts both "images" and "images[]"; here we use "images"
        fd.append("images", item.file, item.file.name);
      }

      const url = `${process.env.NEXT_PUBLIC_API_BASE}sightseeing/${normalizedId}?imagesReplace=false`;
      const res = await fetch(url, { method: "PUT", body: fd });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Request failed");
      }

      alert("Place updated successfully! ✅");
      router.push("/dashboard/Sightseeing");
    } catch (err: any) {
      console.error(err);
      alert(`An error occurred: ${err?.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  const title = data.name.trim() || "Edit Place";

  if (!storePlace || !storePlace.name) {
    return (
      <div className="min-h-[60vh] grid place-items-center p-6">
        <div className="max-w-md text-center">
          <h2 className="text-lg font-semibold text-gray-900">No place selected</h2>
          <p className="text-sm text-gray-600 mt-1">
            Open the Sightseeing list and click <span className="font-medium">Edit</span> on a place to continue.
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard/Sightseeing")}
            className="mt-4 inline-flex items-center px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
          >
            Go to Sightseeing
          </button>
        </div>
      </div>
    );
  }

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
                Edit Place — {title}
              </h1>
              <p className="text-[11px] text-gray-500 truncate">Update sightseeing place details</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setData({
                  ...BLANK_PLACE,
                  _id: normalizedId,
                  name: storePlace.name ?? "",
                  type: (storePlace.type ?? "") as PlaceType | "",
                  area: storePlace.area ?? "",
                  hours: storePlace.hours ?? "",
                  map_url: storePlace.map_url ?? "",
                  estimated_duration: storePlace.estimated_duration ?? "",
                  desc: storePlace.desc ?? "",
                  price: storePlace.price ?? "",
                  price_source: storePlace.price_source ?? "",
                  source_citation: storePlace.source_citation ?? "",
                  existingImages: Array.isArray(storePlace.images) ? storePlace.images : [],
                  newImages: [],
                })
              }
              disabled={submitting}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
                submitting
                  ? "border-gray-200 text-gray-400"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Reset to Loaded
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
                      i <= stepIndex ? true : STEPS.slice(0, i).every((st) => isStepValid(st.key));
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
              className={`h-full transition-all ${submitting ? "bg-emerald-400" : "bg-emerald-600"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto p-4 sm:p-6 pb-36">
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
                          const val = e.target.value as PlaceType | "__add__" | "";
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
                          submitting ? "bg-red-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 active:bg-red-800"
                        }`}
                        title="Cancel"
                        aria-label="Cancel add type"
                      >
                        <X className="size-5" />
                      </button>
                    </div>
                  )}
                  <p className="text-[11px] text-gray-500 mt-2">
                    Can’t find it? Choose <span className="font-medium">“Add a custom type…”</span>
                  </p>
                </Field>

                <Field label="Area *" required>
                  <input
                    type="text"
                    className="input"
                    value={data.area}
                    onChange={(e) => setPlace({ area: e.target.value })}
                    placeholder="City / Region (e.g., South Goa)"
                    disabled={submitting}
                  />
                </Field>
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
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Hours">
                  <div className="relative">
                    <input
                      type="text"
                      className="input pr-9"
                      value={data.hours}
                      onChange={(e) => setPlace({ hours: e.target.value })}
                      placeholder="e.g., 9 AM – 6 PM"
                      disabled={submitting}
                    />
                    <Clock className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </Field>

                <Field label="Estimated Duration">
                  <input
                    type="text"
                    className="input"
                    value={data.estimated_duration}
                    onChange={(e) => setPlace({ estimated_duration: e.target.value })}
                    placeholder="e.g., 1–2 hours"
                    disabled={submitting}
                  />
                </Field>

                <Field label="Google Maps URL" hint="Must start with http(s)://">
                  <div className="relative">
                    <input
                      type="url"
                      className={`input pr-9 ${isValidUrl(data.map_url) ? "" : "ring-2 ring-amber-300 w-full"}`}
                      value={data.map_url}
                      onChange={(e) => setPlace({ map_url: e.target.value })}
                      placeholder="https://maps.google.com/..."
                      disabled={submitting}
                    />
                    <Link2 className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </Field>
              </div>
            </div>
          </SectionCard>
        )}

        {step.key === "content" && (
          <SectionCard
            title="Content"
            subtitle="Describe the place and add pricing notes."
            icon={<MapPin className="size-5 text-emerald-600" />}
          >
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="grid grid-cols-1 gap-4">
                <Field label="Description" hint="Rich text supported">
                  <div className="rounded-xl border border-gray-300 bg-white shadow-sm">
                    <Editor
                      editorState={editorState}
                      onEditorStateChange={(next) => {
                        setEditorState(next);
                        const html = stateToHTML(next.getCurrentContent());
                        setPlace({ desc: html });
                      }}
                      placeholder="What makes this place special? Best time to visit, tips, etc."
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Price">
                    <div className="relative">
                      <input
                        type="text"
                        className="input pl-9"
                        value={data.price}
                        onChange={(e) => setPlace({ price: e.target.value })}
                        placeholder="e.g., ₹50 entry"
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
                      onChange={(e) => setPlace({ price_source: e.target.value })}
                      placeholder="e.g., Ticket counter (Oct 2025)"
                      disabled={submitting}
                    />
                  </Field>
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {step.key === "media" && (
          <SectionCard
            title="Images"
            subtitle="Manage existing images and upload new ones."
            icon={<ImageIcon className="size-5 text-emerald-600" />}
          >
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 sm:p-4">
              {(data.existingImages?.length || 0) > 0 && (
                <>
                  <h4 className="text-xs font-semibold text-emerald-900 mb-2">Existing</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                    {data.existingImages!.map((url, i) => (
                      <div
                        key={`ex-${i}`}
                        className="relative aspect-square rounded-xl overflow-hidden border-2 border-emerald-300 bg-white"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
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

              <h4 className="text-xs font-semibold text-emerald-900 mb-2">Add New Uploads</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {data.newImages.map((img, i) => (
                  <div
                    key={i}
                    className="relative aspect-square rounded-xl overflow-hidden border-2 border-emerald-400 bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.preview} alt={`New ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeNewImage(i)}
                      className="absolute top-1 right-1 size-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md active:scale-95"
                      title="Remove image"
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
                    <p className="mt-1 text-sm font-medium text-emerald-900">Add Images</p>
                    <p className="text-[11px] text-emerald-800/70">JPG/PNG/WebP</p>
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
                  className={`size-2 rounded-full ${isStepValid(step.key) ? "bg-green-500" : "bg-amber-500"}`}
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
                      {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                      {submitting ? "Updating..." : "Update Place"}
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
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .safe-bottom { padding-bottom: calc(env(safe-area-inset-bottom) + 0.5rem); }
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

/* ---------- Reusables (same as Add) ---------- */
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
          {requiredHint && (
            <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">* Required</span>
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