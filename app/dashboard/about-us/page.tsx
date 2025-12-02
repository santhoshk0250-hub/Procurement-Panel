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

type FileWithPreview = {
  file: File;
  preview?: string;
};

export default function AboutUsPage() {
  const [data, setData] = useState<AboutUsData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  // File upload states
  const [thumbnailVideoFile, setThumbnailVideoFile] = useState<File | null>(null);
  const [generalVideoFiles, setGeneralVideoFiles] = useState<Map<number, File>>(new Map());
  const [thumbnailImageFile, setThumbnailImageFile] = useState<File | null>(null);
  const [generalImageFiles, setGeneralImageFiles] = useState<Map<number, File>>(new Map());
  const [guestImageFiles, setGuestImageFiles] = useState<Map<number, File>>(new Map());

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
        if (!cancelled) {
          setFetching(false);
        }
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

  const handleSaveWithFiles = async (section: string, sectionData: any) => {
    const formData = new FormData();
    
    // Append JSON data
    formData.append("data", JSON.stringify(sectionData));

    if (section === "videos") {
      // Thumbnail video file
      if (thumbnailVideoFile) {
        formData.append("thumbnailVideo", thumbnailVideoFile, thumbnailVideoFile.name);
      }
      
      // General video files
      generalVideoFiles.forEach((file, index) => {
        formData.append(`generalVideo_${index}`, file, file.name);
      });
    } else if (section === "images") {
      // Thumbnail image file
      if (thumbnailImageFile) {
        formData.append("thumbnail", thumbnailImageFile, thumbnailImageFile.name);
      }
      
      // General image files
      generalImageFiles.forEach((file, index) => {
        formData.append(`generalImage_${index}`, file, file.name);
      });
      
      // Guest image files
      guestImageFiles.forEach((file, index) => {
        formData.append(`guestImage_${index}`, file, file.name);
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
      // Clear file states after successful upload
      if (section === "videos") {
        setThumbnailVideoFile(null);
        setGeneralVideoFiles(new Map());
      } else if (section === "images") {
        setThumbnailImageFile(null);
        setGeneralImageFiles(new Map());
        setGuestImageFiles(new Map());
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
      const newData = { ...prev };
      let current: any = newData;
      for (let i = 0; i < path.length - 1; i++) {
        if (Array.isArray(current[path[i]])) {
          current = current[path[i]];
          continue;
        }
        current = current[path[i]] = { ...current[path[i]] };
      }
      current[path[path.length - 1]] = value;
      return newData;
    });
  };

  const updateArrayItem = (path: string[], index: number, value: any) => {
    if (!data) return;
    setData((prev) => {
      if (!prev) return prev;
      const newData = { ...prev };
      let current: any = newData;
      for (let i = 0; i < path.length; i++) {
        current = current[path[i]];
      }
      // Handle both object updates and direct value updates (for string arrays)
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        current[index] = { ...current[index], ...value };
      } else {
        current[index] = value;
      }
      return { ...newData };
    });
  };

  const addArrayItem = (path: string[], newItem: any) => {
    if (!data) return;
    setData((prev) => {
      if (!prev) return prev;
      const newData = { ...prev };
      let current: any = newData;
      for (let i = 0; i < path.length; i++) {
        current = current[path[i]];
      }
      current.push(newItem);
      return { ...newData };
    });
  };

  const removeArrayItem = (path: string[], index: number) => {
    if (!data) return;
    setData((prev) => {
      if (!prev) return prev;
      const newData = { ...prev };
      let current: any = newData;
      for (let i = 0; i < path.length; i++) {
        current = current[path[i]];
      }
      current.splice(index, 1);
      return { ...newData };
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
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setActiveSection(null);
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 flex items-center justify-center gap-2 text-sm sm:text-base touch-manipulation transition-colors"
                >
                  <X size={18} className="flex-shrink-0" />
                  <span className="sm:hidden">Cancel</span>
                  <span className="hidden sm:inline">Cancel</span>
                </button>
              </>
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
            <h2 className="text-lg sm:text-2xl font-semibold text-gray-800">Hero Section</h2>
            {isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveSection(activeSection === "hero" ? null : "hero")}
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
                  <p className="text-lg sm:text-xl font-bold text-gray-900 break-words">{data.heroTitle}</p>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Hero Description
                </label>
                {isEditing ? (
                  <textarea
                    value={data.heroDescription}
                    onChange={(e) => updateField(["heroDescription"], e.target.value)}
                    rows={4}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y touch-manipulation"
                  />
                ) : (
                  <p className="text-sm sm:text-base text-gray-600 break-words leading-relaxed">{data.heroDescription}</p>
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
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addArrayItem(["heroBadges"], "")}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-blue-600 hover:text-blue-700 active:text-blue-800 hover:bg-blue-50 active:bg-blue-100 rounded-lg touch-manipulation w-full sm:w-auto"
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
          <section className="bg-white rounded-lg shadow-sm p-3 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-2xl font-semibold text-gray-800">Mission</h2>
              {isEditing && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveSection(activeSection === "mission" ? null : "mission")}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {activeSection === "mission" ? "Collapse" : "Expand"}
                  </button>
                  {activeSection === "mission" && (
                    <button
                      onClick={() => handleSaveSection("mission", data.mission)}
                      disabled={savingSection === "mission"}
                      className="text-green-600 hover:text-green-700 flex items-center gap-1 disabled:opacity-50"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={data.mission.title}
                      onChange={(e) => updateField(["mission", "title"], e.target.value)}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
                    />
                  ) : (
                    <p className="text-lg sm:text-xl font-semibold text-gray-900 break-words">{data.mission.title}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  {isEditing ? (
                    <textarea
                      value={data.mission.description}
                      onChange={(e) => updateField(["mission", "description"], e.target.value)}
                      rows={5}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y touch-manipulation"
                    />
                  ) : (
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed break-words">{data.mission.description}</p>
                  )}
                </div>
              </div>
            ) : null}
          </section>

          <section className="bg-white rounded-lg shadow-sm p-3 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-2xl font-semibold text-gray-800">Vision</h2>
              {isEditing && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveSection(activeSection === "vision" ? null : "vision")}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {activeSection === "vision" ? "Collapse" : "Expand"}
                  </button>
                  {activeSection === "vision" && (
                    <button
                      onClick={() => handleSaveSection("vision", data.vision)}
                      disabled={savingSection === "vision"}
                      className="text-green-600 hover:text-green-700 flex items-center gap-1 disabled:opacity-50"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={data.vision.title}
                      onChange={(e) => updateField(["vision", "title"], e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-xl font-semibold text-gray-900">{data.vision.title}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  {isEditing ? (
                    <textarea
                      value={data.vision.description}
                      onChange={(e) => updateField(["vision", "description"], e.target.value)}
                      rows={6}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-600 leading-relaxed">{data.vision.description}</p>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        </div>

        {/* Journey Timeline */}
        <section className="bg-white rounded-lg shadow-sm p-4 sm:p-6 md:p-8 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Our Journey</h2>
            {isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveSection(activeSection === "journey" ? null : "journey")}
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
                    >
                      <Plus size={18} />
                      Add
                    </button>
                    <button
                      onClick={() => handleSaveSection("journey", { journey: data.journey })}
                      disabled={savingSection === "journey"}
                      className="text-green-600 hover:text-green-700 flex items-center gap-1 disabled:opacity-50"
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
                  const year = item.date ? new Date(item.date).getFullYear().toString() : "";
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
                                    updateArrayItem(["journey"], index, { date: e.target.value })
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
                                    updateArrayItem(["journey"], index, { color: e.target.value })
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
                                  updateArrayItem(["journey"], index, { title: e.target.value })
                                }
                                className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
                              />
                            </div>
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                                Description
                              </label>
                              <textarea
                                value={item.description}
                                onChange={(e) =>
                                  updateArrayItem(["journey"], index, {
                                    description: e.target.value,
                                  })
                                }
                                rows={3}
                                className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y touch-manipulation"
                              />
                            </div>
                            <button
                              onClick={() => removeArrayItem(["journey"], index)}
                              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-red-600 hover:text-red-700 active:text-red-800 hover:bg-red-50 active:bg-red-100 text-sm flex items-center justify-center gap-2 rounded-lg border border-red-200 touch-manipulation transition-colors"
                            >
                              <Trash2 size={16} className="flex-shrink-0" />
                              <span>Remove</span>
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                              <span className="text-xl sm:text-2xl font-bold text-gray-900">{year}</span>
                              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 break-words">{item.title}</h3>
                            </div>
                            <p className="text-sm sm:text-base text-gray-600 leading-relaxed break-words">{item.description}</p>
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
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Statistics</h2>
            {isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveSection(activeSection === "stats" ? null : "stats")}
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
                    >
                      <Plus size={18} />
                      Add
                    </button>
                    <button
                      onClick={() => handleSaveSection("stats", { stats: data.stats })}
                      disabled={savingSection === "stats"}
                      className="text-green-600 hover:text-green-700 flex items-center gap-1 disabled:opacity-50"
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
                              updateArrayItem(["stats"], index, { value: e.target.value })
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
                              updateArrayItem(["stats"], index, { label: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <button
                          onClick={() => removeArrayItem(["stats"], index)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <IconComponent
                          size={48}
                          className={`${stat.color} mx-auto mb-4`}
                        />
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
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Our Values</h2>
            {isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveSection(activeSection === "values" ? null : "values")}
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
                    >
                      <Plus size={18} />
                      Add
                    </button>
                    <button
                      onClick={() => handleSaveSection("values", { values: data.values })}
                      disabled={savingSection === "values"}
                      className="text-green-600 hover:text-green-700 flex items-center gap-1 disabled:opacity-50"
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
                              updateArrayItem(["values"], index, { title: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <textarea
                            value={value.description}
                            onChange={(e) =>
                              updateArrayItem(["values"], index, {
                                description: e.target.value,
                              })
                            }
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                          />
                        </div>
                        <button
                          onClick={() => removeArrayItem(["values"], index)}
                          className="text-red-600 hover:text-red-700 text-sm"
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
                        <p className="text-gray-700 leading-relaxed">{value.description}</p>
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
            <h2 className="text-2xl font-semibold text-gray-800">Available Locations</h2>
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
              <h2 className="text-2xl font-semibold text-gray-800">Contact Details</h2>
              {isEditing && (
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setActiveSection(activeSection === "contactDetails" ? null : "contactDetails")
                    }
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {activeSection === "contactDetails" ? "Collapse" : "Expand"}
                  </button>
                  {activeSection === "contactDetails" && (
                    <button
                      onClick={() =>
                        handleSaveSection("contactDetails", { contactDetails: data.contactDetails })
                      }
                      disabled={savingSection === "contactDetails"}
                      className="text-green-600 hover:text-green-700 flex items-center gap-1 disabled:opacity-50"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp</label>
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
                    <p className="text-gray-600">{data.contactDetails.whatsapp || "N/A"}</p>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        )}

        {/* Videos Section */}
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
                      onClick={() => handleSaveSection("videos", { videos: data.videos })}
                      disabled={savingSection === "videos"}
                      className="text-green-600 hover:text-green-700 flex items-center gap-1 disabled:opacity-50"
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
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Thumbnail Video</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={data.videos.thumbnailVideo.title}
                            onChange={(e) =>
                              updateField(["videos", "thumbnailVideo", "title"], e.target.value)
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-gray-900">{data.videos.thumbnailVideo.title}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description
                        </label>
                        {isEditing ? (
                          <textarea
                            value={data.videos.thumbnailVideo.description}
                            onChange={(e) =>
                              updateField(
                                ["videos", "thumbnailVideo", "description"],
                                e.target.value
                              )
                            }
                            rows={2}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-gray-600">{data.videos.thumbnailVideo.description}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Video File (Upload new video or use URL below)
                        </label>
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              type="file"
                              accept="video/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setThumbnailVideoFile(file);
                                }
                              }}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            {thumbnailVideoFile && (
                              <p className="text-sm text-green-600">
                                Selected: {thumbnailVideoFile.name}
                              </p>
                            )}
                            <div className="text-sm text-gray-500">OR</div>
                            <input
                              type="text"
                              value={data.videos.thumbnailVideo.videoUrl}
                              onChange={(e) =>
                                updateField(["videos", "thumbnailVideo", "videoUrl"], e.target.value)
                              }
                              placeholder="Video URL (if not uploading file)"
                              className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
                            />
                          </div>
                        ) : (
                          <div className="mt-2">
                            <video
                              src={data.videos.thumbnailVideo.videoUrl}
                              controls
                              className="w-full max-w-2xl rounded-lg"
                              playsInline
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* General Videos */}
                {data.videos.generalVideos && data.videos.generalVideos.length > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-700">General Videos</h3>
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
                        >
                          <Plus size={18} />
                          Add Video
                        </button>
                      )}
                    </div>
                    <div className="space-y-4">
                      {data.videos.generalVideos.map((video, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
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
                                <textarea
                                  value={video.description}
                                  onChange={(e) =>
                                    updateArrayItem(["videos", "generalVideos"], index, {
                                      description: e.target.value,
                                    })
                                  }
                                  rows={2}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Video File (Upload new video or use URL below)
                                </label>
                                <div className="space-y-2">
                                  <input
                                    type="file"
                                    accept="video/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        setGeneralVideoFiles((prev) => {
                                          const newMap = new Map(prev);
                                          newMap.set(index, file);
                                          return newMap;
                                        });
                                      }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  />
                                  {generalVideoFiles.get(index) && (
                                    <p className="text-xs text-green-600">
                                      Selected: {generalVideoFiles.get(index)?.name}
                                    </p>
                                  )}
                                  <div className="text-xs text-gray-500">OR</div>
                                  <input
                                    type="text"
                                    value={video.videoUrl}
                                    onChange={(e) =>
                                      updateArrayItem(["videos", "generalVideos"], index, {
                                        videoUrl: e.target.value,
                                      })
                                    }
                                    placeholder="Video URL (if not uploading file)"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  />
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  removeArrayItem(["videos", "generalVideos"], index)
                                }
                                className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                              >
                                <Trash2 size={16} />
                                Remove
                              </button>
                            </div>
                          ) : (
                            <div>
                              <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 break-words">{video.title}</h4>
                              <p className="text-sm text-gray-600 mb-2 break-words">{video.description}</p>
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

        {/* Images Section */}
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
                      onClick={() => handleSaveSection("images", { images: data.images })}
                      disabled={savingSection === "images"}
                      className="text-green-600 hover:text-green-700 flex items-center gap-1 disabled:opacity-50"
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
                {data.images.thumbnail && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Thumbnail Image</h3>
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setThumbnailImageFile(file);
                            }
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        {thumbnailImageFile && (
                          <p className="text-sm text-green-600">
                            Selected: {thumbnailImageFile.name}
                          </p>
                        )}
                        <div className="text-sm text-gray-500">OR</div>
                        <input
                          type="text"
                          value={data.images.thumbnail}
                          onChange={(e) => updateField(["images", "thumbnail"], e.target.value)}
                          placeholder="Image URL (if not uploading file)"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ) : (
                      <div className="w-full max-w-md">
                        <img
                          src={data.images.thumbnail}
                          alt="Thumbnail"
                          className="w-full h-auto rounded-lg object-cover"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* General Images */}
                {data.images.generalImages && data.images.generalImages.length > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-700">General Images</h3>
                      {isEditing && (
                        <button
                          onClick={() => addArrayItem(["images", "generalImages"], "")}
                          className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Plus size={18} />
                          Add Image
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {data.images.generalImages.map((img, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-2">
                          {isEditing ? (
                            <div className="space-y-2">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setGeneralImageFiles((prev) => {
                                      const newMap = new Map(prev);
                                      newMap.set(index, file);
                                      return newMap;
                                    });
                                  }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                              {generalImageFiles.get(index) && (
                                <p className="text-xs text-green-600">
                                  Selected: {generalImageFiles.get(index)?.name}
                                </p>
                              )}
                              <div className="text-xs text-gray-500">OR</div>
                              <input
                                type="text"
                                value={img}
                                onChange={(e) =>
                                  updateArrayItem(["images", "generalImages"], index, e.target.value)
                                }
                                placeholder="Image URL (if not uploading file)"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                              <button
                                onClick={() => removeArrayItem(["images", "generalImages"], index)}
                                className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                              >
                                <Trash2 size={16} />
                                Remove
                              </button>
                            </div>
                          ) : (
                            <img src={img} alt={`General ${index + 1}`} className="w-full h-auto rounded-lg object-cover" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Guest Images */}
                {data.images.guestImages && data.images.guestImages.length > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-700">Guest Images</h3>
                      {isEditing && (
                        <button
                          onClick={() => addArrayItem(["images", "guestImages"], "")}
                          className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Plus size={18} />
                          Add Image
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {data.images.guestImages.map((img, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-2">
                          {isEditing ? (
                            <div className="space-y-2">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setGuestImageFiles((prev) => {
                                      const newMap = new Map(prev);
                                      newMap.set(index, file);
                                      return newMap;
                                    });
                                  }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                              {guestImageFiles.get(index) && (
                                <p className="text-xs text-green-600">
                                  Selected: {guestImageFiles.get(index)?.name}
                                </p>
                              )}
                              <div className="text-xs text-gray-500">OR</div>
                              <input
                                type="text"
                                value={img}
                                onChange={(e) =>
                                  updateArrayItem(["images", "guestImages"], index, e.target.value)
                                }
                                placeholder="Image URL (if not uploading file)"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                              <button
                                onClick={() => removeArrayItem(["images", "guestImages"], index)}
                                className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                              >
                                <Trash2 size={16} />
                                Remove
                              </button>
                            </div>
                          ) : (
                            <img src={img} alt={`Guest ${index + 1}`} className="w-full h-auto rounded-lg object-cover" />
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

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-sm p-8 mb-6 text-white">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-semibold">Call to Action</h2>
            {isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveSection(activeSection === "cta" ? null : "cta")}
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
                <label className="block text-sm font-medium mb-2">CTA Description</label>
                {isEditing ? (
                  <textarea
                    value={data.ctaDescription}
                    onChange={(e) => updateField(["ctaDescription"], e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-blue-400 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-300"
                  />
                ) : (
                  <p className="text-lg opacity-90">{data.ctaDescription}</p>
                )}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
