"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  FileText,
  Image as ImageIcon,
  ListChecks,
  Clock,
  IndianRupee,
  Plus,
  X,
  Languages,
  Users,
} from "lucide-react";

// Rich text editor deps
import TinyMCETextEditor from "@/components/TinyMCETextEditor";
import { useTourManagerStore } from "@/store/tourmanagerStore";

/* =========================
   Types for Tour Manager / Guide UI
   ========================= */

interface GalleryItemUI {
  tag: string;
  file: File | null;
  preview?: string;
  /** Original image URL from API if any (so we can keep it on update) */
  existingUrl?: string;
}

interface LanguagePairUI {
  primary: string;
  secondary: string;
}

interface OperationStepUI {
  time: string;
  title: string;
  description: string; // HTML
}

interface TourProfileUI {
  name: string;
  experience: string;
  description: string; // HTML
  file: File | null;
  preview?: string;
  /** Original profilePic/profilePicUrl from API if any */
  existingPicUrl?: string;
}

interface PriceUI {
  basePrice: string;
  serviceCharges: string;
  taxes: string;
  totalPrice: string;
  priceNote: string;
}

interface TimingsUI {
  from: string;
  to: string;
}

type RoleType = "tour-manager" | "tour-guide" | "";

// Main UI state
interface TourManagerUI {
  roleType: RoleType; // UI only (maps to slug)

  title: string;
  shortDescription: string; // maps to "description" (rich HTML)
  generalInfoHtml: string; // maps to "general_info" (rich HTML)

  languages: LanguagePairUI[];

  price: PriceUI;

  timings: TimingsUI;

  operationProcess: OperationStepUI[];

  inclusions: string[];
  exclusions: string[];

  gallery: GalleryItemUI[];
  profiles: TourProfileUI[];
}

const BLANK_PRICE: PriceUI = {
  basePrice: "",
  serviceCharges: "",
  taxes: "",
  totalPrice: "",
  priceNote: "",
};

const BLANK_TIMINGS: TimingsUI = {
  from: "",
  to: "",
};

const BLANK_TOUR: TourManagerUI = {
  roleType: "",
  title: "",
  shortDescription: "",
  generalInfoHtml: "",
  languages: [{ primary: "Hindi", secondary: "English" }],
  price: { ...BLANK_PRICE },
  timings: { ...BLANK_TIMINGS },
  operationProcess: [
    { time: "Before Tour Start", title: "Meet Your Tour Manager", description: "" },
  ],
  inclusions: [],
  exclusions: [],
  gallery: [{ tag: "beach", file: null }],
  profiles: [
    {
      name: "",
      experience: "",
      description: "",
      file: null,
    },
  ],
};

const STEPS = [
  { key: "basic", label: "Basic Details", icon: <FileText className="size-4" /> },
  { key: "language", label: "Languages", icon: <Languages className="size-4" /> },
  { key: "price", label: "Pricing & Timings", icon: <IndianRupee className="size-4" /> },
  { key: "process", label: "Process & Info", icon: <ListChecks className="size-4" /> },
  { key: "media", label: "Gallery & Profiles", icon: <ImageIcon className="size-4" /> },
] as const;

type StepKey = (typeof STEPS)[number]["key"];
const LAST_INDEX = STEPS.length - 1;

const sanitizeHtml = (html: string) =>
  html.replace(/[\n\r]/g, "").replace(/>\s+</g, "><");

const stripHtmlToText = (html: string) =>
  html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const unwrapId = (id?: string | { $oid: string }) =>
  typeof id === "string" ? id : id?.$oid ?? "";

/* ---------- TimePicker (12-hour) ---------- */

function TimePicker12({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const hours = [...Array(12)].map((_, i) => String(i + 1).padStart(2, "0"));
  const minutes = ["00", "15", "30", "45"];
  const ampm = ["AM", "PM"];

  const [hh, mm, ap] = value
    ? value
        .split(" ")
        .flatMap((part) => part.split(":"))
    : ["08", "00", "AM"];

  const updateValue = (h: string, m: string, a: string) => {
    onChange(`${h}:${m} ${a}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Clock className="size-4 text-gray-400" />
      <select
        className="input !w-20"
        value={hh}
        disabled={disabled}
        onChange={(e) => updateValue(e.target.value, mm, ap)}
      >
        {hours.map((h) => (
          <option key={h}>{h}</option>
        ))}
      </select>

      <select
        className="input !w-20"
        value={mm}
        disabled={disabled}
        onChange={(e) => updateValue(hh, e.target.value, ap)}
      >
        {minutes.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>

      <select
        className="input !w-20"
        value={ap}
        disabled={disabled}
        onChange={(e) => updateValue(hh, mm, e.target.value)}
      >
        {ampm.map((a) => (
          <option key={a}>{a}</option>
        ))}
      </select>
    </div>
  );
}

/* ==============
   Helpers
   ============== */



/* =========================
   Component
   ========================= */

export default function EditTourManagerMobile() {
  const router = useRouter();
  const { tourManager, clearTourManager } = useTourManagerStore();

  const [data, setData] = useState<TourManagerUI>({ ...BLANK_TOUR });
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const step = STEPS[stepIndex];

  // Editors
 
 

  const setTour = (next: Partial<TourManagerUI>) =>
    setData((prev) => ({ ...prev, ...next }));

  /* ---------- Hydrate from store ---------- */

  useEffect(() => {
    if (!tourManager) {
      router.replace("/dashboard/tour-managers");
      return;
    }

    const mapped: TourManagerUI = {
      roleType: (tourManager.slug as RoleType) || "",
      title: tourManager.title || "",
      shortDescription: tourManager.description || "",
      generalInfoHtml: tourManager.general_info || "",
      languages:
        tourManager.language?.map((pair) => ({
          primary: pair[0] || "",
          secondary: pair[1] || "",
        })) || [{ primary: "Hindi", secondary: "English" }],
      price: {
        basePrice:
          tourManager.price_breakdown?.basePrice != null
            ? String(tourManager.price_breakdown.basePrice)
            : "",
        serviceCharges:
          tourManager.price_breakdown?.serviceCharges != null
            ? String(tourManager.price_breakdown.serviceCharges)
            : "",
        taxes:
          tourManager.price_breakdown?.taxes != null
            ? String(tourManager.price_breakdown.taxes)
            : "",
        totalPrice:
          tourManager.price_breakdown?.totalPrice != null
            ? String(tourManager.price_breakdown.totalPrice)
            : "",
        priceNote: tourManager.price_breakdown?.priceNote || "",
      },
      timings: {
        from: tourManager.timings?.from || "",
        to: tourManager.timings?.to || "",
      },
      operationProcess:
        tourManager.operationProcess?.map((op) => ({
          time: op.time || "",
          title: op.title || "",
          description: op.description || "",
        })) || [
          {
            time: "Before Tour Start",
            title: "Meet Your Tour Manager",
            description: "",
          },
        ],
      inclusions: tourManager.inclusions || [],
      exclusions: tourManager.exclusions || [],
      gallery:
        tourManager.gallery?.map((g) => ({
          tag: g.tag || "",
          file: null,
          preview: g.url || g.imageUrl,
          existingUrl: g.url || g.imageUrl,
        })) || [{ tag: "beach", file: null }],
      profiles:
        tourManager.tourManagerProfiles?.map((p) => ({
          name: p.name || "",
          experience: p.experience || "",
          description: p.description || "",
          file: null,
          preview: p.profilePic || p.profilePicUrl,
          existingPicUrl: p.profilePic || p.profilePicUrl,
        })) || [
          {
            name: "",
            experience: "",
            description: "",
            file: null,
          },
        ],
    };

    setData(mapped);

    // Editors
  }, [tourManager, router]);

  // keep operationEditors array in sync


  // keep profileEditors array in sync


  // clean up blob previews
  useEffect(() => {
    return () => {
      data.gallery.forEach((g) => {
        if (g.preview && g.file) URL.revokeObjectURL(g.preview);
      });
      data.profiles.forEach((p) => {
        if (p.preview && p.file) URL.revokeObjectURL(p.preview);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Validation ---------- */

  const canContinueBasic = useMemo(
    () =>
      !!data.title.trim() &&
      !!data.roleType &&
      !!stripHtmlToText(data.shortDescription),
    [data.title, data.roleType, data.shortDescription]
  );

  const canContinuePrice = useMemo(
    () =>
      !!data.price.basePrice.trim() &&
      !!data.price.totalPrice.trim() &&
      !!data.timings.from.trim() &&
      !!data.timings.to.trim(),
    [data.price.basePrice, data.price.totalPrice, data.timings.from, data.timings.to]
  );

  const isStepValid = (k: StepKey) => {
    switch (k) {
      case "basic":
        return canContinueBasic;
      case "price":
        return canContinuePrice;
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

  /* ---------- Languages ---------- */

  const addLanguageRow = () =>
    setData((p) => ({
      ...p,
      languages: [...p.languages, { primary: "", secondary: "" }],
    }));

  const removeLanguageRow = (idx: number) =>
    setData((p) => {
      if (p.languages.length <= 1) {
        return { ...p, languages: [{ primary: "", secondary: "" }] };
      }
      return {
        ...p,
        languages: p.languages.filter((_, i) => i !== idx),
      };
    });

  const updateLanguageRow = (idx: number, next: Partial<LanguagePairUI>) =>
    setData((p) => ({
      ...p,
      languages: p.languages.map((l, i) =>
        i === idx ? { ...l, ...next } : l
      ),
    }));

  /* ---------- Operation Process ---------- */

  const addOperationStep = () =>
    setData((p) => ({
      ...p,
      operationProcess: [
        ...p.operationProcess,
        { time: "", title: "", description: "" },
      ],
    }));

  const removeOperationStep = (idx: number) =>
    setData((p) => {
      if (p.operationProcess.length <= 1) {
        return {
          ...p,
          operationProcess: [{ time: "", title: "", description: "" }],
        };
      }
      return {
        ...p,
        operationProcess: p.operationProcess.filter((_, i) => i !== idx),
      };
    });

  const updateOperationStep = (idx: number, next: Partial<OperationStepUI>) =>
    setData((p) => ({
      ...p,
      operationProcess: p.operationProcess.map((st, i) =>
        i === idx ? { ...st, ...next } : st
      ),
    }));

  /* ---------- Gallery handling ---------- */

  const handleGalleryFileChange = (
    idx: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);

    setData((p) => ({
      ...p,
      gallery: p.gallery.map((g, i) => {
        if (i === idx) {
          if (g.preview && g.file) URL.revokeObjectURL(g.preview);
          return { ...g, file, preview };
        }
        return g;
      }),
    }));

    e.target.value = "";
  };

  const addGalleryItem = () =>
    setData((p) => ({
      ...p,
      gallery: [...p.gallery, { tag: "", file: null }],
    }));

  const removeGalleryItem = (idx: number) =>
    setData((p) => {
      const g = p.gallery[idx];
      if (g?.preview && g.file) URL.revokeObjectURL(g.preview);
      if (p.gallery.length <= 1) {
        return {
          ...p,
          gallery: [{ tag: "", file: null }],
        };
      }
      return {
        ...p,
        gallery: p.gallery.filter((_, i) => i !== idx),
      };
    });

  const updateGalleryTag = (idx: number, tag: string) =>
    setData((p) => ({
      ...p,
      gallery: p.gallery.map((g, i) => (i === idx ? { ...g, tag } : g)),
    }));

  /* ---------- Profiles ---------- */

  const addProfile = () =>
    setData((p) => ({
      ...p,
      profiles: [
        ...p.profiles,
        { name: "", experience: "", description: "", file: null },
      ],
    }));

  const removeProfile = (idx: number) =>
    setData((p) => {
      const prof = p.profiles[idx];
      if (prof?.preview && prof.file) URL.revokeObjectURL(prof.preview);
      if (p.profiles.length <= 1) {
        return {
          ...p,
          profiles: [{ name: "", experience: "", description: "", file: null }],
        };
      }
      return {
        ...p,
        profiles: p.profiles.filter((_, i) => i !== idx),
      };
    });

  const updateProfile = (idx: number, next: Partial<TourProfileUI>) =>
    setData((p) => ({
      ...p,
      profiles: p.profiles.map((pr, i) =>
        i === idx ? { ...pr, ...next } : pr
      ),
    }));

  const handleProfileFileChange = (
    idx: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);

    setData((p) => ({
      ...p,
      profiles: p.profiles.map((pr, i) => {
        if (i === idx) {
          if (pr.preview && pr.file) URL.revokeObjectURL(pr.preview);
          return { ...pr, file, preview };
        }
        return pr;
      }),
    }));

    e.target.value = "";
  };

  /* ---------- Submit (PATCH) ---------- */

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!tourManager) return;

    if (stepIndex < LAST_INDEX) {
      if (isStepValid(step.key)) goNext();
      return;
    }

    try {
      setSubmitting(true);

      const id = unwrapId(tourManager._id as any);
      if (!id) {
        alert("Missing tourManager id");
        return;
      }

   const generalInfoHtmlClean = sanitizeHtml(data.generalInfoHtml || "");


      const shortDescriptionHtmlClean = data.shortDescription
        ? sanitizeHtml(data.shortDescription)
        : "";

      // Build payload
      const payload: any = {
        slug: data.roleType, // "tour-manager" | "tour-guide"

        title: data.title.trim(),
        description: shortDescriptionHtmlClean,

        // GALLERY:
        // - If new file exists for this index → DON'T send imageUrl (old URL is discarded)
        // - If no new file → send existingUrl as imageUrl
        gallery: data.gallery.map((g, idx) => {
          const item: any = {
            tag: g.tag.trim(),
            index: idx,
          };

          if (!g.file && g.existingUrl) {
            item.url = g.existingUrl;
          }
          return item;
        }),

        language: data.languages
          .map((l) => [l.primary.trim(), l.secondary.trim()])
          .filter(([a, b]) => a || b),

        general_info: generalInfoHtmlClean,

        price_breakdown: {
          basePrice: data.price.basePrice ? Number(data.price.basePrice) : 0,
          serviceCharges: data.price.serviceCharges
            ? Number(data.price.serviceCharges)
            : 0,
          taxes: data.price.taxes ? Number(data.price.taxes) : 0,
          totalPrice: data.price.totalPrice ? Number(data.price.totalPrice) : 0,
          priceNote: data.price.priceNote.trim(),
        },

        operationProcess: data.operationProcess
          .map((op) => ({
            time: op.time.trim(),
            title: op.title.trim(),
            description: op.description.trim(),
          }))
          .filter((op) => op.time || op.title || op.description),

        inclusions: data.inclusions,
        exclusions: data.exclusions,

        timings: {
          from: data.timings.from.trim(),
          to: data.timings.to.trim(),
        },

        // PROFILES:
        // - If new file exists for this index → DON'T send profilePicUrl
        // - If no new file → send existingPicUrl as profilePicUrl
        tourManagerProfiles: data.profiles.map((p, idx) => {
          const item: any = {
            name: p.name.trim(),
            experience: p.experience.trim(),
            description: sanitizeHtml(p.description || ""),
            index: idx,
          };

          if (!p.file && p.existingPicUrl) {
            item.profilePicUrl = p.existingPicUrl;
          }
          return item;
        }),
      };

      const fd = new FormData();
      fd.append("payload", JSON.stringify(payload));

      // Attach gallery files with index in field name
      data.gallery.forEach((g, idx) => {
        if (g.file) {
          fd.append(`gallery_files[${idx}]`, g.file, g.file.name);
        }
      });

      // Attach profile pictures with index in field name
      data.profiles.forEach((p, idx) => {
        if (p.file) {
          fd.append(`profile_files[${idx}]`, p.file, p.file.name);
        }
      });

      const url = `${process.env.NEXT_PUBLIC_API_BASE}tour-manager/update/${id}`;
      const res = await fetch(url, { method: "PATCH", body: fd });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Request failed");
      }

      alert("Tour manager/guide updated successfully! ✅");
      clearTourManager();
      router.push("/dashboard/tour-managers");
    } catch (err: any) {
      console.error(err);
      alert(`An error occurred: ${err?.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  const title = data.title.trim() || "Edit Tour Service";

  return (
    <form className="min-h-screen bg-gray-50" onSubmit={handleSubmit}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-gray-200">
        <div className="px-4 py-3 sm:px-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-emerald-600 text-white grid place-items-center text-sm font-bold shadow">
              {title[0]?.toUpperCase() || "T"}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-gray-900 truncate">
                Edit Tour Manager / Guide — {title}
              </h1>
              <p className="text-[11px] text-gray-500 truncate">
                Update your Goa tour manager/guide service
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (tourManager) {
                  router.refresh?.();
                }
              }}
              disabled={submitting}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
                submitting
                  ? "border-gray-200 text-gray-400"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Reset page
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
        {/* BASIC */}
        {step.key === "basic" && (
          <SectionCard
            title="Basic Details"
            subtitle="Core information about the tour manager / guide."
            icon={<FileText className="size-5 text-emerald-600" />}
            requiredHint
          >
            <div className="rounded-xl border border-gray-200 p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Slug *" required>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTour({ roleType: "tour-manager" })}
                      disabled={submitting}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 ${
                        data.roleType === "tour-manager"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-gray-300 bg-white text-gray-700"
                      }`}
                    >
                      <Users className="size-4" />
                      Tour Manager
                    </button>
                    <button
                      type="button"
                      onClick={() => setTour({ roleType: "tour-guide" })}
                      disabled={submitting}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 ${
                        data.roleType === "tour-guide"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-gray-300 bg-white text-gray-700"
                      }`}
                    >
                      <Users className="size-4" />
                      Tour Guide
                    </button>
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Title *" required>
                  <input
                    type="text"
                    className="input"
                    value={data.title}
                    onChange={(e) => setTour({ title: e.target.value })}
                    placeholder="Goa Tour Manager"
                    disabled={submitting}
                  />
                </Field>
              </div>

              {/* Short Description as rich text */}
              <Field label="Short Description *" required>
                <div className="rounded-xl border border-gray-300 bg-white shadow-sm">
                 <TinyMCETextEditor
  value={data.shortDescription || ""}
  onChange={(html) => setTour({ shortDescription: html })}
  placeholder="Manage all tours and travel experiences across Goa."
/>

                </div>
              </Field>
            </div>
          </SectionCard>
        )}

        {/* LANGUAGES */}
        {step.key === "language" && (
          <SectionCard
            title="Languages"
            subtitle="Add language pairs (like your schema: [Hindi, English])."
            icon={<Languages className="size-5 text-emerald-600" />}
          >
            <div className="rounded-xl border border-gray-200 p-4 space-y-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-800">
                  Language Pairs
                </span>
                <button
                  type="button"
                  onClick={addLanguageRow}
                  disabled={submitting}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                >
                  <Plus className="size-3.5" />
                  Add pair
                </button>
              </div>

              <div className="space-y-3">
                {data.languages.map((l, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-gray-200 p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-600">
                        Pair #{idx + 1}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeLanguageRow(idx)}
                        disabled={submitting}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                      >
                        <X className="size-3.5" />
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Primary language">
                        <input
                          type="text"
                          className="input"
                          value={l.primary}
                          onChange={(e) =>
                            updateLanguageRow(idx, { primary: e.target.value })
                          }
                          placeholder="Hindi"
                          disabled={submitting}
                        />
                      </Field>
                      <Field label="Secondary language">
                        <input
                          type="text"
                          className="input"
                          value={l.secondary}
                          onChange={(e) =>
                            updateLanguageRow(idx, {
                              secondary: e.target.value,
                            })
                          }
                          placeholder="English"
                          disabled={submitting}
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        )}

        {/* PRICE & TIMINGS */}
        {step.key === "price" && (
          <SectionCard
            title="Pricing & Timings"
            subtitle="Match your price_breakdown and timings schema."
            icon={<IndianRupee className="size-5 text-emerald-600" />}
            requiredHint
          >
            <div className="rounded-xl border border-gray-200 p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Field label="Base Price *" required>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      className="input pl-8"
                      value={data.price.basePrice}
                      onChange={(e) =>
                        setTour({
                          price: { ...data.price, basePrice: e.target.value },
                        })
                      }
                      placeholder="1200"
                      disabled={submitting}
                    />
                    <IndianRupee className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </Field>
                <Field label="Service Charges">
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={data.price.serviceCharges}
                    onChange={(e) =>
                      setTour({
                        price: {
                          ...data.price,
                          serviceCharges: e.target.value,
                        },
                      })
                    }
                    placeholder="50"
                    disabled={submitting}
                  />
                </Field>
                <Field label="Taxes">
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={data.price.taxes}
                    onChange={(e) =>
                      setTour({
                        price: { ...data.price, taxes: e.target.value },
                      })
                    }
                    placeholder="60"
                    disabled={submitting}
                  />
                </Field>
                <Field label="Total Price *" required>
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={data.price.totalPrice}
                    onChange={(e) =>
                      setTour({
                        price: { ...data.price, totalPrice: e.target.value },
                      })
                    }
                    placeholder="1310"
                    disabled={submitting}
                  />
                </Field>
              </div>

              <Field label="Price Note">
                <textarea
                  className="textarea"
                  value={data.price.priceNote}
                  onChange={(e) =>
                    setTour({
                      price: { ...data.price, priceNote: e.target.value },
                    })
                  }
                  placeholder="Prices may vary during peak season and based on tour type."
                  disabled={submitting}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="From *" required>
                  <TimePicker12
                    value={data.timings.from}
                    onChange={(v) =>
                      setTour({
                        timings: { ...data.timings, from: v },
                      })
                    }
                    disabled={submitting}
                  />
                </Field>
                <Field label="To *" required>
                  <TimePicker12
                    value={data.timings.to}
                    onChange={(v) =>
                      setTour({
                        timings: { ...data.timings, to: v },
                      })
                    }
                    disabled={submitting}
                  />
                </Field>
              </div>
            </div>
          </SectionCard>
        )}

        {/* PROCESS & INFO */}
        {step.key === "process" && (
          <SectionCard
            title="General Info & Operation Process"
            subtitle="Match general_info and operationProcess schema."
            icon={<ListChecks className="size-5 text-emerald-600" />}
          >
            <div className="rounded-xl border border-gray-200 p-4 space-y-6">
              <Field
                label="General Info"
                hint="This maps to general_info (rich text)."
              >
                <div className="rounded-xl border border-gray-300 bg-white shadow-sm">
                 <TinyMCETextEditor
  value={data.generalInfoHtml || ""}
  onChange={(html) => setTour({ generalInfoHtml: html })}
  placeholder="Manages all tour operations across Goa including adventure activities..."
/>

                </div>
              </Field>

              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Operation Process
                  </h3>
                  <button
                    type="button"
                    onClick={addOperationStep}
                    disabled={submitting}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                  >
                    <Plus className="size-3.5" />
                    Add step
                  </button>
                </div>

                <div className="space-y-3">
                  {data.operationProcess.map((op, idx) => (
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
                          onClick={() => removeOperationStep(idx)}
                          disabled={submitting}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                        >
                          <X className="size-3.5" />
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
                        <Field label="Time / Stage">
                          <input
                            type="text"
                            className="input"
                            value={op.time}
                            onChange={(e) =>
                              updateOperationStep(idx, { time: e.target.value })
                            }
                            placeholder="Before Tour Start"
                            disabled={submitting}
                          />
                        </Field>
                        <Field label="Title" className="sm:col-span-2">
                          <input
                            type="text"
                            className="input"
                            value={op.title}
                            onChange={(e) =>
                              updateOperationStep(idx, {
                                title: e.target.value,
                              })
                            }
                            placeholder="Meet Your Tour Manager"
                            disabled={submitting}
                          />
                        </Field>
                      </div>

                      <Field label="Description">
                        <div className="rounded-xl border border-gray-300 bg-white shadow-sm">
                         <TinyMCETextEditor
  value={op.description || ""}
  onChange={(html) => updateOperationStep(idx, { description: html })}
  placeholder="Arrive at the designated meeting point and introduce yourself..."
/>

                        </div>
                      </Field>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="Inclusions"
                  hint='Matches "inclusions" array in schema.'
                >
                  <TagsInput
                    items={data.inclusions}
                    onChange={(items) => setTour({ inclusions: items })}
                    placeholder="Professional guide support"
                    disabled={submitting}
                  />
                </Field>

                <Field
                  label="Exclusions"
                  hint='Matches "exclusions" array in schema.'
                >
                  <TagsInput
                    items={data.exclusions}
                    onChange={(items) => setTour({ exclusions: items })}
                    placeholder="Meals"
                    disabled={submitting}
                  />
                </Field>
              </div>
            </div>
          </SectionCard>
        )}

        {/* MEDIA */}
        {step.key === "media" && (
          <SectionCard
            title="Gallery & Tour Manager Profiles"
            subtitle="Images are uploaded as files (existing URLs are kept unless you replace them)."
            icon={<ImageIcon className="size-5 text-emerald-600" />}
          >
            <div className="space-y-6">
              {/* Gallery */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-emerald-900">
                    Gallery Images
                  </h3>
                  <button
                    type="button"
                    onClick={addGalleryItem}
                    disabled={submitting}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                  >
                    <Plus className="size-3.5" />
                    Add image
                  </button>
                </div>

                <div className="space-y-4">
                  {data.gallery.map((g, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-emerald-200 bg-white p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-emerald-800">
                          Image #{idx + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeGalleryItem(idx)}
                          disabled={submitting}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                        >
                          <X className="size-3.5" />
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Field label="Tag">
                          <input
                            type="text"
                            className="input"
                            value={g.tag}
                            onChange={(e) =>
                              updateGalleryTag(idx, e.target.value)
                            }
                            placeholder="beach / adventure / heritage etc."
                            disabled={submitting}
                          />
                        </Field>

                        <Field label="Image file" className="sm:col-span-2">
                          <label className="block">
                            <div className="flex items-center gap-3 px-3 py-2 border-2 border-dashed border-emerald-300 rounded-xl cursor-pointer hover:border-emerald-500 bg-emerald-50/50">
                              <ImageIcon className="size-5 text-emerald-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-emerald-900 truncate">
                                  {g.file?.name ||
                                    (g.existingUrl
                                      ? "Existing image"
                                      : "Upload image")}
                                </p>
                                <p className="text-[10px] text-emerald-900/70">
                                  JPG / PNG / WebP
                                </p>
                              </div>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) =>
                                handleGalleryFileChange(idx, e)
                              }
                              disabled={submitting}
                            />
                          </label>
                        </Field>
                      </div>

                      {(g.preview || g.existingUrl) && (
                        <div className="mt-3 w-full rounded-xl overflow-hidden border bg-gray-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={g.preview || g.existingUrl}
                            alt={`Gallery ${idx + 1}`}
                            className="w-full h-auto max-h-[260px] object-cover object-center"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Profiles */}
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Tour Manager / Guide Profiles
                  </h3>
                  <button
                    type="button"
                    onClick={addProfile}
                    disabled={submitting}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                  >
                    <Plus className="size-3.5" />
                    Add profile
                  </button>
                </div>

                <div className="space-y-4">
                  {data.profiles.map((p, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-gray-200 p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-700">
                          Profile #{idx + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeProfile(idx)}
                          disabled={submitting}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                        >
                          <X className="size-3.5" />
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <Field label="Name">
                          <input
                            type="text"
                            className="input"
                            value={p.name}
                            onChange={(e) =>
                              updateProfile(idx, { name: e.target.value })
                            }
                            placeholder="Rahul Verma"
                            disabled={submitting}
                          />
                        </Field>
                        <Field label="Experience">
                          <input
                            type="text"
                            className="input"
                            value={p.experience}
                            onChange={(e) =>
                              updateProfile(idx, {
                                experience: e.target.value,
                              })
                            }
                            placeholder="5+ years"
                            disabled={submitting}
                          />
                        </Field>
                      </div>

                      <Field label="Description">
                        <div className="rounded-xl border border-gray-300 bg-white shadow-sm">
                          <TinyMCETextEditor
  value={p.description || ""}
  onChange={(html) => updateProfile(idx, { description: html })}
  placeholder="Expert in Goa sightseeing, water sports coordination..."
/>

                        </div>
                      </Field>

                     <div className="mt-3">
                        <Field label="Profile picture">
                            <div className="space-y-3">
                            {/* Upload button */}
                            <label className="block">
                                <div className="flex items-center gap-3 px-3 py-2 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 bg-gray-50/70">
                                <ImageIcon className="size-5 text-gray-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-gray-800 truncate">
                                    {p.file?.name ||
                                        (p.existingPicUrl
                                        ? "Existing profile image"
                                        : "Upload profile image")}
                                    </p>
                                    <p className="text-[10px] text-gray-500">
                                    JPG / PNG / WebP
                                    </p>
                                </div>
                                </div>
                                <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleProfileFileChange(idx, e)}
                                disabled={submitting}
                                />
                            </label>

                            {/* Big preview like gallery */}
                            {(p.preview || p.existingPicUrl) && (
                                <div className="w-full rounded-xl overflow-hidden border bg-gray-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={p.preview || p.existingPicUrl}
                                    alt={`Profile ${idx + 1}`}
                                    className="w-full h-auto max-h-[260px] object-cover object-center"
                                />
                                </div>
                            )}
                            </div>
                        </Field>
                        </div>

                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>
        )}
      </main>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-full max-w-4xl bg-gray-50/95 backdrop-blur safe-bottom pt-2">
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
                      {submitting ? "Updating..." : "Update Tour Service"}
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
          @apply w-full min-h-[120px] px-4 py-3 rounded-xl border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-[16px] placeholder:text-gray-400 transition-all;
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

/* ---------- Reusable components ---------- */

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

/* ---------- TagsInput (inclusions/exclusions) ---------- */

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
