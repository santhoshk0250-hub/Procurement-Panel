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
  IndianRupee,
  Plus,
  X,
  Music2,
} from "lucide-react";

// Rich text editor deps
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import { EditorState, ContentState, convertFromHTML } from "draft-js";
import { stateToHTML } from "draft-js-export-html";
import { Editor } from "react-draft-wysiwyg";

/* =========================
   Types
   ========================= */

export type NightVenueType =
  | "Bar & Club"
  | "Nightclub"
  | "Bar Street"
  | "Lounge"
  | "Pub"
  | (string & {});

export type NightAmenity = {
  name: string;
  details?: string;
};
export type Music = {
  name: string;
  details?: string;
};

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

interface NightlifeUI {
  // Core
  name: string;
  type: NightVenueType | ""; // CHANGED: Nightlife-specific type with custom support

  // Optional meta
  hours: string;
  estimated_duration: string;

  // Content
  desc: string; // HTML
  price: string; // entry price text
  price_source: string; // e.g., per person / date

  // Nightlife-specific
  age_restriction?: string; // 18+, 21+
  music_type: string[]; // ["EDM", "Hip-Hop"]

  // Amenities (structured)
  amenities: NightAmenity[]; // [{ name: "Dance Floor", details?: "..." }]

  // Media handling (create/edit)
  existingImages?: string[]; // existing gallery URLs when editing
  newImages: Array<{ file: File; preview: string }>; // newly added gallery files

  existingThumbnail?: string; // existing thumbnail URL when editing
  newThumbnail?: { file: File; preview: string } | null; // single file
}

/* =========================
   Helpers
   ========================= */

const MUSIC_PRESETS = ["EDM", "Hip-Hop", "Bollywood", "House", "Techno", "Live"];
const AMENITY_PRESETS = [
  "Dance Floor",
  "Live Music",
  "Pool",
  "VIP Section",
  "Rooftop",
  "Smoking Area",
  "Beachside",
  "Parking",
];

const TYPE_PRESETS: NightVenueType[] = [
  "Bar & Club",
  "Nightclub",
  "Bar Street",
  "Lounge",
  "Pub",
];

const BLANK: NightlifeUI = {
  name: "",
  type: "",
  hours: "",
  estimated_duration: "",
  desc: "",
  price: "",
  price_source: "",
  age_restriction: "",
  music_type: [],
  amenities: [], // structured
  existingImages: [],
  newImages: [],
  existingThumbnail: "",
  newThumbnail: null,
};

const STEPS = [
  { key: "details", label: "Details", icon: <FileText className="size-4" /> },
  { key: "meta", label: "Meta", icon: <ListChecks className="size-4" /> },
  { key: "content", label: "Content", icon: <MapPin className="size-4" /> },
  { key: "media", label: "Media", icon: <ImageIcon className="size-4" /> },
] as const;

type StepKey = (typeof STEPS)[number]["key"];
const LAST_INDEX = STEPS.length - 1;

const initialForm: NightlifeUI = { ...BLANK };

/* =========================
   Component
   ========================= */

export default function AddNightlifeMobile() {
  const router = useRouter();
  const [data, setData] = useState<NightlifeUI>(initialForm);
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // file input refs
  const imagesInputRef = useRef<HTMLInputElement | null>(null);
  const thumbInputRef = useRef<HTMLInputElement | null>(null);

  // Local UI state for adding a single amenity
  const [newAmenity, setNewAmenity] = useState("");
  const [newmusic, setNewMusics] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [showInputmusic, setShowInputmusic] = useState(false);

  // Type dropdown with custom add
  const [typeOptions, setTypeOptions] = useState<NightVenueType[]>(TYPE_PRESETS);
  const [showTypeInput, setShowTypeInput] = useState(false);
  const [newType, setNewType] = useState("");

  const step = STEPS[stepIndex];

  // Rich text editor state for desc
  const [editorState, setEditorState] = useState<EditorState>(() => EditorState.createEmpty());

  // hydrate editor if editing existing HTML
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
      if (data.newThumbnail?.preview) URL.revokeObjectURL(data.newThumbnail.preview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setPlace = (next: Partial<NightlifeUI>) => setData((p) => ({ ...p, ...next }));

  const canContinueDetails = useMemo(() => !!data.name.trim() && !!String(data.type).trim(), [data.name, data.type]);

  // meta step currently has no required fields
  const canContinueMeta = true;

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

  /* ---------- Thumbnail handling ---------- */
  const handleThumbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (data.newThumbnail?.preview) URL.revokeObjectURL(data.newThumbnail.preview);
    setPlace({ newThumbnail: { file: f, preview: URL.createObjectURL(f) } });
  };
  const removeThumb = () => {
    if (data.newThumbnail?.preview) URL.revokeObjectURL(data.newThumbnail.preview);
    setPlace({ newThumbnail: null });
  };

  /* ---------- Amenities helpers (structured) ---------- */

  const addAmenity = () => {
    if (newAmenity.trim() !== "") {
      setAmenities([...amenities, { name: newAmenity.trim() }]);
      setNewAmenity("");
      setShowInput(false);
    }
  };

  const removeAmenity = (index: number) => {
    const updated = [...amenities];
    updated.splice(index, 1);
    setAmenities(updated);
  };

  const [amenities, setAmenities] = useState<NightAmenity[]>([
    { name: "Rooftop Bar" },
    { name: "Sports Bar" },
    { name: "Live Music" },
    { name: "Cocktail Lounge" },
  ]);

  const addMusic = () => {
    if (newmusic.trim() !== "") {
      setmusic([...musics, { name: newmusic.trim() }]);
      setNewMusics("");
      setShowInputmusic(false);
    }
  };

  const removeMusic = (index: number) => {
    const updated = [...musics];
    updated.splice(index, 1);
    setmusic(updated);
  };

  const [musics, setmusic] = useState<Music[]>([
    { name: "EDM" },
    { name: "Hip-Hop" },
    { name: "Bollywood" },
    { name: "Techno" },
    { name: "Live" },
  ]);

  // ---- Type helpers ----
  const addType = () => {
    const t = newType.trim();
    if (!t) return;
    // prevent duplicates (case-insensitive)
    const exists = typeOptions.some((opt) => opt.toLowerCase() === t.toLowerCase());
    const nextList = exists ? typeOptions : [...typeOptions, t as NightVenueType];
    setTypeOptions(nextList);
    setPlace({ type: t as NightVenueType });
    setNewType("");
    setShowTypeInput(false);
  };

  /* ---------- Submit: send JSON + files ---------- */
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (stepIndex < LAST_INDEX) {
      if (isStepValid(step.key)) goNext();
      return;
    }

    try {
      setSubmitting(true);

      // ensure desc is current HTML
      const descHtml = stateToHTML(editorState.getCurrentContent()).trim();

      // Build payload matching server expectations
      const cooked: any = {
        name: data.name.trim(),
        type: data.type, // include type
        hours: data.hours.trim(),
        estimated_duration: data.estimated_duration.trim(),
        desc: descHtml,
        price: data.price.trim(),
        price_source: data.price_source.trim(),
        age_restriction: (data.age_restriction || "").trim() || undefined,
        music_type: musics.map((m) => m.name),
        amenities: amenities.map((a) => a.name),
        thumbnail: data.existingThumbnail || "",
        images: data.existingImages || [],
      };

      const fd = new FormData();
      fd.append("data", JSON.stringify({ place: cooked, createdAt: new Date().toISOString() }));

      // append gallery files
      for (const item of data.newImages) fd.append("images", item.file, item.file.name);
      // append thumbnail file
      if (data.newThumbnail?.file) fd.append("thumbnail", data.newThumbnail.file, data.newThumbnail.file.name);

      const url = `${process.env.NEXT_PUBLIC_API_BASE}nightlife-places`;
      const res = await fetch(url, { method: "POST", body: fd });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Request failed");
      }

      alert("Nightlife place created successfully! 🎉");
      router.push("/dashboard/Nightlife");
    } catch (err: any) {
      console.error(err);
      alert(`An error occurred: ${err?.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  const title = data.name.trim() || "New Nightlife Venue";

  return (
    <form className="min-h-screen bg-gray-50" onSubmit={handleSubmit}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-gray-200">
        <div className="px-4 py-3 sm:px-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-blue-600 text-white grid place-items-center text-sm font-bold shadow">
              {title[0]?.toUpperCase() || "N"}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-gray-900 truncate">Add Nightlife — {title}</h1>
              <p className="text-[11px] text-gray-500 truncate">Create a nightlife venue</p>
            </div>
            <button
              type="button"
              onClick={() => setData(initialForm)}
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
                    const allPrevValid = i <= stepIndex ? true : STEPS.slice(0, i).every((st) => isStepValid(st.key));
                    if (allPrevValid) setStepIndex(i);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs whitespace-nowrap ${
                    active
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : done
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "bg-white border-gray-200 text-gray-700"
                  }`}
                  disabled={submitting}
                >
                  <span className="grid place-items-center">{done ? <CheckCircle2 className="size-4" /> : s.icon}</span>
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Progress */}
          <div className="mt-3 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${submitting ? "bg-blue-400" : "bg-blue-600"}`}
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
            subtitle="Required fields for a nightlife venue."
            icon={<FileText className="size-5 text-blue-600" />}
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

                {/* Type with dropdown + custom add */}
                <Field label="Type *" required hint="Pick from presets or add your own">
                  <div className="space-y-2">
                    <select
                      className="input"
                      value={data.type}
                      onChange={(e) => setPlace({ type: e.target.value as NightVenueType })}
                      disabled={submitting}
                    >
                      <option value="" disabled>
                        Select type
                      </option>
                      {typeOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>

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
                          className="px-4 py-3 text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700"
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
                        className="text-blue-700 text-sm inline-flex items-center gap-1"
                        disabled={submitting}
                      >
                        <Plus className="size-4" /> Add custom type
                      </button>
                    )}
                  </div>
                </Field>
              </div>
            </div>
          </SectionCard>
        )}

        {step.key === "meta" && (
          <SectionCard title="Meta & Logistics" subtitle="Plan-friendly details." icon={<ListChecks className="size-5 text-blue-600" />}>
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
                    onChange={(e) => setPlace({ estimated_duration: e.target.value })}
                    placeholder="e.g., 3–4 hours"
                    disabled={submitting}
                  />
                </Field>

                <Field label="Age Restriction">
                  <div className="relative">
                    <input
                      type="text"
                      className="input pr-9"
                      value={data.age_restriction || ""}
                      onChange={(e) => setPlace({ age_restriction: e.target.value })}
                      placeholder="e.g., 21+"
                      disabled={submitting}
                    />
                  </div>
                </Field>
              </div>
            </div>
          </SectionCard>
        )}

        {step.key === "content" && (
          <SectionCard
            title="Content & Pricing"
            subtitle="Describe the vibe and add pricing notes."
            icon={<MapPin className="size-5 text-blue-600" />}
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
                      onChange={(e) => setPlace({ price_source: e.target.value })}
                      placeholder="e.g., per person (Oct 2025)"
                      disabled={submitting}
                    />
                  </Field>
                </div>

                {/* Amenities (structured) */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-700 mb-4">Nightlife Amenities</h2>

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

                  {showInput ? (
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
                      onClick={() => setShowInput(true)}
                      className="text-blue-600 text-sm hover:underline"
                    >
                      + Add Amenity
                    </button>
                  )}
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-gray-700 mb-4">Music Types</h2>

                  <div className="flex flex-wrap gap-2 mb-4 rounded-lg p-4">
                    {musics.map((music, idx) => (
                      <div
                        key={idx}
                        className="flex items-center border hover:bg-gray-100 transition-colors duration-200 px-4 py-2 rounded-lg cursor-pointer"
                      >
                        <span>{music.name}</span>
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

                  {showInputmusic ? (
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        placeholder="New Music"
                        value={newmusic}
                        onChange={(e) => setNewMusics(e.target.value)}
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
                      onClick={() => setShowInputmusic(true)}
                      className="text-blue-600 text-sm hover:underline"
                    >
                      + Add Music
                    </button>
                  )}
                </div>

                {/* NOTE: Removed the old string-based Amenities ChipEditor to avoid conflicts */}
              </div>
            </div>
          </SectionCard>
        )}

        {step.key === "media" && (
          <SectionCard title="Media" subtitle="Upload a thumbnail and gallery images." icon={<ImageIcon className="size-5 text-blue-600" />}>
            <div className="space-y-6">
              {/* Thumbnail */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 sm:p-4">
                <h4 className="text-xs font-semibold text-blue-900 mb-2">Thumbnail</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 items-start">
                  {data.existingThumbnail ? (
                    <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-blue-300 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={data.existingThumbnail} alt="Existing thumbnail" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPlace({ existingThumbnail: "" })}
                        className="absolute top-1 right-1 size-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md active:scale-95"
                        title="Remove thumbnail"
                        aria-label="Remove existing thumbnail"
                        disabled={submitting}
                      >
                        <X className="size-4" strokeWidth={3} />
                      </button>
                    </div>
                  ) : data.newThumbnail ? (
                    <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-blue-400 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={data.newThumbnail.preview} alt="New thumbnail" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={removeThumb}
                        className="absolute top-1 right-1 size-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md active:scale-95"
                        title="Remove new thumbnail"
                        aria-label="Remove new thumbnail"
                        disabled={submitting}
                      >
                        <X className="size-4" strokeWidth={3} />
                      </button>
                    </div>
                  ) : (
                    <label className="block aspect-square">
                      <div className="flex flex-col items-center justify-center w-full h-full px-4 py-3 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer hover:border-blue-500 transition-colors bg-white hover:bg-blue-50">
                        <Plus className="size-6 text-blue-500" />
                        <p className="mt-1 text-sm font-medium text-blue-900">Add Thumbnail</p>
                        <p className="text-[11px] text-blue-800/70">JPG/PNG/WebP</p>
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
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 sm:p-4">
                {(data.existingImages?.length || 0) > 0 && (
                  <>
                    <h4 className="text-xs font-semibold text-blue-900 mb-2">Existing Gallery</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                      {data.existingImages!.map((url, i) => (
                        <div key={`ex-${i}`} className="relative aspect-square rounded-xl overflow-hidden border-2 border-blue-300 bg-white">
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

                <h4 className="text-xs font-semibold text-blue-900 mb-2">New Uploads</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {data.newImages.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-blue-400 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.preview} alt={`New ${i + 1}`} className="w-full h-full object-cover" />
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
                    <div className="flex flex-col items-center justify-center w-full h-full px-4 py-3 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer hover:border-blue-500 transition-colors bg-white hover:bg-blue-50">
                      <Plus className="size-6 text-blue-500" />
                      <p className="mt-1 text-sm font-medium text-blue-900">Add Images</p>
                      <p className="text-[11px] text-blue-800/70">JPG/PNG/WebP</p>
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

      {/* Sticky step navigation */}
     <div className="fixed bottom-0 right-0 left-0 lg:left-64 z-40 bg-gray-50/95 backdrop-blur safe-bottom pt-2">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-2">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-900/5">
            <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="inline-flex items-center gap-2 text-xs text-gray-600 bg-gray-100 rounded-full px-3 py-1.5 font-semibold self-start sm:self-auto">
                <span className={`size-2 rounded-full ${isStepValid(step.key) ? "bg-blue-500" : "bg-amber-500"}`} />
                {isStepValid(step.key) ? "Looks good" : "Complete required fields"}
              </span>

              <div className="flex w-full sm:w-auto gap-2 sm:ml-auto">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={stepIndex === 0 || submitting}
                  className={`flex-1 sm:flex-none px-4 py-3 text-sm font-medium rounded-xl border ${
                    stepIndex === 0 || submitting ? "border-gray-200 text-gray-400" : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canGoNext || submitting}
                  className={`flex-1 sm:flex-none px-5 py-3 text-sm font-semibold rounded-xl text-white ${
                    !canGoNext || submitting ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                  }`}
                  aria-busy={submitting ? "true" : "false"}
                >
                  {stepIndex < LAST_INDEX ? (
                    "Continue"
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                      {submitting ? "Creating..." : "Create Venue"}
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
          @apply w-full h-12 px-4 py-3 rounded-xl border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-[16px] leading-none placeholder:text-gray-400 transition-all;
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
            <div className="size-8 grid place-items-center bg-blue-50 rounded-lg">{icon}</div>
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

function ChipEditor({
  values,
  onAdd,
  onRemove,
  placeholder,
  icon,
  disabled,
}: {
  values: string[];
  onAdd: (v: string) => void;
  onRemove: (idx: number) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}) {
  const [val, setVal] = useState("");
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {values.map((v, i) => (
          <span key={`${v}-${i}`} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-full bg-gray-100 border border-gray-300">
            {icon}
            <span>{v}</span>
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="ml-1 rounded-full p-0.5 hover:bg-gray-200"
              aria-label={`Remove ${v}`}
              disabled={disabled}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        className="input"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (val.trim()) {
              onAdd(val.trim());
              setVal("");
            }
          }
        }}
        placeholder={placeholder || "Type and press Enter"}
        disabled={disabled}
      />
    </div>
  );
}
