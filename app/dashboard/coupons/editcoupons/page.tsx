// app/dashboard/coupons/EditCouponFormMobile.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCouponStore } from "@/store/couponsStore";

// ---- Types (same as you had) ----
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

interface Validity {
  start: string; // ISO string or yyyy-mm-ddThh:mm
  end: string;
}

interface StoreCoupon {
  _id: string;
  seq: number;
  name: string;
  coupon_code: string;
  details: string;
  price: string;
  eligibility: Eligibility;
  validity: Validity;
  terms_conditions: string[] | string;
  images?: string[];
}

interface CouponFormData {
  _id: string;
  seq: number | "";
  name: string;
  coupon_code: string;
  details: string;
  price: string;
  eligibility: Eligibility;
  validity: Validity;
  terms_conditions: string; // newline-separated in the form
}

interface ImageFile {
  file: File;
  preview: string;
}

// Convert ISO or {$date} to yyyy-mm-ddThh:mm
const toLocalDatetime = (isoString: string | { $date: string }): string => {
  const dateString = typeof isoString === "string" ? isoString : isoString.$date;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const initialBlankState: CouponFormData = {
  _id: "",
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
};

export default function EditCouponFormMobile() {
  const { coupon } = useCouponStore() as {
    coupon: StoreCoupon | null;
  };
  const router = useRouter();

  // Redirect if no coupon in store
  useEffect(() => {
    if (coupon === undefined) return;
    if (!coupon) {
      router.push("/dashboard/coupons");
    }
  }, [coupon, router]);

  const [formData, setFormData] = useState<CouponFormData>(initialBlankState);
  const [newImages, setNewImages] = useState<ImageFile[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [removedImageUrls, setRemovedImageUrls] = useState<string[]>([]);

  const [stayDays, setStayDays] = useState("");
  const [propertyTags, setPropertyTags] = useState("");
  const [segments, setSegments] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize from store coupon
  useEffect(() => {
    if (coupon) {
      setFormData({
        _id: coupon._id,
        seq: coupon.seq,
        name: coupon.name,
        coupon_code: coupon.coupon_code,
        details: coupon.details,
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
        terms_conditions: Array.isArray(coupon.terms_conditions)
          ? coupon.terms_conditions.join("\n")
          : "",
      });

      setStayDays(coupon.eligibility.stay_days?.join(", ") || "");
      setPropertyTags(coupon.eligibility.property_tags_required?.join(", ") || "");
      setSegments(coupon.eligibility.segments?.join(", ") || "");
      setExistingImageUrls(coupon.images || []);
      setRemovedImageUrls([]);
    }
  }, [coupon]);

  // ✅ Derived boolean (NOT a hook) – safe even with early returns
  const requiredOk =
    !!formData.seq &&
    formData.name.trim().length > 0 &&
    formData.coupon_code.trim().length > 0 &&
    formData.details.trim().length > 0 &&
    formData.price.trim().length > 0 &&
    !!formData.validity.start &&
    !!formData.validity.end &&
    formData.eligibility.user_type.trim().length > 0;

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

    if (coupon) {
      setFormData({
        _id: coupon._id,
        seq: coupon.seq,
        name: coupon.name,
        coupon_code: coupon.coupon_code,
        details: coupon.details,
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
        terms_conditions: Array.isArray(coupon.terms_conditions)
          ? coupon.terms_conditions.join("\n")
          : "",
      });
      setStayDays(coupon.eligibility.stay_days?.join(", ") || "");
      setPropertyTags(coupon.eligibility.property_tags_required?.join(", ") || "");
      setSegments(coupon.eligibility.segments?.join(", ") || "");
      setExistingImageUrls(coupon.images || []);
    } else {
      setFormData(initialBlankState);
      setStayDays("");
      setPropertyTags("");
      setSegments("");
      setExistingImageUrls([]);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!requiredOk) {
      alert("Please fill all required fields marked with *");
      return;
    }

    try {
      // Normalize payload
      const processedData = {
        ...formData,
        eligibility: {
          ...formData.eligibility,
          stay_days: stayDays ? stayDays.split(",").map((s) => s.trim()).filter(Boolean) : [],
          property_tags_required: propertyTags
            ? propertyTags.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
          segments: segments ? segments.split(",").map((s) => s.trim()).filter(Boolean) : [],
        },
        terms_conditions: formData.terms_conditions
          ? formData.terms_conditions.split("\n").map((s) => s.trim()).filter(Boolean)
          : [],
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
      console.log("UPDATE URL =>", url);

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
    }
  };

  return (
    <form className="min-h-screen bg-gray-50" onSubmit={handleSubmit}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200 px-4 py-3 sm:px-6">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="size-9 rounded-xl bg-blue-600 text-white grid place-items-center text-sm font-semibold shadow-sm">
            E{coupon.seq}
          </div>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-gray-900 leading-tight">
              Edit Coupon: {coupon.coupon_code}
            </h1>
            <p className="text-xs text-gray-500">
              ID: {coupon._id.substring(0, 8)}... | Mobile-first
            </p>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-[.99]"
            aria-label="Reset form to original data"
          >
            Reset
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-28">
        {/* Basic Information */}
        <SectionCard
          title="Basic Information"
          subtitle="Tell us the essentials about this coupon."
          requiredHint
        >
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
            <Field label="Price" required hint="Accepts currency text or %">
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

          <Field label="Details" required>
            <textarea
              name="details"
              value={formData.details}
              onChange={handleInputChange}
              rows={3}
              className="textarea"
              placeholder="Short description that will be shown to users"
            />
          </Field>
        </SectionCard>

        {/* Validity */}
        <SectionCard title="Validity Period" subtitle="When can this coupon be used?">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Start Date" required>
              <input
                type="datetime-local"
                name="validity.start"
                value={formData.validity.start}
                onChange={handleInputChange}
                className="input"
              />
            </Field>
            <Field label="End Date" required>
              <input
                type="datetime-local"
                name="validity.end"
                value={formData.validity.end}
                onChange={handleInputChange}
                className="input"
              />
            </Field>
          </div>
        </SectionCard>

        {/* Eligibility */}
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

          {/* Toggles */}
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

        {/* Terms & Conditions */}
        <SectionCard title="Terms & Conditions" subtitle="One rule per line.">
          <textarea
            name="terms_conditions"
            value={formData.terms_conditions}
            onChange={handleInputChange}
            placeholder={`Enter each term on a new line\nExample: Not valid on blackout dates`}
            rows={5}
            className="block w-full max-w-full px-3 py-2 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-grey-500 focus:border-grey-500 text-[15px] min-h-[120px] resize-y"
          />
          <p className="mt-1 text-xs text-gray-500">We’ll convert these to a list on submit.</p>
        </SectionCard>

        {/* Images */}
        <SectionCard title="Images" subtitle="Current and newly uploaded images.">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
            {/* Existing Images */}
            {existingImageUrls.map((url, index) => (
              <div
                key={url}
                className="relative rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm group"
              >
                <img src={url} alt={`Existing Image ${index + 1}`} className="w-full h-28 object-cover" />
                <button
                  type="button"
                  onClick={() => removeExistingImage(url)}
                  className="absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg text-sm font-bold"
                  title="Remove existing image"
                  aria-label="Remove existing image"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="size-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6L6 18" />
                    <path d="M6 6L18 18" />
                  </svg>
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-white text-[10px] truncate">EXISTING</p>
                </div>
              </div>
            ))}

            {/* New Images */}
            {newImages.map((image, index) => (
              <div
                key={image.preview}
                className="relative rounded-xl overflow-hidden border-2 border-dashed border-blue-400 bg-blue-50"
              >
                <img
                  src={image.preview}
                  alt={`New Image ${index + 1}`}
                  className="w-full h-28 object-cover opacity-70"
                />
                <button
                  type="button"
                  onClick={() => removeNewImage(index)}
                  className="absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg text-sm font-bold"
                  title="Remove new image"
                  aria-label="Remove new image"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="size-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6L6 18" />
                    <path d="M6 6L18 18" />
                  </svg>
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-white text-[10px] truncate" title={image.file.name}>
                    NEW {image.file.name}
                  </p>
                </div>
              </div>
            ))}

            {existingImageUrls.length === 0 && newImages.length === 0 && (
              <label className="block col-span-2 sm:col-span-1">
                <div className="flex items-center justify-center w-full h-full min-h[112px] px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 transition-colors bg-white">
                  <div className="text-center">
                    <svg
                      className="mx-auto h-8 w-8 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
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
        </SectionCard>
      </main>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-4">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-900/5">
            <div className="p-3 sm:p-4 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 rounded-full px-2.5 py-1">
                  <span
                    className={`size-1.5 rounded-full ${
                      requiredOk ? "bg-green-500" : "bg-amber-500"
                    }`}
                  />
                  {requiredOk ? "Ready to update" : "Fill required fields"}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/coupons")}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 w-full sm:w-auto"
                >
                  Cancel
                </button>

                {/* IMPORTANT: submit button has NO onClick; form handles onSubmit */}
                <button
                  type="submit"
                  disabled={!requiredOk}
                  className={`px-5 py-2 text-sm font-semibold rounded-xl text-white w-full sm:w-auto transition-colors ${
                    requiredOk ? "bg-green-600 hover:bg-green-700" : "bg-green-300 cursor-not-allowed"
                  }`}
                >
                  Update Coupon
                </button>
              </div>
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

// ------- REUSABLES (unchanged) -------
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
