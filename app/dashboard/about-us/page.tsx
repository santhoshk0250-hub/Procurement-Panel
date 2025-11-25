"use client";

import React, { useState } from "react";
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

// Types based on the JSON structure
type AboutUsData = {
  heroTitle: string;
  heroDescription: string;
  heroBadges: string[];
  videoTitle: string;
  videoDescription: string;
  videoUrl: string;
  mission: {
    title: string;
    description: string;
  };
  vision: {
    title: string;
    description: string;
  };
  journey: Array<{
    year: string;
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
    location: string;
    exactAddress: string;
  }>;
  ctaTitle: string;
  ctaDescription: string;
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

// Default data from JSON
const defaultData: AboutUsData = {
  heroTitle: "About Tick Your Tour",
  heroDescription:
    "We're on a mission to make every journey unforgettable. From hotels to activities, we've got everything you need to tick off your travel dreams.",
  heroBadges: ["Trusted by 50K+ Travelers", "100+ Destinations"],
  videoTitle: "Our Story in Motion",
  videoDescription: "Watch how we're transforming the way people experience travel",
  videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  mission: {
    title: "Our Mission",
    description:
      "To empower travelers with seamless, personalized, and unforgettable experiences. We believe every journey should be effortless, every destination accessible, and every memory worth cherishing. Through innovative technology and passionate service, we're making travel dreams come true, one trip at a time.",
  },
  vision: {
    title: "Our Vision",
    description:
      "To become the world's most trusted and innovative travel platform, where technology meets human touch. We envision a future where planning the perfect trip is as simple as a conversation, where AI understands your preferences, and where every traveler feels like a VIP, regardless of their destination or budget.",
  },
  journey: [
    {
      year: "2020",
      title: "The Beginning",
      description:
        "Tick Your Tour was founded with a vision to revolutionize travel experiences. We started as a small team passionate about making travel accessible and memorable.",
      icon: "Sparkles",
      color: "bg-blue-500",
    },
    {
      year: "2021",
      title: "First Milestone",
      description:
        "Launched our platform with hotel bookings and sightseeing packages. Reached our first 1,000 satisfied customers.",
      icon: "Target",
      color: "bg-orange-500",
    },
    {
      year: "2022",
      title: "Expansion",
      description:
        "Expanded services to include food delivery, nightlife, activities, and rentals. Opened branches in Chennai, Coimbatore, and Kerala.",
      icon: "TrendingUp",
      color: "bg-green-500",
    },
    {
      year: "2023",
      title: "AI Integration",
      description:
        "Introduced AI-powered travel assistant to provide personalized recommendations and 24/7 customer support.",
      icon: "Globe",
      color: "bg-violet-500",
    },
    {
      year: "2024",
      title: "Growing Strong",
      description:
        "Serving thousands of travelers with innovative features, video reviews, and seamless booking experiences across multiple destinations.",
      icon: "Award",
      color: "bg-red-500",
    },
  ],
  stats: [
    {
      icon: "Users",
      value: "50K+",
      label: "Happy Travelers",
      color: "text-blue-600",
    },
    {
      icon: "MapPin",
      value: "100+",
      label: "Destinations",
      color: "text-orange-600",
    },
    {
      icon: "Award",
      value: "4.8/5",
      label: "Average Rating",
      color: "text-green-600",
    },
    {
      icon: "Calendar",
      value: "10K+",
      label: "Trips Booked",
      color: "text-violet-600",
    },
  ],
  values: [
    {
      icon: "Heart",
      title: "Customer First",
      description:
        "Your satisfaction is our top priority. We go above and beyond to ensure every travel experience exceeds expectations.",
      color: "bg-red-50 border-red-200",
    },
    {
      icon: "Target",
      title: "Excellence",
      description:
        "We strive for excellence in every service we offer, continuously improving and innovating to serve you better.",
      color: "bg-blue-50 border-blue-200",
    },
    {
      icon: "Globe",
      title: "Accessibility",
      description:
        "Making travel accessible to everyone, with services available in multiple languages and flexible booking options.",
      color: "bg-green-50 border-green-200",
    },
    {
      icon: "Sparkles",
      title: "Innovation",
      description:
        "Leveraging cutting-edge technology including AI to provide personalized and seamless travel experiences.",
      color: "bg-violet-50 border-violet-200",
    },
  ],
  availableLocations: [
    {
      location: "Chennai",
      exactAddress: "123 Main Street, T. Nagar, Chennai, Tamil Nadu 600017, India",
    },
    {
      location: "Coimbatore",
      exactAddress: "456 Park Avenue, RS Puram, Coimbatore, Tamil Nadu 641002, India",
    },
    {
      location: "Kerala",
      exactAddress: "789 Beach Road, Fort Kochi, Kochi, Kerala 682001, India",
    },
  ],
  ctaTitle: "Ready to Start Your Journey?",
  ctaDescription:
    "Join thousands of travelers who trust Tick Your Tour for their perfect getaway. Let's make your next adventure unforgettable.",
};

export default function AboutUsPage() {
  const [data, setData] = useState<AboutUsData>(defaultData);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const handleSave = async () => {
    setLoading(true);
    try {
      // TODO: Implement API call to save data
      // await saveAboutUsData(data);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      setIsEditing(false);
      setActiveSection(null);
      alert("About Us data saved successfully!");
    } catch (error) {
      console.error("Error saving data:", error);
      alert("Failed to save data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (path: string[], value: any) => {
    setData((prev) => {
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
    setData((prev) => {
      const newData = { ...prev };
      let current: any = newData;
      for (let i = 0; i < path.length; i++) {
        current = current[path[i]];
      }
      current[index] = { ...current[index], ...value };
      return { ...newData };
    });
  };

  const addArrayItem = (path: string[], newItem: any) => {
    setData((prev) => {
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
    setData((prev) => {
      const newData = { ...prev };
      let current: any = newData;
      for (let i = 0; i < path.length; i++) {
        current = current[path[i]];
      }
      current.splice(index, 1);
      return { ...newData };
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">About Us</h1>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setActiveSection(null);
                    setData(defaultData);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  <X size={18} />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}
                  Save Changes
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Edit size={18} />
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Hero Section */}
        <section className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-semibold text-gray-800">Hero Section</h2>
            {isEditing && (
              <button
                onClick={() => setActiveSection(activeSection === "hero" ? null : "hero")}
                className="text-blue-600 hover:text-blue-700"
              >
                {activeSection === "hero" ? "Collapse" : "Expand"}
              </button>
            )}
          </div>

          {activeSection === "hero" || !isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hero Title
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={data.heroTitle}
                    onChange={(e) => updateField(["heroTitle"], e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-xl font-bold text-gray-900">{data.heroTitle}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hero Description
                </label>
                {isEditing ? (
                  <textarea
                    value={data.heroDescription}
                    onChange={(e) => updateField(["heroDescription"], e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-600">{data.heroDescription}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => removeArrayItem(["heroBadges"], index)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addArrayItem(["heroBadges"], "")}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                    >
                      <Plus size={18} />
                      Add Badge
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {data.heroBadges.map((badge, index) => (
                      <span
                        key={index}
                        className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
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

        {/* Video Section */}
        <section className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-semibold text-gray-800">Video Section</h2>
            {isEditing && (
              <button
                onClick={() => setActiveSection(activeSection === "video" ? null : "video")}
                className="text-blue-600 hover:text-blue-700"
              >
                {activeSection === "video" ? "Collapse" : "Expand"}
              </button>
            )}
          </div>

          {activeSection === "video" || !isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video Title
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={data.videoTitle}
                    onChange={(e) => updateField(["videoTitle"], e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-lg font-semibold text-gray-900">{data.videoTitle}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video Description
                </label>
                {isEditing ? (
                  <textarea
                    value={data.videoDescription}
                    onChange={(e) => updateField(["videoDescription"], e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-600">{data.videoDescription}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video URL
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={data.videoUrl}
                    onChange={(e) => updateField(["videoUrl"], e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="https://www.youtube.com/embed/..."
                  />
                ) : (
                  <div className="mt-4">
                    <iframe
                      src={data.videoUrl}
                      className="w-full h-96 rounded-lg"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </section>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <section className="bg-white rounded-lg shadow-sm p-8">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">Mission</h2>
              {isEditing && (
                <button
                  onClick={() => setActiveSection(activeSection === "mission" ? null : "mission")}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {activeSection === "mission" ? "Collapse" : "Expand"}
                </button>
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-xl font-semibold text-gray-900">{data.mission.title}</p>
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
                      rows={6}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-600 leading-relaxed">{data.mission.description}</p>
                  )}
                </div>
              </div>
            ) : null}
          </section>

          <section className="bg-white rounded-lg shadow-sm p-8">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">Vision</h2>
              {isEditing && (
                <button
                  onClick={() => setActiveSection(activeSection === "vision" ? null : "vision")}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {activeSection === "vision" ? "Collapse" : "Expand"}
                </button>
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
        <section className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Our Journey</h2>
            {isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveSection(activeSection === "journey" ? null : "journey")}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {activeSection === "journey" ? "Collapse" : "Expand"}
                </button>
                {activeSection === "journey" && (
                  <button
                    onClick={() =>
                      addArrayItem(["journey"], {
                        year: "",
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
                )}
              </div>
            )}
          </div>

          {activeSection === "journey" || !isEditing ? (
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              <div className="space-y-8">
                {data.journey.map((item, index) => {
                  const IconComponent = iconMap[item.icon] || Award;
                  return (
                    <div key={index} className="relative flex gap-6">
                      <div
                        className={`${item.color} w-16 h-16 rounded-full flex items-center justify-center text-white z-10 flex-shrink-0`}
                      >
                        <IconComponent size={24} />
                      </div>
                      <div className="flex-1 pb-8">
                        {isEditing ? (
                          <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Year
                                </label>
                                <input
                                  type="text"
                                  value={item.year}
                                  onChange={(e) =>
                                    updateArrayItem(["journey"], index, { year: e.target.value })
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Color
                                </label>
                                <select
                                  value={item.color}
                                  onChange={(e) =>
                                    updateArrayItem(["journey"], index, { color: e.target.value })
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Title
                              </label>
                              <input
                                type="text"
                                value={item.title}
                                onChange={(e) =>
                                  updateArrayItem(["journey"], index, { title: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            <button
                              onClick={() => removeArrayItem(["journey"], index)}
                              className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                            >
                              <Trash2 size={16} />
                              Remove
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-2xl font-bold text-gray-900">{item.year}</span>
                              <h3 className="text-xl font-semibold text-gray-800">{item.title}</h3>
                            </div>
                            <p className="text-gray-600 leading-relaxed">{item.description}</p>
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
        <section className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Statistics</h2>
            {isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveSection(activeSection === "stats" ? null : "stats")}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {activeSection === "stats" ? "Collapse" : "Expand"}
                </button>
                {activeSection === "stats" && (
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
                )}
              </div>
            )}
          </div>

          {activeSection === "stats" || !isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
        <section className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Our Values</h2>
            {isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveSection(activeSection === "values" ? null : "values")}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {activeSection === "values" ? "Collapse" : "Expand"}
                </button>
                {activeSection === "values" && (
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
                )}
              </div>
            )}
          </div>

          {activeSection === "values" || !isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.values.map((value, index) => {
                const IconComponent = iconMap[value.icon] || Heart;
                return (
                  <div
                    key={index}
                    className={`${value.color} border-2 rounded-lg p-6`}
                  >
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
                  <button
                    onClick={() =>
                      addArrayItem(["availableLocations"], {
                        location: "",
                        exactAddress: "",
                      })
                    }
                    className="text-green-600 hover:text-green-700 flex items-center gap-1"
                  >
                    <Plus size={18} />
                    Add
                  </button>
                )}
              </div>
            )}
          </div>

          {activeSection === "locations" || !isEditing ? (
            <div className="space-y-4">
              {data.availableLocations.map((location, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  {isEditing ? (
                    <div className="space-y-3">
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
                        <h3 className="font-semibold text-gray-900 mb-1">{location.location}</h3>
                        <p className="text-gray-600 text-sm">{location.exactAddress}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-sm p-8 mb-6 text-white">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-semibold">Call to Action</h2>
            {isEditing && (
              <button
                onClick={() => setActiveSection(activeSection === "cta" ? null : "cta")}
                className="text-blue-200 hover:text-white"
              >
                {activeSection === "cta" ? "Collapse" : "Expand"}
              </button>
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

