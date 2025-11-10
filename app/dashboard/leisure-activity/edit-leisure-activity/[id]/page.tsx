"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, X, Upload, Edit2, Trash2 } from "lucide-react";
import { useLeisureActivityStore } from "@/store/leisureActivityStore";

/** ---------- Rich Text (Draft.js) imports ---------- */
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import dynamic from "next/dynamic";
const Editor = dynamic<any>(() => import("react-draft-wysiwyg").then((m) => m.Editor), {
  ssr: false,
});
import { EditorState, ContentState, convertFromHTML } from "draft-js";
import { stateToHTML } from "draft-js-export-html";

/* =================== Config =================== */
const BASE =
  "https://tick-your-tour-base-server-103963826136.us-central1.run.app/leisure-activities";
const USE_BRACKETS_FOR_ARRAYS = true;
const ARRAY = (k: string) => (USE_BRACKETS_FOR_ARRAYS ? `${k}[]` : k);

/* =================== Types =================== */
type TabName = "Activity Details" | "Price Configuration" | "Schedule" | "Surcharges" | "Images & Videos";

type DateSurcharge = {
  mode: "single" | "range";
  startDate: string;
  endDate: string;
  surchargeAmount: string;
  surchargeType: "fixed" | "percentage";
};

type Activity = {
  id: string;
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
  videos: string[]; // can contain server URLs or blob: URLs for previews
  isComplete: boolean;
};

type DraftActivity = Partial<Activity> & { id: string };

type ActivityPayload = {
  name: string;
  description: string; // HTML
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
  isComplete: boolean;
};

/* =================== Mappers =================== */
const fromApi = (api: any): Activity => ({
  id: api.id || api._id?.toString?.() || String(Date.now()),
  name: api.name ?? "",
  description: api.description ?? "", // HTML
  destination: api.destination ?? "",
  coverImage: api.coverImage ?? null,
  vendorPrice: String(api.vendorPrice ?? ""),
  sellingPrice: String(api.sellingPrice ?? ""),
  taxRate: String(api.taxRate ?? ""),
  taxIncluded: Boolean(api.taxIncluded),
  dateSurcharges: Array.isArray(api.dateSurcharges)
    ? api.dateSurcharges.map((s: any) => ({
        mode: (s.mode as "single" | "range") ?? "single",
        startDate:
          typeof s.startDate === "string"
            ? s.startDate.slice(0, 10)
            : new Date(s.startDate).toISOString().slice(0, 10),
        endDate:
          typeof s.endDate === "string"
            ? s.endDate.slice(0, 10)
            : new Date(s.endDate).toISOString().slice(0, 10),
        surchargeAmount: String(s.surchargeAmount ?? ""),
        surchargeType: (s.surchargeType as "fixed" | "percentage") ?? "fixed",
      }))
    : [],
  operatingDays: Array.isArray(api.operatingDays) ? api.operatingDays : [],
  openTime: api.openTime ?? "",
  closeTime: api.closeTime ?? "",
  duration: String(api.duration ?? ""),
  durationType: api.durationType ?? "hrs",
  pickupLocation: api.pickupLocation ?? "",
  dropLocation: api.dropLocation ?? "",
  images: Array.isArray(api.images) ? api.images : [],
  videos: Array.isArray(api.videos) ? api.videos : [],
  isComplete: Boolean(api.isComplete ?? true),
});

function buildFlatFormData(params: {
  payload: ActivityPayload;
  imageFiles: File[];
  videoFiles: File[];
  keepImageUrls: string[];
  keepVideoUrls: string[];
  removedImageUrls: string[];
  removedVideoUrls: string[];
}) {
  const {
    payload,
    imageFiles,
    videoFiles,
    keepImageUrls,
    keepVideoUrls,
    removedImageUrls,
    removedVideoUrls,
  } = params;

  const fd = new FormData();

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

  (payload.operatingDays || []).forEach((d) => fd.append(ARRAY("operatingDays"), d));
  keepImageUrls.forEach((u) => fd.append(ARRAY("keepImageUrls"), u));
  keepVideoUrls.forEach((u) => fd.append(ARRAY("keepVideoUrls"), u));
  removedImageUrls.forEach((u) => fd.append(ARRAY("removedImageUrls"), u));
  removedVideoUrls.forEach((u) => fd.append(ARRAY("removedVideoUrls"), u));

  fd.append("dateSurcharges", JSON.stringify(payload.dateSurcharges || []));

  for (const f of imageFiles) fd.append("images", f, f.name);
  for (const f of videoFiles) fd.append("videos", f, f.name);

  fd.append(
    "changeSummary",
    JSON.stringify({
      keptImages: keepImageUrls.length,
      removedImages: removedImageUrls.length,
      addedImages: imageFiles.length,
      keptVideos: keepVideoUrls.length,
      removedVideos: removedVideoUrls.length,
      addedVideos: videoFiles.length,
    })
  );

  return fd;
}

async function saveActivityBinary(params: {
  baseUrl: string;
  id: string;
  payload: ActivityPayload;
  imageFiles: File[];
  videoFiles: File[];
  keepImageUrls: string[];
  keepVideoUrls: string[];
  removedImageUrls: string[];
  removedVideoUrls: string[];
  signal?: AbortSignal;
}) {
  const { baseUrl, id, signal, ...rest } = params;
  const url = `${baseUrl}/${encodeURIComponent(id)}`;
  const body = buildFlatFormData(rest);

  const res = await fetch(url, { method: "PATCH", body, signal });
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

/* =================== Component =================== */
export default function EditLeisureActivityPage() {
  const router = useRouter();

  // Get activity from store instead of params
  const { activity } = useLeisureActivityStore() as { activity: any | null | undefined };

  const tabs: TabName[] = useMemo(
    () => ["Activity Details", "Price Configuration", "Schedule", "Surcharges", "Images & Videos"],
    []
  );

  const [activeTab, setActiveTab] = useState<TabName>("Activity Details");
  const [editingActivity, setEditingActivity] = useState<DraftActivity | null>(null);

  // Images tracking
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [removedImageUrls, setRemovedImageUrls] = useState<string[]>([]);

  // Videos tracking
  const [existingVideoUrls, setExistingVideoUrls] = useState<string[]>([]);
  const [newVideoFiles, setNewVideoFiles] = useState<File[]>([]);
  const [removedVideoUrls, setRemovedVideoUrls] = useState<string[]>([]);

  const [isSaving, setIsSaving] = useState(false);

  const [locations, setLocations] = useState<string[]>([
    "Baga Beach",
    "Calangute Beach",
    "Candolim",
    "Anjuna",
  ]);
  const [pickupCustom, setPickupCustom] = useState("");
  const [dropCustom, setDropCustom] = useState("");

  const [currentSurcharge, setCurrentSurcharge] = useState<DateSurcharge>({
    mode: "single",
    startDate: "",
    endDate: "",
    surchargeAmount: "",
    surchargeType: "fixed",
  });
  const [editingSurchargeIndex, setEditingSurchargeIndex] = useState<number | null>(null);
  const [editingSurchargeDraft, setEditingSurchargeDraft] = useState<DateSurcharge | null>(null);

  /** ---------- Rich Text: Description editor state ---------- */
  const createEditorStateFromHtml = (html: string) => {
    try {
      const blocks = convertFromHTML(html || "");
      if (!blocks.contentBlocks || blocks.contentBlocks.length === 0) {
        return EditorState.createEmpty();
      }
      const content = ContentState.createFromBlockArray(blocks.contentBlocks, blocks.entityMap);
      return EditorState.createWithContent(content);
    } catch {
      return EditorState.createEmpty();
    }
  };

  const [descEditorState, setDescEditorState] = useState<EditorState>(() =>
    EditorState.createEmpty()
  );

  // Keep editor in sync when editingActivity.description changes
  useEffect(() => {
    if (editingActivity?.description !== undefined) {
      const currentHTML = stateToHTML(descEditorState.getCurrentContent());
      if (editingActivity.description !== currentHTML) {
        setDescEditorState(createEditorStateFromHtml(editingActivity.description));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingActivity?.description]);

  const onDescriptionChange = (st: EditorState) => {
    setDescEditorState(st);
    const html = stateToHTML(st.getCurrentContent());
    updateField("description", html);
  };

  // Helper: detect visually empty HTML
  const isHtmlEmpty = (html: string) => !html || !html.replace(/<[^>]*>/g, "").trim();

  const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const tabIndex = tabs.indexOf(activeTab);
  const isLastTab = tabIndex === tabs.length - 1;
  const isFirstTab = tabIndex === 0;

  /* ---------- Hydrate from store ---------- */
  useEffect(() => {
    if (!activity) return;

    const mappedActivity = fromApi(activity);
    setEditingActivity({ ...mappedActivity });

    // Initialize image tracking
    setExistingImageUrls([...(mappedActivity.images || [])]);
    setNewImageFiles([]);
    setRemovedImageUrls([]);

    // Initialize video tracking
    setExistingVideoUrls([...(mappedActivity.videos || [])]);
    setNewVideoFiles([]);
    setRemovedVideoUrls([]);
  }, [activity]);

  /* ---------- Helpers ---------- */
  const addCustomLocation = (loc: string) => {
    const trimmed = loc.trim();
    if (trimmed && !locations.includes(trimmed)) {
      setLocations((prev) => [...prev, trimmed]);
    }
  };

  const updateField = (field: keyof DraftActivity, value: any) => {
    if (!editingActivity) return;
    setEditingActivity({ ...editingActivity, [field]: value });
  };

  const toggleDay = (day: string) => {
    if (!editingActivity) return;
    const days = editingActivity.operatingDays || [];
    updateField(
      "operatingDays",
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day]
    );
  };

  const toggleAllDays = () => {
    if (!editingActivity) return;
    const days = editingActivity.operatingDays || [];
    updateField("operatingDays", days.length === allDays.length ? [] : [...allDays]);
  };

  /* ---------- Surcharge Helpers ---------- */
  const dateToNum = (d: string) => (d ? Number(d.replace(/-/g, "")) : 0);
  const rangesOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
    if (!aStart || !aEnd || !bStart || !bEnd) return false;
    const aS = dateToNum(aStart),
      aE = dateToNum(aEnd);
    const bS = dateToNum(bStart),
      bE = dateToNum(bEnd);
    return aS <= bE && bS <= aE;
  };
  const normalizeSurcharge = (s: DateSurcharge): DateSurcharge =>
    s.mode === "single" ? { ...s, endDate: s.startDate } : s;

  const validateSurcharge = (s0: DateSurcharge, skipIndex: number | null = null) => {
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
    if (editingActivity) {
      const list = editingActivity.dateSurcharges || [];
      list.forEach((existing, idx) => {
        if (skipIndex !== null && idx === skipIndex) return;
        const e = normalizeSurcharge(existing);
        if (rangesOverlap(e.startDate, e.endDate, s.startDate, s.endDate)) {
          errs.push(
            `Overlaps with existing ${
              e.mode === "single" ? "single date" : "range"
            } ${e.startDate}${e.mode === "range" ? ` → ${e.endDate}` : ""}`
          );
        }
      });
    }
    return errs;
  };

  const handleAddSurcharge = () => {
    if (!editingActivity) return;
    const normalized = normalizeSurcharge(currentSurcharge);
    const errs = validateSurcharge(normalized);
    if (errs.length) {
      alert("Fix surcharge issues:\n\n" + errs.join("\n"));
      return;
    }
    const surcharges = editingActivity.dateSurcharges || [];
    updateField("dateSurcharges", [...surcharges, { ...normalized }]);
    setCurrentSurcharge({
      mode: "single",
      startDate: "",
      endDate: "",
      surchargeAmount: "",
      surchargeType: "fixed",
    });
  };

  const handleRemoveSurcharge = (index: number) => {
    if (!editingActivity) return;
    const surcharges = editingActivity.dateSurcharges || [];
    updateField("dateSurcharges", surcharges.filter((_, i) => i !== index));
    if (editingSurchargeIndex === index) {
      setEditingSurchargeIndex(null);
      setEditingSurchargeDraft(null);
    }
  };

  const beginEditSurcharge = (index: number) => {
    if (!editingActivity) return;
    const row = (editingActivity.dateSurcharges || [])[index];
    setEditingSurchargeIndex(index);
    setEditingSurchargeDraft({ ...row });
  };

  const cancelEditSurcharge = () => {
    setEditingSurchargeIndex(null);
    setEditingSurchargeDraft(null);
  };

  const saveEditSurcharge = () => {
    if (!editingActivity || editingSurchargeIndex === null || !editingSurchargeDraft) return;
    const normalized = normalizeSurcharge(editingSurchargeDraft);
    const errs = validateSurcharge(normalized, editingSurchargeIndex);
    if (errs.length) {
      alert("Fix surcharge issues:\n\n" + errs.join("\n"));
      return;
    }
    const updated = [...(editingActivity.dateSurcharges || [])];
    updated[editingSurchargeIndex] = { ...normalized };
    updateField("dateSurcharges", updated);
    setEditingSurchargeIndex(null);
    setEditingSurchargeDraft(null);
  };

  /* ---------- Image Handling ---------- */
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingActivity) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const picked = Array.from(files);

    setNewImageFiles((prev) => [...prev, ...picked]);

    const previews = picked.map((f) => URL.createObjectURL(f));
    updateField("images", [...(editingActivity.images || []), ...previews]);
  };

  const handleRemoveImage = (index: number) => {
    if (!editingActivity) return;
    const imgs = editingActivity.images || [];
    const removed = imgs[index];

    const isBlob = removed?.startsWith("blob:");

    if (isBlob) {
      updateField("images", imgs.filter((_, i) => i !== index));

      const blobIndex = imgs.slice(0, index).filter((img) => img.startsWith("blob:")).length;
      setNewImageFiles((prev) => prev.filter((_, i) => i !== blobIndex));

      try {
        URL.revokeObjectURL(removed);
      } catch {}
    } else {
      setRemovedImageUrls((prev) => [...prev, removed]);
      setExistingImageUrls((prev) => prev.filter((url) => url !== removed));
      updateField("images", imgs.filter((_, i) => i !== index));
    }
  };

  /* ---------- Video Handling (previews + NEW badge) ---------- */
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingActivity) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const picked = Array.from(files);

    // keep files for PATCH upload
    setNewVideoFiles((prev) => [...prev, ...picked]);

    // show previews using blob URLs
    const previews = picked.map((f) => URL.createObjectURL(f));
    updateField("videos", [...(editingActivity.videos || []), ...previews]);
  };

  const handleRemoveVideo = (index: number) => {
    if (!editingActivity) return;

    const vids = editingActivity.videos || [];
    const removed = vids[index];
    const isBlob = typeof removed === "string" && removed.startsWith("blob:");

    if (isBlob) {
      // remove from UI
      updateField("videos", vids.filter((_, i) => i !== index));

      // which new file index to drop? count blobs before this index
      const blobIndexBefore =
        vids.slice(0, index).filter((v) => String(v).startsWith("blob:")).length - 1;
      setNewVideoFiles((prev) => prev.filter((_, i) => i !== blobIndexBefore));

      // cleanup URL
      try {
        URL.revokeObjectURL(removed);
      } catch {}
    } else {
      // existing remote URL
      setRemovedVideoUrls((prev) => [...prev, removed]);
      setExistingVideoUrls((prev) => prev.filter((url) => url !== removed));
      updateField("videos", vids.filter((_, i) => i !== index));
    }
  };

  // Cleanup any blob: video URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      (editingActivity?.videos || [])
        .filter((v) => typeof v === "string" && v.startsWith("blob:"))
        .forEach((u) => {
          try {
            URL.revokeObjectURL(u);
          } catch {}
        });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Validation & Save ---------- */
  const validateAll = (editing: DraftActivity | null) => {
    const errors: string[] = [];
    let focus: TabName | undefined;

    if (!editing) {
      return { ok: false, errors: ["No activity data"], focus: "Activity Details" as TabName };
    }

    if (!editing.name?.trim()) {
      errors.push("Activity name is required");
      focus ||= "Activity Details";
    }
    if (isHtmlEmpty(editing.description || "")) {
      errors.push("Description is required");
      focus ||= "Activity Details";
    }
    if (!editing.destination?.trim()) {
      errors.push("Destination is required");
      focus ||= "Activity Details";
    }

    if (!editing.vendorPrice) {
      errors.push("Vendor price is required");
      focus ||= "Price Configuration";
    }
    if (!editing.sellingPrice) {
      errors.push("Selling price is required");
      focus ||= "Price Configuration";
    }
    if (editing.taxIncluded && !editing.taxRate) {
      errors.push("Tax rate is required when tax is included");
      focus ||= "Price Configuration";
    }

    if (!editing.operatingDays?.length) {
      errors.push("At least one operating day is required");
      focus ||= "Schedule";
    }
    if (!editing.openTime) {
      errors.push("Open time is required");
      focus ||= "Schedule";
    }
    if (!editing.closeTime) {
      errors.push("Close time is required");
      focus ||= "Schedule";
    }
    if (!editing.duration) {
      errors.push("Activity duration is required");
      focus ||= "Schedule";
    }
    if (!editing.pickupLocation) {
      errors.push("Pickup location is required");
      focus ||= "Schedule";
    }
    if (!editing.dropLocation) {
      errors.push("Drop location is required");
      focus ||= "Schedule";
    }

    const hasImage =
      (editing.images && editing.images.length > 0) ||
      existingImageUrls.length > 0 ||
      newImageFiles.length > 0;
    if (!hasImage) {
      errors.push("At least one image is required");
      focus ||= "Images & Videos";
    }

    return { ok: errors.length === 0, errors, focus };
  };

  const handleSave = async () => {
    const { ok, errors, focus } = validateAll(editingActivity);
    if (!ok) {
      alert(errors.join("\n"));
      if (focus) setActiveTab(focus);
      return;
    }
    if (!editingActivity) return;

    const payload: ActivityPayload = {
      name: editingActivity.name!.trim(),
      description: editingActivity.description || "",
      destination: editingActivity.destination!.trim(),
      coverImage: editingActivity.coverImage ?? null,
      vendorPrice: Number(editingActivity.vendorPrice || 0),
      sellingPrice: Number(editingActivity.sellingPrice || 0),
      taxRate: Number(editingActivity.taxRate || 0),
      taxIncluded: !!editingActivity.taxIncluded,
      dateSurcharges: (editingActivity.dateSurcharges || []).map((s) => ({
        mode: s.mode,
        startDate: s.startDate,
        endDate: s.mode === "single" ? s.startDate : s.endDate,
        surchargeAmount: Number(s.surchargeAmount || 0),
        surchargeType: s.surchargeType,
      })),
      operatingDays: editingActivity.operatingDays || [],
      openTime: editingActivity.openTime || "",
      closeTime: editingActivity.closeTime || "",
      duration: Number(editingActivity.duration || 0),
      durationType: editingActivity.durationType || "hrs",
      pickupLocation: editingActivity.pickupLocation || "",
      dropLocation: editingActivity.dropLocation || "",
      isComplete: true,
    };

    setIsSaving(true);
    try {
      await saveActivityBinary({
        baseUrl: BASE,
        id: editingActivity.id,
        payload,
        imageFiles: newImageFiles,
        videoFiles: newVideoFiles,
        keepImageUrls: existingImageUrls,
        keepVideoUrls: existingVideoUrls,
        removedImageUrls,
        removedVideoUrls,
      });

      alert("Activity updated successfully!");
      router.push("/dashboard/leisure-activity");
    } catch (e: any) {
      console.error(e);
      alert(`Failed to update activity: ${e?.message || e}`);
    } finally {
      setIsSaving(false);
    }
  };

  const tabIndexNum = tabs.indexOf(activeTab);
  const handleNextOrSave = () => {
    if (tabIndexNum === tabs.length - 1) {
      void handleSave();
    } else {
      setActiveTab(tabs[tabIndexNum + 1]);
    }
  };

  const handlePrevious = () => {
    if (tabIndexNum > 0) setActiveTab(tabs[tabIndexNum - 1]);
  };

  const resetAll = () => {
    if (isSaving) return;
    if (activity) {
      setActiveTab("Activity Details");
      setNewImageFiles([]);
      setNewVideoFiles([]);
      setRemovedImageUrls([]);
      setRemovedVideoUrls([]);
      setExistingImageUrls(activity.images || []);
      setExistingVideoUrls(activity.videos || []);
      router.refresh?.();
    }
  };

  /* ---------- Guard Clauses ---------- */
  if (activity === undefined) {
    return <div className="p-6 text-sm text-gray-600">Loading activity…</div>;
  }

  if (!activity) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          No activity selected to edit. Go back and pick an activity first.
        </div>
      </div>
    );
  }

  /* ---------- Render Form Content ---------- */
  const renderFormContent = () => {
    switch (activeTab) {
      case "Activity Details":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Activity Name *</label>
              <input
                value={editingActivity?.name || ""}
                onChange={(e) => updateField("name", e.target.value)}
                className="border rounded-lg px-3 py-2 w-full text-sm"
                placeholder="e.g., Scuba Diving Adventure"
                disabled={isSaving}
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
                    blockType: { inDropdown: true, options: ["Normal", "H1", "H2", "H3", "Blockquote"] },
                  }}
                  wrapperClassName="rounded-lg"
                  editorClassName="px-3 py-2 min-h-[160px] text-sm"
                  toolbarClassName="border-b"
                  editorStyle={{ opacity: isSaving ? 0.5 : 1 }}
                  readOnly={isSaving}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Destination *</label>
              <input
                value={editingActivity?.destination || ""}
                onChange={(e) => updateField("destination", e.target.value)}
                className="border rounded-lg px-3 py-2 w-full text-sm"
                placeholder="e.g., Goa"
                disabled={isSaving}
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
                value={editingActivity?.vendorPrice || ""}
                onChange={(e) => updateField("vendorPrice", e.target.value)}
                className="border rounded-lg px-3 py-2 w-full text-sm"
                placeholder="2000"
                disabled={isSaving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Selling Price (INR) *</label>
              <input
                type="number"
                value={editingActivity?.sellingPrice || ""}
                onChange={(e) => updateField("sellingPrice", e.target.value)}
                className="border rounded-lg px-3 py-2 w-full text-sm"
                placeholder="3000"
                disabled={isSaving}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="taxIncluded"
                type="checkbox"
                checked={editingActivity?.taxIncluded ?? true}
                onChange={(e) => updateField("taxIncluded", e.target.checked)}
                className="w-4 h-4"
                disabled={isSaving}
              />
              <label htmlFor="taxIncluded" className="text-sm font-medium">
                Tax Included
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Tax Rate (%) {editingActivity?.taxIncluded ? "*" : "(disabled when not included)"}
              </label>
              <input
                type="number"
                value={editingActivity?.taxRate || ""}
                onChange={(e) => updateField("taxRate", e.target.value)}
                className="border rounded-lg px-3 py-2 w-full text-sm"
                placeholder="18"
                disabled={!editingActivity?.taxIncluded || isSaving}
              />
            </div>

            <div className="text-xs text-gray-500">
              Date-based adjustments are configured in the <span className="font-semibold">Surcharges</span> tab.
            </div>
          </div>
        );

      case "Schedule":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Operating Days *</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={toggleAllDays}
                  disabled={isSaving}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    (editingActivity?.operatingDays || []).length === allDays.length
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
                    disabled={isSaving}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      (editingActivity?.operatingDays || []).includes(d)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Open Time *</label>
                <input
                  type="time"
                  value={editingActivity?.openTime || ""}
                  onChange={(e) => updateField("openTime", e.target.value)}
                  className="border rounded-lg px-3 py-2 w-full text-sm"
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Close Time *</label>
                <input
                  type="time"
                  value={editingActivity?.closeTime || ""}
                  onChange={(e) => updateField("closeTime", e.target.value)}
                  className="border rounded-lg px-3 py-2 w-full text-sm"
                  disabled={isSaving}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Duration *</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={editingActivity?.duration || ""}
                  onChange={(e) => updateField("duration", e.target.value)}
                  className="border rounded-lg px-3 py-2 flex-1 text-sm"
                  placeholder="2"
                  disabled={isSaving}
                />
                <select
                  value={editingActivity?.durationType || "hrs"}
                  onChange={(e) => updateField("durationType", e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm"
                  disabled={isSaving}
                >
                  <option value="min">Minutes</option>
                  <option value="hrs">Hours</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Pickup Location *</label>
              <select
                value={editingActivity?.pickupLocation || ""}
                onChange={(e) => updateField("pickupLocation", e.target.value)}
                className="border rounded-lg px-3 py-2 w-full text-sm"
                disabled={isSaving}
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
                disabled={isSaving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Drop Location *</label>
              <select
                value={editingActivity?.dropLocation || ""}
                onChange={(e) => updateField("dropLocation", e.target.value)}
                className="border rounded-lg px-3 py-2 w-full text-sm"
                disabled={isSaving}
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
                disabled={isSaving}
              />
            </div>
          </div>
        );

      case "Surcharges":
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Add a surcharge for a <strong>single date</strong> or a <strong>date range</strong>.
              Single-date entries are stored as a one-day range.
            </p>

            <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="s-mode"
                    checked={currentSurcharge.mode === "single"}
                    onChange={() =>
                      setCurrentSurcharge((s) => ({
                        ...s,
                        mode: "single",
                        endDate: s.startDate,
                      }))
                    }
                    disabled={isSaving}
                  />
                  Single Date
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="s-mode"
                    checked={currentSurcharge.mode === "range"}
                    onChange={() => setCurrentSurcharge((s) => ({ ...s, mode: "range" }))}
                    disabled={isSaving}
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
                      disabled={isSaving}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium mb-1">Start</label>
                    <input
                      type="date"
                      value={currentSurcharge.startDate}
                      onChange={(e) => setCurrentSurcharge((s) => ({ ...s, startDate: e.target.value }))}
                      className="border rounded-lg px-2 py-1.5 w-full text-sm"
                      disabled={isSaving}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">End</label>
                    <input
                      type="date"
                      value={currentSurcharge.endDate}
                      onChange={(e) => setCurrentSurcharge((s) => ({ ...s, endDate: e.target.value }))}
                      className="border rounded-lg px-2 py-1.5 w-full text-sm"
                      disabled={isSaving}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Surcharge Amount</label>
                  <input
                    type="number"
                    value={currentSurcharge.surchargeAmount}
                    onChange={(e) =>
                      setCurrentSurcharge((s) => ({
                        ...s,
                        surchargeAmount: e.target.value,
                      }))
                    }
                    className="border rounded-lg px-2 py-1.5 w-full text-sm"
                    placeholder="500"
                    disabled={isSaving}
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
                    disabled={isSaving}
                  >
                    <option value="fixed">Fixed (INR)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleAddSurcharge}
                disabled={isSaving}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Add Surcharge
              </button>
            </div>

            {(editingActivity?.dateSurcharges || []).length > 0 ? (
              <div className="space-y-2">
                {(editingActivity.dateSurcharges || []).map((row, idx) => {
                  const isEditing = editingSurchargeIndex === idx;
                  const draft = isEditing ? (editingSurchargeDraft as DateSurcharge) : row;
                  return (
                    <div key={idx} className="border rounded-lg p-3 bg-white">
                      {isEditing ? (
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                          <div className="md:col-span-6">
                            <div className="flex gap-3">
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="radio"
                                  name={`row-mode-${idx}`}
                                  checked={draft.mode === "single"}
                                  onChange={() =>
                                    setEditingSurchargeDraft((d) =>
                                      d ? { ...d, mode: "single", endDate: d.startDate } : d
                                    )
                                  }
                                  disabled={isSaving}
                                />
                                Single Date
                              </label>
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="radio"
                                  name={`row-mode-${idx}`}
                                  checked={draft.mode === "range"}
                                  onChange={() =>
                                    setEditingSurchargeDraft((d) => (d ? { ...d, mode: "range" } : d))
                                  }
                                  disabled={isSaving}
                                />
                                Date Range
                              </label>
                            </div>
                          </div>

                          {draft.mode === "single" ? (
                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium mb-1">Date</label>
                              <input
                                type="date"
                                value={draft.startDate}
                                onChange={(e) =>
                                  setEditingSurchargeDraft((d) =>
                                    d ? { ...d, startDate: e.target.value, endDate: e.target.value } : d
                                  )
                                }
                                className="border rounded-lg px-2 py-1.5 w-full text-sm"
                                disabled={isSaving}
                              />
                            </div>
                          ) : (
                            <>
                              <div>
                                <label className="block text-xs font-medium mb-1">Start</label>
                                <input
                                  type="date"
                                  value={draft.startDate}
                                  onChange={(e) =>
                                    setEditingSurchargeDraft((d) => (d ? { ...d, startDate: e.target.value } : d))
                                  }
                                  className="border rounded-lg px-2 py-1.5 w-full text-sm"
                                  disabled={isSaving}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1">End</label>
                                <input
                                  type="date"
                                  value={draft.endDate}
                                  onChange={(e) =>
                                    setEditingSurchargeDraft((d) => (d ? { ...d, endDate: e.target.value } : d))
                                  }
                                  className="border rounded-lg px-2 py-1.5 w-full text-sm"
                                  disabled={isSaving}
                                />
                              </div>
                            </>
                          )}

                          <div>
                            <label className="block text-xs font-medium mb-1">Amount</label>
                            <input
                              type="number"
                              value={draft.surchargeAmount}
                              onChange={(e) =>
                                setEditingSurchargeDraft((d) =>
                                  d ? { ...d, surchargeAmount: e.target.value } : d
                                )
                              }
                              className="border rounded-lg px-2 py-1.5 w-full text-sm"
                              disabled={isSaving}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Type</label>
                            <select
                              value={draft.surchargeType}
                              onChange={(e) =>
                                setEditingSurchargeDraft((d) =>
                                  d ? { ...d, surchargeType: e.target.value as "fixed" | "percentage" } : d
                                )
                              }
                              className="border rounded-lg px-2 py-1.5 w-full text-sm"
                              disabled={isSaving}
                            >
                              <option value="fixed">Fixed (INR)</option>
                              <option value="percentage">Percentage (%)</option>
                            </select>
                          </div>

                          <div className="flex gap-2 md:justify-end md:col-span-2">
                            <button
                              onClick={saveEditSurcharge}
                              disabled={isSaving}
                              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50"
                            >
                              <Save size={16} /> Save
                            </button>
                            <button
                              onClick={cancelEditSurcharge}
                              disabled={isSaving}
                              className="px-3 py-2 border text-gray-700 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1"
                            >
                              <X size={16} /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
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
                              onClick={() => beginEditSurcharge(idx)}
                              disabled={isSaving}
                              className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 flex items-center gap-1 disabled:opacity-50"
                            >
                              <Edit2 size={14} /> Edit
                            </button>
                            <button
                              onClick={() => handleRemoveSurcharge(idx)}
                              disabled={isSaving}
                              className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 flex items-center gap-1 disabled:opacity-50"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
              <label className="block text-sm font-medium mb-2">Images * (At least one required)</label>
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
                  disabled={isSaving}
                />
              </label>

              {(editingActivity?.images || []).length > 0 && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(editingActivity.images || []).map((img, idx) => (
                    <div key={idx} className="relative border rounded-lg overflow-hidden group">
                      {img.startsWith("blob:") ? (
                        <div className="relative">
                          <img src={img} alt="" className="w-full h-32 object-cover" />
                          <div className="absolute bottom-1 left-1 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded">
                            NEW
                          </div>
                        </div>
                      ) : (
                        <img src={img} alt="" className="w-full h-32 object-cover" />
                      )}
                      <button
                        onClick={() => handleRemoveImage(idx)}
                        disabled={isSaving}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {removedImageUrls.length > 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  {removedImageUrls.length} image(s) will be removed on save.
                </p>
              )}
            </div>

            {/* Videos */}
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
                  disabled={isSaving}
                />
              </label>

              {(editingActivity?.videos || []).length > 0 && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {(editingActivity.videos || []).map((v, idx) => {
                    const isBlob = typeof v === "string" && v.startsWith("blob:");
                    return (
                      <div key={idx} className="relative border rounded-lg overflow-hidden group bg-black">
                        <video src={v} controls className="w-full h-40 object-cover" preload="metadata" />
                        {isBlob && (
                          <div className="absolute bottom-1 left-1 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded">
                            NEW
                          </div>
                        )}
                        <button
                          onClick={() => handleRemoveVideo(idx)}
                          disabled={isSaving}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                          title="Remove video"
                        >
                          <X size={14} />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 truncate">
                          {isBlob ? "Unsaved video" : `Video ${idx + 1}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {removedVideoUrls.length > 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  {removedVideoUrls.length} video(s) will be removed on save.
                </p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  /* ---------- Main Render ---------- */
  const tabIndexLocal = tabs.indexOf(activeTab);
  const isLast = tabIndexLocal === tabs.length - 1;
  const isFirst = tabIndexLocal === 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white shadow-md rounded-2xl p-4 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-blue-600 text-white grid place-items-center text-sm font-bold shadow">
                {editingActivity?.name?.[0]?.toUpperCase() || "A"}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Edit Leisure Activity</h1>
                <p className="text-sm text-gray-500">{editingActivity?.name || "Untitled"}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={resetAll}
                disabled={isSaving}
                className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Reset
              </button>
              <button
                onClick={() => router.push("/dashboard/leisure-activity")}
                disabled={isSaving}
                className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Back
              </button>
            </div>
          </div>

          <div className="flex overflow-x-auto mb-6 gap-2 pb-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                disabled={isSaving}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
                } disabled:opacity-50`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="mb-6">{renderFormContent()}</div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            {!isFirst && (
              <button
                onClick={handlePrevious}
                disabled={isSaving}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
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
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Saving...
                </>
              ) : isLast ? (
                <>
                  <Save size={18} />
                  Update Activity
                </>
              ) : (
                <>Save & Continue →</>
              )}
            </button>
            <button
              onClick={() => router.push("/dashboard/leisure-activity")}
              disabled={isSaving}
              className="sm:w-auto px-6 py-3 border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
          </div>

          <div className="mt-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              {tabs.map((tab, index) => (
                <div
                  key={tab}
                  className={`h-2 rounded-full transition-all ${
                    index <= tabIndexLocal ? "bg-blue-600 w-8" : "bg-gray-200 w-8"
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-gray-600">
              Step {tabIndexLocal + 1} of {tabs.length}: {activeTab}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}