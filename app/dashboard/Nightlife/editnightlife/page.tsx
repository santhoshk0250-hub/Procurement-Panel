"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  MapPin,
  FileText,
  Image as ImageIcon,
  ListChecks,
  Clock,
  IndianRupee,
  Plus,
  X,
} from "lucide-react";
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import { EditorState, ContentState, convertFromHTML } from "draft-js";
import { stateToHTML } from "draft-js-export-html";
import { Editor } from "react-draft-wysiwyg";

import { useNightlifeStore } from "@/store/usenightlifeStore";

/* =========================
   Types
   ========================= */
type NightVenueType =
  | "Bar & Club"
  | "Nightclub"
  | "Bar Street"
  | "Lounge"
  | "Pub"
  | (string & {});

type NightAmenity = { name: string; details?: string };
type Music = { name: string; details?: string };

interface NightlifeUI {
  name: string;
  type: NightVenueType | "";
  hours: string;
  estimated_duration: string;
  desc: string;
  price: string;
  price_source: string;
  age_restriction?: string;
  music_type: string[];
  amenities: NightAmenity[];
  existingImages?: string[];
  newImages: Array<{ file: File; preview: string }>;
  existingThumbnail?: string;
  newThumbnail?: { file: File; preview: string } | null;
  thumbRemoved?: boolean; // when true, block fallback to store thumbnail
}

/* =========================
   Presets
   ========================= */
const TYPE_PRESETS: NightVenueType[] = [
  "Bar & Club",
  "Nightclub",
  "Bar Street",
  "Lounge",
  "Pub",
];

/* ========= Coalescers ========= */
function hasOwn(obj: object | undefined | null, key: string) {
  return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * Thumbnail precedence (for **string** source, not preview):
 * - if local.thumbRemoved => ""
 * - else local.existingThumbnail (if non-empty)
 * - else storeData.thumbnail
 * - else storeData.existingThumbnail
 * - else ""
 */
function coalesceThumb(local: NightlifeUI, storeData: any) {
  if (local.thumbRemoved) return "";
  const localVal =
    hasOwn(local, "existingThumbnail") && (local.existingThumbnail || "");
  if (localVal) return localVal as string;
  if (storeData?.thumbnail) return storeData.thumbnail;
  if (storeData?.existingThumbnail) return storeData.existingThumbnail;
  return "";
}

/** Respect local existingImages when present (even empty); else server arrays */
function coalesceImages(local: NightlifeUI, storeData: any) {
  if (hasOwn(local, "existingImages") && Array.isArray(local.existingImages)) {
    return local.existingImages;
  }
  if (Array.isArray(storeData?.images)) return storeData.images;
  if (Array.isArray(storeData?.existingImages)) return storeData.existingImages;
  return [];
}

/* =========================
   Component
   ========================= */
export default function EditNightlifeMobile() {
  const router = useRouter();
  const search = useSearchParams();

  const {
    data: storeData,
    setData: setStoreData,
    editingId,
  } = useNightlifeStore() as any;

  const qpId = search.get("id") || undefined;
  const resolvedId: string | undefined =
    qpId || editingId || (storeData as any)?._id;

  // guard to only seed server images once
  const seededFromServerImages = useRef(false);

  // initial local state
  const [data, setData] = useState<NightlifeUI>(() => ({
    name: storeData?.name ?? "",
    type: (storeData?.type as NightVenueType) ?? "",
    hours: storeData?.hours ?? "",
    estimated_duration: storeData?.estimated_duration ?? "",
    desc: storeData?.desc ?? "",
    price: storeData?.price ?? "",
    price_source: storeData?.price_source ?? "",
    age_restriction: storeData?.age_restriction ?? "",
    music_type: storeData?.music_type ?? [],
    amenities: (storeData?.amenities || []).map((a: any) =>
      typeof a === "string" ? { name: a } : a
    ),
    existingThumbnail: storeData?.thumbnail ?? storeData?.existingThumbnail ?? "",
    existingImages: Array.isArray(storeData?.images) ? storeData.images : [],
    newThumbnail: null,
    newImages: [],
    thumbRemoved: false,
  }));

  const [amenities, setAmenities] = useState<NightAmenity[]>(
    (storeData?.amenities || []).map((a: any) =>
      typeof a === "string" ? { name: a } : a
    )
  );
  const [musics, setMusics] = useState<Music[]>(
    (storeData?.music_type || []).map((m: string) => ({ name: m }))
  );

  // sync from store (seed images once; keep local edits)
  useEffect(() => {
    if (!storeData) return;

    setData((prev) => {
      const shouldSeedFromImages =
        !seededFromServerImages.current &&
        Array.isArray(storeData.images) &&
        storeData.images.length > 0;

      const nextExistingImages = shouldSeedFromImages
        ? storeData.images
        : prev.existingImages ?? [];

      if (!seededFromServerImages.current && shouldSeedFromImages) {
        seededFromServerImages.current = true;
      }

      return {
        ...prev,
        name: storeData.name ?? prev.name,
        type: (storeData.type as NightVenueType) ?? prev.type,
        hours: storeData.hours ?? prev.hours,
        estimated_duration:
          storeData.estimated_duration ?? prev.estimated_duration,
        desc: storeData.desc ?? prev.desc,
        price: storeData.price ?? prev.price,
        price_source: storeData.price_source ?? prev.price_source,
        age_restriction: storeData.age_restriction ?? prev.age_restriction,
        music_type: storeData.music_type ?? prev.music_type,
        amenities: (storeData.amenities || prev.amenities || []).map(
          (a: any) => (typeof a === "string" ? { name: a } : a)
        ),
        // refresh server thumbnail only if user hasn't explicitly removed and local is empty
        existingThumbnail: prev.thumbRemoved
          ? ""
          : (prev.existingThumbnail ||
              storeData.thumbnail ||
              storeData.existingThumbnail ||
              ""),
        existingImages: nextExistingImages,
      };
    });

    setAmenities(
      (storeData.amenities || []).map((a: any) =>
        typeof a === "string" ? { name: a } : a
      )
    );
    setMusics((storeData.music_type || []).map((m: string) => ({ name: m })));
  }, [storeData]);

  // Editor hydration
  const [editorState, setEditorState] = useState<EditorState>(() =>
    EditorState.createEmpty()
  );
  useEffect(() => {
    const html = (storeData?.desc || "").trim();
    if (!html) return;
    const blocks = convertFromHTML(html);
    const content = ContentState.createFromBlockArray(
      blocks.contentBlocks,
      blocks.entityMap
    );
    setEditorState(EditorState.createWithContent(content));
  }, [storeData?.desc]);

  // revoke previews on unmount
  useEffect(() => {
    return () => {
      data.newImages.forEach(
        (i) => i.preview && URL.revokeObjectURL(i.preview)
      );
      if (data.newThumbnail?.preview)
        URL.revokeObjectURL(data.newThumbnail.preview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const imagesInputRef = useRef<HTMLInputElement | null>(null);
  const thumbInputRef = useRef<HTMLInputElement | null>(null);

  const [typeOptions, setTypeOptions] = useState<NightVenueType[]>(() => {
    const base = new Set(TYPE_PRESETS);
    if (storeData?.type) base.add(storeData.type);
    return Array.from(base);
  });
  const [showTypeInput, setShowTypeInput] = useState(false);
  const [newType, setNewType] = useState("");

  const [newAmenity, setNewAmenity] = useState("");
  const [showAmenityInput, setShowAmenityInput] = useState(false);

  const [newMusic, setNewMusic] = useState("");
  const [showMusicInput, setShowMusicInput] = useState(false);

  const setPlace = (next: Partial<NightlifeUI>) =>
    setData((p) => ({ ...p, ...next }));

  const title = data.name?.trim() || "Edit Nightlife Venue";

  /* ---------- Validation & Steps ---------- */
  const canContinueDetails =
    !!data.name?.trim() && !!String(data.type || "").trim();
  const STEPS = [
    { key: "details", label: "Details", icon: <FileText className="size-4" /> },
    { key: "meta", label: "Meta", icon: <ListChecks className="size-4" /> },
    { key: "content", label: "Content", icon: <MapPin className="size-4" /> },
    { key: "media", label: "Media", icon: <ImageIcon className="size-4" /> },
  ] as const;
  type StepKey = (typeof STEPS)[number]["key"];
  const LAST_INDEX = STEPS.length - 1;
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  const isStepValid = (k: StepKey) => (k === "details" ? canContinueDetails : true);
  const canGoNext = isStepValid(step.key);
  const [submitting, setSubmitting] = useState(false);

  /* ---------- UI helpers ---------- */
  const coalescedThumb = coalesceThumb(data, storeData);
  const gallery = coalesceImages(data, storeData);
  // ✅ DISPLAY PRIORITY: new upload preview first, else coalesced string
  const displayThumb = data.newThumbnail?.preview || coalescedThumb;

  /* ---------- Actions ---------- */
  const addType = () => {
    const t = newType.trim();
    if (!t) return;
    const exists = typeOptions.some(
      (opt) => opt.toLowerCase() === t.toLowerCase()
    );
    const nextList = exists ? typeOptions : [...typeOptions, t as NightVenueType];
    setTypeOptions(nextList);
    setPlace({ type: t as NightVenueType });
    setNewType("");
    setShowTypeInput(false);
  };

  const addAmenity = () => {
    if (!newAmenity.trim()) return;
    setAmenities((prev) => [...prev, { name: newAmenity.trim() }]);
    setNewAmenity("");
    setShowAmenityInput(false);
  };
  const removeAmenity = (idx: number) =>
    setAmenities((prev) => prev.filter((_, i) => i !== idx));

  const addMusic = () => {
    if (!newMusic.trim()) return;
    setMusics((prev) => [...prev, { name: newMusic.trim() }]);
    setNewMusic("");
    setShowMusicInput(false);
  };
  const removeMusic = (idx: number) =>
    setMusics((prev) => prev.filter((_, i) => i !== idx));

  const handleImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const toAdd = files.map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
    }));
    setPlace({ newImages: [...(data.newImages || []), ...toAdd] });
  };
  const removeNewImage = (idx: number) => {
    const item = data.newImages[idx];
    if (item?.preview) URL.revokeObjectURL(item.preview);
    setPlace({ newImages: data.newImages.filter((_, i) => i !== idx) });
  };

  // remove only from local existingImages
  const removeExistingImage = (idx: number) => {
    const current =
      data.existingImages ??
      (Array.isArray(storeData?.images) ? storeData.images : []);
    const next = current.filter((_, i) => i !== idx);
    setPlace({ existingImages: next });
  };

  const handleThumbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (data.newThumbnail?.preview)
      URL.revokeObjectURL(data.newThumbnail.preview);
    // clear any existing string so preview wins; also ensure we didn't mark removal
    setPlace({
      newThumbnail: { file: f, preview: URL.createObjectURL(f) },
      existingThumbnail: "",
      thumbRemoved: false,
    });
  };

  // remove new or existing thumbnail via a single action
  const removeThumb = () => {
    if (data.newThumbnail?.preview)
      URL.revokeObjectURL(data.newThumbnail.preview);
    setPlace({
      newThumbnail: null,
      existingThumbnail: "",
      thumbRemoved: true, // prevents fallback to store thumbnail
    });
  };

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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (stepIndex < LAST_INDEX) {
      if (isStepValid(step.key)) goNext();
      return;
    }
    if (!resolvedId) {
      alert("Missing venue id for update.");
      return;
    }

    try {
      setSubmitting(true);

      const descHtml = stateToHTML(editorState.getCurrentContent()).trim();

      const cooked: any = {
        name: data.name.trim(),
        type: data.type,
        hours: data.hours.trim(),
        estimated_duration: data.estimated_duration.trim(),
        desc: descHtml,
        price: data.price.trim(),
        price_source: data.price_source.trim(),
        age_restriction: (data.age_restriction || "").trim() || undefined,
        music_type: musics.map((m) => m.name),
        amenities: amenities.map((a) => a.name),
        // If a new thumbnail file is uploaded, send empty string so backend uses the file
        thumbnail: data.newThumbnail?.file ? "" : coalescedThumb,
        images: gallery,
      };

      const fd = new FormData();
      fd.append(
        "data",
        JSON.stringify({ place: cooked, updatedAt: new Date().toISOString() })
      );

      for (const item of data.newImages || []) {
        fd.append("images", item.file, item.file.name);
      }
      if (data.newThumbnail?.file) {
        fd.append("thumbnail", data.newThumbnail.file, data.newThumbnail.file.name);
      }

      const url = `${process.env.NEXT_PUBLIC_API_BASE}nightlife-places/update/${resolvedId}`;
      const res = await fetch(url, { method: "PATCH", body: fd });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Update failed");
      }

      // push updated state back to store
      setStoreData({
        ...data,
        desc: descHtml,
        music_type: musics.map((m: any) => m.name),
        amenities,
        // after successful upload, clear preview and trust server to return latest later
        existingThumbnail: coalescedThumb,
        existingImages: gallery,
        thumbnail: coalescedThumb,
        images: gallery,
        _id: resolvedId,
      });

      alert("Nightlife place updated successfully ✨");
      router.push("/dashboard/Nightlife");
    } catch (err: any) {
      console.error(err);
      alert(`An error occurred: ${err?.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <form className="min-h-screen bg-gray-50" onSubmit={handleSubmit}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-gray-200">
        <div className="px-4 py-3 sm:px-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-emerald-600 text-white grid place-items-center text-sm font-bold shadow">
              {(title || "N")[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-gray-900 truncate">
                Edit Nightlife — {title || "Untitled"}
              </h1>
              <p className="text-[11px] text-gray-500 truncate">
                Update existing nightlife venue
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                // Reset: seed from server again and clear the removal flag
                setData((prev) => ({
                  ...prev,
                  name: storeData?.name ?? "",
                  type: (storeData?.type as NightVenueType) ?? "",
                  hours: storeData?.hours ?? "",
                  estimated_duration: storeData?.estimated_duration ?? "",
                  desc: storeData?.desc ?? "",
                  price: storeData?.price ?? "",
                  price_source: storeData?.price_source ?? "",
                  age_restriction: storeData?.age_restriction ?? "",
                  music_type: storeData?.music_type ?? [],
                  amenities: (storeData?.amenities || []).map((a: any) =>
                    typeof a === "string" ? { name: a } : a
                  ),
                  existingThumbnail:
                    storeData?.thumbnail ?? storeData?.existingThumbnail ?? "",
                  existingImages: Array.isArray(storeData?.images)
                    ? storeData.images
                    : [],
                  newThumbnail: null,
                  newImages: [],
                  thumbRemoved: false,
                }));
                setAmenities(
                  (storeData?.amenities || []).map((a: any) =>
                    typeof a === "string" ? { name: a } : a
                  )
                );
                setMusics(
                  (storeData?.music_type || []).map((m: string) => ({
                    name: m,
                  }))
                );
                seededFromServerImages.current = true;
              }}
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

          {!resolvedId && (
            <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 px-3 py-2 text-xs">
              Unable to determine venue id to update. Open this page via the
              Dashboard “Edit” action or add{" "}
              <code className="mx-1 px-1 py-0.5 bg-white rounded border">
                ?id=&lt;venueId&gt;
              </code>{" "}
              to the URL.
            </div>
          )}

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
      <main className="max-w-3xl mx-auto p-4 sm:p-6 pb-40">
        {step.key === "details" && (
          <SectionCard
            title="Basic Details"
            subtitle="Core identity of the venue."
            icon={<FileText className="size-5 text-emerald-600" />}
            requiredHint
          >
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="grid grid-cols-1 gap-4">
                <Field label="Name *" required>
                  <input
                    type="text"
                    className="input"
                    value={data.name}
                    onChange={(e) => setPlace({ name: e.target.value })}
                    placeholder="Venue name (e.g., Tito's)"
                    disabled={submitting}
                  />
                </Field>

                <Field
                  label="Type *"
                  required
                  hint="Pick from presets or add your own"
                >
                  <div className="space-y-2">
                    <select
                      className="input"
                      value={data.type}
                      onChange={(e) =>
                        setPlace({ type: e.target.value as NightVenueType })
                      }
                      disabled={submitting}
                    >
                      <option value="" disabled>
                        Select type
                      </option>
                      {TYPE_PRESETS.concat(
                        storeData?.type && !TYPE_PRESETS.includes(storeData.type)
                          ? [storeData.type as NightVenueType]
                          : []
                      ).map((opt, i) => (
                        <option key={`${opt}-${i}`} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>

                    {/* add custom type */}
                    <div className="space-y-2">
                      {showTypeInput ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newType}
                            onChange={(e) => setNewType(e.target.value)}
                            placeholder="Custom type (e.g., Speakeasy)"
                            className="input"
                            disabled={submitting}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addType();
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={addType}
                            className="px-4 py-3 text-sm font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700"
                            disabled={submitting}
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowTypeInput(false);
                              setNewType("");
                            }}
                            className="px-4 py-3 text-sm font-medium rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
                            disabled={submitting}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowTypeInput(true)}
                          className="text-emerald-700 text-sm inline-flex items-center gap-1"
                          disabled={submitting}
                        >
                          <Plus className="size-4" /> Add custom type
                        </button>
                      )}
                    </div>
                  </div>
                </Field>
              </div>
            </div>
          </SectionCard>
        )}

        {step.key === "meta" && (
          <SectionCard
            title="Meta & Logistics"
            subtitle="Plan-friendly details."
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
                      placeholder="e.g., 7:00 PM – 2:00 AM"
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
                    onChange={(e) =>
                      setPlace({ estimated_duration: e.target.value })
                    }
                    placeholder="e.g., 3–4 hours"
                    disabled={submitting}
                  />
                </Field>

                <Field label="Age Restriction">
                  <input
                    type="text"
                    className="input"
                    value={data.age_restriction || ""}
                    onChange={(e) =>
                      setPlace({ age_restriction: e.target.value })
                    }
                    placeholder="e.g., 21+"
                    disabled={submitting}
                  />
                </Field>
              </div>
            </div>
          </SectionCard>
        )}

        {step.key === "content" && (
          <SectionCard
            title="Content & Pricing"
            subtitle="Describe the vibe and pricing."
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
                      placeholder="Music, crowd, best nights, entry tips, etc."
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
                  <Field label="Entry / Cover Price">
                    <div className="relative">
                      <input
                        type="text"
                        className="input pl-9"
                        value={data.price}
                        onChange={(e) => setPlace({ price: e.target.value })}
                        placeholder="e.g., Entry: ₹500–1000"
                        disabled={submitting}
                      />
                      <IndianRupee className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </Field>

                  <Field label="Price Source / Notes">
                    <input
                      type="text"
                      className="input"
                      value={data.price_source}
                      onChange={(e) =>
                        setPlace({ price_source: e.target.value })
                      }
                      placeholder="e.g., per person (Oct 2025)"
                      disabled={submitting}
                    />
                  </Field>
                </div>

                {/* Amenities */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-700 mb-4">
                    Nightlife Amenities
                  </h2>

                  <div className="flex flex-wrap gap-2 mb-4 rounded-lg p-4">
                    {amenities.map((amenity, idx) => (
                      <div
                        key={idx}
                        className="flex items-center border hover:bg-gray-100 transition-colors duration-200 px-4 py-2 rounded-lg cursor-pointer"
                      >
                        <span>{amenity.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAmenity(idx)}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          ❌
                        </button>
                      </div>
                    ))}
                  </div>

                  {showAmenityInput ? (
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        placeholder="New Amenity"
                        value={newAmenity}
                        onChange={(e) => setNewAmenity(e.target.value)}
                        className="w-64 rounded-lg border px-3 py-2"
                      />
                      <button
                        type="button"
                        onClick={addAmenity}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAmenityInput(true)}
                      className="text-blue-600 text-sm hover:underline"
                    >
                      + Add Amenity
                    </button>
                  )}
                </div>

                {/* Music */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-700 mb-4">
                    Music Types
                  </h2>

                  <div className="flex flex-wrap gap-2 mb-4 rounded-lg p-4">
                    {musics.map((m, idx) => (
                      <div
                        key={idx}
                        className="flex items-center border hover:bg-gray-100 transition-colors duration-200 px-4 py-2 rounded-lg cursor-pointer"
                      >
                        <span>{m.name}</span>
                        <button
                          type="button"
                          onClick={() => removeMusic(idx)}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          ❌
                        </button>
                      </div>
                    ))}
                  </div>

                  {showMusicInput ? (
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        placeholder="New Music"
                        value={newMusic}
                        onChange={(e) => setNewMusic(e.target.value)}
                        className="w-64 rounded-lg border px-3 py-2"
                      />
                      <button
                        type="button"
                        onClick={addMusic}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowMusicInput(true)}
                      className="text-blue-600 text-sm hover:underline"
                    >
                      + Add Music
                    </button>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {step.key === "media" && (
          <SectionCard
            title="Media"
            subtitle="Replace or add a thumbnail and gallery images."
            icon={<ImageIcon className="size-5 text-emerald-600" />}
          >
            <div className="space-y-6">
              {/* Thumbnail */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 sm:p-4">
                <h4 className="text-xs font-semibold text-emerald-900 mb-2">
                  Thumbnail
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 items-start">
                  {displayThumb ? (
                    <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-emerald-300 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={displayThumb}
                        alt="Thumbnail"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeThumb}
                        className="absolute top-1 right-1 size-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md active:scale-95"
                        title="Remove thumbnail"
                        aria-label="Remove thumbnail"
                        disabled={submitting}
                      >
                        <X className="size-4" strokeWidth={3} />
                      </button>
                    </div>
                  ) : (
                    <label className="block aspect-square">
                      <div className="flex flex-col items-center justify-center w-full h-full px-4 py-3 border-2 border-dashed border-emerald-300 rounded-xl cursor-pointer hover:border-emerald-500 transition-colors bg-white hover:bg-emerald-50">
                        <Plus className="size-6 text-emerald-500" />
                        <p className="mt-1 text-sm font-medium text-emerald-900">
                          Upload Thumbnail
                        </p>
                        <p className="text-[11px] text-emerald-800/70">
                          JPG/PNG/WebP
                        </p>
                      </div>
                      <input
                        ref={thumbInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleThumbUpload}
                        className="hidden"
                        disabled={submitting}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Gallery */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 sm:p-4">
                {(gallery.length || 0) > 0 && (
                  <>
                    <h4 className="text-xs font-semibold text-emerald-900 mb-2">
                      Existing Gallery
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                      {gallery.map((url, i) => (
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
                  Add New Images
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
            </div>
          </SectionCard>
        )}
      </main>

      {/* Sticky nav */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-gray-50/95 backdrop-blur safe-bottom pt-2">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-2">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-900/5">
            <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="inline-flex items-center gap-2 text-xs text-gray-600 bg-gray-100 rounded-full px-3 py-1.5 font-semibold self-start sm:self-auto">
                <span
                  className={`size-2 rounded-full ${
                    canGoNext ? "bg-green-500" : "bg-amber-500"
                  }`}
                />
                {canGoNext ? "Looks good" : "Complete required fields"}
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
                  disabled={!canGoNext || submitting || !resolvedId}
                  className={`flex-1 sm:flex-none px-5 py-3 text-sm font-semibold rounded-xl text-white ${
                    !canGoNext || submitting || !resolvedId
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
                      {submitting ? "Updating..." : "Update Venue"}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style jsx>{`
        .input {
          @apply w-full h-12 px-4 py-3 rounded-xl border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-[16px] leading-none placeholder:text-gray-400 transition-all;
          -webkit-tap-highlight-color: transparent;
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
