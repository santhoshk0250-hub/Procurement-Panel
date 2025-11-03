"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  FileVideo2,
  Languages,
  FileText,
  Star,
  X,
  Check, // ✅ for green save button
} from "lucide-react";
import { useReviewStore } from "@/store/usereviewStore";

/* =========================
   Types (aligned to schema + UI)
   ========================= */

type MongoId = string | { $oid: string };
const unwrapId = (id?: MongoId) => (typeof id === "string" ? id : id?.$oid ?? "");

interface VideoReviewUI {
  name: string;
  description: string;
  language: string;
  existingThumbnailUrl?: string | null;
  newThumbnail?: { file: File; preview: string } | null;
  existingVideoUrl?: string | null;
  newVideo?: { file: File; preview: string } | null;
}

const BLANK: VideoReviewUI = {
  name: "",
  description: "",
  language: "",
  existingThumbnailUrl: null,
  newThumbnail: null,
  existingVideoUrl: null,
  newVideo: null,
};

const STEPS = [
  { key: "details", label: "Details", icon: <FileText className="size-4" /> },
  { key: "media", label: "Media", icon: <ImageIcon className="size-4" /> },
] as const;

type StepKey = (typeof STEPS)[number]["key"];
const LAST_INDEX = STEPS.length - 1;

/* =========================
   Defaults for languages
   ========================= */
const DEFAULT_LANGS = [
  "Kannada",
  "Malayalam",
  "Telugu",
  "Tamil",
  "Hindi",
  "English",
];

/* =========================
   Page (store-only hydration)
   ========================= */

export default function EditReviewReelPage() {
  const router = useRouter();

  // ✅ only from store
  const storeReview = useReviewStore((r: any) => r.review);
  const clearStore = useReviewStore((r: any) => r.clearReview);

  const [data, setData] = useState<VideoReviewUI>({ ...BLANK });
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // file input refs
  const thumbRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLInputElement | null>(null);

  /* ---------- Dynamic languages (like Add page) ---------- */
  const addLangInputRef = useRef<HTMLInputElement | null>(null);
  const [addingLang, setAddingLang] = useState(false);
  const [newLang, setNewLang] = useState("");

  // Build initial language list = defaults + stored + current review language
  const [languages, setLanguages] = useState<string[]>(() => {
    try {
      const fromStorage = localStorage.getItem("reviewLanguages");
      const stored: string[] = fromStorage ? JSON.parse(fromStorage) : [];
      const current = (storeReview?.language ?? "").trim();
      const seed = Array.from(
        new Set([
          ...DEFAULT_LANGS,
          ...stored,
          ...(current ? [current] : []),
        ])
      ).sort((a, b) => a.localeCompare(b));
      return seed;
    } catch {
      const current = (storeReview?.language ?? "").trim();
      return Array.from(new Set([...DEFAULT_LANGS, ...(current ? [current] : [])])).sort((a, b) =>
        a.localeCompare(b)
      );
    }
  });

  useEffect(() => {
    if (addingLang) addLangInputRef.current?.focus();
  }, [addingLang]);

  const saveNewLanguage = () => {
    const value = newLang.trim();
    if (!value) return;
    const exists = languages.some((l) => l.toLowerCase() === value.toLowerCase());
    const next = exists ? languages : [...languages, value].sort((a, b) => a.localeCompare(b));
    setLanguages(next);
    setReview({ language: value });
    setNewLang("");
    setAddingLang(false);
    // persist for future add/edit pages
    try {
      localStorage.setItem("reviewLanguages", JSON.stringify(next));
    } catch {}
  };

  /* ---------- Hydrate strictly from store once ---------- */
  useEffect(() => {
    if (storeReview) {
      setData({
        name: storeReview.name || "",
        description: storeReview.description || "",
        language: storeReview.language || "",
        existingThumbnailUrl: storeReview.thumbnail || null,
        existingVideoUrl: storeReview.videoURL || null,
        newThumbnail: null,
        newVideo: null,
      });

      // ensure current language is present in dropdown if not already
      const current = (storeReview.language || "").trim();
      if (current && !languages.some((l) => l.toLowerCase() === current.toLowerCase())) {
        const next = [...languages, current].sort((a, b) => a.localeCompare(b));
        setLanguages(next);
        try {
          localStorage.setItem("reviewLanguages", JSON.stringify(next));
        } catch {}
      }
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeReview]);

  // Revoke previews on unmount
  useEffect(() => {
    return () => {
      if (data.newThumbnail?.preview) URL.revokeObjectURL(data.newThumbnail.preview);
      if (data.newVideo?.preview) URL.revokeObjectURL(data.newVideo.preview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- UI setters ---------- */
  const setReview = (next: Partial<VideoReviewUI>) => setData((p) => ({ ...p, ...next }));

  /* ---------- Media handlers ---------- */
  const handleThumbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setData((p) => {
      if (p.newThumbnail?.preview) URL.revokeObjectURL(p.newThumbnail.preview);
      const preview = URL.createObjectURL(f);
      return { ...p, newThumbnail: { file: f, preview }, existingThumbnailUrl: null };
    });
  };

  const clearThumb = () => {
    setData((p) => {
      if (p.newThumbnail?.preview) URL.revokeObjectURL(p.newThumbnail.preview);
      return { ...p, newThumbnail: null, existingThumbnailUrl: null };
    });
    if (thumbRef.current) thumbRef.current.value = "";
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setData((p) => {
      if (p.newVideo?.preview) URL.revokeObjectURL(p.newVideo.preview);
      const preview = URL.createObjectURL(f);
      return { ...p, newVideo: { file: f, preview }, existingVideoUrl: null };
    });
  };

  const clearVideo = () => {
    setData((p) => {
      if (p.newVideo?.preview) URL.revokeObjectURL(p.newVideo.preview);
      return { ...p, newVideo: null, existingVideoUrl: null };
    });
    if (videoRef.current) videoRef.current.value = "";
  };

  /* ---------- Validation & Stepper ---------- */
  const isDetailsValid = data.name.trim() && data.description.trim() && data.language.trim();

  const isStepValid = (k: StepKey) => (k === "details" ? !!isDetailsValid : true);
  const canGoNext = isStepValid(STEPS[stepIndex].key);
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

  /* ---------- Submit (PUT /reelreview/reviewreels/:id) ---------- */
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // 🚫 No URL ID — strictly read from store
    const finalId = unwrapId(storeReview?._id);
    if (!finalId) {
      alert("Missing review id. Please go back to the list and re-open Edit.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        name: data.name.trim(),
        description: data.description.trim(),
        language: data.language.trim(),
      };

      const fd = new FormData();
      fd.append("payload", JSON.stringify(payload));
      if (data.newThumbnail?.file)
        fd.append("thumbnail", data.newThumbnail.file, data.newThumbnail.file.name);
      if (data.newVideo?.file)
        fd.append("video", data.newVideo.file, data.newVideo.file.name);

      const url = `${process.env.NEXT_PUBLIC_API_BASE}reelreview/reviewreels/${encodeURIComponent(
        finalId
      )}`;
      const res = await fetch(url, { method: "PUT", body: fd });
      if (!res.ok) throw new Error((await res.text()) || "Update failed");

      alert("Review updated successfully ✅");
      try {
        clearStore(); // clear stale edit cache
      } catch {}
      router.push("/dashboard/review");
    } catch (err: any) {
      console.error(err);
      alert(`An error occurred: ${err?.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Render ---------- */
  const title = data.name?.trim() || "Edit Review";

  if (!hydrated) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="size-5 animate-spin" />
          <span>Loading…</span>
        </div>
      </div>
    );
  }

  if (!storeReview) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <p className="text-gray-700 font-medium">No review selected for editing.</p>
        <button
          className="mt-3 inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white"
          onClick={() => router.push("/dashboard/reviews")}
        >
          Go to Reviews
        </button>
      </div>
    );
  }

  return (
    <form className="min-h-screen bg-gray-50" onSubmit={handleSubmit}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-gray-200">
        <div className="px-4 py-3 sm:px-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-blue-600 text-white grid place-items-center text-sm font-bold shadow">
              {title[0]?.toUpperCase() || "R"}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-gray-900 truncate">
                Edit Review Reel — {title}
              </h1>
              <p className="text-[11px] text-gray-500 truncate">
                Update details and media for this review
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                // Reset to current store values
                setData({
                  name: storeReview?.name || "",
                  description: storeReview?.description || "",
                  language: storeReview?.language || "",
                  existingThumbnailUrl: storeReview?.thumbnail || null,
                  existingVideoUrl: storeReview?.videoURL || null,
                  newThumbnail: null,
                  newVideo: null,
                });
                if (thumbRef.current) thumbRef.current.value = "";
                if (videoRef.current) videoRef.current.value = "";
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

          {/* Stepper */}
          <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {STEPS.map((s, i) => {
              const active = i === stepIndex;
              const done = i < stepIndex;
              const canJump = i <= stepIndex || (i === 1 ? !!isDetailsValid : true);

              return (
                <button
                  key={s.key}
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
              className={`h-full transition-all ${submitting ? "bg-blue-400" : "bg-blue-600"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto p-4 sm:p-6 pb-36">
        {/* DETAILS */}
        {STEPS[stepIndex].key === "details" && (
          <SectionCard
            title="Review Details"
            subtitle="Edit required fields."
            icon={<FileText className="size-5 text-blue-600" />}
            requiredHint
          >
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Name *" required>
                  <input
                    type="text"
                    className="input"
                    value={data.name}
                    onChange={(e) => setReview({ name: e.target.value })}
                    placeholder="Reviewer name or title"
                    disabled={submitting}
                  />
                </Field>

                <Field label="Language *" required>
                  <div className="space-y-2">
                    {!addingLang ? (
                      <div className="relative">
                        <select
                          className="input pr-9"
                          value={data.language}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "__add__") {
                              setAddingLang(true);
                              return;
                            }
                            setReview({ language: val });
                          }}
                          disabled={submitting}
                        >
                          <option value="">Select language</option>
                          {languages.map((lang) => (
                            <option key={lang} value={lang}>
                              {lang}
                            </option>
                          ))}
                          <option value="__add__">➕ Add a language…</option>
                        </select>
                        <Languages className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      </div>
                    ) : (
                      <div className="flex items-stretch gap-2">
                        <input
                          ref={addLangInputRef}
                          type="text"
                          className="input flex-1"
                          placeholder="Type a new language (e.g., Marathi)"
                          value={newLang}
                          onChange={(e) => setNewLang(e.target.value)}
                          disabled={submitting}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              saveNewLanguage();
                            } else if (e.key === "Escape") {
                              setNewLang("");
                              setAddingLang(false);
                            }
                          }}
                        />
                        {/* Save (green check) */}
                        <button
                          type="button"
                          onClick={saveNewLanguage}
                          disabled={submitting || !newLang.trim()}
                          className={`size-10 grid place-items-center rounded-full text-white transition
                            ${
                              submitting || !newLang.trim()
                                ? "bg-green-300 cursor-not-allowed"
                                : "bg-green-600 hover:bg-green-700 active:bg-green-800"
                            }`}
                          title="Save language"
                          aria-label="Save language"
                        >
                          <Check className="size-5" />
                        </button>
                        {/* Cancel (red X) */}
                        <button
                          type="button"
                          onClick={() => {
                            setNewLang("");
                            setAddingLang(false);
                          }}
                          disabled={submitting}
                          className={`size-10 grid place-items-center rounded-full text-white transition
                            ${
                              submitting
                                ? "bg-red-300 cursor-not-allowed"
                                : "bg-red-600 hover:bg-red-700 active:bg-red-800"
                            }`}
                          title="Cancel"
                          aria-label="Cancel adding language"
                        >
                          <X className="size-5" />
                        </button>
                      </div>
                    )}
                    <p className="text-[11px] text-gray-500">
                      Can’t find it? Choose <span className="font-medium">“Add a language…”</span> to
                      add your own.
                    </p>
                  </div>
                </Field>

                <Field label="Short Description *" required className="sm:col-span-2">
                  <textarea
                    className="textarea w-full"
                    rows={3}
                    value={data.description}
                    onChange={(e) => setReview({ description: e.target.value })}
                    placeholder="What does the reviewer say?"
                    disabled={submitting}
                  />
                </Field>
              </div>
            </div>
          </SectionCard>
        )}

        {/* MEDIA */}
        {STEPS[stepIndex].key === "media" && (
          <SectionCard
            title="Media"
            subtitle="Replace the thumbnail or the video if needed."
            icon={<ImageIcon className="size-5 text-blue-600" />}
          >
            {/* Thumbnail */}
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Thumbnail</h3>
            <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50/50 p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="size-8 grid place-items-center bg-blue-100 rounded-lg">
                  <Star className="size-4 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-900">Primary Cover</p>
                  <p className="text-xs text-blue-800/80">Used as the cover image in listings.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {data.existingThumbnailUrl || data.newThumbnail ? (
                  <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-blue-400 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={data.newThumbnail?.preview || data.existingThumbnailUrl || ""}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                      decoding="async"
                      loading="lazy"
                    />
                    <button
                      type="button"
                      onClick={clearThumb}
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
                      <ImageIcon className="size-6 text-blue-400" />
                      <p className="mt-1 text-sm font-medium text-blue-900">Add Thumbnail</p>
                    </div>
                    <input
                      ref={thumbRef}
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

            {/* Video */}
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Video</h3>
            <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {data.existingVideoUrl || data.newVideo ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-gray-300 bg-black/5">
                    <video
                      src={data.newVideo?.preview || data.existingVideoUrl || ""}
                      className="w-full h-full object-contain bg-black"
                      controls
                    />
                    <button
                      type="button"
                      onClick={clearVideo}
                      className="absolute top-1 right-1 size-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md active:scale-95"
                      title="Remove video"
                      aria-label="Remove video"
                      disabled={submitting}
                    >
                      <X className="size-4" strokeWidth={3} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                      <p className="text-white text-[10px] font-medium inline-flex items-center gap-1">
                        <FileVideo2 className="size-3.5" /> VIDEO
                      </p>
                    </div>
                  </div>
                ) : (
                  <label className="block aspect-video">
                    <div className="flex flex-col items-center justify-center w-full h-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 transition-colors bg-white hover:bg-gray-50">
                      <FileVideo2 className="size-6 text-gray-400" />
                      <p className="mt-1 text-sm font-medium text-gray-700">Add Video</p>
                      <p className="text-[11px] text-gray-500">MP4/WebM recommended</p>
                    </div>
                    <input
                      ref={videoRef}
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      className="hidden"
                      disabled={submitting}
                    />
                  </label>
                )}
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
                    isStepValid(STEPS[stepIndex].key) ? "bg-green-500" : "bg-amber-500"
                  }`}
                />
                {isStepValid(STEPS[stepIndex].key) ? "Looks good" : "Complete required fields"}
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
                      {submitting ? "Updating..." : "Update Review"}
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
