"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  Image as ImageIcon,
  MapPin,
  HelpCircle,
  CheckCircle2,
  Loader2,
  Edit,
  Link as LinkIcon,
  Power,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import TinyMCETextEditor from "@/components/TinyMCETextEditor";

/* ---------- Incoming (example) ---------- */
type OID = { $oid: string };
type ISODate = string;

type FAQ = { q: string; a: string };

// Steps type: time + title; description stored as HTML string
type StepItem = {
  time: string;
  title: string;
};

type ServiceDoc = {
  _id?: OID | string;
  name: string;
  slug: string;
  category: string;
  description?: string;
  is_active: boolean;
  banners?: string; // image URL (kept if no new file)
  terms?: {
    version?: string;
    content?: string;
  };
  policies?: { version?: string; content?: string };
  cancellation_policy?: {
    version?: string;
    content?: string;
  };
  contact_us?: {
    email?: string;
    phone?: string;
  };
  faqs?: FAQ[];
  supportedRegions?: string[];

  // LLM chips
  llm_chips?: FAQ[];

  // Steps to follow: backend supports time, title, description
  stepsToFollow?: {
    time: string;
    title: string;
    description: string;
  }[];
};

// --- Prefill from your message ---
const INITIAL_SERVICE: ServiceDoc = {
  _id: { $oid: "690c559ddafce6ed45e1d042" },
  name: "Rentals",
  slug: "rentals",
  category: "transport",
  is_active: true,
  banners: "https://storage.googleapis.com/tyt_banners/Banner_for_rentals.png",
  terms: {
    version: "1.0",
    content: "",
  },
  policies: {
    version: "1.0",
    content: "",
  },
  faqs: [
    {
      q: "Is helmet provided for scooters?",
      a: "Yes, one helmet is complimentary; extra on request.",
    },
    {
      q: "Do you deliver the vehicle?",
      a: "Free delivery within 5 km; beyond that delivery fees apply.",
    },
    {
      q: "What about late returns?",
      a: "Grace of 30 minutes; then hourly charges apply.",
    },
  ],
  supportedRegions: ["Goa"],
};

/* ---------- Steps ---------- */
const STEPS = [
  { key: "basic", label: "Basic", icon: <Edit className="size-4" /> },
  { key: "media", label: "Banner", icon: <ImageIcon className="size-4" /> },
  { key: "llmChips", label: "LLM Chips", icon: <HelpCircle className="size-4" /> },
  { key: "terms", label: "Terms & Policies", icon: <FileText className="size-4" /> },
  { key: "steps", label: "Steps", icon: <FileText className="size-4" /> },
  { key: "faqs", label: "FAQs", icon: <HelpCircle className="size-4" /> },
  { key: "regions", label: "Regions", icon: <MapPin className="size-4" /> },
] as const;

type StepKey = (typeof STEPS)[number]["key"];
const LAST_INDEX = STEPS.length - 1;

/* ---------- Helpers ---------- */
const unwrapId = (id?: OID | string) => (typeof id === "string" ? id : id?.$oid ?? "");

// Support string or { $date: string } from the backend (kept if needed later)
const toDateInput = (iso?: string | { $date?: string }) => {
  if (!iso) return "";
  const str = typeof iso === "string" ? iso : iso.$date;
  return str ? str.slice(0, 10) : "";
};

const fromDateInput = (d?: string) => (d ? new Date(d).toISOString() : undefined);

const sanitizeHtml = (html: string) =>
  (html ?? "")
    .replace(/[\n\r]/g, "")
    .replace(/>\s+</g, "><");

const stripHtmlToText = (html: string) =>
  (html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

/* ---------- Component ---------- */
export default function EditServiceMobile() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idFromQuery = searchParams.get("type") || "";

  // hydrate from server (here we use the provided data)
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [doc, setDoc] = useState<ServiceDoc | null>(INITIAL_SERVICE);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      if (!idFromQuery) {
        setLoadErr("Missing id in query");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE}services?type=${encodeURIComponent(idFromQuery)}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(await res.text());

        const payload = await res.json();
        if (isMounted) {
          setDoc(payload?.data || null);
          setLoadErr(null);
        }
      } catch (e: any) {
        if (isMounted) setLoadErr(e?.message || "Failed to fetch transfer");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [idFromQuery]);

  const [submitting, setSubmitting] = useState(false);

  // basic fields
  const [name, setName] = useState(doc?.name || "");
  const [slug, setSlug] = useState(doc?.slug || "");
  const [category, setCategory] = useState(doc?.category || "");
  const [active, setActive] = useState(!!doc?.is_active);

  // description HTML (TinyMCE)
  const [descriptionHtml, setDescriptionHtml] = useState(doc?.description || "");

  // banner
  const [bannerUrl, setBannerUrl] = useState(doc?.banners || "");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const bannerPreview = useMemo(
    () => (bannerFile ? URL.createObjectURL(bannerFile) : bannerUrl),
    [bannerFile, bannerUrl]
  );

  // terms / policies / cancellation: HTML strings
  const [termsVersion, setTermsVersion] = useState(doc?.terms?.version || "1.0");
  const [termsHtml, setTermsHtml] = useState(doc?.terms?.content || "");

  const [polVersion, setPolVersion] = useState(doc?.policies?.version || "1.0");
  const [polHtml, setPolHtml] = useState(doc?.policies?.content || "");

  const [cancelPolVersion, setCancelPolVersion] = useState(doc?.cancellation_policy?.version || "1.0");
  const [cancelPolHtml, setCancelPolHtml] = useState(doc?.cancellation_policy?.content || "");

  // Contact us
  const [contactEmail, setContactEmail] = useState(doc?.contact_us?.email || "");
  const [contactPhone, setContactPhone] = useState(doc?.contact_us?.phone || "");

  // FAQs: questions in faqs[], answers in faqAnswersHtml[]
  const [faqs, setFaqs] = useState<FAQ[]>(doc?.faqs || [{ q: "", a: "" }]);
  const [faqAnswersHtml, setFaqAnswersHtml] = useState<string[]>(
    (doc?.faqs && doc.faqs.length ? doc.faqs : [{ q: "", a: "" }]).map((f) => f.a || "")
  );

  // LLM chips
  const [llmChips, setLlmChips] = useState<FAQ[]>(
    doc?.llm_chips && doc.llm_chips.length ? doc.llm_chips : [{ q: "", a: "" }]
  );
  const [llmChipAnswersHtml, setLlmChipAnswersHtml] = useState<string[]>(
    (doc?.llm_chips && doc.llm_chips.length ? doc.llm_chips : [{ q: "", a: "" }]).map((c) => c.a || "")
  );

  // Regions
  const [regions, setRegions] = useState<string[]>(doc?.supportedRegions || [""]);

  // Steps (time + title)
  const [steps, setSteps] = useState<StepItem[]>(
    doc?.stepsToFollow && doc.stepsToFollow.length
      ? doc.stepsToFollow.map((s) => ({
          time: s.time || "",
          title: s.title || "",
        }))
      : [{ time: "", title: "" }]
  );

  // Step descriptions as HTML strings
  const [stepDescriptionsHtml, setStepDescriptionsHtml] = useState<string[]>(
    doc?.stepsToFollow && doc.stepsToFollow.length ? doc.stepsToFollow.map((s) => s.description || "") : [""]
  );

  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];

  // Hydrate form state when doc changes
  useEffect(() => {
    if (!doc) return;

    setName(doc.name || "");
    setSlug(doc.slug || "");
    setCategory(doc.category || "");
    setActive(!!doc.is_active);
    setBannerUrl(doc.banners || "");
    setBannerFile(null);

    setDescriptionHtml(doc.description || "");

    setTermsVersion(doc.terms?.version || "1.0");
    setTermsHtml(doc.terms?.content || "");

    setPolVersion(doc.policies?.version || "1.0");
    setPolHtml(doc.policies?.content || "");

    setCancelPolVersion(doc.cancellation_policy?.version || "1.0");
    setCancelPolHtml(doc.cancellation_policy?.content || "");

    setContactEmail(doc.contact_us?.email || "");
    setContactPhone(doc.contact_us?.phone || "");

    const nextFaqs = (doc.faqs && doc.faqs.length ? doc.faqs : [{ q: "", a: "" }]) as FAQ[];
    setFaqs(nextFaqs);
    setFaqAnswersHtml(nextFaqs.map((f) => f.a || ""));

    const nextLlmChips = (doc.llm_chips && doc.llm_chips.length ? doc.llm_chips : [{ q: "", a: "" }]) as FAQ[];
    setLlmChips(nextLlmChips);
    setLlmChipAnswersHtml(nextLlmChips.map((c) => c.a || ""));

    setRegions((doc.supportedRegions && doc.supportedRegions.length ? doc.supportedRegions : [""]) as string[]);

    setSteps(
      doc.stepsToFollow && doc.stepsToFollow.length
        ? doc.stepsToFollow.map((s: any) => ({
            time: s.time || "",
            title: s.title || "",
          }))
        : [{ time: "", title: "" }]
    );

    setStepDescriptionsHtml(
      doc.stepsToFollow && doc.stepsToFollow.length ? doc.stepsToFollow.map((s: any) => s.description || "") : [""]
    );
  }, [doc]);

  /* ---------- Validation ---------- */
  const isStepValid = (k: StepKey) => {
    switch (k) {
      case "basic":
        return name.trim().length > 0 && slug.trim().length > 0 && category.trim().length > 0;

      case "media":
        return (bannerPreview?.length ?? 0) > 0;

      case "steps": {
        const firstStep = steps[0] || { time: "", title: "" };
        const firstDescText = stripHtmlToText(stepDescriptionsHtml[0] || "");
        return firstStep.title.trim().length > 0 && firstDescText.length > 0;
      }

      case "terms":
      case "faqs":
      case "regions":
      case "llmChips":
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

  /* ---------- Dynamic lists ---------- */
  const addFAQ = () => {
    setFaqs((p) => [...p, { q: "", a: "" }]);
    setFaqAnswersHtml((p) => [...p, ""]);
  };

  const remFAQ = (idx: number) => {
    setFaqs((p) => (p.length <= 1 ? [{ q: "", a: "" }] : p.filter((_, i) => i !== idx)));
    setFaqAnswersHtml((p) => (p.length <= 1 ? [""] : p.filter((_, i) => i !== idx)));
  };

  const setFAQ = (idx: number, next: Partial<FAQ>) =>
    setFaqs((p) => p.map((f, i) => (i === idx ? { ...f, ...next } : f)));

  // LLM Chips dynamic list
  const addLlmChip = () => {
    setLlmChips((p) => [...p, { q: "", a: "" }]);
    setLlmChipAnswersHtml((p) => [...p, ""]);
  };

  const remLlmChip = (idx: number) => {
    setLlmChips((p) => (p.length <= 1 ? [{ q: "", a: "" }] : p.filter((_, i) => i !== idx)));
    setLlmChipAnswersHtml((p) => (p.length <= 1 ? [""] : p.filter((_, i) => i !== idx)));
  };

  const setLlmChip = (idx: number, next: Partial<FAQ>) =>
    setLlmChips((p) => p.map((c, i) => (i === idx ? { ...c, ...next } : c)));

  // Regions
  const addRegion = () => setRegions((p) => [...p, ""]);
  const remRegion = (idx: number) => setRegions((p) => (p.length <= 1 ? [""] : p.filter((_, i) => i !== idx)));
  const setRegion = (idx: number, val: string) => setRegions((p) => p.map((r, i) => (i === idx ? val : r)));

  // Steps To Follow dynamic list
  const addStep = () => {
    setSteps((prev) => [...prev, { time: "", title: "" }]);
    setStepDescriptionsHtml((prev) => [...prev, ""]);
  };

  const updateStepAt = (index: number, field: keyof StepItem, value: string) =>
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));

  const clearStepAt = (index: number) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { time: "", title: "" } : s)));
    setStepDescriptionsHtml((prev) => prev.map((d, i) => (i === index ? "" : d)));
  };

  const removeStepAt = (index: number) => {
    setSteps((prev) => (prev.length <= 1 ? [{ time: "", title: "" }] : prev.filter((_, i) => i !== index)));
    setStepDescriptionsHtml((prev) => (prev.length <= 1 ? [""] : prev.filter((_, i) => i !== index)));
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

      const basePayload: ServiceDoc = {
        ...(doc || {}),
        name: name.trim(),
        slug: slug.trim(),
        category: category.trim(),
        description: sanitizeHtml(descriptionHtml || "").trim(),
        is_active: active,
        banners: bannerFile ? undefined : bannerUrl.trim(),

        terms: {
          version: (termsVersion || "1.0").trim(),
          content: sanitizeHtml(termsHtml || "").trim(),
        },
        policies: {
          version: (polVersion || "1.0").trim(),
          content: sanitizeHtml(polHtml || "").trim(),
        },
        cancellation_policy: {
          version: (cancelPolVersion || "1.0").trim(),
          content: sanitizeHtml(cancelPolHtml || "").trim(),
        },

        contact_us: {
          email: contactEmail.trim(),
          phone: contactPhone.trim(),
        },

        stepsToFollow: steps
          .map((s, idx) => ({
            time: (s.time || "").trim(),
            title: (s.title || "").trim(),
            description: sanitizeHtml(stepDescriptionsHtml[idx] || "").trim(),
          }))
          .filter((s) => s.time || s.title || s.description),

        faqs: faqs
          .map((f, idx) => ({
            q: (f.q || "").trim(),
            a: sanitizeHtml(faqAnswersHtml[idx] || "").trim(),
          }))
          .filter((f) => f.q || f.a),

        supportedRegions: regions.map((r) => r.trim()).filter(Boolean),

        llm_chips: llmChips
          .map((c, idx) => ({
            q: (c.q || "").trim(),
            a: sanitizeHtml(llmChipAnswersHtml[idx] || "").trim(),
          }))
          .filter((c) => c.q || c.a),
      };

      const id = unwrapId(doc?._id);
      const url = `${process.env.NEXT_PUBLIC_API_BASE}services?type=${encodeURIComponent(idFromQuery)}`;

      let res: Response;

      if (bannerFile) {
        const form = new FormData();
        form.append("banner", bannerFile);
        form.append("payload", JSON.stringify(basePayload));
        res = await fetch(url, { method: id ? "PATCH" : "POST", body: form });
      } else {
        res = await fetch(url, {
          method: id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(basePayload),
        });
      }

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Failed");
      }

      alert(id ? "Service updated successfully! ✅" : "Service created successfully! 🎉");
      router.push(`/dashboard/services?type=${encodeURIComponent(idFromQuery)}`);
    } catch (err: any) {
      console.error(err);
      alert(`Save failed: ${err?.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Render ---------- */
  const titleLetter = (name || "R")[0]?.toUpperCase() || "R";

  if (loading && !doc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="size-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (loadErr && !doc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-red-600">{loadErr}</p>
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
              {titleLetter}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-gray-900 truncate">
                {unwrapId(doc?._id) ? "Edit Service" : "Create Service"} — {name || "Untitled"}
              </h1>
              <p className="text-[11px] text-gray-500 truncate">Configure details, content, FAQs & regions.</p>
            </div>

            <label className="inline-flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800">
              <input
                type="checkbox"
                className="size-4"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                disabled={submitting}
              />
              <Power className="size-3.5" /> Active
            </label>
          </div>

          {/* Stepper */}
          <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {STEPS.map((s, i) => {
              const activeStep = i === stepIndex;
              const done = i < stepIndex;
              const canJump = i <= stepIndex || STEPS.slice(0, i).every((st) => isStepValid(st.key));

              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => canJump && setStepIndex(i)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs whitespace-nowrap ${
                    activeStep
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : done
                      ? "bg-green-50 border-green-500 text-green-700"
                      : "bg-white border-gray-200 text-gray-700"
                  }`}
                  disabled={submitting || !canJump}
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
      <main className="max-w-3xl mx-auto p-4 sm:p-6 pb-36 lg:pb-64">
        {/* BASIC */}
        {step.key === "basic" && (
          <SectionCard
            title="Basic Information"
            subtitle="Identity & classification."
            icon={<Edit className="size-5 text-blue-600" />}
            requiredHint
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name *">
                <input
                  type="text"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rentals"
                  disabled={submitting}
                />
              </Field>

              <Field label="Slug *" hint="lowercase URL id">
                <div className="relative">
                  <input
                    type="text"
                    className="input"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="rentals"
                    disabled={submitting}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 inline-flex items-center gap-1">
                    <LinkIcon className="size-3.5" /> /services/{slug || "slug"}
                  </span>
                </div>
              </Field>

              <Field label="Category *">
                <input
                  type="text"
                  className="input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., transport"
                  disabled={submitting}
                />
              </Field>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <p className="text-[11px] text-gray-500 mb-2">
                Short summary used on service detail and listing views.
              </p>

              <div className="rounded-xl border border-gray-300 bg-white p-2">
                <TinyMCETextEditor value={descriptionHtml} onChange={setDescriptionHtml} disabled={submitting} />
              </div>
            </div>
          </SectionCard>
        )}

        {/* MEDIA */}
        {step.key === "media" && (
          <SectionCard title="Banner" subtitle="Hero image shown on service landing." icon={<ImageIcon className="size-5 text-blue-600" />} requiredHint>
            {bannerPreview ? (
              <div className="relative rounded-xl border border-gray-200 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bannerPreview}
                  alt="Banner preview"
                  className="w-full h-48 object-cover bg-gray-100"
                  decoding="async"
                  loading="lazy"
                />
                <button
                  type="button"
                  onClick={() => {
                    setBannerFile(null);
                    setBannerUrl("");
                  }}
                  className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 hover:bg-white text-gray-700 shadow grid place-items-center"
                  title="Remove banner"
                  aria-label="Remove banner"
                  disabled={submitting}
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setBannerFile(f);
                  }}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  disabled={submitting}
                />
                <p className="text-xs text-gray-500">Upload a single image (JPG/PNG/WebP). Max ~5MB recommended.</p>
              </div>
            )}
          </SectionCard>
        )}

        {/* LLM Chips */}
        {step.key === "llmChips" && (
          <SectionCard title="LLM Chips" subtitle="Predefined Q&A snippets for the assistant." icon={<HelpCircle className="size-5 text-blue-600" />}>
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
                          value={llmChipAnswersHtml[i] || ""}
                          onChange={(html) =>
                            setLlmChipAnswersHtml((prev) => prev.map((v, idx) => (idx === i ? html : v)))
                          }
                          disabled={submitting}
                        />
                      </div>
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* TERMS & POLICIES */}
        {step.key === "terms" && (
          <SectionCard title="Terms & Policies" subtitle="Versioned content used on checkout and legal sections." icon={<FileText className="size-5 text-blue-600" />}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Terms Version">
                <input
                  type="text"
                  className="input"
                  value={termsVersion}
                  onChange={(e) => setTermsVersion(e.target.value)}
                  placeholder="1.0"
                  disabled={submitting}
                />
              </Field>
              <div className="hidden sm:block" />
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Terms Content</label>
              <div className="rounded-xl border border-gray-300 bg-white p-2">
                <TinyMCETextEditor value={termsHtml} onChange={setTermsHtml} disabled={submitting} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <Field label="Policies Version">
                <input
                  type="text"
                  className="input"
                  value={polVersion}
                  onChange={(e) => setPolVersion(e.target.value)}
                  placeholder="1.0"
                  disabled={submitting}
                />
              </Field>
              <div className="hidden sm:block" />
              <div className="hidden sm:block" />
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Policies Content</label>
              <div className="rounded-xl border border-gray-300 bg-white p-2">
                <TinyMCETextEditor value={polHtml} onChange={setPolHtml} disabled={submitting} />
              </div>
            </div>

            {/* Cancellation Policy */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cancellation Policy</label>
              <p className="text-[11px] text-gray-500 mb-2">
                This will be used wherever cancellation terms are shown (checkout, confirmations, etc.).
              </p>
              <div className="rounded-xl border border-gray-300 bg-white p-2">
                <TinyMCETextEditor value={cancelPolHtml} onChange={setCancelPolHtml} disabled={submitting} />
              </div>
            </div>

            {/* Contact Us */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              <Field label="Support Email">
                <input
                  type="email"
                  className="input"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="support@tickyourtour.com"
                  disabled={submitting}
                />
              </Field>
              <Field label="Support Phone">
                <input
                  type="tel"
                  className="input"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  disabled={submitting}
                />
              </Field>
            </div>
          </SectionCard>
        )}

        {/* STEPS TO FOLLOW */}
        {step.key === "steps" && (
          <SectionCard title="Steps to Follow" subtitle="Shown to the traveler as important instructions for this transfer route." icon={<FileText className="size-5 text-blue-600" />}>
            <div className="rounded-xl border border-gray-200">
              <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800 inline-flex items-center gap-2">
                  <FileText className="size-4 text-blue-600" /> Steps
                </p>

                <button
                  type="button"
                  onClick={addStep}
                  disabled={submitting}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                >
                  <Plus className="size-3.5" />
                  Add step
                </button>
              </div>

              <div className="p-3 space-y-3">
                {steps.map((val, i) => (
                  <div key={`step-${i}`} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-9 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Field label="Time" hint={i === 0 ? "e.g., Before Pickup" : "e.g., During Ride"}>
                          <input
                            type="text"
                            className="input w-full"
                            value={val.time}
                            onChange={(e) => updateStepAt(i, "time", e.target.value)}
                            placeholder={i === 0 ? "Before Pickup" : "During Ride"}
                            disabled={submitting}
                          />
                        </Field>

                        <Field label={i === 0 ? "Title *" : "Title"} required={i === 0} hint={`Step ${i + 1}`}>
                          <input
                            type="text"
                            className="input w-full"
                            value={val.title}
                            onChange={(e) => updateStepAt(i, "title", e.target.value)}
                            placeholder={i === 0 ? "Reach the Location" : "Another instruction title"}
                            disabled={submitting}
                          />
                        </Field>
                      </div>

                      <Field label={i === 0 ? "Description *" : "Description"} required={i === 0}>
                        <div className="rounded-xl border border-gray-300 bg-white p-2 w-full">
                          <TinyMCETextEditor
                            value={stepDescriptionsHtml[i] || ""}
                            onChange={(html) =>
                              setStepDescriptionsHtml((prev) => prev.map((v, idx) => (idx === i ? html : v)))
                            }
                            disabled={submitting}
                          />
                        </div>
                      </Field>
                    </div>

                    <div className="col-span-3 flex gap-2 mt-7">
                      <button
                        type="button"
                        onClick={() => clearStepAt(i)}
                        disabled={submitting}
                        className="w-full h-10 grid place-items-center rounded-xl border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                        title="Clear step"
                        aria-label="Clear step"
                      >
                        <X className="size-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeStepAt(i)}
                        disabled={submitting || steps.length <= 1}
                        className="w-full h-10 grid place-items-center rounded-xl border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                        title="Remove step"
                        aria-label="Remove step"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        )}

        {/* FAQs */}
        {step.key === "faqs" && (
          <SectionCard title="Frequently Asked Questions" subtitle="Quick answers for customers." icon={<HelpCircle className="size-5 text-blue-600" />}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-800">Questions</span>
              <button
                type="button"
                onClick={addFAQ}
                disabled={submitting}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
              >
                <Plus className="size-3.5" />
                Add FAQ
              </button>
            </div>

            <div className="space-y-3">
              {faqs.map((f, i) => (
                <div key={`faq-${i}`} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-600">FAQ #{i + 1}</p>
                    <button
                      type="button"
                      onClick={() => remFAQ(i)}
                      disabled={submitting}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                    >
                      <Trash2 className="size-3.5" />
                      Remove
                    </button>
                  </div>

                  <div className="space-y-3">
                    <Field label="Question">
                      <input
                        type="text"
                        className="input w-full"
                        value={f.q}
                        onChange={(e) => setFAQ(i, { q: e.target.value })}
                        placeholder="e.g., Is helmet provided for scooters?"
                        disabled={submitting}
                      />
                    </Field>

                    <Field label="Answer">
                      <div className="rounded-xl border border-gray-300 bg-white p-2">
                        <TinyMCETextEditor
                          value={faqAnswersHtml[i] || ""}
                          onChange={(html) =>
                            setFaqAnswersHtml((prev) => prev.map((v, idx) => (idx === i ? html : v)))
                          }
                          disabled={submitting}
                        />
                      </div>
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* REGIONS */}
        {step.key === "regions" && (
          <SectionCard title="Supported Regions" subtitle="Where this service is offered." icon={<MapPin className="size-5 text-blue-600" />}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-800">Regions</span>
              <button
                type="button"
                onClick={addRegion}
                disabled={submitting}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
              >
                <Plus className="size-3.5" />
                Add Region
              </button>
            </div>

            <div className="space-y-2">
              {regions.map((r, i) => (
                <div key={`region-${i}`} className="flex items-center gap-2">
                  <input
                    type="text"
                    className="input flex-1"
                    value={r}
                    onChange={(e) => setRegion(i, e.target.value)}
                    placeholder="e.g., Goa"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => remRegion(i)}
                    disabled={submitting}
                    className="size-10 grid place-items-center rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
                    title="Remove region"
                    aria-label="Remove region"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </main>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 right-0 left-0 lg:left-64 z-40 bg-gray-50/95 backdrop-blur safe-bottom pt-2">
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
                      {submitting ? "Saving..." : unwrapId(doc?._id) ? "Update Service" : "Create Service"}
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
