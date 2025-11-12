"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import { EditorState, ContentState, convertFromHTML } from "draft-js";
import { stateToHTML } from "draft-js-export-html";
import { Editor } from "react-draft-wysiwyg";

interface Eligibility {
  user_type: string;
  first_booking?: boolean;
  min_cart_value?: number;
  min_group_size?: number;
  min_stay_nights?: number;
  stay_days?: string[];
  same_day_booking?: boolean;
  payment_type?: string;
  booking_time_cutoff?: string;
  id_check_required?: boolean;
  select_hotels_only?: boolean;
  participating_hotels_only?: boolean;
  booking_date?: string;
  pickup_airport?: string;
  max_pickup_distance_km?: number;
  property_tags_required?: string[];
  segments?: string[];
}

interface Validity {
  start: string;
  end: string;
}

interface CouponFormData {
  seq: number;
  name: string;
  coupon_code: string;
  details: string;
  price: string;
  eligibility: Eligibility;
  validity: Validity;
  terms_conditions: string; // HTML
}

interface ImageFile {
  file: File;
  preview: string;
}

export default function CouponFormMobile() {
  // ------- STATE -------
  const [formData, setFormData] = useState<CouponFormData>({
    seq: ("" as unknown) as number,
    name: "",
    coupon_code: "",
    details: "",
    price: "",
    eligibility: {
      user_type: "",
      stay_days: [],
      property_tags_required: [],
      segments: [],
      booking_time_cutoff: "",
    },
    validity: { start: "", end: "" },
    terms_conditions: "",
  });

  const [images, setImages] = useState<ImageFile[]>([]);
  const [stayDays, setStayDays] = useState("");
  const [propertyTags, setPropertyTags] = useState("");
  const [segments, setSegments] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Editors
  const [detailsEditor, setDetailsEditor] = useState<EditorState>(EditorState.createEmpty());
  const [termsEditor, setTermsEditor] = useState<EditorState>(EditorState.createEmpty());

  // Tabs
  const tabs = ["Basics", "Eligibility", "Images"] as const;
  type Tab = typeof tabs[number];
  const [activeTab, setActiveTab] = useState<Tab>("Basics");

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  // Initialize editors from existing HTML (if any)
  useEffect(() => {
    if (formData.details) {
      try {
        const blocks = convertFromHTML(formData.details);
        const content = ContentState.createFromBlockArray(blocks.contentBlocks, blocks.entityMap);
        setDetailsEditor(EditorState.createWithContent(content));
      } catch {
        setDetailsEditor(EditorState.createEmpty());
      }
    } else {
      setDetailsEditor(EditorState.createEmpty());
    }
  }, [formData.details]);

  useEffect(() => {
    if (formData.terms_conditions) {
      try {
        const blocks = convertFromHTML(formData.terms_conditions);
        const content = ContentState.createFromBlockArray(blocks.contentBlocks, blocks.entityMap);
        setTermsEditor(EditorState.createWithContent(content));
      } catch {
        setTermsEditor(EditorState.createEmpty());
      }
    } else {
      setTermsEditor(EditorState.createEmpty());
    }
  }, [formData.terms_conditions]);

  // ------- DERIVED -------
  const requiredOk = useMemo(() => {
    const nameOk = formData.name.trim().length > 0;
    const codeOk = formData.coupon_code.trim().length > 0;
    const imagesOk = images.length > 0; // images are required and only added in last tab
    return nameOk && codeOk && imagesOk;
  }, [formData.name, formData.coupon_code, images.length]);

  // ------- HANDLERS -------
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name.startsWith("eligibility.")) {
      const field = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        eligibility: {
          ...prev.eligibility,
          [field]: type === "checkbox" ? checked : type === "number" ? Number(value) : value,
        },
      }));
    } else if (name.startsWith("validity.")) {
      const field = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        validity: { ...prev.validity, [field]: value },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "number" ? Number(value) : value,
      }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;

    const mapped = files.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setImages((prev) => [...prev, ...mapped]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index]?.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const resetForm = () => {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
    setStayDays("");
    setPropertyTags("");
    setSegments("");
    setDetailsEditor(EditorState.createEmpty());
    setTermsEditor(EditorState.createEmpty());
    setActiveTab("Basics");
    setFormData({
      seq: 0,
      name: "",
      coupon_code: "",
      details: "",
      price: "",
      eligibility: {
        user_type: "",
        stay_days: [],
        property_tags_required: [],
        segments: [],
        booking_time_cutoff: "",
      },
      validity: { start: "", end: "" },
      terms_conditions: "",
    });
  };

  const goNextTab = () => {
    setActiveTab((t) => (t === "Basics" ? "Eligibility" : t === "Eligibility" ? "Images" : "Images"));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Only allow submit on the last tab
    if (activeTab !== "Images") return;

    if (!requiredOk || isSubmitting) {
      if (!requiredOk)
        alert("Please fill all required fields: Name, Coupon Code, and at least one Image.");
      return;
    }

    setIsSubmitting(true);
    try {
      const detailsHTML = stateToHTML(detailsEditor.getCurrentContent());
      const termsHTML = stateToHTML(termsEditor.getCurrentContent());

      const processedData = {
        ...formData,
        details: detailsHTML,
        terms_conditions: termsHTML,
        eligibility: {
          ...formData.eligibility,
          stay_days: stayDays ? stayDays.split(",").map((s) => s.trim()).filter(Boolean) : [],
          property_tags_required: propertyTags
            ? propertyTags.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
          segments: segments ? segments.split(",").map((s) => s.trim()).filter(Boolean) : [],
        },
      };

      const submitFormData = new FormData();
      submitFormData.append("data", JSON.stringify(processedData));
      images.forEach((img) => submitFormData.append("images", img.file));

      const response = await fetch(
        (process.env.NEXT_PUBLIC_API_BASE as string) + "coupons/add",
        { method: "POST", body: submitFormData }
      );

      if (response.ok) {
        router.push("/dashboard/coupons");
        return;
      } else {
        const msg = await safeErrorText(response);
        alert(msg || "Failed to create coupon");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ------- UI -------
  return (
    <form
      className="min-h-screen bg-gray-50"
      onSubmit={handleSubmit}
      aria-busy={isSubmitting}
      onKeyDown={(e) => {
        // Prevent Enter from submitting until Images tab
        if (e.key === "Enter" && activeTab !== "Images") e.preventDefault();
      }}
    >
      {/* Loading overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-[60] bg-white/70 backdrop-blur-sm grid place-items-center">
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl border bg-white shadow">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth="2" opacity="0.25" />
              <path d="M22 12a10 10 0 0 1-10 10" strokeWidth="2" />
            </svg>
            <span className="text-sm text-gray-700 font-medium">Creating coupon…</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200 px-4 py-3 sm:px-6">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="size-9 rounded-xl bg-blue-600 text-white grid place-items-center text-sm font-semibold shadow-sm">CF</div>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-gray-900 leading-tight">Add New Coupon</h1>
            <p className="text-xs text-gray-500">Mobile-first, accessible, and responsive</p>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-[.99]"
            aria-label="Reset form"
            disabled={isSubmitting}
          >
            Reset
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-28">
        {/* Tabs */}
        <div role="tablist" aria-label="Coupon form sections" className="mt-4 grid grid-cols-3 gap-2">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={activeTab === t}
              onClick={() => setActiveTab(t)}
              className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                activeTab === t
                  ? "bg-blue-600 text-white border-blue-600 shadow"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
              disabled={isSubmitting}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Disable inputs while submitting */}
        <fieldset disabled={isSubmitting} className="contents">
          {/* Panels */}
          {activeTab === "Basics" && (
            <>
              <SectionCard title="Basic Information" subtitle="Tell us the essentials about this coupon." requiredHint>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Sequence Number">
                    <input
                      type="number"
                      name="seq"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.seq}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="e.g., 1"
                    />
                  </Field>
                  <Field label="Coupon Name" required>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="Summer Saver"
                      autoComplete="off"
                    />
                  </Field>
                  <Field label="Coupon Code" required>
                    <input
                      type="text"
                      name="coupon_code"
                      value={formData.coupon_code}
                      onChange={handleInputChange}
                      className="input uppercase tracking-wider"
                      placeholder="SUMMER25"
                      autoCapitalize="characters"
                    />
                  </Field>
                  <Field label="Price" hint="Accepts currency text or %">
                    <input
                      type="text"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="₹500 or 10%"
                      inputMode="decimal"
                    />
                  </Field>
                </div>

                <Field label="Description">
                  <div className="border rounded-xl bg-white">
                    <Editor
                      editorState={detailsEditor}
                      onEditorStateChange={setDetailsEditor}
                      toolbar={{
                        options: ["inline", "list","history"],
                        inline: { options: ["bold", "italic", "underline", "monospace"] },
                        list: { options: ["unordered", "ordered"] },
                      }}
                      editorClassName="px-3 py-2 min-h-[120px] text-[15px]"
                      toolbarClassName="border-b"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Saved as HTML.</p>
                </Field>

               
              </SectionCard>

              <SectionCard title="Validity Period" subtitle="When can this coupon be used?">
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <Field label="Start Date">
      <input
        type="datetime-local"
        name="validity.start"
        value={formData.validity.start}
        onChange={handleInputChange}
        className="input"
      />
    </Field>

    <Field label="End Date">
      <input
        type="datetime-local"
        name="validity.end"
        value={formData.validity.end}
        onChange={handleInputChange}
        className="input"
      />
    </Field>

    {/* Make Terms & Conditions full width on sm+ */}
    <div className="sm:col-span-2">
      <Field label="Terms & Conditions">
        <div className="border rounded-xl bg-white">
          <Editor
            editorState={termsEditor}
            onEditorStateChange={setTermsEditor}
            toolbar={{
              options: ["inline", "list", "history"],
              inline: { options: ["bold", "italic", "underline", "monospace"] },
              list: { options: ["unordered", "ordered"] },
            }}
            editorClassName="px-3 py-2 min-h-[120px] text-[15px]"
            toolbarClassName="border-b"
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">Add rules as bullets; saved as HTML.</p>
      </Field>
    </div>
  </div>
</SectionCard>

            </>
          )}

          {activeTab === "Eligibility" && (
            <>
              <SectionCard title="Eligibility" subtitle="Who qualifies and under what conditions?">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="User Type">
                    <input
                      type="text"
                      name="eligibility.user_type"
                      value={formData.eligibility.user_type}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="e.g., new_user, loyalty_gold"
                    />
                  </Field>

                  <Field label="Min Cart Value">
                    <input
                      type="number"
                      name="eligibility.min_cart_value"
                      value={formData.eligibility.min_cart_value ?? ""}
                      onChange={handleInputChange}
                      className="input"
                      inputMode="decimal"
                      placeholder="e.g., 2500"
                    />
                  </Field>

                  <Field label="Min Group Size">
                    <input
                      type="number"
                      name="eligibility.min_group_size"
                      value={formData.eligibility.min_group_size ?? ""}
                      onChange={handleInputChange}
                      className="input"
                      inputMode="numeric"
                      placeholder="e.g., 2"
                    />
                  </Field>

                  <Field label="Min Stay Nights">
                    <input
                      type="number"
                      name="eligibility.min_stay_nights"
                      value={formData.eligibility.min_stay_nights ?? ""}
                      onChange={handleInputChange}
                      className="input"
                      inputMode="numeric"
                      placeholder="e.g., 3"
                    />
                  </Field>

                  <Field label="Payment Type" hint="e.g., prepaid, pay_at_property">
                    <input
                      type="text"
                      name="eligibility.payment_type"
                      value={formData.eligibility.payment_type ?? ""}
                      onChange={handleInputChange}
                      className="input"
                    />
                  </Field>

                  <Field label="Booking Time Cutoff" hint="24h time">
                    <input
                      type="time"
                      name="eligibility.booking_time_cutoff"
                      value={formData.eligibility.booking_time_cutoff ?? ""}
                      onChange={handleInputChange}
                      className="input"
                    />
                  </Field>

                  <Field label="Booking Date">
                    <input
                      type="date"
                      name="eligibility.booking_date"
                      value={formData.eligibility.booking_date ?? ""}
                      onChange={handleInputChange}
                      className="input"
                    />
                  </Field>

                  <Field label="Pickup Airport" hint="IATA code e.g., JFK">
                    <input
                      type="text"
                      name="eligibility.pickup_airport"
                      value={formData.eligibility.pickup_airport ?? ""}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="e.g., BLR"
                      maxLength={4}
                    />
                  </Field>

                  <Field label="Max Pickup Distance (km)">
                    <input
                      type="number"
                      name="eligibility.max_pickup_distance_km"
                      value={formData.eligibility.max_pickup_distance_km ?? ""}
                      onChange={handleInputChange}
                      className="input"
                      inputMode="decimal"
                      placeholder="e.g., 15"
                    />
                  </Field>

                  <Field label="Stay Days (comma-separated)">
                    <input
                      type="text"
                      value={stayDays}
                      onChange={(e) => setStayDays(e.target.value)}
                      className="input"
                      placeholder="Monday, Tuesday"
                    />
                  </Field>

                  <Field label="Property Tags Required (comma-separated)">
                    <input
                      type="text"
                      value={propertyTags}
                      onChange={(e) => setPropertyTags(e.target.value)}
                      className="input"
                      placeholder="luxury, pool, beach"
                    />
                  </Field>

                  <Field label="Segments (comma-separated)">
                    <input
                      type="text"
                      value={segments}
                      onChange={(e) => setSegments(e.target.value)}
                      className="input"
                      placeholder="premium, business, leisure"
                    />
                  </Field>
                </div>

                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <ToggleCheck
                    label="First Booking"
                    name="eligibility.first_booking"
                    checked={formData.eligibility.first_booking ?? false}
                    onChange={handleInputChange}
                  />
                  <ToggleCheck
                    label="Same Day Booking"
                    name="eligibility.same_day_booking"
                    checked={formData.eligibility.same_day_booking ?? false}
                    onChange={handleInputChange}
                  />
                  <ToggleCheck
                    label="ID Check Required"
                    name="eligibility.id_check_required"
                    checked={formData.eligibility.id_check_required ?? false}
                    onChange={handleInputChange}
                  />
                  <ToggleCheck
                    label="Select Hotels Only"
                    name="eligibility.select_hotels_only"
                    checked={formData.eligibility.select_hotels_only ?? false}
                    onChange={handleInputChange}
                  />
                  <ToggleCheck
                    label="Participating Hotels Only"
                    name="eligibility.participating_hotels_only"
                    checked={formData.eligibility.participating_hotels_only ?? false}
                    onChange={handleInputChange}
                  />
                </div>
              </SectionCard>
            </>
          )}

          {activeTab === "Images" && (
            <>
              <SectionCard title="Images (required)" subtitle="Add marketing creatives or banners.">
                {images.length === 0 ? (
                  <div>
                    <label className="block">
                      <div className="flex items-center justify-center w-full px-4 py-10 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 transition-colors bg-white">
                        <div className="text-center">
                          <svg className="mx-auto h-10 w-10 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <p className="mt-2 text-sm text-gray-700">Tap to upload images</p>
                          <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB • You can choose multiple</p>
                        </div>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {images.map((image, index) => (
                      <div key={index} className="relative rounded-xl overflow-hidden border border-gray-200 bg-white">
                        <img src={image.preview} alt={`Image ${index + 1}`} className="w-full h-28 object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg text-lg font-bold"
                          title="Remove image"
                          aria-label="Remove image"
                        >
                          ×
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                          <p className="text-white text-[11px] truncate" title={image.file.name}>
                            {image.file.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </>
          )}
        </fieldset>
      </main>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-4">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-900/5">
            <div className="p-3 sm:p-4 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 rounded-full px-2.5 py-1">
                  <span className={`size-1.5 rounded-full ${requiredOk ? "bg-green-500" : "bg-amber-500"}`} />
                  {activeTab === "Images" ? (requiredOk ? "Ready to submit" : "Fill required fields") : "Continue to next"}
                </span>
              </div>

              {/* Footer buttons: Cancel + Continue until last tab; Create only on last */}
              {activeTab !== "Images" ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/coupons")}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 w-full sm:w-auto disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={goNextTab}
                    disabled={isSubmitting}
                    className="px-5 py-2 text-sm font-semibold rounded-xl text-white w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
                  >
                    Continue
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/coupons")}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 w-full sm:w-auto disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!requiredOk || isSubmitting}
                    className={`px-5 py-2 text-sm font-semibold rounded-xl text-white w-full sm:w-auto transition-colors inline-flex items-center justify-center gap-2 ${
                      !requiredOk || isSubmitting ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <circle cx="12" cy="12" r="10" strokeWidth="2" opacity="0.25" />
                          <path d="M22 12a10 10 0 0 1-10 10" strokeWidth="2" />
                        </svg>
                        Creating…
                      </>
                    ) : (
                      "Create Coupon"
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Local styles */}
      <style jsx>{`
        .input {
          @apply w-full px-3 py-2 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-[15px];
        }
        .textarea {
          @apply w-full px-3 py-2 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-[15px];
        }
      `}</style>
    </form>
  );
}

// Utility: try to read server error body safely
async function safeErrorText(res: Response) {
  try {
    const txt = await res.text();
    return txt;
  } catch {
    return "";
  }
}

// ------- REUSABLES -------
function SectionCard({
  title,
  subtitle,
  requiredHint,
  children,
}: {
  title: string;
  subtitle?: string;
  requiredHint?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-gray-100 bg-gradient-to-b from-white to-gray-50">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{title}</h2>
              {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
            {requiredHint && (
              <span className="text-[11px] text-gray-500">Fields marked with * are required</span>
            )}
          </div>
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
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
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

function ToggleCheck({
  label,
  name,
  checked,
  onChange,
}: {
  label: string;
  name: string;
  checked: boolean;
  onChange: (e: any) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}
