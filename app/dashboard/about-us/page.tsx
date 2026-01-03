"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Target,
  TrendingUp,
  Globe,
  Award,
  Users,
  MapPin,
  Calendar,
  Heart,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { getInstance, patchInstance } from "@/lib/swr";
import TinyMCETextEditor from "@/components/TinyMCETextEditor";

// Types based on the API response structure
type AboutUsData = {
  _id?: string;
  heroTitle: string;
  heroDescription: string;
  heroBadges: string[];
  videoTitle: string;
  videoDescription: string;
  videos?: {
    thumbnailVideo?: {
      title: string;
      description: string;
      videoUrl: string;
    };
    generalVideos?: Array<{
      title: string;
      description: string;
      videoUrl: string;
    }>;
  };
  mission: {
    title: string;
    description: string;
  };
  vision: {
    title: string;
    description: string;
  };
  journey: Array<{
    date: string;
    title: string;
    description: string;
    icon: string;
    color: string;
  }>;
  stats: Array<{
    icon: string;
    value: string;
    label: string;
    color: string;
  }>;
  values: Array<{
    icon: string;
    title: string;
    description: string;
    color: string;
  }>;
  availableLocations: Array<{
    name?: string;
    title?: string;
    location: string;
    mapUrl?: string;
    exactAddress: string;
  }>;
  contactDetails?: {
    email: string;
    phone: string;
    whatsapp?: string;
  };
  images?: {
    thumbnail?: string;
    generalImages?: string[];
    guestImages?: string[];
  };
  ctaTitle: string;
  ctaDescription: string;
};

type ApiResponse = {
  success: boolean;
  message: string;
  data: AboutUsData;
};

// Icon mapping
const iconMap: Record<string, any> = {
  Sparkles,
  Target,
  TrendingUp,
  Globe,
  Award,
  Users,
  MapPin,
  Calendar,
  Heart,
};

type UploadItem = { file: File | null; preview?: string };

type ImageGridProps = {
  images: string[];
  uploads: Map<number, UploadItem>;
  setUploads: React.Dispatch<React.SetStateAction<Map<number, UploadItem>>>;
  arrayPath: string[];
  title: string;
  isEditing: boolean; // ✅ NEW
  updateField: (path: string[], value: any) => void;
  addArrayItem: (path: string[], newItem: any) => void;
};

 function ImageGrid({
    images,
    uploads,
    setUploads,
    arrayPath,
    title,
    isEditing,
    updateField,
  }: ImageGridProps) {
    const keyBase = arrayPath.join("-");

    const setUploadAt = (index: number, file: File) => {
      const preview = URL.createObjectURL(file);
      setUploads((prev) => {
        const next = new Map(prev);
        const existing = next.get(index);
        if (existing?.preview) URL.revokeObjectURL(existing.preview);
        next.set(index, { file, preview });
        return next;
      });
    };

    const removeAt = (index: number) => {
      const removed = uploads.get(index);
      if (removed?.preview) URL.revokeObjectURL(removed.preview);

      // remove from images
      const nextImages = images.filter((_, i) => i !== index);
      updateField(arrayPath, nextImages);

      // shift uploads map keys so indices stay aligned
      setUploads((prev) => {
        const next = new Map<number, UploadItem>();
        prev.forEach((val, k) => {
          if (k === index) return; // removed
          const newKey = k > index ? k - 1 : k;
          next.set(newKey, val);
        });
        return next;
      });
    };

    const trigger = (id: string) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      el?.click();
    };

    const onReplacePick = (index: number, file?: File) => {
      if (!file) return;
      setUploadAt(index, file);
    };

    // ✅ Add flow: open picker -> if file chosen, append slot -> set upload on new slot
    const onAddPick = (file?: File) => {
      if (!file) return;
      const newIndex = images.length;
      updateField(arrayPath, [...images, ""]); // only AFTER file chosen
      setUploadAt(newIndex, file);
    };

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
        </div>

        <div className="flex gap-3 flex-wrap">
          {images.map((img, index) => {
            const replaceId = `${keyBase}-input-${index}`;
            const src = uploads.get(index)?.preview || img;

            return (
              <div key={index} className="relative w-[180px]">
                {/* Tile */}
                {isEditing ? (
                  <button
                    type="button"
                    onClick={() => trigger(replaceId)}
                    className="w-[180px] h-[120px] rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm hover:shadow transition grid place-items-center"
                  >
                    {src ? (
                      <img
                        src={src}
                        alt={`${title} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full border-2 border-dashed border-gray-300 bg-gray-50 grid place-items-center text-sm text-gray-600">
                        Add Image
                      </div>
                    )}
                  </button>
                ) : (
                  <div className="w-[180px] h-[120px] rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
                    {src ? (
                      <img
                        src={src}
                        alt={`${title} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                )}

                {/* ✅ Remove X only in edit */}
                {isEditing && (img || uploads.get(index)?.file) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAt(index);
                    }}
                    className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-600 text-white grid place-items-center shadow hover:bg-red-700"
                    aria-label="Remove image"
                    title="Remove"
                  >
                    ✕
                  </button>
                )}

                {/* hidden replace input */}
                {isEditing && (
                  <input
                    id={replaceId}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      onReplacePick(index, e.target.files?.[0]);
                      e.currentTarget.value = "";
                    }}
                  />
                )}
              </div>
            );
          })}

          {/* ✅ SINGLE Add tile only in edit */}
          {isEditing && (
            <>
              <button
                type="button"
                onClick={() => trigger(`${keyBase}-add`)}
                className="w-[180px] h-[120px] rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50 transition grid place-items-center text-sm text-gray-600"
              >
                Add Image
              </button>

              <input
                id={`${keyBase}-add`}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  onAddPick(e.target.files?.[0]);
                  e.currentTarget.value = "";
                }}
              />
            </>
          )}
        </div>

        {/* ✅ show pending uploads list (optional) */}
        {isEditing && uploads.size > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            Selected new images will upload when you click <b>Save</b>.
          </p>
        )}
      </div>
    );
  }



export default function AboutUsPage() {
  const [data, setData] = useState<AboutUsData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  // ===== File upload states (UPDATED) =====
  const [thumbnailVideoUpload, setThumbnailVideoUpload] = useState<UploadItem>({
    file: null,
  });
  const [generalVideoUploads, setGeneralVideoUploads] = useState<
    Map<number, UploadItem>
  >(new Map());

  const [thumbnailImageUpload, setThumbnailImageUpload] = useState<UploadItem>({
    file: null,
  });
  const [generalImageUploads, setGeneralImageUploads] = useState<
    Map<number, UploadItem>
  >(new Map());
  const [guestImageUploads, setGuestImageUploads] = useState<
    Map<number, UploadItem>
  >(new Map());

  // Cleanup blob previews on unmount
  useEffect(() => {
    return () => {
      if (thumbnailVideoUpload.preview)
        URL.revokeObjectURL(thumbnailVideoUpload.preview);
      if (thumbnailImageUpload.preview)
        URL.revokeObjectURL(thumbnailImageUpload.preview);

      generalVideoUploads.forEach((u) => u.preview && URL.revokeObjectURL(u.preview));
      generalImageUploads.forEach((u) => u.preview && URL.revokeObjectURL(u.preview));
      guestImageUploads.forEach((u) => u.preview && URL.revokeObjectURL(u.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch data on mount - optimized to not block navigation
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setFetching(true);
        const response = (await getInstance(
          `${process.env.NEXT_PUBLIC_API_BASE}about`
        )) as ApiResponse;

        if (cancelled) return;

        if (response.success && response.data) {
          setData(response.data);
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Error fetching about data:", error);
        alert("Failed to load About Us data. Please refresh the page.");
      } finally {
        if (!cancelled) setFetching(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveSection = async (section: string, sectionData: any) => {
    try {
      setSavingSection(section);

      // Check if this section needs file uploads
      if (section === "videos" || section === "images") {
        await handleSaveWithFiles(section, sectionData);
      } else {
        const response = await patchInstance<ApiResponse>(
          `${process.env.NEXT_PUBLIC_API_BASE}about/section/${section}`,
          sectionData
        );
        if (response.success && response.data) {
          setData(response.data);
          setIsEditing(false);
          setActiveSection(null);
          alert(`${section} updated successfully!`);
        }
      }
    } catch (error: any) {
      console.error(`Error saving ${section}:`, error);
      alert(`Failed to save ${section}. ${error.message || "Please try again."}`);
    } finally {
      setSavingSection(null);
    }
  };

  // ===== UPDATED handleSaveWithFiles =====
  const deepClone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

  const handleSaveWithFiles = async (section: string, sectionData: any) => {
    const formData = new FormData();

    // ✅ Clean JSON so old URLs aren't sent when new binaries exist
    const cleanData = deepClone(sectionData);

    if (section === "videos") {
      // thumbnail video: if uploading a file, remove the videoUrl from JSON
      if (thumbnailVideoUpload.file) {
        if (cleanData?.videos?.thumbnailVideo) {
          delete cleanData.videos.thumbnailVideo.videoUrl;
        }
      }

      // general videos: for each uploaded index, remove that slot's videoUrl from JSON
      generalVideoUploads.forEach((u, idx) => {
        if (u.file && cleanData?.videos?.generalVideos?.[idx]) {
          delete cleanData.videos.generalVideos[idx].videoUrl;
        }
      });
    }

    if (section === "images") {
      // thumbnail image: if uploading a file, remove thumbnail URL from JSON
      if (thumbnailImageUpload.file) {
        if (cleanData?.images) {
          delete cleanData.images.thumbnail;
        }
      }

      // general images: for each uploaded index, remove that slot's string URL from JSON
      generalImageUploads.forEach((u, idx) => {
        if (u.file && Array.isArray(cleanData?.images?.generalImages)) {
          cleanData.images.generalImages[idx] = "";
        }
      });

      // guest images: same
      guestImageUploads.forEach((u, idx) => {
        if (u.file && Array.isArray(cleanData?.images?.guestImages)) {
          cleanData.images.guestImages[idx] = "";
        }
      });
    }

    // ✅ Append cleaned JSON
    formData.append("data", JSON.stringify(cleanData));

    // ✅ Append binaries (same as your current logic)
    if (section === "videos") {
      if (thumbnailVideoUpload.file) {
        formData.append(
          "thumbnailVideo",
          thumbnailVideoUpload.file,
          thumbnailVideoUpload.file.name
        );
      }
      generalVideoUploads.forEach((u, index) => {
        if (u.file) formData.append(`generalVideo_${index}`, u.file, u.file.name);
      });
    } else if (section === "images") {
      if (thumbnailImageUpload.file) {
        formData.append("thumbnail", thumbnailImageUpload.file, thumbnailImageUpload.file.name);
      }
      generalImageUploads.forEach((u, index) => {
        if (u.file) formData.append(`generalImage_${index}`, u.file, u.file.name);
      });
      guestImageUploads.forEach((u, index) => {
        if (u.file) formData.append(`guestImage_${index}`, u.file, u.file.name);
      });
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE}about/section/${section}`,
      {
        method: "PATCH",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Request failed");
    }

    const result = (await response.json()) as ApiResponse;
    if (result.success && result.data) {
      setData(result.data);

      // Clear file states after successful upload (and revoke previews)
      if (section === "videos") {
        if (thumbnailVideoUpload.preview) URL.revokeObjectURL(thumbnailVideoUpload.preview);
        generalVideoUploads.forEach((u) => u.preview && URL.revokeObjectURL(u.preview));

        setThumbnailVideoUpload({ file: null });
        setGeneralVideoUploads(new Map());
      } else if (section === "images") {
        if (thumbnailImageUpload.preview) URL.revokeObjectURL(thumbnailImageUpload.preview);
        generalImageUploads.forEach((u) => u.preview && URL.revokeObjectURL(u.preview));
        guestImageUploads.forEach((u) => u.preview && URL.revokeObjectURL(u.preview));

        setThumbnailImageUpload({ file: null });
        setGeneralImageUploads(new Map());
        setGuestImageUploads(new Map());
      }

      setIsEditing(false);
      setActiveSection(null);
      alert(`${section} updated successfully!`);
    }
  };

  const updateField = (path: string[], value: any) => {
    if (!data) return;
    setData((prev) => {
      if (!prev) return prev;
      const newData: any = { ...prev };
      let current: any = newData;
      for (let i = 0; i < path.length - 1; i++) {
        if (Array.isArray(current[path[i]])) {
          current = current[path[i]];
          continue;
        }
        current[path[i]] = { ...current[path[i]] };
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return newData;
    });
  };

 // ---------- immutable helpers ----------
const getIn = (obj: any, path: string[]) =>
  path.reduce((acc, key) => acc?.[key], obj);

const setIn = (obj: any, path: string[], value: any): any => {
  const [head, ...rest] = path;
  const clone = Array.isArray(obj) ? [...obj] : { ...obj };

  if (rest.length === 0) {
    clone[head] = value;
    return clone;
  }

  clone[head] = setIn(obj?.[head] ?? {}, rest, value);
  return clone;
};

// ---------- replace these 3 functions ----------
const addArrayItem = (path: string[], newItem: any) => {
  setData((prev) => {
    if (!prev) return prev;
    const arr = (getIn(prev, path) as any[]) ?? [];
    return setIn(prev, path, [...arr, newItem]);
  });
};

const removeArrayItem = (path: string[], index: number) => {
  setData((prev) => {
    if (!prev) return prev;
    const arr = ((getIn(prev, path) as any[]) ?? []).filter((_, i) => i !== index);
    return setIn(prev, path, arr);
  });
};

const updateArrayItem = (path: string[], index: number, value: any) => {
  setData((prev) => {
    if (!prev) return prev;
    const arr = ((getIn(prev, path) as any[]) ?? []).map((item, i) => {
      if (i !== index) return item;
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return { ...item, ...value };
      }
      return value;
    });
    return setIn(prev, path, arr);
  });
};


  // Show loading state only if we don't have data yet
  if (fetching && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4" size={48} />
          <p className="text-gray-600">Loading About Us data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load data. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 md:p-6 -mx-3 sm:mx-0">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-6">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">About Us</h1>
          <div className="flex gap-2 w-full sm:w-auto">
            {isEditing ? (
              <button
                onClick={() => {
                  setIsEditing(false);
                  setActiveSection(null);
                }}
                className="flex-1 sm:flex-initial px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 flex items-center justify-center gap-2 text-sm sm:text-base touch-manipulation transition-colors"
              >
                <X size={18} className="flex-shrink-0" />
                <span>Cancel</span>
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 sm:flex-initial px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 flex items-center justify-center gap-2 text-sm sm:text-base touch-manipulation transition-colors"
              >
                <Edit size={18} className="flex-shrink-0" />
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>

        {/* Hero Section */}
        <section className="bg-white rounded-lg shadow-sm p-3 sm:p-6 md:p-8 mb-3 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-2xl font-semibold text-gray-800">
              Hero Section
            </h2>
            {isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setActiveSection(activeSection === "hero" ? null : "hero")
                  }
                  className="text-blue-600 hover:text-blue-700"
                >
                  {activeSection === "hero" ? "Collapse" : "Expand"}
                </button>
                {activeSection === "hero" && (
                  <button
                    onClick={() =>
                      handleSaveSection("hero", {
                        heroTitle: data.heroTitle,
                        heroDescription: data.heroDescription,
                        heroBadges: data.heroBadges,
                      })
                    }
                    disabled={savingSection === "hero"}
                    className="text-green-600 hover:text-green-700 flex items-center gap-1 disabled:opacity-50"
                    type="button"
                  >
                    {savingSection === "hero" ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    Save
                  </button>
                )}
              </div>
            )}
          </div>

          {activeSection === "hero" || !isEditing ? (
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Hero Title
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={data.heroTitle}
                    onChange={(e) => updateField(["heroTitle"], e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
                  />
                ) : (
                  <p className="text-lg sm:text-xl font-bold text-gray-900 break-words">
                    {data.heroTitle}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Hero Description
                </label>
                {isEditing ? (
                  <TinyMCETextEditor
                    value={data.heroDescription || ""}
                    disabled={savingSection === "hero"}
                    onChange={(html) => updateField(["heroDescription"], html)}
                  />
                ) : (
                  <div
                    className="prose prose-sm max-w-none text-gray-600 break-words leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: data.heroDescription || "" }}
                  />
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Hero Badges
                </label>
                {isEditing ? (
                  <div className="space-y-2">
                    {data.heroBadges.map((badge, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={badge}
                          onChange={(e) => {
                            const newBadges = [...data.heroBadges];
                            newBadges[index] = e.target.value;
                            updateField(["heroBadges"], newBadges);
                          }}
                          className="flex-1 px-3 sm:px-4 py-2.5 sm:py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
                        />
                        <button
                          onClick={() => removeArrayItem(["heroBadges"], index)}
                          className="px-3 sm:px-4 py-2.5 sm:py-2 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg touch-manipulation min-w-[44px] flex items-center justify-center"
                          aria-label="Remove badge"
                          type="button"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addArrayItem(["heroBadges"], "")}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-blue-600 hover:text-blue-700 active:text-blue-800 hover:bg-blue-50 active:bg-blue-100 rounded-lg touch-manipulation w-full sm:w-auto"
                      type="button"
                    >
                      <Plus size={18} className="flex-shrink-0" />
                      <span>Add Badge</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {data.heroBadges.map((badge, index) => (
                      <span
                        key={index}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-100 text-blue-800 rounded-full text-xs sm:text-sm font-medium break-words"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </section>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 mb-3 sm:mb-6">
          {/* Mission */}
          <section className="bg-white rounded-lg shadow-sm p-3 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-2xl font-semibold text-gray-800">
                Mission
              </h2>
              {isEditing && (
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setActiveSection(activeSection === "mission" ? null : "mission")
                    }
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {activeSection === "mission" ? "Collapse" : "Expand"}
                  </button>
                  {activeSection === "mission" && (
                    <button
                      onClick={() => handleSaveSection("mission", data.mission)}
                      disabled={savingSection === "mission"}
                      className="text-green-600 hover:text-green-700 flex items-center gap-1 disabled:opacity-50"
                      type="button"
                    >
                      {savingSection === "mission" ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      Save
                    </button>
                  )}
                </div>
              )}
            </div>

            {activeSection === "mission" || !isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={data.mission.title}
                      onChange={(e) =>
                        updateField(["mission", "title"], e.target.value)
                      }
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
                    />
                  ) : (
                    <p className="text-lg sm:text-xl font-semibold text-gray-900 break-words">
                      {data.mission.title}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  {isEditing ? (
                    <TinyMCETextEditor
                      value={data.mission.description || ""}
                      disabled={savingSection === "mission"}
                      onChange={(html) =>
                        updateField(["mission", "description"], html)
                      }
                    />
                  ) : (
                    <div
                      className="prose prose-sm max-w-none text-gray-600 leading-relaxed break-words"
                      dangerouslySetInnerHTML={{
                        __html: data.mission.description || "",
                      }}
                    />
                  )}
                </div>
              </div>
            ) : null}
          </section>

          {/* Vision */}
          <section className="bg-white rounded-lg shadow-sm p-3 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-2xl font-semibold text-gray-800">
                Vision
              </h2>
              {isEditing && (
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setActiveSection(activeSection === "vision" ? null : "vision")
                    }
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {activeSection === "vision" ? "Collapse" : "Expand"}
                  </button>
                  {activeSection === "vision" && (
                    <button
                      onClick={() => handleSaveSection("vision", data.vision)}
                      disabled={savingSection === "vision"}
                      className="text-green-600 hover:text-green-700 flex items-center gap-1 disabled:opacity-50"
                      type="button"
                    >
                      {savingSection === "vision" ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      Save
                    </button>
                  )}
                </div>
              )}
            </div>

            {activeSection === "vision" || !isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={data.vision.title}
                      onChange={(e) =>
                        updateField(["vision", "title"], e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-xl font-semibold text-gray-900">
                      {data.vision.title}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  {isEditing ? (
                    <TinyMCETextEditor
                      value={data.vision.description || ""}
                      disabled={savingSection === "vision"}
                      onChange={(html) =>
                        updateField(["vision", "description"], html)
                      }
                    />
                  ) : (
                    <div
                      className="prose prose-sm max-w-none text-gray-600 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: data.vision.description || "",
                      }}
                    />
                  )}
                </div>
              </div>
            ) : null}
          </section>
        </div>

        {/* Journey Timeline */}
        <section className="bg-white rounded-lg shadow-sm p-4 sm:p-6 md:p-8 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">
              Our Journey
            </h2>
            {isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setActiveSection(activeSection === "journey" ? null : "journey")
                  }
                  className="text-blue-600 hover:text-blue-700"
                >
                  {activeSection === "journey" ? "Collapse" : "Expand"}
                </button>
                {activeSection === "journey" && (
                  <>
                    <button
                      onClick={() =>
                        addArrayItem(["journey"], {
                          date: new Date().toISOString().split("T")[0],
                          title: "",
                          description: "",
                          icon: "Award",
                          color: "bg-blue-500",
                        })
                      }
                      className="text-green-600 hover:text-green-700 flex items-center gap-1"
                      type="button"
                    >
                      <Plus size={18} />
                      Add
                    </button>
                    <button
                      onClick={() =>
                        handleSaveSection("journey", { journey: data.journey })
                      }
                      disabled={savingSection === "journey"}
                      className="text-green-600 hover:text-green-700 flex items-center gap-1 disabled:opacity-50"
                      type="button"
                    >
                      {savingSection === "journey" ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      Save
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {activeSection === "journey" || !isEditing ? (
            <div className="relative">
              <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              <div className="space-y-6 sm:space-y-8">
                {data.journey.map((item, index) => {
                  const IconComponent = iconMap[item.icon] || Award;
                  const year = item.date
                    ? new Date(item.date).getFullYear().toString()
                    : "";
                  return (
                    <div key={index} className="relative flex gap-3 sm:gap-6">
                      <div
                        className={`${item.color} w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white z-10 flex-shrink-0`}
                      >
                        <IconComponent size={20} className="sm:w-6 sm:h-6" />
                      </div>
                      <div className="flex-1 pb-6 sm:pb-8">
                        {isEditing ? (
                          <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                                  Date
                                </label>
                                <input
                                  type="date"
                                  value={item.date}
                                  onChange={(e) =>
                                    updateArrayItem(["journey"], index, {
                                      date: e.target.value,
                                    })
                                  }
                                  className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
                                />
                              </div>
                              <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                                  Color
                                </label>
                                <select
                                  value={item.color}
                                  onChange={(e) =>
                                    updateArrayItem(["journey"], index, {
                                      color: e.target.value,
                                    })
                                  }
                                  className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
                                >
                                  <option value="bg-blue-500">Blue</option>
                                  <option value="bg-orange-500">Orange</option>
                                  <option value="bg-green-500">Green</option>
                                  <option value="bg-violet-500">Violet</option>
                                  <option value="bg-red-500">Red</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                                Title
                              </label>
                              <input
                                type="text"
                                value={item.title}
                                onChange={(e) =>
                                  updateArrayItem(["journey"], index, {
                                    title: e.target.value,
                                  })
                                }
                                className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
                              />
                            </div>
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                                Description
                              </label>
                              <TinyMCETextEditor
                                value={item.description || ""}
                                disabled={savingSection === "journey"}
                                onChange={(html) =>
                                  updateArrayItem(["journey"], index, {
                                    description: html,
                                  })
                                }
                              />
                            </div>
                            <button
                              onClick={() => removeArrayItem(["journey"], index)}
                              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-red-600 hover:text-red-700 active:text-red-800 hover:bg-red-50 active:bg-red-100 text-sm flex items-center justify-center gap-2 rounded-lg border border-red-200 touch-manipulation transition-colors"
                              type="button"
                            >
                              <Trash2 size={16} className="flex-shrink-0" />
                              <span>Remove</span>
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                              <span className="text-xl sm:text-2xl font-bold text-gray-900">
                                {year}
                              </span>
                              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 break-words">
                                {item.title}
                              </h3>
                            </div>
                            <div
                              className="prose prose-sm max-w-none text-gray-600 leading-relaxed break-words"
                              dangerouslySetInnerHTML={{
                                __html: item.description || "",
                              }}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>

        {/* Stats */}
        <section className="bg-white rounded-lg shadow-sm p-4 sm:p-6 md:p-8 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">
              Statistics
            </h2>
            {isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setActiveSection(activeSection === "stats" ? null : "stats")
                  }
                  className="text-blue-600 hover:text-blue-700"
                >
                  {activeSection === "stats" ? "Collapse" : "Expand"}
                </button>
                {activeSection === "stats" && (
                  <>
                    <button
                      onClick={() =>
                        addArrayItem(["stats"], {
                          icon: "Award",
                          value: "",
                          label: "",
                          color: "text-blue-600",
                        })
                      }
                      className="text-green-600 hover:text-green-700 flex items-center gap-1"
                      type="button"
                    >
                      <Plus size={18} />
                      Add
                    </button>
                    <button
                      onClick={() =>
                        handleSaveSection("stats", { stats: data.stats })
                      }
                      disabled={savingSection === "stats"}
                      className="text-green-600 hover:text-green-700 flex items-center gap-1 disabled:opacity-50"
                      type="button"
                    >
                      {savingSection === "stats" ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      Save
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {activeSection === "stats" || !isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {data.stats.map((stat, index) => {
                const IconComponent = iconMap[stat.icon] || Award;
                return (
                  <div
                    key={index}
                    className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 text-center"
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Value
                          </label>
                          <input
                            type="text"
                            value={stat.value}
                            onChange={(e) =>
                              updateArrayItem(["stats"], index, {
                                value: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Label
                          </label>
                          <input
                            type="text"
                            value={stat.label}
                            onChange={(e) =>
                              updateArrayItem(["stats"], index, {
                                label: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <button
                          onClick={() => removeArrayItem(["stats"], index)}
                          className="text-red-600 hover:text-red-700 text-sm"
                          type="button"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <IconComponent size={48} className={`${stat.color} mx-auto mb-4`} />
                        <div className={`text-4xl font-bold ${stat.color} mb-2`}>
                          {stat.value}
                        </div>
                        <div className="text-gray-600 font-medium">{stat.label}</div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>

        {/* Values */}
        <section className="bg-white rounded-lg shadow-sm p-4 sm:p-6 md:p-8 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">
              Our Values
            </h2>
            {isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setActiveSection(activeSection === "values" ? null : "values")
                  }
                  className="text-blue-600 hover:text-blue-700"
                >
                  {activeSection === "values" ? "Collapse" : "Expand"}
                </button>
                {activeSection === "values" && (
                  <>
                    <button
                      onClick={() =>
                        addArrayItem(["values"], {
                          icon: "Heart",
                          title: "",
                          description: "",
                          color: "bg-red-50 border-red-200",
                        })
                      }
                      className="text-green-600 hover:text-green-700 flex items-center gap-1"
                      type="button"
                    >
                      <Plus size={18} />
                      Add
                    </button>
                    <button
                      onClick={() =>
                        handleSaveSection("values", { values: data.values })
                      }
                      disabled={savingSection === "values"}
                      className="text-green-600 hover:text-green-700 flex items-center gap-1 disabled:opacity-50"
                      type="button"
                    >
                      {savingSection === "values" ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      Save
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {activeSection === "values" || !isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {data.values.map((value, index) => {
                const IconComponent = iconMap[value.icon] || Heart;
                return (
                  <div key={index} className={`${value.color} border-2 rounded-lg p-6`}>
                    {isEditing ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Title
                          </label>
                          <input
                            type="text"
                            value={value.title}
                            onChange={(e) =>
                              updateArrayItem(["values"], index, {
                                title: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <TinyMCETextEditor
                            value={value.description || ""}
                            disabled={savingSection === "values"}
                            onChange={(html) =>
                              updateArrayItem(["values"], index, {
                                description: html,
                              })
                            }
                          />
                        </div>
                        <button
                          onClick={() => removeArrayItem(["values"], index)}
                          className="text-red-600 hover:text-red-700 text-sm"
                          type="button"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <IconComponent size={32} className="text-gray-800 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {value.title}
                        </h3>
                        <div
                          className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: value.description || "",
                          }}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>

        {/* Locations */}
        <section className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">
              Available Locations
            </h2>
            {isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setActiveSection(activeSection === "locations" ? null : "locations")
                  }
                  className="text-blue-600 hover:text-blue-700"
                >
                  {activeSection === "locations" ? "Collapse" : "Expand"}
                </button>
                {activeSection === "locations" && (
                  <>
                    <button
                      onClick={() =>
                        addArrayItem(["availableLocations"], {
                          name: "",
                          title: "",
                          location: "",
                          mapUrl: "",
                          exactAddress: "",
                        })
                      }
                      className="text-green-600 hover:text-green-700 flex items-center gap-1"
                      type="button"
                    >
                      <Plus size={18} />
                      Add
                    </button>
                    <button
                      onClick={() =>
                        handleSaveSection("availableLocations", {
                          availableLocations: data.availableLocations,
                        })
                      }
                      disabled={savingSection === "availableLocations"}
                      className="text-green-600 hover:text-green-700 flex items-center gap-1 disabled:opacity-50"
                      type="button"
                    >
                      {savingSection === "availableLocations" ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      Save
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {activeSection === "locations" || !isEditing ? (
            <div className="space-y-4">
              {data.availableLocations.map((location, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name
                          </label>
                          <input
                            type="text"
                            value={location.name || ""}
                            onChange={(e) =>
                              updateArrayItem(["availableLocations"], index, {
                                name: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Title
                          </label>
                          <input
                            type="text"
                            value={location.title || ""}
                            onChange={(e) =>
                              updateArrayItem(["availableLocations"], index, {
                                title: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Location
                        </label>
                        <input
                          type="text"
                          value={location.location}
                          onChange={(e) =>
                            updateArrayItem(["availableLocations"], index, {
                              location: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Map URL
                        </label>
                        <input
                          type="text"
                          value={location.mapUrl || ""}
                          onChange={(e) =>
                            updateArrayItem(["availableLocations"], index, {
                              mapUrl: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Address
                        </label>
                        <input
                          type="text"
                          value={location.exactAddress}
                          onChange={(e) =>
                            updateArrayItem(["availableLocations"], index, {
                              exactAddress: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <button
                        onClick={() => removeArrayItem(["availableLocations"], index)}
                        className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                        type="button"
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <MapPin size={24} className="text-blue-600 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {location.title || location.location}
                        </h3>
                        <p className="text-gray-600 text-sm">{location.exactAddress}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {/* Contact Details */}
        {data.contactDetails && (
          <section className="bg-white rounded-lg shadow-sm p-8 mb-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">
                Contact Details
              </h2>
              {isEditing && (
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setActiveSection(
                        activeSection === "contactDetails" ? null : "contactDetails"
                      )
                    }
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {activeSection === "contactDetails" ? "Collapse" : "Expand"}
                  </button>
                  {activeSection === "contactDetails" && (
                    <button
                      onClick={() =>
                        handleSaveSection("contactDetails", {
                          contactDetails: data.contactDetails,
                        })
                      }
                      disabled={savingSection === "contactDetails"}
                      className="text-green-600 hover:text-green-700 flex items-center gap-1 disabled:opacity-50"
                      type="button"
                    >
                      {savingSection === "contactDetails" ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      Save
                    </button>
                  )}
                </div>
              )}
            </div>

            {activeSection === "contactDetails" || !isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={data.contactDetails.email}
                      onChange={(e) =>
                        updateField(["contactDetails", "email"], e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-600">{data.contactDetails.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={data.contactDetails.phone}
                      onChange={(e) =>
                        updateField(["contactDetails", "phone"], e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-600">{data.contactDetails.phone}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    WhatsApp
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={data.contactDetails.whatsapp || ""}
                      onChange={(e) =>
                        updateField(["contactDetails", "whatsapp"], e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-600">
                      {data.contactDetails.whatsapp || "N/A"}
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        )}

        {/* =========================
            VIDEOS (UPDATED UI)
           ========================= */}
        {data.videos && (
          <section className="bg-white rounded-lg shadow-sm p-8 mb-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Videos</h2>
              {isEditing && (
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setActiveSection(activeSection === "videos" ? null : "videos")
                    }
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {activeSection === "videos" ? "Collapse" : "Expand"}
                  </button>
                  {activeSection === "videos" && (
                    <button
                      onClick={() =>
                        handleSaveSection("videos", { videos: data.videos })
                      }
                      disabled={savingSection === "videos"}
                      className="text-green-600 hover:text-green-700 flex items-center gap-1 disabled:opacity-50"
                      type="button"
                    >
                      {savingSection === "videos" ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      Save
                    </button>
                  )}
                </div>
              )}
            </div>

            {activeSection === "videos" || !isEditing ? (
              <div className="space-y-6">
                {/* Thumbnail Video */}
                {data.videos.thumbnailVideo && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">
                      Thumbnail Video
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Title
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={data.videos.thumbnailVideo.title}
                            onChange={(e) =>
                              updateField(
                                ["videos", "thumbnailVideo", "title"],
                                e.target.value
                              )
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-gray-900">
                            {data.videos.thumbnailVideo.title}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description
                        </label>
                        {isEditing ? (
                          <TinyMCETextEditor
                            value={data.videos.thumbnailVideo.description || ""}
                            disabled={savingSection === "videos"}
                            onChange={(html) =>
                              updateField(
                                ["videos", "thumbnailVideo", "description"],
                                html
                              )
                            }
                          />
                        ) : (
                          <div
                            className="prose prose-sm max-w-none text-gray-600"
                            dangerouslySetInnerHTML={{
                              __html: data.videos.thumbnailVideo.description || "",
                            }}
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Video
                        </label>

                        {isEditing ? (
                          <div className="space-y-3">
                            {(thumbnailVideoUpload.preview ||
                              data.videos.thumbnailVideo.videoUrl) && (
                              <video
                                src={
                                  thumbnailVideoUpload.preview ||
                                  data.videos.thumbnailVideo.videoUrl
                                }
                                controls
                                className="w-full max-w-2xl rounded-lg"
                                playsInline
                              />
                            )}

                            <div className="flex flex-col sm:flex-row gap-2">
                              <label className="flex-1 px-4 py-2 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50 cursor-pointer text-sm text-blue-700 hover:border-blue-500 text-center">
                                Upload new video
                                <input
                                  type="file"
                                  accept="video/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;

                                    const preview = URL.createObjectURL(file);
                                    if (thumbnailVideoUpload.preview) {
                                      URL.revokeObjectURL(thumbnailVideoUpload.preview);
                                    }
                                    setThumbnailVideoUpload({ file, preview });
                                  }}
                                />
                              </label>

                              <button
                                type="button"
                                className="px-4 py-2 rounded-lg border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                                onClick={() => {
                                  if (thumbnailVideoUpload.preview) {
                                    URL.revokeObjectURL(thumbnailVideoUpload.preview);
                                  }
                                  setThumbnailVideoUpload({ file: null });
                                  updateField(["videos", "thumbnailVideo", "videoUrl"], "");
                                }}
                              >
                                Remove
                              </button>
                            </div>

                            {thumbnailVideoUpload.file && (
                              <p className="text-sm text-green-600">
                                Selected: {thumbnailVideoUpload.file.name}
                              </p>
                            )}
                          </div>
                        ) : (
                          <video
                            src={data.videos.thumbnailVideo.videoUrl}
                            controls
                            className="w-full max-w-2xl rounded-lg"
                            playsInline
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* General Videos */}
                {data.videos.generalVideos && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-700">
                        General Videos
                      </h3>
                      {isEditing && (
                        <button
                          onClick={() =>
                            addArrayItem(["videos", "generalVideos"], {
                              title: "",
                              description: "",
                              videoUrl: "",
                            })
                          }
                          className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          type="button"
                        >
                          <Plus size={18} />
                          Add Video
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {data.videos.generalVideos.map((video, index) => (
                        <div
                          key={index}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          {isEditing ? (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Title
                                </label>
                                <input
                                  type="text"
                                  value={video.title}
                                  onChange={(e) =>
                                    updateArrayItem(["videos", "generalVideos"], index, {
                                      title: e.target.value,
                                    })
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Description
                                </label>
                                <TinyMCETextEditor
                                  value={video.description || ""}
                                  disabled={savingSection === "videos"}
                                  onChange={(html) =>
                                    updateArrayItem(["videos", "generalVideos"], index, {
                                      description: html,
                                    })
                                  }
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Video
                                </label>

                                {(generalVideoUploads.get(index)?.preview ||
                                  video.videoUrl) && (
                                  <video
                                    src={
                                      generalVideoUploads.get(index)?.preview ||
                                      video.videoUrl
                                    }
                                    controls
                                    className="w-full rounded-lg mb-2"
                                    playsInline
                                  />
                                )}

                                <div className="flex flex-col sm:flex-row gap-2">
                                  <label className="flex-1 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 cursor-pointer text-sm text-gray-700 hover:border-emerald-500 text-center">
                                    Upload / Replace
                                    <input
                                      type="file"
                                      accept="video/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;

                                        const preview = URL.createObjectURL(file);
                                        setGeneralVideoUploads((prev) => {
                                          const next = new Map(prev);
                                          const existing = next.get(index);
                                          if (existing?.preview) {
                                            URL.revokeObjectURL(existing.preview);
                                          }
                                          next.set(index, { file, preview });
                                          return next;
                                        });
                                      }}
                                    />
                                  </label>

                                  <button
                                    type="button"
                                    className="px-3 py-2 rounded-lg border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 text-sm"
                                    onClick={() => {
                                      setGeneralVideoUploads((prev) => {
                                        const next = new Map(prev);
                                        const existing = next.get(index);
                                        if (existing?.preview) {
                                          URL.revokeObjectURL(existing.preview);
                                        }
                                        next.delete(index);
                                        return next;
                                      });
                                      updateArrayItem(["videos", "generalVideos"], index, {
                                        videoUrl: "",
                                      });
                                    }}
                                  >
                                    Remove video
                                  </button>
                                </div>

                                {generalVideoUploads.get(index)?.file && (
                                  <p className="text-xs text-green-600 mt-1">
                                    Selected: {generalVideoUploads.get(index)?.file?.name}
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                  onClick={() =>
                                    removeArrayItem(["videos", "generalVideos"], index)
                                  }
                                  className="flex-1 px-3 py-2 rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 text-sm flex items-center justify-center gap-2"
                                  type="button"
                                >
                                  <Trash2 size={16} />
                                  Remove slot
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 break-words">
                                {video.title}
                              </h4>
                              <div
                                className="prose prose-sm max-w-none text-gray-600 mb-2 break-words"
                                dangerouslySetInnerHTML={{
                                  __html: video.description || "",
                                }}
                              />
                              <video
                                src={video.videoUrl}
                                controls
                                className="w-full rounded-lg"
                                playsInline
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </section>
        )}

        {/* =========================
            IMAGES (UPDATED UI)
           ========================= */}
        {data.images && (
          <section className="bg-white rounded-lg shadow-sm p-8 mb-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Images</h2>
              {isEditing && (
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setActiveSection(activeSection === "images" ? null : "images")
                    }
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {activeSection === "images" ? "Collapse" : "Expand"}
                  </button>
                  {activeSection === "images" && (
                    <button
                      onClick={() =>
                        handleSaveSection("images", { images: data.images })
                      }
                      disabled={savingSection === "images"}
                      className="text-green-600 hover:text-green-700 flex items-center gap-1 disabled:opacity-50"
                      type="button"
                    >
                      {savingSection === "images" ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      Save
                    </button>
                  )}
                </div>
              )}
            </div>

            {activeSection === "images" || !isEditing ? (
              <div className="space-y-6">
                {/* Thumbnail Image */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">
                    Thumbnail Image
                  </h3>

                  {isEditing ? (
                    <div className="space-y-3">
                      {(thumbnailImageUpload.preview || data.images?.thumbnail) && (
                        <img
                          src={thumbnailImageUpload.preview || data.images?.thumbnail}
                          className="w-full max-w-md rounded-lg object-cover border"
                          alt="Thumbnail preview"
                        />
                      )}

                      <div className="flex flex-col sm:flex-row gap-2">
                        <label className="flex-1 px-4 py-2 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50 cursor-pointer text-sm text-blue-700 hover:border-blue-500 text-center">
                          Upload new image
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;

                              const preview = URL.createObjectURL(file);
                              if (thumbnailImageUpload.preview) {
                                URL.revokeObjectURL(thumbnailImageUpload.preview);
                              }
                              setThumbnailImageUpload({ file, preview });
                            }}
                          />
                        </label>

                        <button
                          type="button"
                          className="px-4 py-2 rounded-lg border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                          onClick={() => {
                            if (thumbnailImageUpload.preview) {
                              URL.revokeObjectURL(thumbnailImageUpload.preview);
                            }
                            setThumbnailImageUpload({ file: null });
                            updateField(["images", "thumbnail"], "");
                          }}
                        >
                          Remove
                        </button>
                      </div>

                      {thumbnailImageUpload.file && (
                        <p className="text-sm text-green-600">
                          Selected: {thumbnailImageUpload.file.name}
                        </p>
                      )}
                    </div>
                  ) : data.images.thumbnail ? (
                    <div className="w-full max-w-md">
                      <img
                        src={data.images.thumbnail}
                        alt="Thumbnail"
                        className="w-full h-auto rounded-lg object-cover"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No thumbnail image.</p>
                  )}
                </div>

                {/* General Images */}
              <ImageGrid
  title="Gallery Images"
  images={data.images.generalImages || []}
  uploads={generalImageUploads}
  setUploads={setGeneralImageUploads}
  arrayPath={["images", "generalImages"]}
  updateField={updateField}
  addArrayItem={addArrayItem}
  isEditing={isEditing}   // ✅ add this
/>

                {/* Guest Images */}
             <ImageGrid
  title="Guest Images"
  images={data.images.guestImages || []}
  uploads={guestImageUploads}
  setUploads={setGuestImageUploads}
  arrayPath={["images", "guestImages"]}
  updateField={updateField}
  addArrayItem={addArrayItem}
  isEditing={isEditing}   // ✅ add this
/>
              </div>
            ) : null}
          </section>
        )}

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-sm p-8 mb-6 text-white">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-semibold">Call to Action</h2>
            {isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setActiveSection(activeSection === "cta" ? null : "cta")
                  }
                  className="text-blue-200 hover:text-white"
                >
                  {activeSection === "cta" ? "Collapse" : "Expand"}
                </button>
                {activeSection === "cta" && (
                  <>
                    <button
                      onClick={() =>
                        handleSaveSection("ctaTitle", { ctaTitle: data.ctaTitle })
                      }
                      disabled={savingSection === "ctaTitle"}
                      className="text-green-200 hover:text-white flex items-center gap-1 disabled:opacity-50"
                      type="button"
                    >
                      {savingSection === "ctaTitle" ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      Save Title
                    </button>
                    <button
                      onClick={() =>
                        handleSaveSection("ctaDescription", {
                          ctaDescription: data.ctaDescription,
                        })
                      }
                      disabled={savingSection === "ctaDescription"}
                      className="text-green-200 hover:text-white flex items-center gap-1 disabled:opacity-50"
                      type="button"
                    >
                      {savingSection === "ctaDescription" ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      Save Description
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {activeSection === "cta" || !isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">CTA Title</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={data.ctaTitle}
                    onChange={(e) => updateField(["ctaTitle"], e.target.value)}
                    className="w-full px-4 py-2 border border-blue-400 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-300"
                  />
                ) : (
                  <p className="text-2xl font-bold">{data.ctaTitle}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  CTA Description
                </label>
                {isEditing ? (
                  <TinyMCETextEditor
                    value={data.ctaDescription || ""}
                    disabled={savingSection === "ctaDescription"}
                    onChange={(html) => updateField(["ctaDescription"], html)}
                  />
                ) : (
                  <div
                    className="prose prose-invert prose-sm max-w-none opacity-95"
                    dangerouslySetInnerHTML={{
                      __html: data.ctaDescription || "",
                    }}
                  />
                )}
              </div>
            </div>
          ) : null}
        </section>

        {/* Global TinyMCE styles (same style you used earlier) */}
        <style jsx global>{`
          .tox {
            border: none !important;
          }
          .tox .tox-editor-header {
            border-bottom: 1px solid #e5e7eb !important;
          }
          .tox .tox-toolbar__primary {
            padding: 6px !important;
          }
          .tox .tox-tbtn {
            width: 32px !important;
            height: 32px !important;
          }
          .tox .tox-edit-area__iframe {
            background: white !important;
          }
          @media (max-width: 640px) {
            .tox .tox-toolbar__primary {
              padding: 4px !important;
            }
            .tox .tox-tbtn {
              width: 28px !important;
              height: 28px !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
