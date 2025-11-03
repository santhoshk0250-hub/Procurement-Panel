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
  Check, 
} from "lucide-react";

/* =========================
   Types matching your Mongoose schema
   ========================= */

interface VideoReviewUI {
  name: string;
  description: string;
  language: string;
  /** Media handling for create/edit */
  existingThumbnailUrl?: string | null;
  newThumbnail?: { file: File; preview: string } | null;
  existingVideoUrl?: string | null; // hydrate in edit mode if you already have a url
  newVideo?: { file: File; preview: string } | null; // client upload replaces URL field
}

interface ReviewsFormData {
  review: VideoReviewUI[]; // keep array to align with schema, but UI limits to 1 item
}

/* =========================
   Helpers
   ========================= */

const BLANK_REVIEW: VideoReviewUI = {
  name: "",
  description: "",
  language: "",
  existingThumbnailUrl: null,
  newThumbnail: null,
  existingVideoUrl: null,
  newVideo: null,
};

const initialForm: ReviewsFormData = {
  review: [{ ...BLANK_REVIEW }],
};

const STEPS = [
  { key: "details", label: "Details", icon: <FileText className="size-4" /> },
  { key: "media", label: "Media", icon: <ImageIcon className="size-4" /> },
] as const;

type StepKey = (typeof STEPS)[number]["key"];
const LAST_INDEX = STEPS.length - 1;

/* =========================
   Component
   ========================= */

export default function AddReviewReelsMobile() {
  const router = useRouter();
  const [data, setData] = useState<ReviewsFormData>(initialForm);
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const step = STEPS[stepIndex];

  // file inputs mapped per-item using refs array (single item UI)
  const thumbRefs = useRef<Array<HTMLInputElement | null>>([]);
  const videoRefs = useRef<Array<HTMLInputElement | null>>([]);

  // ===== Language management state =====
  const [languages, setLanguages] = useState<string[]>([
    "Kannada",
    "Malayalam",
    "Telugu",
    "Tamil",
    "Hindi",
    "English", // added
  ]);
  const [addingLang, setAddingLang] = useState(false);
  const [newLang, setNewLang] = useState("");
  const addLangInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (addingLang) addLangInputRef.current?.focus();
  }, [addingLang]);

  const saveNewLanguage = () => {
    const value = newLang.trim();
    if (!value) return;
    const exists = languages.some((l) => l.toLowerCase() === value.toLowerCase());
    const next = exists ? languages : [...languages, value].sort((a, b) => a.localeCompare(b));
    setLanguages(next);
    setReview(0, { language: value });
    setNewLang("");
    setAddingLang(false);
  };

  // revoke previews on unmount
  useEffect(() => {
    return () => {
      data.review.forEach((r) => {
        if (r.newThumbnail?.preview) URL.revokeObjectURL(r.newThumbnail.preview);
        if (r.newVideo?.preview) URL.revokeObjectURL(r.newVideo.preview);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setReview = (idx: number, next: Partial<VideoReviewUI>) =>
    setData((p) => {
      const arr = [...p.review];
      arr[idx] = { ...arr[idx], ...next };
      return { review: arr };
    });

  const handleThumbUpload = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setData((p) => {
      const arr = [...p.review];
      const prev = arr[idx]?.newThumbnail?.preview;
      if (prev) URL.revokeObjectURL(prev);
      const preview = URL.createObjectURL(f);
      arr[idx] = { ...arr[idx], newThumbnail: { file: f, preview }, existingThumbnailUrl: null };
      return { review: arr };
    });
  };

  const clearThumb = (idx: number) => {
    setData((p) => {
      const arr = [...p.review];
      const prev = arr[idx]?.newThumbnail?.preview;
      if (prev) URL.revokeObjectURL(prev);
      arr[idx] = { ...arr[idx], newThumbnail: null, existingThumbnailUrl: null };
      return { review: arr };
    });
    const input = thumbRefs.current[idx];
    if (input) input.value = "";
  };

  const handleVideoUpload = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setData((p) => {
      const arr = [...p.review];
      const prev = arr[idx]?.newVideo?.preview;
      if (prev) URL.revokeObjectURL(prev);
      const preview = URL.createObjectURL(f);
      arr[idx] = { ...arr[idx], newVideo: { file: f, preview }, existingVideoUrl: null };
      return { review: arr };
    });
  };

  const clearVideo = (idx: number) => {
    setData((p) => {
      const arr = [...p.review];
      const prev = arr[idx]?.newVideo?.preview;
      if (prev) URL.revokeObjectURL(prev);
      arr[idx] = { ...arr[idx], newVideo: null, existingVideoUrl: null };
      return { review: arr };
    });
    const input = videoRefs.current[idx];
    if (input) input.value = "";
  };

  const canContinueDetails = data.review.every(
    (r) => r.name.trim() && r.description.trim() && r.language.trim()
  );

  const isStepValid = (k: StepKey) => {
    switch (k) {
      case "details":
        return canContinueDetails;
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

  /* ---------- Submit: send JSON + files in one go ---------- */
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (stepIndex < LAST_INDEX) {
      if (isStepValid(step.key)) goNext();
      return;
    }

    try {
      setSubmitting(true);

      // Only one review item UI; keep array for API compatibility
      const r = data.review[0];
      const cooked = [{
        name: r.name.trim(),
        description: r.description.trim(),
        language: r.language.trim(),
        // server should persist final URLs for both thumbnail & video
        thumbnail: r.existingThumbnailUrl || "",
        videoURL: r.existingVideoUrl || "",
      }];

      const fd = new FormData();
      fd.append(
        "payload",
        JSON.stringify({ review: cooked, createdAt: new Date().toISOString() })
      );

      if (r.newThumbnail?.file) {
        fd.append("thumbnail", r.newThumbnail.file, r.newThumbnail.file.name);
      }
      if (r.newVideo?.file) {
        fd.append("video", r.newVideo.file, r.newVideo.file.name);
      }

      const url = `${process.env.NEXT_PUBLIC_API_BASE}reelreview/create`;
      const res = await fetch(url, { method: "POST", body: fd });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Request failed");
      }

      alert("Review reel created successfully! 🎉");
      router.push("/dashboard/review");
    } catch (err: any) {
      console.error(err);
      alert(`An error occurred: ${err?.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  const title = data.review[0]?.name?.trim() || "New Review";

  return (
    <form className="min-h-screen bg-gray-50" onSubmit={handleSubmit}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-gray-200">
        <div className="px-4 py-3 sm:px-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-blue-600 text-white grid place-items-center text-sm font-bold shadow">
              {(title[0]?.toUpperCase() || "R")}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-gray-900 truncate">
                Add Review Reel — {title}
              </h1>
              <p className="text-[11px] text-gray-500 truncate">Create a single video review</p>
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
                    const allPrevValid = i <= stepIndex
                      ? true
                      : STEPS.slice(0, i).every((st) => isStepValid(st.key));
                    if (allPrevValid) setStepIndex(i);
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
            <div
              className={`h-full transition-all ${submitting ? "bg-blue-400" : "bg-blue-600"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto p-4 sm:p-6 pb-36">
        {step.key === "details" && (
          <SectionCard
            title="Review Details"
            subtitle="Fill the required fields."
            icon={<FileText className="size-5 text-blue-600" />}
            requiredHint
          >
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Name *" required>
                  <input
                    type="text"
                    className="input"
                    value={data.review[0].name}
                    onChange={(e) => setReview(0, { name: e.target.value })}
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
                          value={data.review[0].language}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "__add__") {
                              setAddingLang(true);
                              return;
                            }
                            setReview(0, { language: val });
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
                          ${submitting || !newLang.trim()
                            ? "bg-green-300 cursor-not-allowed"
                            : "bg-green-600 hover:bg-green-700 active:bg-green-800"}`}
                        title="Save language"
                        aria-label="Save language"
                      >
                        <Check className="size-5" />
                      </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewLang("");
                          setAddingLang(false);
                        }}
                        disabled={submitting}
                        className={`size-10 grid place-items-center rounded-full text-white transition
                          ${submitting
                            ? "bg-red-300 cursor-not-allowed"
                            : "bg-red-600 hover:bg-red-700 active:bg-red-800"}`}
                        title="Cancel"
                        aria-label="Cancel adding language"
                      >
                        <X className="size-5" />
                      </button>
                      </div>
                    )}
                    <p className="text-[11px] text-gray-500">
                      Can’t find it? Choose <span className="font-medium">“Add a language…”</span> to add your own.
                    </p>
                  </div>
                </Field>

                {/* Description */}
                <Field label="Short Description *" required className="sm:col-span-2">
                  <textarea
                    className="textarea w-full"
                    rows={3}
                    value={data.review[0].description}
                    onChange={(e) => setReview(0, { description: e.target.value })}
                    placeholder="What does the reviewer say?"
                    disabled={submitting}
                  />
                </Field>
              </div>
            </div>
          </SectionCard>
        )}

        {step.key === "media" && (
          <SectionCard
            title="Media"
            subtitle="Upload a thumbnail and a video for this review."
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
                  <p className="text-xs text-blue-800/80">Used as the cover image in listings.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {(data.review[0].existingThumbnailUrl || data.review[0].newThumbnail) ? (
                  <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-blue-400 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={data.review[0].newThumbnail?.preview || data.review[0].existingThumbnailUrl || ""}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                      decoding="async"
                      loading="lazy"
                    />
                    <button
                      type="button"
                      onClick={() => clearThumb(0)}
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
                      ref={(el) => { thumbRefs.current[0] = el; }}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleThumbUpload(0, e)}
                      className="hidden"
                      disabled={submitting}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Video */}
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Video (single)</h3>
            <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {(data.review[0].existingVideoUrl || data.review[0].newVideo) ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-gray-300 bg-black/5">
                    <video
                      src={data.review[0].newVideo?.preview || data.review[0].existingVideoUrl || ""}
                      className="w-full h-full object-contain bg-black"
                      controls
                    />
                    <button
                      type="button"
                      onClick={() => clearVideo(0)}
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
                      ref={(el) => { videoRefs.current[0] = el; }}
                      type="file"
                      accept="video/*"
                      onChange={(e) => handleVideoUpload(0, e)}
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
                      {submitting ? "Creating..." : "Create Review"}
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
        .textarea {
          @apply w-full min-h-[112px] px-4 py-3 rounded-xl border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-[16px] placeholder:text-gray-400 transition-all resize-y;
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