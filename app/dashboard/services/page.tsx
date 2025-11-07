"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter,useSearchParams } from "next/navigation";
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
} from "lucide-react";

// Rich text editor
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import { Editor } from "react-draft-wysiwyg";
import { EditorState, ContentState, convertFromHTML } from "draft-js";
import { stateToHTML } from "draft-js-export-html";

/* ---------- Incoming (example) ---------- */
type OID = { $oid: string };
type ISODate = string;

type FAQ = { q: string; a: string };

type ServiceDoc = {
  _id?: OID | string;
  name: string;
  slug: string;
  category: string;
  is_active: boolean;
  banners?: string; // image URL (kept if no new file)
  terms?: { version?: string; updatedAt?: ISODate; content?: string };
  policies?: { version?: string; content?: string };
  faqs?: FAQ[];
  supportedRegions?: string[];
  createdAt?: ISODate;
  updatedAt?: ISODate;
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
    updatedAt: "2025-11-06T00:00:00.000Z",
    content: "",
  },
  policies: {
    version: "1.0",
    content: "",
  },
  faqs: [
    { q: "Is helmet provided for scooters?", a: "Yes, one helmet is complimentary; extra on request." },
    { q: "Do you deliver the vehicle?", a: "Free delivery within 5 km; beyond that delivery fees apply." },
    { q: "What about late returns?", a: "Grace of 30 minutes; then hourly charges apply." },
  ],
  supportedRegions: ["Goa"],
  createdAt: "2025-11-06T00:00:00.000Z",
  updatedAt: "2025-11-06T00:00:00.000Z",
};

/* ---------- Steps ---------- */
const STEPS = [
  { key: "basic", label: "Basic", icon: <Edit className="size-4" /> },
  { key: "media", label: "Banner", icon: <ImageIcon className="size-4" /> },
  { key: "terms", label: "Terms & Policies", icon: <FileText className="size-4" /> },
  { key: "faqs", label: "FAQs", icon: <HelpCircle className="size-4" /> },
  { key: "regions", label: "Regions", icon: <MapPin className="size-4" /> },
] as const;

type StepKey = (typeof STEPS)[number]["key"];
const LAST_INDEX = STEPS.length - 1;

/* ---------- Helpers ---------- */
const unwrapId = (id?: OID | string) => (typeof id === "string" ? id : id?.$oid ?? "");
const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : "");
const fromDateInput = (d?: string) => (d ? new Date(d).toISOString() : undefined);

const htmlToEditorState = (html?: string) => {
  const safe = (html ?? "").trim();
  if (!safe) return EditorState.createEmpty();
  const blocks = convertFromHTML(safe);
  const content = ContentState.createFromBlockArray(blocks.contentBlocks, blocks.entityMap);
  return EditorState.createWithContent(content);
};

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

  // form state
  const [name, setName] = useState(doc?.name || "");
  const [slug, setSlug] = useState(doc?.slug || "");
  const [category, setCategory] = useState(doc?.category || "");
  const [active, setActive] = useState(!!doc?.is_active);

  const [bannerUrl, setBannerUrl] = useState(doc?.banners || "");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const bannerPreview = useMemo(
    () => (bannerFile ? URL.createObjectURL(bannerFile) : bannerUrl),
    [bannerFile, bannerUrl]
  );

  const [termsVersion, setTermsVersion] = useState(doc?.terms?.version || "1.0");
  const [termsUpdated, setTermsUpdated] = useState(toDateInput(doc?.terms?.updatedAt));
  const [termsEditor, setTermsEditor] = useState(() => htmlToEditorState(doc?.terms?.content));

  const [polVersion, setPolVersion] = useState(doc?.policies?.version || "1.0");
  const [polEditor, setPolEditor] = useState(() => htmlToEditorState(doc?.policies?.content));

  const [faqs, setFaqs] = useState<FAQ[]>(doc?.faqs || [{ q: "", a: "" }]);
  const [regions, setRegions] = useState<string[]>(doc?.supportedRegions || [""]);

  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];

  useEffect(() => {
    if (!doc) return;
    setName(doc.name || "");
    setSlug(doc.slug || "");
    setCategory(doc.category || "");
    setActive(!!doc.is_active);
    setBannerUrl(doc.banners || "");
    setTermsVersion(doc.terms?.version || "1.0");
    setTermsUpdated(toDateInput(doc.terms?.updatedAt));
    setTermsEditor(htmlToEditorState(doc.terms?.content));
    setPolVersion(doc.policies?.version || "1.0");
    setPolEditor(htmlToEditorState(doc.policies?.content));
    setFaqs((doc.faqs && doc.faqs.length ? doc.faqs : [{ q: "", a: "" }]) as FAQ[]);
    setRegions((doc.supportedRegions && doc.supportedRegions.length ? doc.supportedRegions : [""]) as string[]);
  }, [doc]);

  /* ---------- Validation ---------- */
  const isStepValid = (k: StepKey) => {
    switch (k) {
      case "basic":
        return name.trim().length > 0 && slug.trim().length > 0 && category.trim().length > 0;
      case "media":
        return (bannerPreview?.length ?? 0) > 0;
      case "terms":
      case "faqs":
      case "regions":
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
  const addFAQ = () => setFaqs((p) => [...p, { q: "", a: "" }]);
  const remFAQ = (idx: number) => setFaqs((p) => (p.length <= 1 ? [{ q: "", a: "" }] : p.filter((_, i) => i !== idx)));
  const setFAQ = (idx: number, next: Partial<FAQ>) => setFaqs((p) => p.map((f, i) => (i === idx ? { ...f, ...next } : f)));

  const addRegion = () => setRegions((p) => [...p, ""]);
  const remRegion = (idx: number) => setRegions((p) => (p.length <= 1 ? [""] : p.filter((_, i) => i !== idx)));
  const setRegion = (idx: number, val: string) => setRegions((p) => p.map((r, i) => (i === idx ? val : r)));
  const sanitizeHtml = (html: string) =>
  html
    .replace(/[\n\r]/g, "")     // drop newline and carriage return characters
    .replace(/>\s+</g, "><");   // collapse whitespace between tags


  /* ---------- Submit ---------- */
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (stepIndex < LAST_INDEX) {
      if (isStepValid(step.key)) goNext();
      return;
    }

    try {
      setSubmitting(true);

      const termsHtml = sanitizeHtml(stateToHTML(termsEditor.getCurrentContent()));
const polHtml   = sanitizeHtml(stateToHTML(polEditor.getCurrentContent()));


      const basePayload: ServiceDoc = {
        ...(doc || {}),
        name: name.trim(),
        slug: slug.trim(),
        category: category.trim(),
        is_active: active,
        banners: bannerFile ? undefined : bannerUrl.trim(), // keep current URL if no new file
        terms: {
          version: (termsVersion || "1.0").trim(),
          updatedAt: fromDateInput(termsUpdated),
          content: termsHtml,
        },
        policies: {
          version: (polVersion || "1.0").trim(),
          content: polHtml,
        },
        faqs: faqs
          .map((f) => ({ q: (f.q || "").trim(), a: (f.a || "").trim() }))
          .filter((f) => f.q || f.a),
        supportedRegions: regions.map((r) => r.trim()).filter(Boolean),
      };

      const id = unwrapId(doc?._id);
      const url = `${process.env.NEXT_PUBLIC_API_BASE}services?type=${encodeURIComponent(idFromQuery)}`;

      let res: Response;
      if (bannerFile) {
        // multipart: single image + JSON payload
        const form = new FormData();
        form.append("banner", bannerFile); // adjust field name if backend expects something else
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
              <input type="checkbox" className="size-4" checked={active} onChange={(e) => setActive(e.target.checked)} />
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
            <div className={`h-full transition-all ${submitting ? "bg-blue-400" : "bg-blue-600"}`} style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto p-4 sm:p-6 pb-36">
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
              {/* Category as a plain input instead of dropdown */}
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
          </SectionCard>
        )}

        {/* MEDIA */}
        {step.key === "media" && (
          <SectionCard
            title="Banner"
            subtitle="Hero image shown on service landing."
            icon={<ImageIcon className="size-5 text-blue-600" />}
            requiredHint
          >
            {/* Image preview with replace/remove */}
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

        {/* TERMS & POLICIES */}
        {step.key === "terms" && (
          <SectionCard
            title="Terms & Policies"
            subtitle="Versioned content used on checkout and legal sections."
            icon={<FileText className="size-5 text-blue-600" />}
          >
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
              <Field label="Terms Updated On">
                <input
                  type="date"
                  className="input"
                  value={termsUpdated}
                  onChange={(e) => setTermsUpdated(e.target.value)}
                  disabled={submitting}
                />
              </Field>
              <div className="hidden sm:block" />
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Terms Content</label>
              <div className="rounded-xl border border-gray-300 bg-white p-2">
                <Editor
                  editorState={termsEditor}
                  onEditorStateChange={setTermsEditor}
                  toolbar={{
                    options: ["inline", "list"],
                    inline: { options: ["bold", "italic", "underline", "strikethrough"] },
                    list: { options: ["unordered", "ordered"] },
                  }}
                  toolbarClassName="border-b"
                  wrapperClassName="rounded-xl overflow-hidden"
                  editorClassName="min-h-[180px] px-3"
                />
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
                <Editor
                  editorState={polEditor}
                  onEditorStateChange={setPolEditor}
                  toolbar={{
                    options: ["inline", "list"],
                    inline: { options: ["bold", "italic", "underline", "strikethrough"] },
                    list: { options: ["unordered", "ordered"] },
                  }}
                  toolbarClassName="border-b"
                  wrapperClassName="rounded-xl overflow-hidden"
                  editorClassName="min-h-[160px] px-3"
                />
              </div>
            </div>
          </SectionCard>
        )}

        {/* FAQs */}
        {step.key === "faqs" && (
          <SectionCard
            title="Frequently Asked Questions"
            subtitle="Quick answers for customers."
            icon={<HelpCircle className="size-5 text-blue-600" />}
          >
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
                      <input
                        type="text"
                        className="input w-full"
                        value={f.a}
                        onChange={(e) => setFAQ(i, { a: e.target.value })}
                        placeholder="e.g., Yes, one helmet is complimentary; extra on request."
                        disabled={submitting}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* REGIONS */}
        {step.key === "regions" && (
          <SectionCard
            title="Supported Regions"
            subtitle="Where this service is offered."
            icon={<MapPin className="size-5 text-blue-600" />}
          >
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