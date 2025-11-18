"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HelpCircle, Plus, Trash2, Loader2 } from "lucide-react";

// Rich text editor
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import { Editor } from "react-draft-wysiwyg";
import { EditorState, ContentState, convertFromHTML } from "draft-js";
import { stateToHTML } from "draft-js-export-html";

type OID = { $oid: string };

type FAQ = { q: string; a: string };

type ServiceDoc = {
  _id?: OID | string;
  name?: string;
  faqs?: FAQ[];
};

const unwrapId = (id?: OID | string) => (typeof id === "string" ? id : id?.$oid ?? "");

// HTML → EditorState
const htmlToEditorState = (html?: string) => {
  const safe = (html ?? "").trim();
  if (!safe) return EditorState.createEmpty();
  const blocks = convertFromHTML(safe);
  const content = ContentState.createFromBlockArray(blocks.contentBlocks, blocks.entityMap);
  return EditorState.createWithContent(content);
};

// simple sanitizer (optional but nice)
const sanitizeHtml = (html: string) =>
  html
    .replace(/[\n\r]/g, "")
    .replace(/>\s+</g, "><");

/* ---------- Component (FAQs only, answers as rich text) ---------- */
export default function EditServiceFaqsMobile() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idFromQuery = searchParams.get("type") || "";

  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [doc, setDoc] = useState<ServiceDoc | null>(null);

  const [serviceName, setServiceName] = useState<string>("");

  // FAQs data (question + raw HTML answer)
  const [faqs, setFaqs] = useState<FAQ[]>([{ q: "", a: "" }]);
  // Editors for answers (parallel to faqs)
  const [faqEditors, setFaqEditors] = useState<EditorState[]>([EditorState.createEmpty()]);

  const [submitting, setSubmitting] = useState(false);

  // Fetch service (for FAQs + optional name)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!idFromQuery) {
        setLoadErr("Missing type in query");
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
        if (!isMounted) return;

        const data: ServiceDoc | null = payload?.data || null;
        setDoc(data);
        setServiceName(data?.name || "");

        const initialFaqs: FAQ[] =
          (data?.faqs && data.faqs.length ? data.faqs : [{ q: "", a: "" }]) as FAQ[];
        setFaqs(initialFaqs);

        const initialEditors = initialFaqs.map((f) => htmlToEditorState(f.a));
        setFaqEditors(initialEditors.length ? initialEditors : [EditorState.createEmpty()]);

        setLoadErr(null);
      } catch (e: any) {
        if (isMounted) setLoadErr(e?.message || "Failed to fetch service");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [idFromQuery]);

  /* ---------- Dynamic list helpers ---------- */
  const addFAQ = () => {
    setFaqs((p) => [...p, { q: "", a: "" }]);
    setFaqEditors((p) => [...p, EditorState.createEmpty()]);
  };

  const remFAQ = (idx: number) => {
    setFaqs((p) => (p.length <= 1 ? [{ q: "", a: "" }] : p.filter((_, i) => i !== idx)));
    setFaqEditors((p) =>
      p.length <= 1 ? [EditorState.createEmpty()] : p.filter((_, i) => i !== idx)
    );
  };

  const setFAQQuestion = (idx: number, q: string) => {
    setFaqs((p) => p.map((f, i) => (i === idx ? { ...f, q } : f)));
  };

  const setFAQAnswerEditor = (idx: number, editorState: EditorState) => {
    setFaqEditors((p) => p.map((ed, i) => (i === idx ? editorState : ed)));
  };

  /* ---------- Submit (FAQs only) ---------- */
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!idFromQuery) {
      alert("Missing service type in URL.");
      return;
    }

    try {
      setSubmitting(true);

      // Build FAQs payload using editor HTML
      const preparedFaqs: FAQ[] = faqs.map((f, i) => {
        const editor = faqEditors[i] ?? EditorState.createEmpty();
        const html = sanitizeHtml(stateToHTML(editor.getCurrentContent()));
        return {
          q: (f.q || "").trim(),
          a: html,
        };
      });

      const basePayload: Partial<ServiceDoc> = {
        faqs: preparedFaqs.filter((f) => f.q || f.a),
      };

      const id = unwrapId(doc?._id);
      if (!id) {
        alert("Service not loaded properly (missing _id).");
        return;
      }

      const url = `${process.env.NEXT_PUBLIC_API_BASE}services?type=${encodeURIComponent(
        idFromQuery
      )}`;

      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(basePayload),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Failed");
      }

      alert("FAQs updated successfully! ✅");
      router.push(`/dashboard/services?type=${encodeURIComponent(idFromQuery)}`);
    } catch (err: any) {
      console.error(err);
      alert(`Save failed: ${err?.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  const titleLetter = (serviceName || "S")[0]?.toUpperCase() || "S";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-2 text-gray-600 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading service FAQs...
        </div>
      </div>
    );
  }

  if (loadErr) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <p className="text-sm text-red-600 mb-3">Error: {loadErr}</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-50"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <form className="min-h-screen bg-gray-50 pb-24" onSubmit={handleSubmit}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-gray-200">
        <div className="px-4 py-3 sm:px-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-blue-600 text-white grid place-items-center text-sm font-bold shadow">
              {titleLetter}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-gray-900 truncate">
                Edit FAQs — {serviceName || "Service"}
              </h1>
              <p className="text-[11px] text-gray-500 truncate">
                Manage common questions for this service.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* FAQ Section Only */}
      <main className="max-w-3xl mx-auto p-4 sm:p-6">
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
                  {/* Question (plain text) */}
                  <Field label="Question">
                    <input
                      type="text"
                      className="input w-full"
                      value={f.q}
                      onChange={(e) => setFAQQuestion(i, e.target.value)}
                      placeholder="e.g., Is helmet provided for scooters?"
                      disabled={submitting}
                    />
                  </Field>

                  {/* Answer (rich text editor) */}
                  <Field label="Answer">
                    <div className="rounded-xl border border-gray-300 bg-white p-2">
                      <Editor
                        editorState={faqEditors[i] || EditorState.createEmpty()}
                        onEditorStateChange={(st) => setFAQAnswerEditor(i, st)}
                        toolbar={{
                          options: ["inline", "list"],
                          inline: {
                            options: ["bold", "italic", "underline", "strikethrough"],
                          },
                          list: {
                            options: ["unordered", "ordered"],
                          },
                        }}
                        toolbarClassName="border-b"
                        wrapperClassName="rounded-xl overflow-hidden"
                        editorClassName="min-h-[120px] px-3"
                      />
                    </div>
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </main>

      {/* Sticky Footer (Save) */}
      <div className="fixed bottom-0 right-0 left-0 lg:left-64 z-40 bg-gray-50/95 backdrop-blur safe-bottom pt-2">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-2">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-900/5">
            <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="inline-flex items-center gap-2 text-xs text-gray-600 bg-gray-100 rounded-full px-3 py-1.5 font-semibold self-start sm:self-auto">
                FAQs: {faqs.filter((f) => f.q || f.a).length} active
              </span>

              <div className="flex w-full sm:w-auto gap-2 sm:ml-auto">
                <button
                  type="button"
                  onClick={() => router.back()}
                  disabled={submitting}
                  className="flex-1 sm:flex-none px-4 py-3 text-sm font-medium rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 sm:flex-none px-5 py-3 text-sm font-semibold rounded-xl text-white ${
                    submitting ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                  }`}
                  aria-busy={submitting ? "true" : "false"}
                >
                  <span className="inline-flex items-center gap-2">
                    {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                    {submitting ? "Saving..." : "Save FAQs"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Local styles (reusing your .input etc.) */}
      <style jsx>{`
        .input {
          @apply w-full h-12 px-4 py-3 rounded-xl border border-gray-300 bg-white
          shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          text-[16px] leading-none placeholder:text-gray-400 transition-all;
          -webkit-tap-highlight-color: transparent;
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
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
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
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      {children}
    </label>
  );
}
