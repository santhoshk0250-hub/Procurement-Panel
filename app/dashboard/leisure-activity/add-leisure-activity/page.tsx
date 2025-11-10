"use client";

import React, { useMemo, useState } from "react";
import { Plus, Save, X, Upload, Edit2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

/** ---------- Rich Text (Draft.js) imports ---------- */
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
// ❗ Use dynamic import to avoid SSR issues in Next
import dynamic from "next/dynamic";
const Editor = dynamic<any>(() => import("react-draft-wysiwyg").then((m) => m.Editor), {
  ssr: false,
});
import { EditorState, ContentState, convertFromHTML } from "draft-js";
import { stateToHTML } from "draft-js-export-html";

/** ---------- Config ---------- */
const BASE =
  "https://tick-your-tour-base-server-103963826136.us-central1.run.app/leisure-activities";

// After a successful save, where should we go?
const AFTER_SAVE_REDIRECT = "/dashboard/leisure-activity";

/** If your backend wants `operatingDays[]` style keys, keep true. */
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
  description: string; // HTML from editor
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
  videos: string[];

  isComplete: boolean;
};

/** ---------- Payload for backend ---------- */
type ActivityPayload = {
  name: string;
  description: string; // keep HTML
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

  // scalars
  fd.append("name", payload.name);
  fd.append("description", payload.description); // HTML
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

  // arrays
  (payload.operatingDays || []).forEach((d) => fd.append(ARRAY("operatingDays"), d));
  fd.append("dateSurcharges", JSON.stringify(payload.dateSurcharges || []));

  // files
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

  /** ---------- Rich Text: Description editor state ---------- */
  const createEditorStateFromHtml = (html: string) => {
    try {
      const blocks = convertFromHTML(html || "");
      if (!blocks.contentBlocks || blocks.contentBlocks.length === 0) {
        return EditorState.createEmpty();
      }
      const content = ContentState.createFromBlockArray(
        blocks.contentBlocks,
        blocks.entityMap
      );
      return EditorState.createWithContent(content);
    } catch {
      return EditorState.createEmpty();
    }
  };

  const [descEditorState, setDescEditorState] = useState<EditorState>(() =>
    createEditorStateFromHtml(form.description)
  );

  // Keep editor in sync when form.description changes externally (e.g., after reset)
  React.useEffect(() => {
    const currentHTML = stateToHTML(descEditorState.getCurrentContent());
    if (form.description !== currentHTML) {
      setDescEditorState(createEditorStateFromHtml(form.description));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.description]);

  const onDescriptionChange = (st: EditorState) => {
    setDescEditorState(st);
    const html = stateToHTML(st.getCurrentContent());
    updateField("description", html);
  };

  // Helper: detect visually empty HTML (e.g., "<p><br></p>")
  const isHtmlEmpty = (html: string) => !html || !html.replace(/<[^>]*>/g, "").trim();

  // Surcharges (create)
  const [currentSurcharge, setCurrentSurcharge] = useState<DateSurcharge>({
    mode: "single",
    startDate: "",
    endDate: "",
    surchargeAmount: "",
    surchargeType: "fixed",
  });

  const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const getCurrentTabIndex = () => tabs.indexOf(activeTab);
  const isLastTab = () => getCurrentTabIndex() === tabs.length - 1;
  const isFirstTab = () => getCurrentTabIndex() === 0;

  /** ---------- Field helpers ---------- */
  const updateField = <K extends keyof DraftActivity>(field: K, value: DraftActivity[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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

  /** ---------- Surcharge helpers ---------- */
  const dateToNum = (d: string) => (d ? Number(d.replace(/-/g, "")) : 0);
  const normalizeSurcharge = (s: DateSurcharge): DateSurcharge =>
    s.mode === "single" ? { ...s, endDate: s.startDate } : s;

  const rangesOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
    if (!aStart || !aEnd || !bStart || !bEnd) return false;
    const aS = dateToNum(aStart),
      aE = dateToNum(aEnd);
    const bS = dateToNum(bStart),
      bE = dateToNum(bEnd);
    return aS <= bE && bS <= aE;
  };

  const validateSurcharge = (s0: DateSurcharge) => {
    const s = normalizeSurcharge(s0);
    const errs: string[] = [];
    if (!s.startDate) errs.push("Start date is required");
    if (s.mode === "range" && !s.endDate) errs.push("End date is required");
    if (s.startDate && s.endDate && dateToNum(s.startDate) > dateToNum(s.endDate)) {
      errs.push("Start date cannot be after end date");
    }
    if (!s.surchargeAmount || Number(s.surchargeAmount) <= 0) {
      errs.push("Surcharge amount must be greater than 0");
    }
    if (s.surchargeType === "percentage" && Number(s.surchargeAmount) > 100) {
      errs.push("Percentage surcharge cannot exceed 100%");
    }
    (form.dateSurcharges || []).forEach((existing) => {
      const e = normalizeSurcharge(existing);
      if (rangesOverlap(e.startDate, e.endDate, s.startDate, s.endDate)) {
        errs.push(
          `Overlaps with existing ${e.mode === "single" ? "single date" : "range"} ${e.startDate}${
            e.mode === "range" ? ` → ${e.endDate}` : ""
          }`
        );
      }
    });

    return errs;
  };

  const handleAddSurcharge = () => {
    const normalized = normalizeSurcharge(currentSurcharge);
    const errs = validateSurcharge(normalized);
    if (errs.length) {
      alert("Fix surcharge issues:\n\n" + errs.join("\n"));
      return;
    }
    updateField("dateSurcharges", [...(form.dateSurcharges || []), { ...normalized }]);
    setCurrentSurcharge({
      mode: "single",
      startDate: "",
      endDate: "",
      surchargeAmount: "",
      surchargeType: "fixed",
    });
  };

  const handleRemoveSurcharge = (index: number) => {
    const surcharges = form.dateSurcharges || [];
    updateField(
      "dateSurcharges",
      surcharges.filter((_, i) => i !== index)
    );
  };

  /** ---------- Media handlers ---------- */
  const [uploads, setUploads] = useState<UploadDraft>({
    newImageFiles: [],
    newVideoFiles: [],
    keepImageUrls: [],
    keepVideoUrls: [],
  });

  // IMAGES
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    setUploads((u) => ({ ...u, newImageFiles: [...u.newImageFiles, ...newFiles] }));
    const previews = newFiles.map((f) => URL.createObjectURL(f));
    updateField("images", [...(form.images || []), ...previews]);
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
    // Keep uploads.newImageFiles aligned with previews order:
    setUploads((u) => {
      const copy = [...u.newImageFiles];
      if (copy[index]) copy.splice(index, 1);
      return { ...u, newImageFiles: copy };
    });
  };

  // VIDEOS (▶️ previews + NEW badge)
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);

    // store for POST
    setUploads((u) => ({ ...u, newVideoFiles: [...u.newVideoFiles, ...newFiles] }));

    // show playable previews
    const previews = newFiles.map((f) => URL.createObjectURL(f));
    updateField("videos", [...(form.videos || []), ...previews]);
  };

  const handleRemoveVideo = (index: number) => {
    const vids = form.videos || [];
    const removed = vids[index];

    // remove preview from UI
    updateField(
      "videos",
      vids.filter((_, i) => i !== index)
    );

    // revoke blob URL if applicable
    if (typeof removed === "string" && removed.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(removed);
      } catch {}
    }

    // keep files array in sync (index alignment with previews)
    setUploads((u) => {
      const copy = [...u.newVideoFiles];
      if (copy[index]) copy.splice(index, 1);
      return { ...u, newVideoFiles: copy };
    });
  };

  // Revoke any remaining blobs on unmount to avoid leaks
  React.useEffect(() => {
    return () => {
      (form.images || [])
        .concat(form.videos || [])
        .filter((u) => typeof u === "string" && u.startsWith("blob:"))
        .forEach((u) => {
          try {
            URL.revokeObjectURL(u);
          } catch {}
        });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ---------- Validation ---------- */
  const validateAll = (draft: DraftActivity, up: UploadDraft) => {
    const errors: string[] = [];
    let focus: TabName | undefined;

    // details
    if (!draft.name?.trim()) {
      errors.push("Path `name` is required.");
      focus ||= "Activity Details";
    }
    if (isHtmlEmpty(draft.description)) {
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

    const payload: ActivityPayload = {
      name: form.name.trim(),
      description: form.description, // ✅ keep HTML as-is
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

      // reset
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
              <div className="border rounded-lg">
                <Editor
                  editorState={descEditorState}
                  onEditorStateChange={onDescriptionChange}
                  placeholder="Describe the activity..."
                  toolbar={{
                    options: ["inline", "list", "textAlign", "history", "blockType"],
                    inline: { options: ["bold", "italic", "underline", "strikethrough"] },
                    list: { options: ["unordered", "ordered", "indent", "outdent"] },
                    textAlign: { inDropdown: true },
                    blockType: {
                      inDropdown: true,
                      options: ["Normal", "H1", "H2", "H3", "Blockquote"],
                    },
                  }}
                  wrapperClassName="rounded-lg"
                  editorClassName="px-3 py-2 min-h-[160px] text-sm"
                  toolbarClassName="border-b"
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
            <p className="text-sm text-gray-600">
              Add a surcharge for a <strong>single date</strong> or a{" "}
              <strong>date range</strong>. Single-date entries are stored as a one-day range.
            </p>

            <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="s-mode"
                    checked={currentSurcharge.mode === "single"}
                    onChange={() =>
                      setCurrentSurcharge((s) => ({ ...s, mode: "single", endDate: s.startDate }))
                    }
                  />
                  Single Date
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="s-mode"
                    checked={currentSurcharge.mode === "range"}
                    onChange={() => setCurrentSurcharge((s) => ({ ...s, mode: "range" }))}
                  />
                  Date Range
                </label>
              </div>

              {currentSurcharge.mode === "single" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium mb-1">Date</label>
                    <input
                      type="date"
                      value={currentSurcharge.startDate}
                      onChange={(e) =>
                        setCurrentSurcharge((s) => ({
                          ...s,
                          startDate: e.target.value,
                          endDate: e.target.value,
                        }))
                      }
                      className="border rounded-lg px-2 py-1.5 w-full text-sm"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium mb-1">Start Date</label>
                    <input
                      type="date"
                      value={currentSurcharge.startDate}
                      onChange={(e) =>
                        setCurrentSurcharge((s) => ({ ...s, startDate: e.target.value }))
                      }
                      className="border rounded-lg px-2 py-1.5 w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">End Date</label>
                    <input
                      type="date"
                      value={currentSurcharge.endDate}
                      onChange={(e) =>
                        setCurrentSurcharge((s) => ({ ...s, endDate: e.target.value }))
                      }
                      className="border rounded-lg px-2 py-1.5 w-full text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Surcharge Amount</label>
                  <input
                    type="number"
                    placeholder="500"
                    value={currentSurcharge.surchargeAmount}
                    onChange={(e) =>
                      setCurrentSurcharge((s) => ({ ...s, surchargeAmount: e.target.value }))
                    }
                    className="border rounded-lg px-2 py-1.5 w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Type</label>
                  <select
                    value={currentSurcharge.surchargeType}
                    onChange={(e) =>
                      setCurrentSurcharge((s) => ({
                        ...s,
                        surchargeType: e.target.value as "fixed" | "percentage",
                      }))
                    }
                    className="border rounded-lg px-2 py-1.5 w-full text-sm"
                  >
                    <option value="fixed">Fixed (INR)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleAddSurcharge}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Add Surcharge
              </button>
            </div>

            {(form.dateSurcharges || []).length > 0 ? (
              <div className="space-y-2">
                {(form.dateSurcharges || []).map((row, idx) => (
                  <div key={idx} className="border rounded-lg p-3 bg-white">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div className="text-sm">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border mr-2">
                          {row.mode === "single" ? "Single Date" : "Date Range"}
                        </span>
                        {row.mode === "single" ? (
                          <span className="font-medium">{row.startDate}</span>
                        ) : (
                          <>
                            <span className="font-medium">{row.startDate}</span> to{" "}
                            <span className="font-medium">{row.endDate}</span>
                          </>
                        )}
                        <span className="ml-2 text-blue-600">
                          +{row.surchargeAmount} {row.surchargeType === "percentage" ? "%" : "INR"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRemoveSurcharge(idx)}
                          className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 flex items-center gap-1"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No surcharges added yet.</p>
            )}
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
                      {/* Show actual image + NEW badge for blob previews */}
                      <img src={img} alt="" className="w-full h-32 object-cover" />
                      {img.startsWith("blob:") && (
                        <div className="absolute bottom-1 left-1 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded">
                          NEW
                        </div>
                      )}
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

            {/* Videos with playable previews */}
            <div>
              <label className="block text-sm font-medium mb-2">Videos (Optional)</label>
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
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {(form.videos || []).map((v, idx) => (
                    <div key={idx} className="relative border rounded-lg overflow-hidden group bg-black">
                      <video src={v} controls className="w-full h-40 object-cover" preload="metadata" />
                      {typeof v === "string" && v.startsWith("blob:") && (
                        <div className="absolute bottom-1 left-1 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded">
                          NEW
                        </div>
                      )}
                      <button
                        onClick={() => handleRemoveVideo(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove video"
                      >
                        <X size={14} />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 truncate">
                        {v.startsWith("blob:") ? "Unsaved video" : `Video ${idx + 1}`}
                      </div>
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
            <h1 className="text-xl sm:text-2xl font-bold">Add Leisure Activity</h1>
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