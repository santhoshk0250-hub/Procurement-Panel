"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Save, X, Upload, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

/** ---------- WYSIWYG imports ---------- */
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import { Editor } from "react-draft-wysiwyg";
import { EditorState, ContentState, convertFromHTML } from "draft-js";
import { stateToHTML } from "draft-js-export-html";

/** ---------- Config ---------- */
// Build-time replaced by Next.js (available in client components)
const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

// tiny helper to avoid double slashes
const joinUrl = (base: string, path: string) =>
  `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;

// fail fast if the env var is missing
if (!API_BASE) {
  throw new Error("Missing NEXT_PUBLIC_API_BASE. Set it in your .env.local");
}

const BASE = joinUrl(API_BASE, "/activity/create");


const AFTER_SAVE_REDIRECT = "/dashboard/Activities";

/** Array key helper (toggle [] if your backend needs it) */
const USE_BRACKETS_FOR_ARRAYS = true;
const ARRAY = (k: string) => (USE_BRACKETS_FOR_ARRAYS ? `${k}[]` : k);

/** ---------- Types ---------- */
type TabName =
  | "Activity Details"
  | "Price Configuration"
  | "Schedule"
  | "Surcharges"
  | "Images & Videos";

type DateSurcharge = {
  mode: "single" | "range";
  startDate: string;
  endDate: string;
  surchargeAmount: string;
  surchargeType: "fixed" | "percentage";
};

type UploadDraft = {
  newImageFiles: File[];
  newVideoFiles: File[];
  keepImageUrls: string[];
  keepVideoUrls: string[];
};

type DraftActivity = {
  name: string;
  description: string; // HTML produced by the editor
  destination: string;
  coverImage?: string | null;

  vendorPrice: string;
  sellingPrice: string;
  taxRate: string;
  taxIncluded: boolean;

  dateSurcharges: DateSurcharge[];

  operatingDays: string[];
  openTime: string;
  closeTime: string;
  duration: string;
  durationType: "min" | "hrs";
  pickupLocation: string;
  dropLocation: string;

  images: string[];
  videos: string[]; // URLs: can be server URLs or blob: previews

  isComplete: boolean;
};

type ActivityPayload = {
  name: string;
  description: string;
  destination: string;
  coverImage?: string | null;
  vendorPrice: number;
  sellingPrice: number;
  taxRate: number;
  taxIncluded: boolean;
  dateSurcharges: Array<{
    mode: "single" | "range";
    startDate: string;
    endDate: string;
    surchargeAmount: number;
    surchargeType: "fixed" | "percentage";
  }>;
  operatingDays: string[];
  openTime: string;
  closeTime: string;
  duration: number;
  durationType: "min" | "hrs";
  pickupLocation: string;
  dropLocation: string;
  keepImageUrls?: string[];
  keepVideoUrls?: string[];
  isComplete: boolean;
};

/** ---------- FormData builder ---------- */
function buildFlatFormData(params: {
  payload: ActivityPayload;
  imageFiles: File[];
  videoFiles: File[];
  imagesKey?: string;
  videosKey?: string;
}) {
  const {
    payload,
    imageFiles,
    videoFiles,
    imagesKey = "images",
    videosKey = "videos",
  } = params;

  const fd = new FormData();

  fd.append("name", payload.name);
  fd.append("description", payload.description);
  fd.append("destination", payload.destination);
  if (payload.coverImage != null) fd.append("coverImage", String(payload.coverImage ?? ""));

  fd.append("vendorPrice", String(payload.vendorPrice));
  fd.append("sellingPrice", String(payload.sellingPrice));
  fd.append("taxRate", String(payload.taxRate));
  fd.append("taxIncluded", String(payload.taxIncluded));

  fd.append("openTime", payload.openTime);
  fd.append("closeTime", payload.closeTime);
  fd.append("duration", String(payload.duration));
  fd.append("durationType", payload.durationType);

  fd.append("pickupLocation", payload.pickupLocation);
  fd.append("dropLocation", payload.dropLocation);

  fd.append("isComplete", String(payload.isComplete));

  (payload.operatingDays || []).forEach((d) => fd.append(ARRAY("operatingDays"), d));
  fd.append("dateSurcharges", JSON.stringify(payload.dateSurcharges || []));

  for (const f of imageFiles) fd.append(imagesKey, f, f.name);
  for (const f of videoFiles) fd.append(videosKey, f, f.name);

  return fd;
}

async function saveActivityBinary({
  baseUrl,
  payload,
  imageFiles,
  videoFiles,
  imagesKey,
  videosKey,
  signal,
}: {
  baseUrl: string;
  payload: ActivityPayload;
  imageFiles: File[];
  videoFiles: File[];
  imagesKey?: string;
  videosKey?: string;
  signal?: AbortSignal;
}) {
  const body = buildFlatFormData({
    payload,
    imageFiles,
    videoFiles,
    imagesKey,
    videosKey,
  });

  const res = await fetch(baseUrl, { method: "POST", body, signal });
  const text = await res.text();
  let data: any = text;
  try {
    data = JSON.parse(text);
  } catch {}
  if (!res.ok) {
    const message = (data && (data.message || data.error)) || text || `HTTP ${res.status}`;
    throw new Error(message);
  }
  return data;
}

/** ---------- Page Component ---------- */
export default function AddLeisureActivityPage() {
  const router = useRouter();

  const tabs: TabName[] = useMemo(
    () => [
      "Activity Details",
      "Price Configuration",
      "Schedule",
      "Surcharges",
      "Images & Videos",
    ],
    []
  );

  const [activeTab, setActiveTab] = useState<TabName>("Activity Details");
  const [isSaving, setIsSaving] = useState(false);

  const [locations, setLocations] = useState<string[]>([
    "Baga Beach",
    "Calangute Beach",
    "Candolim",
    "Anjuna",
  ]);
  const [pickupCustom, setPickupCustom] = useState("");
  const [dropCustom, setDropCustom] = useState("");

  const [form, setForm] = useState<DraftActivity>({
    name: "",
    description: "",
    destination: "",
    coverImage: null,

    vendorPrice: "",
    sellingPrice: "",
    taxRate: "",
    taxIncluded: true,

    dateSurcharges: [],

    operatingDays: [],
    openTime: "",
    closeTime: "",
    duration: "",
    durationType: "hrs",
    pickupLocation: "",
    dropLocation: "",

    images: [],
    videos: [],

    isComplete: false,
  });

  const [uploads, setUploads] = useState<UploadDraft>({
    newImageFiles: [],
    newVideoFiles: [],
    keepImageUrls: [],
    keepVideoUrls: [],
  });

  /** WYSIWYG editor state */
  const [descEditor, setDescEditor] = useState<EditorState>(EditorState.createEmpty());
  useEffect(() => {
    if (form.description?.trim()) {
      const blocks = convertFromHTML(form.description);
      const content = ContentState.createFromBlockArray(blocks.contentBlocks, blocks.entityMap);
      setDescEditor(EditorState.createWithContent(content));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Ensure at least one surge card when entering the tab */
  const blankSurcharge: DateSurcharge = {
    mode: "single",
    startDate: "",
    endDate: "",
    surchargeAmount: "",
    surchargeType: "fixed",
  };
  useEffect(() => {
    if (activeTab === "Surcharges" && form.dateSurcharges.length === 0) {
      setForm((prev) => ({ ...prev, dateSurcharges: [blankSurcharge] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const getCurrentTabIndex = () => tabs.indexOf(activeTab);
  const isLastTab = () => getCurrentTabIndex() === tabs.length - 1;
  const isFirstTab = () => getCurrentTabIndex() === 0;

  /** ---------- Field helpers ---------- */
  const updateField = <K extends keyof DraftActivity>(field: K, value: DraftActivity[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateSurchargeAt = <K extends keyof DateSurcharge>(
    index: number,
    key: K,
    value: DateSurcharge[K]
  ) => {
    setForm((prev) => {
      const next = [...prev.dateSurcharges];
      const curr = { ...next[index], [key]: value } as DateSurcharge;
      if (key === "mode" && value === "single") {
        curr.endDate = curr.startDate;
      }
      if (key === "startDate" && curr.mode === "single") {
        curr.endDate = String(value);
      }
      next[index] = curr;
      return { ...prev, dateSurcharges: next };
    });
  };

  const addSurchargeCard = () => {
    setForm((prev) => ({ ...prev, dateSurcharges: [...prev.dateSurcharges, blankSurcharge] }));
  };

  const removeSurchargeCard = (index: number) => {
    setForm((prev) => ({
      ...prev,
      dateSurcharges: prev.dateSurcharges.filter((_, i) => i !== index),
    }));
  };

  const toggleDay = (day: string) => {
    const days = form.operatingDays || [];
    updateField(
      "operatingDays",
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day]
    );
  };

  const toggleAllDays = () => {
    const days = form.operatingDays || [];
    updateField("operatingDays", days.length === allDays.length ? [] : [...allDays]);
  };

  const addCustomLocation = (loc: string) => {
    const trimmed = loc.trim();
    if (trimmed && !locations.includes(trimmed)) {
      setLocations((prev) => [...prev, trimmed]);
    }
  };

  /** ---------- Media handlers ---------- */
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    setUploads((u) => ({ ...u, newImageFiles: [...u.newImageFiles, ...newFiles] }));
    const previews = newFiles.map((f) => URL.createObjectURL(f));
    updateField("images", [...(form.images || []), ...previews]);
  };

  // UPDATED: create video previews with blob: URLs (and store files)
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    setUploads((u) => ({ ...u, newVideoFiles: [...u.newVideoFiles, ...newFiles] }));

    const previews = newFiles.map((f) => URL.createObjectURL(f));
    updateField("videos", [...(form.videos || []), ...previews]);
  };

  // UPDATED: revoke blob URL if needed
  const handleRemoveVideo = (index: number) => {
    const vids = form.videos || [];
    const removed = vids[index];
    updateField(
      "videos",
      vids.filter((_, i) => i !== index)
    );
    if (removed?.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(removed);
      } catch {}
    }
  };

  const handleRemoveImage = (index: number) => {
    const imgs = form.images || [];
    const removed = imgs[index];
    updateField(
      "images",
      imgs.filter((_, i) => i !== index)
    );
    if (removed?.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(removed);
      } catch {}
    }
  };

  /** ---------- Validation ---------- */
  const dateToNum = (d: string) => (d ? Number(d.replace(/-/g, "")) : 0);
  const rangesOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
    if (!aStart || !aEnd || !bStart || !bEnd) return false;
    const aS = dateToNum(aStart),
      aE = dateToNum(aEnd);
    const bS = dateToNum(bStart),
      bE = dateToNum(bEnd);
    return aS <= bE && bS <= aE;
  };

  const validateAll = (draft: DraftActivity, up: UploadDraft) => {
    const errors: string[] = [];
    let focus: TabName | undefined;

    // details
    if (!draft.name?.trim()) {
      errors.push("Path `name` is required.");
      focus ||= "Activity Details";
    }

    const descHasText = descEditor.getCurrentContent().hasText();
    if (!descHasText) {
      errors.push("Path `description` is required.");
      focus ||= "Activity Details";
    }

    if (!draft.destination?.trim()) {
      errors.push("Path `destination` is required.");
      focus ||= "Activity Details";
    }

    // price
    if (!draft.vendorPrice) {
      errors.push("Vendor price is required");
      focus ||= "Price Configuration";
    }
    if (!draft.sellingPrice) {
      errors.push("Selling price is required");
      focus ||= "Price Configuration";
    }
    if (draft.taxIncluded && !draft.taxRate) {
      errors.push("Tax rate is required when tax is included");
      focus ||= "Price Configuration";
    }

    // schedule
    if (!draft.operatingDays?.length) {
      errors.push("At least one operating day is required");
      focus ||= "Schedule";
    }
    if (!draft.openTime) {
      errors.push("Path `openTime` is required.");
      focus ||= "Schedule";
    }
    if (!draft.closeTime) {
      errors.push("Path `closeTime` is required.");
      focus ||= "Schedule";
    }
    if (!draft.duration) {
      errors.push("Activity duration is required");
      focus ||= "Schedule";
    }
    if (!draft.pickupLocation) {
      errors.push("Path `pickupLocation` is required.");
      focus ||= "Schedule";
    }
    if (!draft.dropLocation) {
      errors.push("Path `dropLocation` is required.");
      focus ||= "Schedule";
    }

    // surcharges
    const surges = draft.dateSurcharges || [];
    for (let i = 0; i < surges.length; i++) {
      const s = surges[i];
      const label = `Surge #${i + 1}`;
      if (!s.surchargeAmount || Number(s.surchargeAmount) <= 0) {
        errors.push(`${label}: Surcharge amount must be greater than 0`);
        focus ||= "Surcharges";
      }
      if (s.surchargeType === "percentage" && Number(s.surchargeAmount) > 100) {
        errors.push(`${label}: Percentage surcharge cannot exceed 100%`);
        focus ||= "Surcharges";
      }
      if (!s.startDate) {
        errors.push(`${label}: Start date is required`);
        focus ||= "Surcharges";
      }
      if (s.mode === "range" && !s.endDate) {
        errors.push(`${label}: End date is required`);
        focus ||= "Surcharges";
      }
      if (s.startDate && (s.endDate || s.mode === "single")) {
        const end = s.mode === "single" ? s.startDate : s.endDate;
        if (dateToNum(s.startDate) > dateToNum(end!)) {
          errors.push(`${label}: Start date cannot be after end date`);
          focus ||= "Surcharges";
        }
      }
      for (let j = i + 1; j < surges.length; j++) {
        const t = surges[j];
        const iEnd = s.mode === "single" ? s.startDate : s.endDate;
        const jEnd = t.mode === "single" ? t.startDate : t.endDate;
        if (
          s.startDate &&
          iEnd &&
          t.startDate &&
          jEnd &&
          rangesOverlap(s.startDate, iEnd, t.startDate, jEnd)
        ) {
          errors.push(`${label} overlaps with Surge #${j + 1}`);
          focus ||= "Surcharges";
        }
      }
    }

    // media
    const hasImage =
      (draft.images && draft.images.length > 0) ||
      (up.newImageFiles && up.newImageFiles.length > 0);
    if (!hasImage) {
      errors.push("Add at least one image");
      focus ||= "Images & Videos";
    }

    return { ok: errors.length === 0, errors, focus };
  };

  /** ---------- Save (POST) ---------- */
  const handleNextOrSave = async () => {
    if (!isLastTab()) {
      setActiveTab(tabs[getCurrentTabIndex() + 1]);
      return;
    }

    const { ok, errors, focus } = validateAll(form, uploads);
    if (!ok) {
      alert(errors.join("\n"));
      if (focus) setActiveTab(focus);
      return;
    }

    const htmlDescription = stateToHTML(descEditor.getCurrentContent());

    const payload: ActivityPayload = {
      name: form.name.trim(),
      description: htmlDescription,
      destination: form.destination.trim(),
      coverImage: form.coverImage ?? null,
      vendorPrice: Number(form.vendorPrice || 0),
      sellingPrice: Number(form.sellingPrice || 0),
      taxRate: Number(form.taxRate || 0),
      taxIncluded: !!form.taxIncluded,
      dateSurcharges: (form.dateSurcharges || []).map((s) => ({
        mode: s.mode,
        startDate: s.startDate,
        endDate: s.mode === "single" ? s.startDate : s.endDate,
        surchargeAmount: Number(s.surchargeAmount || 0),
        surchargeType: s.surchargeType,
      })),
      operatingDays: form.operatingDays || [],
      openTime: form.openTime || "",
      closeTime: form.closeTime || "",
      duration: Number(form.duration || 0),
      durationType: form.durationType || "hrs",
      pickupLocation: form.pickupLocation || "",
      dropLocation: form.dropLocation || "",
      isComplete: true,
    };

    setIsSaving(true);
    try {
      await saveActivityBinary({
        baseUrl: BASE,
        payload,
        imageFiles: uploads.newImageFiles,
        videoFiles: uploads.newVideoFiles,
        imagesKey: "images",
        videosKey: "videos",
      });

      alert("Activity saved successfully!");

      if (AFTER_SAVE_REDIRECT) {
        router.push(AFTER_SAVE_REDIRECT);
        return;
      }

      // Reset if not redirecting
      setForm({
        name: "",
        description: "",
        destination: "",
        coverImage: null,
        vendorPrice: "",
        sellingPrice: "",
        taxRate: "",
        taxIncluded: true,
        dateSurcharges: [],
        operatingDays: [],
        openTime: "",
        closeTime: "",
        duration: "",
        durationType: "hrs",
        pickupLocation: "",
        dropLocation: "",
        images: [],
        videos: [],
        isComplete: false,
      });
      setUploads({
        newImageFiles: [],
        newVideoFiles: [],
        keepImageUrls: [],
        keepVideoUrls: [],
      });
      setDescEditor(EditorState.createEmpty());
      setActiveTab("Activity Details");
    } catch (e: any) {
      console.error(e);
      alert(`Failed to save activity: ${e?.message || e}`);
    } finally {
      setIsSaving(false);
    }
  };

  /** ---------- UI ---------- */
  const renderFormContent = () => {
    switch (activeTab) {
      case "Activity Details":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Activity Name *</label>
              <input
                placeholder="e.g., Scuba Diving Adventure"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="border rounded-lg px-3 py-2 w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description *</label>
              <div className="border rounded-lg bg-white">
                <Editor
                  editorState={descEditor}
                  onEditorStateChange={setDescEditor}
                  toolbar={{
                    options: ["inline", "blockType", "list", "link", "history"],
                    inline: { options: ["bold", "italic", "underline"] },
                    list: { options: ["unordered", "ordered"] },
                  }}
                  editorClassName="px-3 py-2 min-h-[140px]"
                  toolbarClassName="border-b px-2"
                  wrapperClassName="rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Destination *</label>
              <input
                placeholder="e.g., Goa"
                value={form.destination}
                onChange={(e) => updateField("destination", e.target.value)}
                className="border rounded-lg px-3 py-2 w-full text-sm"
              />
            </div>
          </div>
        );

      case "Price Configuration":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Vendor Price (INR) *</label>
              <input
                type="number"
                placeholder="2000"
                value={form.vendorPrice}
                onChange={(e) => updateField("vendorPrice", e.target.value)}
                className="border rounded-lg px-3 py-2 w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Selling Price (INR) *</label>
              <input
                type="number"
                placeholder="3000"
                value={form.sellingPrice}
                onChange={(e) => updateField("sellingPrice", e.target.value)}
                className="border rounded-lg px-3 py-2 w-full text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="taxIncluded"
                checked={form.taxIncluded}
                onChange={(e) => updateField("taxIncluded", e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="taxIncluded" className="text-sm font-medium">
                Tax Included
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Tax Rate (%) {form.taxIncluded ? "*" : "(disabled when not included)"}
              </label>
              <input
                type="number"
                placeholder="18"
                value={form.taxRate}
                onChange={(e) => updateField("taxRate", e.target.value)}
                className="border rounded-lg px-3 py-2 w-full text-sm"
                disabled={!form.taxIncluded}
              />
            </div>

            <div className="text-xs text-gray-500">
              Note: Date-based price adjustments are configured in the{" "}
              <span className="font-semibold">Surcharges</span> tab.
            </div>
          </div>
        );

      case "Schedule":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Operating Days *</label>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                type="button"
                onClick={toggleAllDays}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  (form.operatingDays || []).length === allDays.length
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                }`}
              >
                All
              </button>
              {allDays.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    (form.operatingDays || []).includes(d)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Open Time *</label>
                <input
                  type="time"
                  value={form.openTime}
                  onChange={(e) => updateField("openTime", e.target.value)}
                  className="border rounded-lg px-3 py-2 w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Close Time *</label>
                <input
                  type="time"
                  value={form.closeTime}
                  onChange={(e) => updateField("closeTime", e.target.value)}
                  className="border rounded-lg px-3 py-2 w-full text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Duration of Activity *</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="2"
                  value={form.duration}
                  onChange={(e) => updateField("duration", e.target.value)}
                  className="border rounded-lg px-3 py-2 flex-1 text-sm"
                />
                <select
                  value={form.durationType}
                  onChange={(e) => updateField("durationType", e.target.value as "min" | "hrs")}
                  className="border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="min">Minutes</option>
                  <option value="hrs">Hours</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Pickup Location *</label>
              <select
                value={form.pickupLocation}
                onChange={(e) => updateField("pickupLocation", e.target.value)}
                className="border rounded-lg px-3 py-2 w-full text-sm"
              >
                <option value="">Select location</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
              <input
                value={pickupCustom}
                onChange={(e) => setPickupCustom(e.target.value)}
                onBlur={() => {
                  if (pickupCustom.trim()) {
                    addCustomLocation(pickupCustom);
                    updateField("pickupLocation", pickupCustom.trim());
                    setPickupCustom("");
                  }
                }}
                placeholder="Or type custom location"
                className="border rounded-lg px-3 py-2 w-full text-sm mt-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Drop Location *</label>
              <select
                value={form.dropLocation}
                onChange={(e) => updateField("dropLocation", e.target.value)}
                className="border rounded-lg px-3 py-2 w-full text-sm"
              >
                <option value="">Select location</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
              <input
                value={dropCustom}
                onChange={(e) => setDropCustom(e.target.value)}
                onBlur={() => {
                  if (dropCustom.trim()) {
                    addCustomLocation(dropCustom);
                    updateField("dropLocation", dropCustom.trim());
                    setDropCustom("");
                  }
                }}
                placeholder="Or type custom location"
                className="border rounded-lg px-3 py-2 w-full text-sm mt-2"
              />
            </div>
          </div>
        );

      case "Surcharges":
        return (
          <div className="space-y-4">
            <div className="border border-yellow-300 bg-amber-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-yellow-900">Surge Charges</h3>
                <button
                  type="button"
                  onClick={addSurchargeCard}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-yellow-400 text-yellow-900 hover:bg-yellow-100"
                >
                  <Plus size={16} /> Add surge
                </button>
              </div>

              <div className="space-y-3">
                {form.dateSurcharges.map((row, idx) => (
                  <div key={idx} className="rounded-lg border border-yellow-300 bg-white p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">Surge #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeSurchargeCard(idx)}
                        className="px-2.5 py-1.5 text-xs rounded-md bg-red-50 text-red-600 hover:bg-red-100 inline-flex items-center gap-1"
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium">Surge window</label>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name={`mode-${idx}`}
                              checked={row.mode === "single"}
                              onChange={() => updateSurchargeAt(idx, "mode", "single")}
                            />
                            Single date
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name={`mode-${idx}`}
                              checked={row.mode === "range"}
                              onChange={() => updateSurchargeAt(idx, "mode", "range")}
                            />
                            Date range
                          </label>
                        </div>

                        {row.mode === "single" ? (
                          <div className="mt-2">
                            <label className="block text-xs text-gray-600 mb-1">Date</label>
                            <input
                              type="date"
                              placeholder="dd-mm-yyyy"
                              value={row.startDate}
                              onChange={(e) => updateSurchargeAt(idx, "startDate", e.target.value)}
                              className="border rounded-lg px-3 py-2 w-full text-sm"
                            />
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">
                                Start date
                              </label>
                              <input
                                type="date"
                                placeholder="dd-mm-yyyy"
                                value={row.startDate}
                                onChange={(e) =>
                                  updateSurchargeAt(idx, "startDate", e.target.value)
                                }
                                className="border rounded-lg px-3 py-2 w-full text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">End date</label>
                              <input
                                type="date"
                                placeholder="dd-mm-yyyy"
                                value={row.endDate}
                                onChange={(e) => updateSurchargeAt(idx, "endDate", e.target.value)}
                                className="border rounded-lg px-3 py-2 w-full text-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium">Surge amount</label>
                        <div className="grid grid-cols-[1fr_auto] gap-2">
                          <input
                            type="number"
                            placeholder="enter amount"
                            value={row.surchargeAmount}
                            onChange={(e) =>
                              updateSurchargeAt(idx, "surchargeAmount", e.target.value)
                            }
                            className="border rounded-lg px-3 py-2 w-full text-sm"
                          />
                          <select
                            value={row.surchargeType}
                            onChange={(e) =>
                              updateSurchargeAt(
                                idx,
                                "surchargeType",
                                e.target.value as "fixed" | "percentage"
                              )
                            }
                            className="border rounded-lg px-3 py-2 text-sm"
                            title="Type"
                          >
                            <option value="fixed">INR</option>
                            <option value="percentage">%</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "Images & Videos":
        return (
          <div className="space-y-6">
            {/* Images */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Images * (At least one required)
              </label>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-blue-400 transition-colors bg-gray-50">
                <Upload size={32} className="text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Click to upload images</span>
                <span className="text-xs text-gray-500 mt-1">or drag and drop</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              {(form.images || []).length > 0 && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(form.images || []).map((img, idx) => (
                    <div key={idx} className="relative border rounded-lg overflow-hidden group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" className="w-full h-32 object-cover" />
                      <button
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Videos */}
            <div>
              <label className="block text-sm font-medium mb-2">Video</label>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-blue-400 transition-colors bg-gray-50">
                <Upload size={32} className="text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Click to upload videos</span>
                <span className="text-xs text-gray-500 mt-1">or drag and drop</span>
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={handleVideoUpload}
                  className="hidden"
                />
              </label>

              {(form.videos || []).length > 0 && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(form.videos || []).map((src, idx) => (
                    <div
                      key={idx}
                      className="relative border rounded-xl overflow-hidden bg-black group"
                    >
                      <video
                        src={src}
                        controls
                        className="w-full h-48 object-contain bg-black"
                      />
                      <button
                        onClick={() => handleRemoveVideo(idx)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove video"
                        title="Remove"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white shadow-md rounded-2xl p-4 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl sm:text-2xl font-bold">Add Activity</h1>
            <div className="flex gap-2">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-1 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
              >
                <X size={16} /> Cancel
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex overflow-x-auto mb-6 gap-2 pb-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="mb-6">{renderFormContent()}</div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            {!isFirstTab() && (
              <button
                onClick={() => setActiveTab(tabs[getCurrentTabIndex() - 1])}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                ← Previous
              </button>
            )}
            <button
              onClick={handleNextOrSave}
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : isLastTab() ? (
                <>
                  <Save size={18} />
                  Save Activity
                </>
              ) : (
                <>Save & Continue →</>
              )}
            </button>
            <button
              onClick={() => router.back()}
              className="sm:w-auto px-6 py-3 border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>

          {/* Step indicator */}
          <div className="mt-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              {tabs.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index <= getCurrentTabIndex() ? "bg-blue-600 w-8" : "bg-gray-200 w-8"
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-gray-600">
              Step {getCurrentTabIndex() + 1} of {tabs.length}: {activeTab}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
