// app/dashboard/coupons/EditCouponFormMobile.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCouponStore } from "@/store/couponsStore";

// WYSIWYG
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import { Editor } from "react-draft-wysiwyg";
import { EditorState, ContentState, convertFromHTML } from "draft-js";
import { stateToHTML } from "draft-js-export-html";

// ---- Types ----
interface Eligibility {
  user_type: string;
  first_booking?: boolean;
  min_cart_value?: number;
  min_group_size?: number;
  min_stay_nights?: number;
  stay_days?: string[];
  same_day_booking?: boolean;
  payment_type?: string;
  booking_time_cutoff?: string; // HH:MM (24h)
  id_check_required?: boolean;
  select_hotels_only?: boolean;
  participating_hotels_only?: boolean;
  booking_date?: string; // yyyy-mm-dd
  pickup_airport?: string;
  max_pickup_distance_km?: number;
  property_tags_required?: string[];
  segments?: string[];
}
interface Validity { start: string; end: string; }
interface StoreCoupon {
  _id: string;
  seq: number;
  name: string;
  coupon_code: string;
  details: string; // HTML or text
  price: string;
  eligibility: Eligibility;
  validity: Validity;
  terms_conditions: string[] | string; // may exist in store
  images?: string[];
}
interface CouponFormData {
  _id: string;
  seq: number | "";
  name: string;
  coupon_code: string;
  price: string;
  eligibility: Eligibility;
  validity: Validity;
  details: string;            // editor saves HTML into this on submit
  terms_conditions: string;   // editor saves HTML into this on submit
}
interface ImageFile { file: File; preview: string; }

// Convert ISO or {$date} to yyyy-mm-ddThh:mm
const toLocalDatetime = (isoString: string | { $date: string }): string => {
  const dateString = typeof isoString === "string" ? isoString : isoString.$date;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}`;
};

// Normalize terms (string | string[]) to HTML for the editor
const normalizeTermsToHTML = (terms: string[] | string | undefined): string => {
  if (!terms) return "";
  if (Array.isArray(terms)) {
    if (terms.length === 0) return "";
    const items = terms.map((t) => `<li>${escapeHtml(t)}</li>`).join("");
    return `<ul>${items}</ul>`;
  }
  // assume already HTML or plain text; if plain text with newlines, make list
  if (/<[a-z][\s\S]*>/i.test(terms)) return terms;
  const lines = terms
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return "";
  return `<ul>${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>`;
};

// simple HTML escaper for list items
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const initialBlankState: CouponFormData = {
  _id: "",
  seq: ("" as unknown) as number,
  name: "",
  coupon_code: "",
  price: "",
  eligibility: {
    user_type: "",
    stay_days: [],
    property_tags_required: [],
    segments: [],
    booking_time_cutoff: "",
  },
  validity: { start: "", end: "" },
  details: "",
  terms_conditions: "",
};

export default function EditCouponFormMobile() {
  const { coupon } = useCouponStore() as { coupon: StoreCoupon | null };
  const router = useRouter();

  useEffect(() => {
    if (coupon === undefined) return;
    if (!coupon) router.push("/dashboard/coupons");
  }, [coupon, router]);

  const [formData, setFormData] = useState<CouponFormData>(initialBlankState);
  const [editorState, setEditorState] = useState<EditorState>(() => EditorState.createEmpty());
  const [termsEditorState, setTermsEditorState] = useState<EditorState>(() => EditorState.createEmpty());

  // Images
  const [newImages, setNewImages] = useState<ImageFile[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [removedImageUrls, setRemovedImageUrls] = useState<string[]>([]);

  // Comma fields
  const [stayDays, setStayDays] = useState("");
  const [propertyTags, setPropertyTags] = useState("");
  const [segments, setSegments] = useState("");

  // Tabs
  type TabKey = "basics" | "eligibility" | "images";
  const [activeTab, setActiveTab] = useState<TabKey>("basics");

  // Loading state for submit
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  // Initialize from store coupon
  useEffect(() => {
    if (!coupon) return;

    // Details editor init
    const detailsHtml = coupon.details || "";
    try {
      const blocks = convertFromHTML(detailsHtml);
      const content = ContentState.createFromBlockArray(blocks.contentBlocks, blocks.entityMap);
      setEditorState(EditorState.createWithContent(content));
    } catch {
      setEditorState(EditorState.createEmpty());
    }

    // Terms editor init
    const termsHtml = normalizeTermsToHTML(coupon.terms_conditions);
    try {
      const blocks = convertFromHTML(termsHtml);
      const content = ContentState.createFromBlockArray(blocks.contentBlocks, blocks.entityMap);
      setTermsEditorState(EditorState.createWithContent(content));
    } catch {
      setTermsEditorState(EditorState.createEmpty());
    }

    setFormData({
      _id: coupon._id,
      seq: coupon.seq,
      name: coupon.name,
      coupon_code: coupon.coupon_code,
      price: coupon.price,
      eligibility: {
        ...coupon.eligibility,
        stay_days: coupon.eligibility.stay_days || [],
        property_tags_required: coupon.eligibility.property_tags_required || [],
        segments: coupon.eligibility.segments || [],
        min_cart_value: coupon.eligibility.min_cart_value || undefined,
        min_group_size: coupon.eligibility.min_group_size || undefined,
        min_stay_nights: coupon.eligibility.min_stay_nights || undefined,
        max_pickup_distance_km: coupon.eligibility.max_pickup_distance_km || undefined,
      },
      validity: {
        start: toLocalDatetime(coupon.validity.start),
        end: toLocalDatetime(coupon.validity.end),
      },
      details: detailsHtml,
      terms_conditions: termsHtml,
    });

    setStayDays(coupon.eligibility.stay_days?.join(", ") || "");
    setPropertyTags(coupon.eligibility.property_tags_required?.join(", ") || "");
    setSegments(coupon.eligibility.segments?.join(", ") || "");
    setExistingImageUrls(coupon.images || []);
    setRemovedImageUrls([]);
  }, [coupon]);

  // Required check
  const detailsOk = editorState.getCurrentContent().hasText();
  const requiredOk =
    !!formData.seq &&
    formData.name.trim().length > 0 &&
    formData.coupon_code.trim().length > 0 &&
    formData.price.trim().length > 0 &&
    !!formData.validity.start &&
    !!formData.validity.end &&
    formData.eligibility.user_type.trim().length > 0 &&
    detailsOk;

  if (!coupon) {
    return (
      <div className="min-h-screen grid place-items-center">
        <p className="text-gray-500">Loading coupon data or redirecting...</p>
      </div>
    );
  }

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
      setFormData((prev) => ({ ...prev, validity: { ...prev.validity, [field]: value } }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: type === "number" ? Number(value) : value }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    const mapped = files.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setNewImages((prev) => [...prev, ...mapped]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeNewImage = (index: number) => {
    setNewImages((prev) => {
      URL.revokeObjectURL(prev[index]?.preview);
      return prev.filter((_, i) => i !== index);
    });
  };
  const removeExistingImage = (urlToRemove: string) => {
    setExistingImageUrls((prev) => prev.filter((url) => url !== urlToRemove));
    setRemovedImageUrls((prev) => [...prev, urlToRemove]);
  };

  const resetForm = () => {
    newImages.forEach((img) => URL.revokeObjectURL(img.preview));
    setNewImages([]);
    setRemovedImageUrls([]);
    setActiveTab("basics");

    if (coupon) {
      const detailsHtml = coupon.details || "";
      const termsHtml = normalizeTermsToHTML(coupon.terms_conditions);

      // reset editors
      try {
        const b = convertFromHTML(detailsHtml);
        setEditorState(EditorState.createWithContent(ContentState.createFromBlockArray(b.contentBlocks, b.entityMap)));
      } catch {
        setEditorState(EditorState.createEmpty());
      }
      try {
        const tb = convertFromHTML(termsHtml);
        setTermsEditorState(
          EditorState.createWithContent(ContentState.createFromBlockArray(tb.contentBlocks, tb.entityMap))
        );
      } catch {
        setTermsEditorState(EditorState.createEmpty());
      }

      setFormData({
        _id: coupon._id,
        seq: coupon.seq,
        name: coupon.name,
        coupon_code: coupon.coupon_code,
        price: coupon.price,
        eligibility: {
          ...coupon.eligibility,
          stay_days: coupon.eligibility.stay_days || [],
          property_tags_required: coupon.eligibility.property_tags_required || [],
          segments: coupon.eligibility.segments || [],
          min_cart_value: coupon.eligibility.min_cart_value || undefined,
          min_group_size: coupon.eligibility.min_group_size || undefined,
          min_stay_nights: coupon.eligibility.min_stay_nights || undefined,
          max_pickup_distance_km: coupon.eligibility.max_pickup_distance_km || undefined,
        },
        validity: {
          start: toLocalDatetime(coupon.validity.start),
          end: toLocalDatetime(coupon.validity.end),
        },
        details: detailsHtml,
        terms_conditions: termsHtml,
      });
      setStayDays(coupon.eligibility.stay_days?.join(", ") || "");
      setPropertyTags(coupon.eligibility.property_tags_required?.join(", ") || "");
      setSegments(coupon.eligibility.segments?.join(", ") || "");
      setExistingImageUrls(coupon.images || []);
    } else {
      setEditorState(EditorState.createEmpty());
      setTermsEditorState(EditorState.createEmpty());
      setFormData(initialBlankState);
      setStayDays("");
      setPropertyTags("");
      setSegments("");
      setExistingImageUrls([]);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Only allow submit from the Images tab
    if (activeTab !== "images" || isSubmitting) return;

    if (!requiredOk) {
      alert("Please fill all required fields marked with *");
      return;
    }

    try {
      setIsSubmitting(true);

      const detailsHTML = stateToHTML(editorState.getCurrentContent());
      const termsHTML = stateToHTML(termsEditorState.getCurrentContent());

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
        images: existingImageUrls,
      };

      const submitFormData = new FormData();
      submitFormData.append("data", JSON.stringify(processedData));
      submitFormData.append("images_keep", JSON.stringify(existingImageUrls));
      submitFormData.append("images_removed", JSON.stringify(removedImageUrls));
      newImages.forEach((img) => submitFormData.append("images", img.file));
      submitFormData.append(
        "images_change_summary",
        JSON.stringify({
          kept_count: existingImageUrls.length,
          removed_count: removedImageUrls.length,
          added_count: newImages.length,
        })
      );

      const url = `${process.env.NEXT_PUBLIC_API_BASE}coupons/update/${coupon._id}`;
      const response = await fetch(url, { method: "PUT", body: submitFormData });

      if (response.ok) {
        alert("Coupon updated successfully! 🎉");
        router.push("/dashboard/coupons");
      } else {
        const errorText = await response.text();
        console.error("Update failed:", errorText);
        alert(`Failed to update coupon: ${errorText}`);
      }
    } catch (err) {
      console.error("Update failed:", err);
      alert(`An error occurred during update: ${(err as Error)?.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const goNextTab = () => {
    setActiveTab((t) => (t === "basics" ? "eligibility" : t === "eligibility" ? "images" : "images"));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-0 sm:px-4 md:px-4">
      <div className="w-full max-w-6xl ml-auto rounded-none sm:rounded-2xl bg-white p-4 sm:p-6 md:p-8 shadow-none sm:shadow-lg min-h-screen sm:min-h-0">
        <form
          ref={formRef}
          className={`bg-white rounded-none sm:rounded-2xl shadow-none sm:shadow-md space-y-4 sm:space-y-6 ${isSubmitting ? "cursor-wait" : ""}`}
          onSubmit={handleSubmit}
          // Prevent Enter from submitting unless on the last tab
          onKeyDown={(e) => {
            if (e.key === "Enter" && activeTab !== "images") {
              e.preventDefault();
            }
          }}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-6">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-blue-600 text-white grid place-items-center text-sm font-semibold shadow-sm">
                E{coupon.seq}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 leading-tight">
                  Edit Coupon: {coupon.coupon_code}
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">ID: {coupon._id.substring(0, 8)}... | Mobile-first</p>
              </div>
            </div>
            <button
              type="button"
              onClick={resetForm}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-[.99] disabled:opacity-60 touch-manipulation"
              aria-label="Reset form to original data"
            >
              Reset
            </button>
          </div>

          <main className="pb-4 sm:pb-6">
        {/* Tabs */}
        <div role="tablist" aria-label="Edit coupon sections" className="flex gap-3 mt-4">
          <TabPill label="Basics" isActive={activeTab === "basics"} onClick={() => setActiveTab("basics")} disabled={isSubmitting}/>
          <TabPill label="Eligibility" isActive={activeTab === "eligibility"} onClick={() => setActiveTab("eligibility")} disabled={isSubmitting}/>
          <TabPill label="Images" isActive={activeTab === "images"} onClick={() => setActiveTab("images")} disabled={isSubmitting}/>
        </div>

        {/* Panels */}
        {activeTab === "basics" && (
          <SectionCard title="Basics" requiredHint>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Sequence Number" required>
                <input
                  type="number"
                  name="seq"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.seq}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="e.g., 1"
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
                />
              </Field>
              <Field label="Price" required hint="Accepts currency text or %">
                <input
                  type="text"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="₹500 or 10%"
                  inputMode="decimal"
                  disabled={isSubmitting}
                />
              </Field>
            </div>

            {/* Details */}
            <Field label="Details" required>
              <div className={`rounded-xl border border-gray-300 bg-white ${isSubmitting ? "opacity-70" : ""}`}>
                <Editor
                  editorState={editorState}
                  onEditorStateChange={setEditorState}
                  toolbarClassName="rdw-toolbar-wrapper rounded-t-xl border-b"
                  wrapperClassName="rdw-wrapper"
                  editorClassName="px-3 py-2 min-h-[140px]"
                  readOnly={isSubmitting}
                  toolbarHidden={isSubmitting}
                  toolbar={{
                    options: ["inline", "blockType", "list","remove", "history"],
                    inline: { options: ["bold", "italic", "underline"] },
                    list: { options: ["unordered", "ordered"] },
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Rich text will be saved as HTML.</p>
            </Field>

           

            <SectionCard title="Validity Period" subtitle="When can this coupon be used?">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Start Date" required>
                  <input
                    type="datetime-local"
                    name="validity.start"
                    value={formData.validity.start}
                    onChange={handleInputChange}
                    className="input"
                    disabled={isSubmitting}
                  />
                </Field>
                <Field label="End Date" required>
                  <input
                    type="datetime-local"
                    name="validity.end"
                    value={formData.validity.end}
                    onChange={handleInputChange}
                    className="input"
                    disabled={isSubmitting}
                  />
                </Field>

           {/* Terms & Conditions (full width on sm+) */}
<div className="sm:col-span-2">
  <Field label="Terms & Conditions">
    <div className={`rounded-xl border border-gray-300 bg-white ${isSubmitting ? "opacity-70" : ""}`}>
      <Editor
        editorState={termsEditorState}
        onEditorStateChange={setTermsEditorState}
        toolbarClassName="rdw-toolbar-wrapper rounded-t-xl border-b"
        wrapperClassName="rdw-wrapper"
        editorClassName="px-3 py-2 min-h-[140px]"
        readOnly={isSubmitting}
        toolbarHidden={isSubmitting}
        toolbar={{
          options: ["inline", "blockType", "list", "remove", "history"],
          inline: { options: ["bold", "italic", "underline"] },
          list: { options: ["unordered", "ordered"] },
        }}
      />
    </div>
    <p className="mt-1 text-xs text-gray-500">Add rules as bullets; saved as HTML.</p>
  </Field>
</div>

              </div>
            </SectionCard>

          </SectionCard>
        )}

        {activeTab === "eligibility" && (
          <SectionCard title="Eligibility" subtitle="Who qualifies and under what conditions?">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="User Type" required>
                <input
                  type="text"
                  name="eligibility.user_type"
                  value={formData.eligibility.user_type}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="e.g., new_user, loyalty_gold"
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
                />
              </Field>

              <Field label="Stay Days (comma-separated)">
                <input
                  type="text"
                  value={stayDays}
                  onChange={(e) => setStayDays(e.target.value)}
                  className="input"
                  placeholder="Monday, Tuesday"
                  disabled={isSubmitting}
                />
              </Field>

              <Field label="Property Tags Required (comma-separated)">
                <input
                  type="text"
                  value={propertyTags}
                  onChange={(e) => setPropertyTags(e.target.value)}
                  className="input"
                  placeholder="luxury, pool, beach"
                  disabled={isSubmitting}
                />
              </Field>

              <Field label="Segments (comma-separated)">
                <input
                  type="text"
                  value={segments}
                  onChange={(e) => setSegments(e.target.value)}
                  className="input"
                  placeholder="premium, business, leisure"
                  disabled={isSubmitting}
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
        )}

        {activeTab === "images" && (
          <SectionCard title="Images" subtitle="Current and newly uploaded images.">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
              {existingImageUrls.map((url) => (
                <div
                  key={url}
                  className="relative rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm group"
                >
                  <img src={url} alt="Existing" className="w-full h-28 object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(url)}
                    disabled={isSubmitting}
                    className="absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg text-sm font-bold disabled:opacity-60"
                    title="Remove existing image"
                    aria-label="Remove existing image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18" /><path d="M6 6L18 18" />
                    </svg>
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-white text-[10px] truncate">EXISTING</p>
                  </div>
                </div>
              ))}

              {newImages.map((image, index) => (
                <div
                  key={image.preview}
                  className="relative rounded-xl overflow-hidden border-2 border-dashed border-blue-400 bg-blue-50"
                >
                  <img src={image.preview} alt={`New ${index + 1}`} className="w-full h-28 object-cover opacity-70" />
                  <button
                    type="button"
                    onClick={() => removeNewImage(index)}
                    disabled={isSubmitting}
                    className="absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg text-sm font-bold disabled:opacity-60"
                    title="Remove new image"
                    aria-label="Remove new image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18" /><path d="M6 6L18 18" />
                    </svg>
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-white text-[10px] truncate" title={image.file.name}>NEW {image.file.name}</p>
                  </div>
                </div>
              ))}

              {existingImageUrls.length === 0 && newImages.length === 0 && (
                <label className="block col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-center w-full h-full min-h[112px] px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 transition-colors bg-white">
                    <div className="text-center">
                      <svg className="mx-auto h-8 w-8 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="mt-1 text-sm text-gray-700">Add More</p>
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
              )}
            </div>

            <div className="mt-2">
              <label className="inline-flex">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <span
                  onClick={() => !isSubmitting && fileInputRef.current?.click()}
                  className="px-3 py-2 rounded-xl border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Upload Images
                </span>
              </label>
            </div>
          </SectionCard>
        )}
          </main>

          {/* Sticky action bar */}
          <div className="sticky bottom-0 z-40 mt-4 sm:mt-6">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-4">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-900/5">
            <div className="p-3 sm:p-4 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 rounded-full px-2.5 py-1">
                  <span className={`size-1.5 rounded-full ${requiredOk ? "bg-green-500" : "bg-amber-500"}`} />
                  {requiredOk ? "Ready to update" : "Fill required fields"}
                </span>
              </div>

              {/* Buttons vary by tab */}
              {activeTab !== "images" ? (
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
                    type="button"
                    disabled={!requiredOk || isSubmitting}
                    onClick={() => formRef.current?.requestSubmit()}
                    aria-busy={isSubmitting}
                    className={`px-5 py-2 text-sm font-semibold rounded-xl text-white w-full sm:w-auto transition-colors inline-flex items-center justify-center gap-2 ${
                      !requiredOk || isSubmitting
                        ? "bg-green-300 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {isSubmitting && (
                      <svg
                        className="animate-spin h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round"></path>
                      </svg>
                    )}
                    {isSubmitting ? "Updating..." : "Update Coupon"}
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
      `}</style>
        </form>
      </div>
    </div>
  );
}

/* ------- REUSABLES ------- */
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

function TabPill({
  label,
  isActive,
  onClick,
  disabled,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button" // never submit
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={onClick}
      className={`px-5 py-2 rounded-2xl text-sm font-semibold transition-colors border ${
        isActive
          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
          : "bg-white text-gray-700 border-gray-200 hover:border-blue-400"
      } ${disabled ? "opacity-60" : ""}`}
    >
      {label}
    </button>
  );
}
