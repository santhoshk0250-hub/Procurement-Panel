"use client";

import React, { useEffect, useState } from "react";
import {
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  Loader2,
  FileImage,
  FileText,
} from "lucide-react";

import { getInstance, patchInstance, postInstance, deleteInstance } from "@/lib/swr";

type Certification = {
  _id?: string;
  title: string;
  description: string;
  imageUrl: string;
  documentUrl: string;
};

type ApiResponse = {
  success: boolean;
  message: string;
  data: any;
};

export default function CertificationsPage() {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [activeSection, setActiveSection] = useState<boolean>(true);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);

  // File upload states
  const [imageFiles, setImageFiles] = useState<Map<number, File>>(new Map());
  const [docFiles, setDocFiles] = useState<Map<number, File>>(new Map());

  // Fetch Certifications - optimized to not block navigation
  useEffect(() => {
    let cancelled = false;
    
    const fetchCertifications = async () => {
      try {
        setFetching(true);
        const res = (await getInstance(
          `${process.env.NEXT_PUBLIC_API_BASE}certifications`
        )) as ApiResponse;

        if (cancelled) return;

        if (res.success) {
          setCertifications(res.data);
        }
      } catch (e) {
        if (cancelled) return;
        console.error("Error fetching certifications:", e);
        alert("Failed to load certifications.");
      } finally {
        if (!cancelled) {
          setFetching(false);
        }
      }
    };

    fetchCertifications();
    
    return () => {
      cancelled = true;
    };
  }, []);

  // Prevent body scroll when editing on mobile
  useEffect(() => {
    if (isEditing && typeof window !== 'undefined' && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
    return undefined;
  }, [isEditing]);

  const handleAdd = () => {
    setCertifications((prev) => [
      ...prev,
      {
        title: "",
        description: "",
        imageUrl: "",
        documentUrl: "",
      },
    ]);
  };

  const handleRemove = async (index: number) => {
    const cert = certifications[index];
    if (cert._id) {
      if (!confirm("Delete this certification?")) return;

      await deleteInstance(
        `${process.env.NEXT_PUBLIC_API_BASE}certifications/${cert._id}`
      );
    }

    setCertifications((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      for (let i = 0; i < certifications.length; i++) {
        const cert = certifications[i];
        const formData = new FormData();

        formData.append("title", cert.title);
        formData.append("description", cert.description);

        if (imageFiles.get(i)) {
          formData.append("image", imageFiles.get(i)!, imageFiles.get(i)!.name);
        } else {
          formData.append("imageUrl", cert.imageUrl);
        }

        if (docFiles.get(i)) {
          formData.append(
            "document",
            docFiles.get(i)!,
            docFiles.get(i)!.name
          );
        } else {
          formData.append("documentUrl", cert.documentUrl);
        }

        if (cert._id) {
          await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE}certifications/${cert._id}`,
            {
            method: "PATCH",
            body: formData,
          });
        } else {
          await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE}certifications`,
            {
            method: "POST",
            body: formData,
          });
        }
      }

      alert("Certifications saved successfully!");
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Failed to save certifications.");
    } finally {
      setSaving(false);
    }
  };

  // Show loading state only if we don't have data yet
  if (fetching && certifications.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  // Full-screen editing mode for mobile
  if (isEditing) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col md:relative md:z-auto md:bg-gray-50 md:p-2 md:sm:p-4 md:md:p-6 md:-mx-3 md:sm:mx-0">
        {/* Mobile Header - Fixed */}
        <header className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between md:hidden">
          <h1 className="text-base font-bold">Edit Certifications</h1>
          <button
            onClick={() => {
              setIsEditing(false);
              setActiveSection(false);
            }}
            className="p-2 hover:bg-gray-100 rounded-lg touch-manipulation"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </header>

        {/* Desktop Header */}
        <div className="hidden md:block max-w-6xl mx-auto w-full mb-3 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
            <h1 className="text-xl sm:text-3xl font-bold">Certifications</h1>
            <button
              onClick={() => {
                setIsEditing(false);
                setActiveSection(false);
              }}
              className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 active:bg-gray-100 touch-manipulation transition-colors text-xs sm:text-base"
            >
              <X size={16} className="flex-shrink-0" /> 
              <span>Cancel</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto md:max-w-6xl md:mx-auto md:w-full">
          <section className="bg-white md:rounded-lg md:shadow-sm px-4 py-4 md:p-3 md:sm:p-6 min-h-full md:min-h-0">
            {/* Action Buttons - Mobile Fixed at Top */}
            <div className="sticky top-0 bg-white border-b border-gray-200 -mx-4 px-4 py-3 mb-4 flex gap-2 z-10 md:static md:bg-transparent md:border-0 md:-mx-0 md:px-0 md:py-0 md:mb-3 md:sm:mb-4 md:flex-row md:justify-between md:items-center">
              <h2 className="text-base font-semibold md:text-lg md:sm:text-2xl">Certification List</h2>
              <div className="flex gap-2 md:flex-row">
                <button
                  onClick={handleAdd}
                  className="px-3 py-2 text-green-600 hover:text-green-700 active:text-green-800 flex items-center justify-center gap-1 border border-green-200 rounded-lg hover:bg-green-50 active:bg-green-100 touch-manipulation transition-colors text-sm"
                >
                  <Plus size={16} className="flex-shrink-0" /> 
                  <span>Add</span>
                </button>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-2 text-blue-600 hover:text-blue-700 active:text-blue-800 flex items-center justify-center gap-1 border border-blue-200 rounded-lg hover:bg-blue-50 active:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation transition-colors text-sm"
                >
                  {saving ? <Loader2 size={14} className="animate-spin flex-shrink-0" /> : <Save size={14} className="flex-shrink-0" />}
                  <span>Save</span>
                </button>
              </div>
            </div>

            {activeSection && (
              <div className="space-y-4 sm:space-y-6">
                {certifications.map((cert, index) => (
                  <div key={index} className="border p-4 sm:p-5 rounded-lg bg-gray-50">
                    <div className="space-y-3 sm:space-y-3">
                      {/* Title */}
                      <div>
                        <label className="block text-sm font-medium mb-2">Title</label>
                        <input
                          type="text"
                          value={cert.title}
                          onChange={(e) =>
                            setCertifications((prev) => {
                              const updated = [...prev];
                              updated[index].title = e.target.value;
                              return updated;
                            })
                          }
                          className="w-full px-3 sm:px-4 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium mb-2">Description</label>
                        <textarea
                          value={cert.description}
                          rows={3}
                          onChange={(e) =>
                            setCertifications((prev) => {
                              const updated = [...prev];
                              updated[index].description = e.target.value;
                              return updated;
                            })
                          }
                          className="w-full px-3 sm:px-4 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y touch-manipulation"
                        />
                      </div>

                      {/* Image Upload */}
                      <div>
                        <label className="block text-sm font-medium mb-2">Image</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file)
                              setImageFiles((prev) => {
                                const map = new Map(prev);
                                map.set(index, file);
                                return map;
                              });
                          }}
                          className="w-full px-3 sm:px-4 py-2.5 text-sm border border-gray-300 rounded-lg file:mr-3 sm:file:mr-4 file:py-2 file:px-3 sm:file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation cursor-pointer"
                        />
                        {imageFiles.get(index) && (
                          <p className="text-green-600 text-xs mt-1.5 truncate">
                            Selected: {imageFiles.get(index)?.name}
                          </p>
                        )}
                      </div>

                      {/* Document Upload */}
                      <div>
                        <label className="block text-sm font-medium mb-2">Document</label>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file)
                              setDocFiles((prev) => {
                                const map = new Map(prev);
                                map.set(index, file);
                                return map;
                              });
                          }}
                          className="w-full px-3 sm:px-4 py-2.5 text-sm border border-gray-300 rounded-lg file:mr-3 sm:file:mr-4 file:py-2 file:px-3 sm:file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation cursor-pointer"
                        />
                        {docFiles.get(index) && (
                          <p className="text-green-600 text-xs mt-1.5 truncate">
                            Selected: {docFiles.get(index)?.name}
                          </p>
                        )}
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => handleRemove(index)}
                        className="w-full sm:w-auto px-4 py-2.5 text-red-600 hover:text-red-700 active:text-red-800 hover:bg-red-50 active:bg-red-100 flex items-center justify-center gap-2 rounded-lg border border-red-200 mt-3 touch-manipulation transition-colors text-sm"
                      >
                        <Trash2 size={16} className="flex-shrink-0" /> 
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  // Normal view mode
  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 md:p-6 -mx-3 sm:mx-0">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-6">
          <h1 className="text-xl sm:text-3xl font-bold">Certifications</h1>

          <button
            onClick={() => {
              setIsEditing(true);
              setActiveSection(true);
            }}
            className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 active:bg-blue-800 touch-manipulation transition-colors text-xs sm:text-base"
          >
            <Edit size={16} className="flex-shrink-0" /> 
            <span>Edit</span>
          </button>
        </div>

        {/* Certifications Section */}
        <section className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-2xl font-semibold">Certification List</h2>
          </div>

          {activeSection && (
            <div className="space-y-3 sm:space-y-6">
              {certifications.map((cert, index) => (
                <div key={index} className="border p-3 sm:p-5 rounded-lg bg-gray-50">
                  {/* Display Mode */}
                  <div className="space-y-3">
                    <h3 className="text-lg sm:text-xl font-semibold break-words">{cert.title}</h3>
                    <p className="text-sm sm:text-base text-gray-600 break-words">{cert.description}</p>

                    <div className="w-full sm:w-48">
                      <img
                        src={cert.imageUrl}
                        className="w-full sm:w-48 h-auto rounded-lg border object-cover"
                        alt="certification"
                      />
                    </div>

                    <a
                      href={cert.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-blue-600 hover:text-blue-700 active:text-blue-800 hover:bg-blue-50 active:bg-blue-100 rounded-lg border border-blue-200 text-sm touch-manipulation transition-colors"
                    >
                      <FileText size={16} className="flex-shrink-0" /> 
                      <span>View Document</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
