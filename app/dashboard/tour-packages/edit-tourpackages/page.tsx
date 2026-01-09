"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  FileText,
  Image as ImageIcon,
  ListChecks,
  IndianRupee,
  Plus,
  X,
  ChevronDown,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

import { useTourPackageStore, type PackageModel } from "@/store/tourpackagesStore";

// Rich text editor deps
import TinyMCETextEditor from "@/components/TinyMCETextEditor";


/* =========================
   Types for Tour Package UI
   ========================= */

type IDType = string | { $oid: string };

interface ThumbnailUI {
  file: File | null;
  preview?: string; // object URL if user selects a new file
  existingUrl?: string; // existing thumbnail url from API/store
}
type PriceMode = "min" | "max";
interface ServiceUI {
  serviceId: string;
  serviceItemId: string;
  itemModel: string;
  pricePerPerson: string;
  priceCurrency: string;
}

interface ItineraryActivityUI {
  serviceId: string; // categoryId if known, else "" (we can resolve later)
  serviceItemId: string;
  itemModel: string;
  isRemovable: boolean;
    useMinPrice: boolean; // ✅ NEW
  useMaxPrice: boolean; // ✅ NEW
}

interface DayTimeSlotUI {
  id: string;
  from: string;
  to: string;
  activities: ItineraryActivityUI[];
}

interface ItineraryDayUI {
  day: string;
  title: string;
  description: string;
  timeSlots: DayTimeSlotUI[];
}

type SurchargeWindow = "single" | "range";

interface Surcharge {
  windowType: SurchargeWindow;
  singleDate: string;
  startDate: string;
  endDate: string;
  amount: string;
  currency: string;
}
type HotelRatePlanUI = {
  plan_name: string;
  price: number;
  cancellation_policy?: string;
};

type SelectedHotelUI = {
  hotelItemId: string;          // hotel._id from servicesMeta.hotels
  hotel_id: string;             // hotel.hotel_id
  property_name: string;

  room_id: string;              // rooms[].room_id
  room_type: string;            // rooms[].room_type
  occupancy_min?: number;
  occupancy_max?: number;

  rate_plan: HotelRatePlanUI;   // chosen plan
  currency: string;             // rooms[].pricing.currency
};

type InclusionTabKey = "pickupanddrop" | "rentals" | "foodservices" ;
type MealKey = "breakfast" | "lunch" | "dinner";

type InclusionSingleSelection = {
  serviceId: string;       // category id from /services
  serviceItemId: string;   // selected item _id from servicesMeta
  itemModel: string;       // mapped model
  useMinPrice: boolean;    // ✅ NEW
  useMaxPrice: boolean;    // ✅ NEW
} | null;

type FoodMealItemSelection = {
  serviceItemId: string;
  useMinPrice: boolean;
  useMaxPrice: boolean;
};

type FoodDayPlanUI = {
  dateIso: string; // YYYY-MM-DD
  dayIndex: number; // 0-based
  meals: Record<MealKey, FoodMealItemSelection[]>;
};

interface TourPackageUI {
  _id?: string; // for edit
  name: string;
  category: string;
  descriptionHtml: string;
pricingMode: PriceMode; // ✅ NEW
  thumbnail: ThumbnailUI;
  checkInDate: string;
 useStartAsCheckIn: boolean;  // ✅ default checked
  minPax: string;
  maxPax: string;
  totalDays: string;
  totalNights: string;

  startDate: string;
  endDate: string;
markup_min_price: number;
  markup_max_price: number;
  services: ServiceUI[];
  itinerary: ItineraryDayUI[];

  exclusions: string[];
  surcharges: Surcharge[];

  hasTourGuide: boolean;
  hasTransport: boolean;
     selectedHotelId: string | null;     // ✅ NEW (hotel item _id)
  selectedHotelCategoryId: string | null;
  selectedHotel: SelectedHotelUI | null; // ✅ NEW

     inclusions: {
    pickupanddrop: InclusionSingleSelection;
    rentals: InclusionSingleSelection;
    foodPlan: FoodDayPlanUI[];
  };
}

/* 🔹 services API response type */
interface ServiceCategory {
  _id: string;
  title: string;
}


/* 🔹 services/meta API response types */
interface ServiceMetaItem {
  _id: string;
  title?: string;
  metaTitle?: string;
  name?: string;
markup_min_price: number;
  markup_max_price: number;
  banner?: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  images?: string[];

  destination?: string;
  address?: string;
  city?: string;
  location?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };

  price?: number;
  priceBreakdown?: { totalPrice?: number; basePrice?: number };
  vendorPricing?: {
    oneDay?: number;
    twoDays?: number;
    threePlusPerDay?: number;
    currency?: string;
  };
  sellerPricing?: {
    oneDay?: number;
    twoDays?: number;
    threePlusPerDay?: number;
    currency?: string;
  };
  vehicleOption?: any;
  vehicleOptions?: any[];

  vehicleId?: string;
  vehicleType?: string;
  seaterCapacity?: string;
  mileage?: string;
  distanceLimitPerDay?: string;

  rating?: number;
  reviewCount?: number;
  ratingCount?: number;
  duration?: number;
  durationType?: string;
  timing?: string;
  regularTimings?: string;

  [key: string]: any;
}


type ServicesMetaMap = Record<string, ServiceMetaItem[]>;

/* =========================
   Helpers
   ========================= */

   const isoToDate = (iso: string) => {
  // avoid timezone shifting by pinning to midnight
  return new Date(`${iso}T00:00:00`);
};

const calcInclusiveDays = (startIso?: string, endIso?: string) => {
  if (!startIso || !endIso) return 0;
  const start = isoToDate(startIso);
  const end = isoToDate(endIso);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  if (end < start) return 0;

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const diff = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
  return diff + 1; // ✅ inclusive
};

// Ensure day has slots with stable ids (and avoid sharing slot objects across days)
const ensureDaySlots = (day: ItineraryDayUI): ItineraryDayUI => {
  const hasSlots = Array.isArray(day.timeSlots) && day.timeSlots.length > 0;
  if (hasSlots) return day;

  return {
    ...day,
    timeSlots: DEFAULT_DAY_SLOTS.map((s) => ({
      id: crypto.randomUUID(), // fresh id
      from: s.from,
      to: s.to,
      activities: [],
    })),
  };
};


const normalizeTitle = (t: string) => (t || "").trim().toLowerCase();

const normalizeKey = (v: string) =>
  (v || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");

const timeToMinutes = (t: string) => {
  const m = (t || "").trim().match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (!m) return null;

  let hour = Number(m[1]);
  const minute = Number(m[2]);
  const ampm = m[3].toUpperCase();

  if (hour === 12) hour = 0;
  let mins = hour * 60 + minute;
  if (ampm === "PM") mins += 12 * 60;
  return mins;
};

const slotRange = (from: string, to: string) => {
  const start = timeToMinutes(from);
  const end = timeToMinutes(to);
  if (start === null || end === null) return null;
  if (end <= start) return null;
  return { start, end };
};

const rangesOverlap = (a: { start: number; end: number }, b: { start: number; end: number }) =>
  a.start < b.end && b.start < a.end;

const hasOverlappingSlot = (
  slots: DayTimeSlotUI[],
  from: string,
  to: string,
  ignoreId?: string
) => {
  const nr = slotRange(from, to);
  if (!nr) return "Invalid time range (end must be after start).";

  for (const s of slots) {
    if (ignoreId && s.id === ignoreId) continue;
    const er = slotRange(s.from, s.to);
    if (!er) continue;
    if (rangesOverlap(nr, er)) {
      return `This time overlaps an existing slot: ${s.from} - ${s.to}`;
    }
  }
  return null;
};

const makeSlot = (from: string, to: string): DayTimeSlotUI => ({
  id: crypto.randomUUID(),
  from,
  to,
  activities: [],
});

const DEFAULT_DAY_SLOTS: DayTimeSlotUI[] = [
  makeSlot("10:00 AM", "1:30 PM"),
  makeSlot("3:00 PM", "6:00 PM"),
  makeSlot("6:30 PM", "9:00 PM"),
];

/* 🔹 mapping from /services title -> /services/meta key */
const SERVICE_META_KEY_BY_TITLE: Record<string, string> = {
  Hotels: "hotels",
  Rentals: "rentals",
  "Food Service": "foodservices",
  Activities: "activities",
  "Leisure Activities": "leisureactivities",
  Nightlife: "nightlife",
  Sightseeing: "sightseeingpackages",
  "Pick & Drop": "pickupanddrop",
  "Tour Manager": "tourmanager",
};

// 🔹 Map service "title" -> itemModel
const ITEM_MODEL_BY_TITLE: Record<string, string> = {
  Hotels: "Hotel_mains",
  Sightseeing: "sightseeing_packages",
  "Leisure Activities": "LeisureActivity",
  Activities: "Activity",
  Nightlife: "NightlifePlace",
  "Tour Manager": "TourManager",
  "Pick & Drop": "PickupDrop",
  Rentals: "rentals",
  "Food Service": "foodservices",
};

const getItemModelForTitle = (title: string) => {
  const mapped = ITEM_MODEL_BY_TITLE[title];
  if (mapped) return mapped;

  const k = normalizeKey(title);
  if (k === "hotel" || k === "hotels") return "Hotel_mains";
  if (k === "foodservice" || k === "foodservices") return "foodservices";
  if (k === "pickdrop" || k === "pickupanddrop") return "PickupDrop";
  return "";
};

/* =========================
   Card content mapping
   ========================= */
const getMinMaxPrice = (item: ServiceMetaItem) => {
  const min = typeof item.markup_min_price === "number" ? item.markup_min_price : undefined;
  const max = typeof item.markup_max_price === "number" ? item.markup_max_price : undefined;
  return { min, max };
};

const formatPriceLabelFromChecks = (item: ServiceMetaItem, useMin: boolean, useMax: boolean) => {
  const { min, max } = getMinMaxPrice(item);

  if (!useMin && !useMax) return ""; // nothing selected

  if (useMin && useMax) {
    if (min != null && max != null) return `₹${min} - ₹${max}`;
    if (min != null) return `From ₹${min}`;
    if (max != null) return `Up to ₹${max}`;
    return "";
  }

  if (useMin) return min != null ? `From ₹${min}` : "";
  if (useMax) return max != null ? `Up to ₹${max}` : "";

  return "";
};



const getServiceCardContent = (categoryKey: string, item: ServiceMetaItem) => {
  const key = categoryKey || "";

  const firstImage = item.thumbnail || item.thumbnailUrl || item.banner || item.images?.[0];

  const rating =
    item.rating ??
      item.ratingCount ??
      item.reviewCount
      ? `${item.rating?.toFixed?.(1) ?? ""}★ (${item.reviewCount ?? item.ratingCount} reviews)`
      : "";

  if (key === "hotels" || key === "hotel") {
    const price = item.priceBreakdown?.totalPrice ?? item.priceBreakdown?.basePrice ?? item.price;
    const galleryImages = item?.media_gallery?.room?.[0] || "";
    return {
      mediaUrl: galleryImages,
      title: item.metaTitle || item.title || item.name || "Hotel",
      subtitle: [item.destination, item.location?.city, item.city].filter(Boolean).join(" • "),
      chip: item.rating ? `${Number(item.rating).toFixed(1)}★` : "",
      priceLabel: price ? `From ₹${price}` : "",
      ratingLabel: rating,
    };
  }

  if (key === "rentals") {
    const price =
      item.sellerPricing?.oneDay ??
      item.sellerPricing?.threePlusPerDay ??
      item.vendorPricing?.oneDay ??
      item.priceBreakdown?.totalPrice;

    return {
      mediaUrl: firstImage,
      title: item.metaTitle || item.variant || item.vehicleId || "Rental vehicle",
      subtitle: [item.vehicleType, item.seaterCapacity].filter(Boolean).join(" • "),
      chip: item.mileage || item.distanceLimitPerDay || "",
      priceLabel: price ? `₹${price} / day` : "",
      ratingLabel: rating,
    };
  }

  if (key === "foodservices") {
    const price = item.priceBreakdown?.totalPrice ?? item.priceBreakdown?.basePrice ?? item.price;

    return {
      mediaUrl: firstImage,
      title: item.metaTitle || item.name || "Food item",
      subtitle: item.category
        ? Array.isArray(item.category)
          ? item.category.join(", ")
          : String(item.category)
        : item.cuisine
          ? (item.cuisine as string[]).join(", ")
          : "",
      chip: item.dietaryInfo?.vegetarian ? "Veg" : "",
      priceLabel: price ? `₹${price} per person` : "",
      ratingLabel: rating,
    };
  }

  if (key === "activities" || key === "leisureactivities") {
    const price = item.priceBreakdown?.totalPrice ?? item.priceBreakdown?.basePrice ?? item.price;

    return {
      mediaUrl: firstImage,
      title: item.metaTitle || item.title || "Activity",
      subtitle: [item.destination, item.duration ? `${item.duration} ${item.durationType || "min"}` : undefined]
        .filter(Boolean)
        .join(" • "),
      chip: Array.isArray(item.category) ? item.category.join(", ") : item.category || "",
      priceLabel: price ? `From ₹${price}` : "",
      ratingLabel: rating,
    };
  }

  if (key === "nightlife") {
    const price = item.priceBreakdown?.totalPrice ?? item.priceBreakdown?.basePrice ?? item.price;

    return {
      mediaUrl: firstImage,
      title: item.metaTitle || item.title || "Nightlife",
      subtitle: [item.destination, item.timing].filter(Boolean).join(" • "),
      chip: item.type || "",
      priceLabel: price ? `From ₹${price}` : "",
      ratingLabel: rating,
    };
  }

  if (key === "sightseeingpackages") {
    const price = item.priceBreakdown?.totalPrice ?? item.priceBreakdown?.basePrice ?? item.price;

    return {
      mediaUrl: firstImage,
      title: item.metaTitle || item.title || "Sightseeing",
      subtitle: [item.destination, item.vehicleType].filter(Boolean).join(" • "),
      chip: item.groupSize || "",
      priceLabel: price ? `From ₹${price}` : "",
      ratingLabel: rating,
    };
  }

  if (key === "pickupanddrop") {
    const v = item.vehicleOption || item.vehicleOptions?.[0];
    const price = v?.sellerBasePrice ?? v?.basePrice ?? item.priceBreakdown?.totalPrice;

    return {
      mediaUrl: v?.images?.[0] || firstImage,
      title: v?.vehiclename || item.metaTitle || "Pickup & Drop",
      subtitle: [v?.vehicleType, `Max ${v?.maxPax || ""} pax`].filter(Boolean).join(" • "),
      chip: v?.availabilityStatus || "",
      priceLabel: price ? `From ₹${price}` : "",
      ratingLabel: v?.ratings
        ? `${v.ratings.average?.toFixed?.(1) ?? ""}★ (${v.ratings.totalReviews} reviews)`
        : "",
    };
  }

  if (key === "tourmanager") {
    const price = item.price_breakdown?.totalPrice ?? item.priceBreakdown?.totalPrice;

    return {
      mediaUrl: item.tourManagerProfiles?.[0]?.profilePic || firstImage,
      title: item.metaTitle || item.title || "Tour Manager",
      subtitle: item.general_info ? "Full tour management for Goa" : "",
      chip: item.timings ? `${item.timings.from} – ${item.timings.to}` : "",
      priceLabel: price ? `From ₹${price}` : "",
      ratingLabel: "",
    };
  }

  const price = item.priceBreakdown?.totalPrice ?? item.priceBreakdown?.basePrice ?? item.price;

  return {
    mediaUrl: firstImage,
    title: item.metaTitle || item.title || item.name || "Service item",
    subtitle: item.destination || item.location?.city || item.location?.address || "",
    chip: "",
    priceLabel: price ? `From ₹${price}` : "",
    ratingLabel: rating,
  };
};

const TOUR_CATEGORIES = [
  "Adventure",
  "Honeymoon",
  "Family",
  "Wildlife",
  "Cultural",
  "Beach",
  "Weekend",
  "Luxury",
  "Budget",
] as const;

const sanitizeHtml = (html: string) => html.replace(/[\n\r]/g, "").replace(/>\s+</g, "><");
const stripHtmlToText = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

/* ========== Defaults ========== */

const DEFAULT_SURCHARGE: Surcharge = {
  windowType: "single",
  singleDate: "",
  startDate: "",
  endDate: "",
  amount: "",
  currency: "INR",
};

const BLANK_IT_ACTIVITY: ItineraryActivityUI = {
  serviceId: "",
  serviceItemId: "",
  itemModel: "",
  isRemovable: true,
    useMinPrice: true,   // ✅ default can be anything, will be overridden on add
  useMaxPrice: false,
};

const BLANK_IT_DAY: ItineraryDayUI = {
  day: "1",
  title: "",
  description: "",
  timeSlots: DEFAULT_DAY_SLOTS.map((s) => ({ ...s, id: crypto.randomUUID(), activities: [] })),
};

const BLANK_TOUR_PACKAGE: TourPackageUI = {
  _id: "",
  name: "",
  category: "Luxury",
  descriptionHtml: "",
  thumbnail: { file: null, existingUrl: "" },
pricingMode: "min", // ✅ default
  checkInDate: "", 
  useStartAsCheckIn: true,  // ✅ default checked
  minPax: "1",
  maxPax: "0",
  totalDays: "1",
  totalNights: "0",
  startDate: "",
  endDate: "",
markup_min_price: null,
  markup_max_price: null,
  services: [],
  itinerary: [{ ...BLANK_IT_DAY, day: "1" }],
  surcharges: [DEFAULT_SURCHARGE],
  exclusions: [],
  hasTourGuide: false,
  hasTransport: false,
  selectedHotelId: null,
  selectedHotelCategoryId: null,
  selectedHotel: null,
     inclusions: {
    pickupanddrop: null,
    rentals: null,
    foodPlan: [],
  },
};

const STEPS = [
  { key: "basic", label: "Basic Details", icon: <FileText className="size-4" /> },
  { key: "services", label: "Itinerary", icon: <ListChecks className="size-4" /> },
  { key: "surcharges", label: "Surcharges", icon: <IndianRupee className="size-4" /> },
] as const;

type StepKey = (typeof STEPS)[number]["key"];
const LAST_INDEX = STEPS.length - 1;

/* =========================
   STORE -> UI MAPPING
   ========================= */

function buildRemovableMap(inclusions: any) {
  const map = new Map<string, boolean>();

  if (!inclusions || typeof inclusions !== "object") return map;

  for (const key of Object.keys(inclusions)) {
    const bucket = inclusions[key];
    const arr = bucket?.data;

    if (Array.isArray(arr)) {
      for (const row of arr) {
        if (row?.serviceItemId && typeof row.isRemovable === "boolean") {
          map.set(String(row.serviceItemId), row.isRemovable);
        }
      }
    }
  }

  return map;
}

const isIsoDate = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

const clampIsoDate = (value: string, min?: string, max?: string) => {
  if (!isIsoDate(value)) return value;

  let out = value;

  if (isIsoDate(min) && out < (min as string)) out = min as string;
  if (isIsoDate(max) && out > (max as string)) out = max as string;

  return out;
};

const parseDayNumber = (v?: string) => {
  // expects "Day 1", "Day 2" ...
  const m = String(v || "").match(/Day\s*(\d+)/i);
  return m ? Number(m[1]) : null;
};

const buildFoodPlanFromRange = (startIso?: string, endIso?: string): FoodDayPlanUI[] => {
  const count = calcInclusiveDays(startIso, endIso);
  if (!count || !startIso) return [];

  const start = isoToDate(startIso);
  return Array.from({ length: count }).map((_, idx) => {
    const d = new Date(start.getTime() + idx * 24 * 60 * 60 * 1000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const dateIso = `${y}-${m}-${day}`;

    return {
      dateIso,
      dayIndex: idx,
      meals: { breakfast: [], lunch: [], dinner: [] },
    };
  });
};

const itemModelFromItineraryType = (t?: string) => {
  const k = (t || "").toLowerCase();

  // hotel slots in itinerary
  if (k === "hotel_checkin" || k === "hotel_checkout" || k === "hotel") return "Hotel_mains";

  // activities
  if (k === "activity" || k === "activities") return "Activity";

  // nightlife
  if (k === "nightlife") return "NightlifePlace";

  // pickup/drop
  if (k === "pickup-drop" || k === "pickup_drop" || k === "pickupanddrop") return "PickupDrop";

  // rentals
  if (k === "rentals" || k === "rental_vehicle") return "rentals";

  // meals / food
  if (k === "meals" || k === "food" || k === "foodservices") return "foodservices";

  // sightseeing
  if (k === "sightseeing") return "sightseeing_packages";

  return "";
};




function mapStoreToUI(pkg: PackageModel): TourPackageUI {
  // Build itinerary slots from activitieIds (group by time/endtime)
  const removableMap = buildRemovableMap(pkg?.inclusions);
  const itineraryDays: ItineraryDayUI[] =
    (pkg?.itinerary || []).map((d: any, idx: number) => {
      const acts = Array.isArray(d?.activitieIds) ? d.activitieIds : [];

      // Create a map keyed by "time|endtime"
      const slotMap = new Map<string, DayTimeSlotUI>();

      for (const a of acts) {
        const from = a?.time || "10:00 AM";
        const to = a?.endtime || "1:30 PM";
        const key = `${from}|${to}`;

        if (!slotMap.has(key)) {
          slotMap.set(key, {
            id: crypto.randomUUID(),
            from,
            to,
            activities: [],
          });
        }

        const slot = slotMap.get(key)!;

        // Try to infer removable from inclusions if present
        // Try to infer removable from inclusions (hotel, activity, nightlife, etc.)
        let isRemovable =
          typeof a?.isRemovable === "boolean"
            ? a.isRemovable
            : !!a?.isOptional; // fallback

        const fromInclusions = removableMap.get(String(a?.serviceItemId || ""));
        if (typeof fromInclusions === "boolean") {
          isRemovable = fromInclusions;
        }
const rootMode: PriceMode = pkg?.markup_price_mode === "max" ? "max" : "min";

const useMin =
  typeof a?.markup_minprice === "boolean"
    ? a.markup_minprice
    : rootMode === "min";

const useMax =
  typeof a?.markup_maxprice === "boolean"
    ? a.markup_maxprice
    : rootMode === "max";

// ✅ IMPORTANT: store changed: serviceItemId is now _id/id
const serviceItemId = String(a?.serviceItemId || a?._id || a?.id || "");

// ✅ IMPORTANT: store changed: type is not itemModel
const itemModel = String(a?.itemModel || itemModelFromItineraryType(a?.type) || "");

slot.activities.push({
  serviceId: "", // can still infer later from itemModel
  serviceItemId,
  itemModel,
  isRemovable,
  useMinPrice: useMin,
  useMaxPrice: useMax,
});


      }

      // If no activities, keep defaults
      const timeSlots =
        slotMap.size > 0
          ? Array.from(slotMap.values()).sort((s1, s2) => {
            const m1 = timeToMinutes(s1.from) ?? 0;
            const m2 = timeToMinutes(s2.from) ?? 0;
            return m1 - m2;
          })
          : DEFAULT_DAY_SLOTS.map((s) => ({ ...s, id: crypto.randomUUID(), activities: [] }));

      return {
        day: String(d?.day ?? idx + 1),
        title: d?.title || "",
        description: d?.description || "",
        timeSlots,
      };
    }) || [{ ...BLANK_IT_DAY }];

  const surcharges: Surcharge[] =
    Array.isArray(pkg?.surcharges) && pkg.surcharges.length
      ? pkg.surcharges.map((s: any) => ({
        windowType: (s?.windowType || "single") as SurchargeWindow,
        singleDate: s?.singleDate || "",
        startDate: s?.startDate || "",
        endDate: s?.endDate || "",
        amount: s?.amount !== undefined && s?.amount !== null ? String(s.amount) : "",
        currency: s?.currency || "INR",
      }))
      : [{ ...DEFAULT_SURCHARGE }];

const rootMode: PriceMode = pkg?.markup_price_mode === "max" ? "max" : "min";

const start = (pkg as any)?.start_date || "";
const end = (pkg as any)?.end_date || "";
const checkIn = (pkg as any)?.check_in_date || "";


// ✅ Pickup & Drop (single)
const pickRow = (pkg as any)?.inclusions?.pickup_drop?.data?.[0] || null;
const pickupanddrop: InclusionSingleSelection = pickRow?.serviceItemId
  ? {
      serviceId: "", // fill after categories load
      serviceItemId: String(pickRow.serviceItemId),
      itemModel: "PickupDrop",
      useMinPrice:
        typeof pickRow.markup_minprice === "boolean" ? pickRow.markup_minprice : rootMode === "min",
      useMaxPrice:
        typeof pickRow.markup_maxprice === "boolean" ? pickRow.markup_maxprice : rootMode === "max",
    }
  : null;

// ✅ Rentals (single)
const rentRow = (pkg as any)?.inclusions?.rental_vehicle?.data?.[0] || null;
const rentals: InclusionSingleSelection = rentRow?.serviceItemId
  ? {
      serviceId: "", // fill after categories load
      serviceItemId: String(rentRow.serviceItemId),
      itemModel: "rentals",
      useMinPrice:
        typeof rentRow.markup_minprice === "boolean" ? rentRow.markup_minprice : rootMode === "min",
      useMaxPrice:
        typeof rentRow.markup_maxprice === "boolean" ? rentRow.markup_maxprice : rootMode === "max",
    }
  : null;

// ✅ Food plan (day-wise from meals.data)
const baseFoodPlan = buildFoodPlanFromRange(start, end);
const foodPlanMap = new Map(baseFoodPlan.map((d) => [d.dayIndex, d]));

const mealsArr = (pkg as any)?.inclusions?.meals?.data;
if (Array.isArray(mealsArr)) {
  for (const row of mealsArr) {
    const mealType = String(row?.type || "").toLowerCase() as MealKey; // breakfast/lunch/dinner
    if (!["breakfast", "lunch", "dinner"].includes(mealType)) continue;

    const dayNum = parseDayNumber(row?.date);
    if (!dayNum) continue;

    const idx = dayNum - 1;
    const dayPlan = foodPlanMap.get(idx);
    if (!dayPlan) continue;

    const itemId = row?.serviceItemId ? String(row.serviceItemId) : "";
    if (!itemId) continue;

    dayPlan.meals[mealType].push({
      serviceItemId: itemId,
      useMinPrice:
        typeof row.markup_minprice === "boolean" ? row.markup_minprice : rootMode === "min",
      useMaxPrice:
        typeof row.markup_maxprice === "boolean" ? row.markup_maxprice : rootMode === "max",
    });
  }
}

const foodPlan = baseFoodPlan;


// if backend didn't send check_in_date, default to "use start date"
const inferredUseStart =
  !isIsoDate(checkIn) ? true : (!!start && checkIn === start);

const clampedCheckIn = isIsoDate(checkIn)
  ? clampIsoDate(checkIn, start || undefined, end || undefined)
  : "";

  const incHotelRow = (pkg as any)?.inclusions?.hotel?.data?.[0] || null;

const selectedHotelFromInclusions: SelectedHotelUI | null = incHotelRow
  ? {
      hotelItemId: String(incHotelRow.serviceItemId || ""), // <-- matches servicesMeta.hotels[_id]
      hotel_id: String(incHotelRow.hotel_id || ""),         // may be missing in inclusion row
      property_name: incHotelRow.name || incHotelRow.property_name || "Hotel",

      room_id: String(incHotelRow.room_id || ""),
      room_type: String(incHotelRow.room_type || ""),

      rate_plan: {
        plan_name: incHotelRow?.rate_plan?.plan_name || "",
        price: Number(incHotelRow?.rate_plan?.price) || 0,
        cancellation_policy: incHotelRow?.rate_plan?.cancellation_policy || "",
      },

      currency: "INR", // inclusion row doesn't provide currency, keep safe default
    }
  : null;

const selectedHotelIdFromInclusions = selectedHotelFromInclusions?.hotelItemId || null;


  return {
    _id: (pkg as any)?._id || (pkg as any)?.id || "",
    name: pkg?.name || "",
    category: pkg?.category || "Luxury",
    descriptionHtml: pkg?.description || "",
    pricingMode: (pkg?.markup_price_mode === "max" ? "max" : "min"),
    thumbnail: {
      file: null,
      preview: undefined,
      existingUrl: (pkg as any)?.thumbnail_image || "",
    },
    minPax: String(pkg?.min_pax ?? ""),
    maxPax: String(pkg?.max_pax ?? ""),
    totalDays: String(pkg?.total_days ?? itineraryDays.length ?? ""),
    totalNights: String(pkg?.total_nights ?? ""),
      startDate: start,
      endDate: end,
      useStartAsCheckIn: inferredUseStart,            // ✅ FIX (no `|| true`)
    checkInDate: inferredUseStart ? start : clampedCheckIn,
    markup_min_price: pkg?.markup_min_price || null,  
    markup_max_price: pkg?.markup_max_price || null,
    services: [], // will be computed from itinerary at submit (like add page)
    itinerary: itineraryDays,
    exclusions: Array.isArray(pkg?.exclusions) ? pkg.exclusions : [],
    surcharges,
    hasTourGuide: !!pkg?.inclusions?.tourGuide?.data,
    hasTransport: !!pkg?.inclusions?.transport?.data,
      selectedHotelId: selectedHotelIdFromInclusions,
  selectedHotelCategoryId: null, // we’ll fill after categories/meta load
  selectedHotel: selectedHotelFromInclusions,
    inclusions: {
    pickupanddrop,
    rentals,
    foodPlan,
  },
  };
}

/* =========================
   Component
   ========================= */

   const listInclusiveDates = (startIso?: string, endIso?: string) => {
  const count = calcInclusiveDays(startIso, endIso);
  if (!count || !startIso) return [];
  const start = isoToDate(startIso);
  return Array.from({ length: count }).map((_, i) => {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
};

const ensureFoodPlanForRange = (prev: TourPackageUI) => {
  const dates = listInclusiveDates(prev.startDate, prev.endDate);
  if (!dates.length) return prev;

  const existing = prev.inclusions?.foodPlan || [];
  const existingMap = new Map(existing.map((x) => [x.dateIso, x]));

  const nextPlan: FoodDayPlanUI[] = dates.map((dateIso, idx) => {
    const old = existingMap.get(dateIso);
    return (
      old || {
        dateIso,
        dayIndex: idx,
        meals: { breakfast: [], lunch: [], dinner: [] },
      }
    );
  });

  // if same length and same dates, keep
  const same =
    existing.length === nextPlan.length &&
    existing.every((x, i) => x.dateIso === nextPlan[i]?.dateIso);

  if (same) return prev;

  return {
    ...prev,
    inclusions: {
      ...prev.inclusions,
      foodPlan: nextPlan,
    },
  };
};

export default function EditTourPackagePage() {
  const router = useRouter();
  const params = useParams(); // optional
  const { tourPackage } = useTourPackageStore();

  const [data, setData] = useState<TourPackageUI>({ ...BLANK_TOUR_PACKAGE });
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const step = STEPS[stepIndex];

  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [loadingServiceCategories, setLoadingServiceCategories] = useState(false);

  const [servicesMeta, setServicesMeta] = useState<ServicesMetaMap>({});
  const [loadingServicesMeta, setLoadingServicesMeta] = useState(false);

  const [descriptionHtml, setDescriptionHtml] = useState<string>("");
  const tabsScrollRef = React.useRef<HTMLDivElement | null>(null);

  const scrollTabsToStart = () => {
    const el = tabsScrollRef.current;
    if (!el) return;
    el.scrollTo({ left: 0, behavior: "smooth" });
  };

  


  const catPickDrop = useMemo(
    () => serviceCategories.find((c) => normalizeTitle(c.title) === "pick & drop") || null,
    [serviceCategories]
  );
  
  const catRentals = useMemo(
    () => serviceCategories.find((c) => normalizeTitle(c.title) === "rentals") || null,
    [serviceCategories]
  );
  
  const catFood = useMemo(
    () => serviceCategories.find((c) => normalizeTitle(c.title) === "food service") || null,
    [serviceCategories]
  );
  
  useEffect(() => {
  if (!catPickDrop?._id && !catRentals?._id) return;

  setData((prev) => {
    const next = { ...prev };

    if (catPickDrop?._id && prev.inclusions.pickupanddrop?.serviceItemId && !prev.inclusions.pickupanddrop.serviceId) {
      next.inclusions = {
        ...next.inclusions,
        pickupanddrop: {
          ...prev.inclusions.pickupanddrop,
          serviceId: catPickDrop._id,
          itemModel: getItemModelForTitle(catPickDrop.title) || prev.inclusions.pickupanddrop.itemModel,
        },
      };
    }

    if (catRentals?._id && prev.inclusions.rentals?.serviceItemId && !prev.inclusions.rentals.serviceId) {
      next.inclusions = {
        ...next.inclusions,
        rentals: {
          ...prev.inclusions.rentals,
          serviceId: catRentals._id,
          itemModel: getItemModelForTitle(catRentals.title) || prev.inclusions.rentals.itemModel,
        },
      };
    }

    return next;
  });
}, [catPickDrop?._id, catRentals?._id]);

  
  const [inclusionModal, setInclusionModal] = useState<{
    open: boolean;
    tab: InclusionTabKey;
  }>({ open: false, tab: "pickupanddrop" });
  
  const openInclusionModal = () => setInclusionModal({ open: true, tab: "pickupanddrop" });
  const closeInclusionModal = () => setInclusionModal({ open: false, tab: "pickupanddrop" });
  
  const [foodMealPicker, setFoodMealPicker] = useState<{
    open: boolean;
    dateIso: string | null;
    meal: MealKey | null;
    selected: FoodMealItemSelection[];
  }>({ open: false, dateIso: null, meal: null, selected: [] });
  
  
  const openFoodMealPicker = (dateIso: string, meal: MealKey) => {
    const day = data.inclusions.foodPlan.find((d) => d.dateIso === dateIso);
    const raw = (day?.meals?.[meal] || []) as any[];
  
    // ✅ Backward compatible: if old data is string[], convert to objects
    const selected: FoodMealItemSelection[] = raw.map((x) => {
      if (typeof x === "string") {
        return {
          serviceItemId: x,
          useMinPrice: data.pricingMode === "min",
          useMaxPrice: data.pricingMode === "max",
        };
      }
      return {
        serviceItemId: x.serviceItemId,
        useMinPrice: !!x.useMinPrice,
        useMaxPrice: !!x.useMaxPrice,
      };
    });
  
    setFoodMealPicker({ open: true, dateIso, meal, selected });
  };
  
  
  const closeFoodMealPicker = () =>
    setFoodMealPicker({ open: false, dateIso: null, meal: null, selected: [] });
  
  
  const toggleFoodMealItem = (serviceItemId: string) => {
    setFoodMealPicker((prev) => {
      const exists = prev.selected.some((x) => x.serviceItemId === serviceItemId);
  
      if (exists) {
        return { ...prev, selected: prev.selected.filter((x) => x.serviceItemId !== serviceItemId) };
      }
  
      // ✅ default min/max based on global pricing mode (same as itinerary)
      return {
        ...prev,
        selected: [
          ...prev.selected,
          {
            serviceItemId,
            useMinPrice: data.pricingMode === "min",
            useMaxPrice: data.pricingMode === "max",
          },
        ],
      };
    });
  };
  
  
  const saveFoodMealPicker = () => {
    if (!foodMealPicker.dateIso || !foodMealPicker.meal) return closeFoodMealPicker();
  
    setData((prev) => ({
      ...prev,
      inclusions: {
        ...prev.inclusions,
        foodPlan: (prev.inclusions.foodPlan || []).map((d) => {
          if (d.dateIso !== foodMealPicker.dateIso) return d;
          return {
            ...d,
            meals: {
              ...d.meals,
              [foodMealPicker.meal!]: [...foodMealPicker.selected],
            },
          };
        }),
      },
    }));
  
    closeFoodMealPicker();
  };

const [hotelModal, setHotelModal] = useState({
  open: false,
  step: "hotel" as "hotel" | "room" | "plan",
  hotelId: "" as string,     // servicesMeta.hotels item._id
  roomId: "" as string,      // rooms[].room_id
  planName: "" as string,    // rate_plans[].plan_name
});
  const openHotelModal = () =>
    setHotelModal({ open: true, step: "hotel", hotelId: "", roomId: "", planName: "" });
  
  const closeHotelModal = () =>
    setHotelModal({ open: false, step: "hotel", hotelId: "", roomId: "", planName: "" });
  
    const [hotelPicker, setHotelPicker] = useState<{ open: boolean }>({ open: false });
  
  const openHotelPicker = () => setHotelPicker({ open: true });
  const closeHotelPicker = () => setHotelPicker({ open: false });
  
  // find “Hotels” category id (from /services)
  const hotelsCategory = useMemo(() => {
    return serviceCategories.find((c) => normalizeTitle(c.title) === "hotels") || null;
  }, [serviceCategories]);
  
  // hotels list (from /services/meta)
  const hotelsList: any[] = (servicesMeta?.hotels || []) as any[];
  
  const selectedHotelObj = useMemo(() => {
    return hotelsList.find((h) => h?._id === hotelModal.hotelId) || null;
  }, [hotelsList, hotelModal.hotelId]);
  
  const selectedRoomObj = useMemo(() => {
    if (!selectedHotelObj) return null;
    return (selectedHotelObj.rooms || []).find((r: any) => r.room_id === hotelModal.roomId) || null;
  }, [selectedHotelObj, hotelModal.roomId]);
  
  const selectedPlanObj = useMemo(() => {
    if (!selectedRoomObj) return null;
    return (selectedRoomObj?.pricing?.rate_plans || []).find(
      (p: any) => p.plan_name === hotelModal.planName
    ) || null;
  }, [selectedRoomObj, hotelModal.planName]);
  
  const selectedHotelItem = useMemo(() => {
    if (!data.selectedHotelId) return null;
    return hotelsList.find((h) => h._id === data.selectedHotelId) || null;
  }, [data.selectedHotelId, hotelsList]);
  
  
    const setPricingMode = (mode: PriceMode) => {
    setData((prev) => ({
      ...prev,
      pricingMode: mode,
      itinerary: (prev.itinerary || []).map((day) => ({
        ...day,
        timeSlots: (day.timeSlots || []).map((slot) => ({
          ...slot,
          activities: (slot.activities || []).map((a) => ({
            ...a,
            useMinPrice: mode === "min",
            useMaxPrice: mode === "max",
          })),
        })),
      })),
    }));
  };
  
  const HOTEL_ITEM_MODEL = "Hotel_mains";
  
  function upsertHotelActivityInSlot(
    slot: DayTimeSlotUI,
    hotelServiceId: string,
    hotelItemId: string,
    pricingMode: PriceMode
  ): DayTimeSlotUI {
    const hotelActivity: ItineraryActivityUI = {
      ...BLANK_IT_ACTIVITY,
      serviceId: hotelServiceId,
      serviceItemId: hotelItemId,
      itemModel: HOTEL_ITEM_MODEL,
      isRemovable: false,
      useMinPrice: pricingMode === "min",
      useMaxPrice: pricingMode === "max",
    };
  
    // ✅ remove ANY existing hotel activity (old hotel should not remain)
    const nonHotel = (slot.activities || []).filter(
      (a) => a.itemModel !== HOTEL_ITEM_MODEL
    );
  
    return { ...slot, activities: [hotelActivity, ...nonHotel] };
  }
  
  function applySelectedHotelToDefaultSlots(prev: TourPackageUI): TourPackageUI {
    if (!prev.selectedHotel) return prev;
    if (!prev.itinerary?.length) return prev;
  
    const hotelServiceId = prev.selectedHotelCategoryId;
    const hotelItemId = prev.selectedHotel.hotelItemId;
  
    if (!hotelServiceId || !hotelItemId) return prev;
  
    const lastDayIdx = prev.itinerary.length - 1;
  
    // ✅ decide which day should contain the "check-in hotel"
    const checkInIso = prev.useStartAsCheckIn ? prev.startDate : prev.checkInDate;
    let checkInIdx = prev.useStartAsCheckIn
      ? 0
      : dayIndexFromStart(prev.startDate, checkInIso);
  
    // clamp within itinerary
    checkInIdx = Math.max(0, Math.min(checkInIdx, lastDayIdx));
  
    const patchDayAtIndex = (day: ItineraryDayUI) => {
      const slots = day.timeSlots?.length
        ? day.timeSlots
        : DEFAULT_DAY_SLOTS.map((s) => ({
            id: crypto.randomUUID(),
            from: s.from,
            to: s.to,
            activities: [],
          }));
  
      const slot0 = slots[0];
  
      // ✅ if already has this hotel in slot0, don't change (prevents pointless re-renders)
      const already =
        (slot0.activities || []).length > 0 &&
        slot0.activities[0].itemModel === HOTEL_ITEM_MODEL &&
        slot0.activities[0].serviceItemId === hotelItemId &&
        slot0.activities[0].serviceId === hotelServiceId;
  
      if (already) return day;
  
      const nextSlot0 = upsertHotelActivityInSlot(
        slot0,
        hotelServiceId,
        hotelItemId,
        prev.pricingMode
      );
  
      return { ...day, timeSlots: [nextSlot0, ...slots.slice(1)] };
    };
  
    const nextItinerary = prev.itinerary.map((d, idx) => {
      if (idx === checkInIdx) return patchDayAtIndex(d);
  
      // ✅ keep this if you still want hotel on checkout day
      if (idx === lastDayIdx) return patchDayAtIndex(d);
  
      return d;
    });
  
    // ✅ if no actual change, return prev
    const same = nextItinerary === prev.itinerary;
    return same ? prev : { ...prev, itinerary: nextItinerary };
  }
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  
  function dayIndexFromStart(startIso?: string, targetIso?: string) {
    if (!startIso || !targetIso) return 0;
  
    const start = isoToDate(startIso);
    const target = isoToDate(targetIso);
  
    if (isNaN(start.getTime()) || isNaN(target.getTime())) return 0;
  
    const diff = Math.round((target.getTime() - start.getTime()) / MS_PER_DAY);
    return diff; // 0 => Day1, 1 => Day2, 2 => Day3...
  }
  
  
useEffect(() => {
  if (!hotelsCategory?._id) return;

  setData((prev) => {
    if (!prev.selectedHotel) return prev;
    if (prev.selectedHotelCategoryId) return prev; // already set

    return {
      ...prev,
      selectedHotelCategoryId: hotelsCategory._id,
    };
  });
}, [hotelsCategory?._id]);


  const scrollTabsToEnd = () => {
    const el = tabsScrollRef.current;
    if (!el) return;
    el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
  };
  // Slot editor state
  const [slotEditor, setSlotEditor] = useState<{
    open: boolean;
    dayIdx: number | null;
    slotId: string | null;
  }>({ open: false, dayIdx: null, slotId: null });

  const pad2 = (n: number) => String(n).padStart(2, "0");
  const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
  const MINUTES = Array.from({ length: 60 }, (_, i) => i);

  const [fromHour, setFromHour] = useState(10);
  const [fromMinute, setFromMinute] = useState(0);
  const [fromAmpm, setFromAmpm] = useState<"AM" | "PM">("AM");

  const [toHour, setToHour] = useState(1);
  const [toMinute, setToMinute] = useState(30);
  const [toAmpm, setToAmpm] = useState<"AM" | "PM">("PM");

  const fromVal = `${fromHour}:${pad2(fromMinute)} ${fromAmpm}`;
  const toVal = `${toHour}:${pad2(toMinute)} ${toAmpm}`;

  const parseTime = (t: string) => {
    const m = (t || "").trim().match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
    if (!m) return null;
    return { hour: Number(m[1]), minute: Number(m[2]), ampm: m[3].toUpperCase() as "AM" | "PM" };
  };

  const loadSlotToEditor = (slot: DayTimeSlotUI) => {
    const pf = parseTime(slot.from);
    const pt = parseTime(slot.to);
    if (!pf || !pt) return;

    setFromHour(pf.hour);
    setFromMinute(pf.minute);
    setFromAmpm(pf.ampm);

    setToHour(pt.hour);
    setToMinute(pt.minute);
    setToAmpm(pt.ampm);
  };

  useEffect(() => {
    setData((prev) => {
      if (!prev.useStartAsCheckIn) return prev;
      if (!prev.startDate) return prev;
      if (prev.checkInDate === prev.startDate) return prev;
      return { ...prev, checkInDate: prev.startDate };
    });
  }, [data.startDate, data.useStartAsCheckIn]);
  
  const formatDateLabel = (iso?: string) => {
    // iso: "YYYY-MM-DD" -> "DD-MM-YYYY"
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    if (!y || !m || !d) return iso;
    return `${d}-${m}-${y}`;
  };

  const closeSlotEditor = () => setSlotEditor({ open: false, dayIdx: null, slotId: null });

  const TimeSelect = ({ hour, setHour, minute, setMinute, ampm, setAmpm }: any) => (
    <div className="grid grid-cols-3 gap-2">
      <select className="input w-full" value={hour} onChange={(e) => setHour(Number(e.target.value))} disabled={submitting}>
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>

      <select className="input w-full" value={minute} onChange={(e) => setMinute(Number(e.target.value))} disabled={submitting}>
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {pad2(m)}
          </option>
        ))}
      </select>

      <select className="input w-full" value={ampm} onChange={(e) => setAmpm(e.target.value as "AM" | "PM")} disabled={submitting}>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );

  const setTour = (next: Partial<TourPackageUI>) => setData((prev) => ({ ...prev, ...next }));

  /* ---------- Hydrate from store (EDIT) ---------- */
  useEffect(() => {
    if (!tourPackage) return;

    const ui = mapStoreToUI(tourPackage);
    setData(ui);

    setDescriptionHtml(ui.descriptionHtml || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourPackage]);

  useEffect(() => {
    setTour({ descriptionHtml: descriptionHtml || "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descriptionHtml]);


  /* ---------- fetch service categories & meta ---------- */
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingServiceCategories(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}tour-packages/services`);
        if (!res.ok) throw new Error("Failed to fetch service categories");
        const json = await res.json();
        setServiceCategories(Array.isArray(json.data) ? json.data : []);
      } catch (err) {
        console.error("Error fetching service categories:", err);
      } finally {
        setLoadingServiceCategories(false);
      }
    };

    const fetchMeta = async () => {
      try {
        setLoadingServicesMeta(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}tour-packages/services/meta`);
        if (!res.ok) throw new Error("Failed to fetch services meta");
        const json = await res.json();
        setServicesMeta(json.data || {});
      } catch (err) {
        console.error("Error fetching services meta:", err);
      } finally {
        setLoadingServicesMeta(false);
      }
    };

    fetchCategories();
    fetchMeta();
  }, []);

  /* ---------- Validation ---------- */
  const canContinueBasic = useMemo(
    () => !!data.name.trim() && !!data.category.trim() && !!stripHtmlToText(data.descriptionHtml),
    [data.name, data.category, data.descriptionHtml]
  );

  const isStepValid = (k: StepKey) => {
    switch (k) {
      case "basic":
        return canContinueBasic;
      case "surcharges":
        return true;
      default:
        return true;
    }
  };

  const canGoNext = isStepValid(step.key);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const goNext = () => {
    if (submitting || !canGoNext) return;
    if (stepIndex >= LAST_INDEX) {
      void handleSubmit();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, LAST_INDEX));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    if (submitting) return;
    setStepIndex((i) => Math.max(i - 1, 0));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ---------- Thumbnail upload (Edit) ---------- */
  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setData((p) => {
      if (p.thumbnail.preview) URL.revokeObjectURL(p.thumbnail.preview);
      return { ...p, thumbnail: { ...p.thumbnail, file, preview } };
    });
    e.target.value = "";
  };

  const clearNewThumbnail = () => {
    setData((p) => {
      if (p.thumbnail.preview) URL.revokeObjectURL(p.thumbnail.preview);
      return { ...p, thumbnail: { ...p.thumbnail, file: null, preview: undefined } };
    });
  };

  /* ---------- Itinerary (days) ---------- */
  const [openDays, setOpenDays] = useState<Record<number, boolean>>({ 0: true });

  useEffect(() => {
    // when itinerary changes due to store hydrate, open day 1 by default
    setOpenDays({ 0: true });
  }, [data.itinerary?.length]);

  const toggleDayOpen = (idx: number) => setOpenDays((prev) => ({ ...prev, [idx]: !prev[idx] }));
  const ensureDayOpen = (idx: number) => setOpenDays((prev) => ({ ...prev, [idx]: true }));

  const addItineraryDay = () => {
    setData((p) => {
      const nextIndex = p.itinerary.length;
      setOpenDays((prev) => ({ ...prev, [nextIndex]: true }));
      return {
        ...p,
        itinerary: [
          ...p.itinerary,
          {
            ...BLANK_IT_DAY,
            day: String(nextIndex + 1),
            timeSlots: DEFAULT_DAY_SLOTS.map((s) => ({ ...s, id: crypto.randomUUID(), activities: [] })),
          },
        ],
      };
    });
  };

  const updateItineraryDay = (idx: number, next: Partial<ItineraryDayUI>) =>
    setData((p) => ({
      ...p,
      itinerary: p.itinerary.map((d, i) => (i === idx ? { ...d, ...next } : d)),
    }));

  const removeItineraryDay = (idx: number) =>
    setData((p) => ({
      ...p,
      itinerary: p.itinerary.length <= 1 ? [{ ...BLANK_IT_DAY, day: "1" }] : p.itinerary.filter((_, i) => i !== idx),
    }));

  const updateItineraryActivity = (dayIdx: number, slotIdx: number, activityIdx: number, next: Partial<ItineraryActivityUI>) =>
    setData((p) => ({
      ...p,
      itinerary: p.itinerary.map((d, i) => {
        if (i !== dayIdx) return d;

        const timeSlots = (d.timeSlots || []).map((slot, sIdx) => {
          if (sIdx !== slotIdx) return slot;

          const activities = (slot.activities || []).map((a, aIdx) => (aIdx === activityIdx ? { ...a, ...next } : a));
          return { ...slot, activities };
        });

        return { ...d, timeSlots };
      }),
    }));

  const removeItineraryActivity = (dayIdx: number, slotIdx: number, activityIdx: number) =>
    setData((p) => ({
      ...p,
      itinerary: p.itinerary.map((d, i) => {
        if (i !== dayIdx) return d;

        const timeSlots = (d.timeSlots || []).map((slot, sIdx) => {
          if (sIdx !== slotIdx) return slot;

          return { ...slot, activities: (slot.activities || []).filter((_, aIdx) => aIdx !== activityIdx) };
        });

        return { ...d, timeSlots };
      }),
    }));

  const removeTimeSlot = (dayIdx: number, slotId: string) => {
    setData((prev) => ({
      ...prev,
      itinerary: prev.itinerary.map((day, i) => {
        if (i !== dayIdx) return day;
        return { ...day, timeSlots: (day.timeSlots || []).filter((s) => s.id !== slotId) };
      }),
    }));

    setSlotEditor((prev) => (prev.slotId === slotId ? { open: false, dayIdx: null, slotId: null } : prev));
  };

  /* ---------- Surcharges ---------- */
  const addSurcharge = () => setData((p) => ({ ...p, surcharges: [...p.surcharges, { ...DEFAULT_SURCHARGE }] }));

  const removeSurcharge = (idx: number) =>
    setData((p) => {
      if (p.surcharges.length <= 1) return { ...p, surcharges: [{ ...DEFAULT_SURCHARGE }] };
      return { ...p, surcharges: p.surcharges.filter((_, i) => i !== idx) };
    });

  const updateSurcharge = (idx: number, next: Partial<Surcharge>) =>
    setData((p) => ({
      ...p,
      surcharges: p.surcharges.map((s, i) => (i === idx ? { ...s, ...next } : s)),
    }));

  /* ---------- Service picker modal state ---------- */
  const [servicePicker, setServicePicker] = useState<{
    open: boolean;
    dayIdx: number | null;
    slotIdx: number | null;
    activeCategoryId: string | null;
    selected: { categoryId: string; categoryTitle: string; itemId: string }[];
  }>({ open: false, dayIdx: null, slotIdx: null, activeCategoryId: null, selected: [] });

  const openServicePicker = (dayIdx: number, slotIdx: number) => {
  const fallbackCategoryId = serviceCategories[0]?._id || null;

  // ✅ Prefill selections from this SLOT's existing activities
  const day = data.itinerary?.[dayIdx];
  const slot = day?.timeSlots?.[slotIdx];
const preselected =
  (slot?.activities || [])
    .filter((a) => a.serviceItemId)
    .map((a) => {
      // If serviceId exists, use it
      let categoryId = a.serviceId;

      // Otherwise infer from itemModel
      if (!categoryId && a.itemModel) {
        const inferred = serviceCategories.find(
          (c) => (ITEM_MODEL_BY_TITLE[c.title] ?? getItemModelForTitle(c.title)) === a.itemModel
        );
        if (inferred?._id) categoryId = inferred._id;
      }

      const cat = serviceCategories.find((c) => c._id === categoryId);

      return {
        categoryId: categoryId || "",
        categoryTitle: cat?.title || "",
        itemId: a.serviceItemId,
      };
    })
    .filter((x) => x.categoryId && x.itemId);


  setServicePicker({
    open: true,
    dayIdx,
    slotIdx,
    activeCategoryId: fallbackCategoryId,
    selected: preselected,
  });
};


  const closeServicePicker = () =>
    setServicePicker({ open: false, dayIdx: null, slotIdx: null, activeCategoryId: null, selected: [] });

  const handleServicePickerDone = () => {
    if (servicePicker.dayIdx === null || servicePicker.slotIdx === null) {
      closeServicePicker();
      return;
    }

    const selections = servicePicker.selected;
    if (!selections.length) {
      closeServicePicker();
      return;
    }

    setData((prev) => ({
      ...prev,
      itinerary: prev.itinerary.map((day, dayIdx) => {
        if (dayIdx !== servicePicker.dayIdx) return day;

        return {
          ...day,
          timeSlots: day.timeSlots.map((slot, sIdx) => {
            if (sIdx !== servicePicker.slotIdx) return slot;

           const newActs: ItineraryActivityUI[] = selections.map((sel) => {
  const cat = serviceCategories.find((c) => c._id === sel.categoryId);
  const itemModel = cat ? (ITEM_MODEL_BY_TITLE[cat.title] ?? getItemModelForTitle(cat.title)) : "";

  const mode: PriceMode = prev.pricingMode === "max" ? "max" : "min";

  return {
    ...BLANK_IT_ACTIVITY,
    serviceId: sel.categoryId,
    serviceItemId: sel.itemId,
    itemModel,
    useMinPrice: mode === "min",
    useMaxPrice: mode === "max",
  };
});


            return { ...slot, activities: [...(slot.activities || []), ...newActs] };
          }),
        };
      }),
    }));

    closeServicePicker();
  };

  /* ---------- Submit (EDIT) ---------- */
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (stepIndex < LAST_INDEX) {
      if (isStepValid(step.key)) goNext();
      return;
    }

    try {
      setSubmitting(true);

      const descHtmlClean = (descriptionHtml || "").replace(/[\n\r]/g, "").replace(/>\s+</g, "><");


      // Collect unique services from itinerary
      const servicesFromActivities: { serviceId: string; serviceItemId: string; itemModel: string }[] = [];
      const serviceKeySet = new Set<string>();

      data.itinerary.forEach((day) => {
        (day.timeSlots || []).forEach((slot) => {
          (slot.activities || []).forEach((a) => {
            if (a.serviceId || a.serviceItemId || a.itemModel) {
              const key = `${a.serviceId || ""}|${a.serviceItemId || ""}|${a.itemModel || ""}`;
              if (!serviceKeySet.has(key)) {
                serviceKeySet.add(key);
                servicesFromActivities.push({
                  serviceId: a.serviceId,
                  serviceItemId: a.serviceItemId,
                  itemModel: a.itemModel,
                });
              }
            }
          });
        });
      });

      const totalDaysCount = data.itinerary.length || 1;
      const checkInDay = 1;
      const checkOutDay = totalDaysCount;

      const buildInclusionsPayload = () => {
  const pick = data.inclusions.pickupanddrop;
  const rent = data.inclusions.rentals;

  const foodPlanSelectedDays =
    (data.inclusions.foodPlan || [])
      .map((d) => ({
        // ✅ send "Day 1", "Day 2" instead of dateIso
        day: `Day ${d.dayIndex + 1}`,

        meals: {
          breakfast: (d.meals?.breakfast || []).map((x: any) =>
            typeof x === "string"
              ? {
                  serviceItemId: x,
                  useMinPrice: data.pricingMode === "min",
                  useMaxPrice: data.pricingMode === "max",
                }
              : {
                  serviceItemId: x.serviceItemId,
                  useMinPrice: !!x.useMinPrice,
                  useMaxPrice: !!x.useMaxPrice,
                }
          ),

          lunch: (d.meals?.lunch || []).map((x: any) =>
            typeof x === "string"
              ? {
                  serviceItemId: x,
                  useMinPrice: data.pricingMode === "min",
                  useMaxPrice: data.pricingMode === "max",
                }
              : {
                  serviceItemId: x.serviceItemId,
                  useMinPrice: !!x.useMinPrice,
                  useMaxPrice: !!x.useMaxPrice,
                }
          ),

          dinner: (d.meals?.dinner || []).map((x: any) =>
            typeof x === "string"
              ? {
                  serviceItemId: x,
                  useMinPrice: data.pricingMode === "min",
                  useMaxPrice: data.pricingMode === "max",
                }
              : {
                  serviceItemId: x.serviceItemId,
                  useMinPrice: !!x.useMinPrice,
                  useMaxPrice: !!x.useMaxPrice,
                }
          ),
        },
      }))
      .filter((d) => {
        const b = d.meals.breakfast.length;
        const l = d.meals.lunch.length;
        const dn = d.meals.dinner.length;
        return b + l + dn > 0;
      });

  const hasAnything =
    !!pick?.serviceItemId || !!rent?.serviceItemId || foodPlanSelectedDays.length > 0;

  if (!hasAnything) return undefined;

  return {
    pickupanddrop: pick?.serviceItemId
      ? {
          serviceId: pick.serviceId,
          serviceItemId: pick.serviceItemId,
          itemModel: pick.itemModel,
          useMinPrice: !!pick.useMinPrice,
          useMaxPrice: !!pick.useMaxPrice,
        }
      : undefined,

    rentals: rent?.serviceItemId
      ? {
          serviceId: rent.serviceId,
          serviceItemId: rent.serviceItemId,
          itemModel: rent.itemModel,
          useMinPrice: !!rent.useMinPrice,
          useMaxPrice: !!rent.useMaxPrice,
        }
      : undefined,

    foodPlan: foodPlanSelectedDays.length ? foodPlanSelectedDays : undefined,
  };
};

      const payload = {
        id: data._id, // some APIs use id
        _id: data._id, // some APIs use _id

        name: data.name.trim(),
        category: data.category.trim(),
        description: descHtmlClean,

        has_tour_guide: !!data.hasTourGuide,
        has_transport: !!data.hasTransport,

        check_in_day: checkInDay,
        check_out_day: checkOutDay,
        check_in_date: (data.useStartAsCheckIn ? data.startDate : data.checkInDate) || undefined,

        start_date: data.startDate || undefined,
        end_date: data.endDate || undefined,
markup_price_mode: data.pricingMode,
        min_pax: Number(data.minPax) || 0,
        max_pax: Number(data.maxPax) || 0,
        total_days: Number(data.totalDays) || 0,
        total_nights: Number(data.totalNights) || 0,
        markup_min_price: data.markup_min_price,
        markup_max_price: data.markup_max_price,
        services: servicesFromActivities.map((s) => ({
          serviceId: s.serviceId || undefined,
          serviceItemId: s.serviceItemId || undefined,
          itemModel: s.itemModel || undefined,
        })),

        itinerary: data.itinerary.map((d, idx) => {
          const numericDay = Number(d.day) || idx + 1;
          const isFirstDay = idx === 0;
          const isLastDay = idx === data.itinerary.length - 1;

          let title = d.title || "";
          if (!title.trim()) {
            if (isFirstDay) title = `Check-in Day ${checkInDay}`;
            else if (isLastDay) title = `Check-out Day ${checkOutDay}`;
            else title = `Day ${numericDay}`;
          }

          return {
            day: numericDay,
            title,
            description: d.description,

            timeSlots: (d.timeSlots || [])
              .filter((s) => s.from && s.to)
              .map((s) => ({
                from: s.from,
                to: s.to,

                // ✅ slot-wise activities
          activities: (s.activities || [])
  .filter((a) => a.itemModel || a.serviceItemId)
  .map((a) => {
    const isHotel = a.itemModel === "Hotel_mains";
    const isFirstDay = idx === 0;
    const isLastDay = idx === data.itinerary.length - 1;

    const hotelExtras =
      isHotel && (isFirstDay || isLastDay) && data.selectedHotel
        ? {
            room_id: data.selectedHotel.room_id,
            room_type: data.selectedHotel.room_type,
            rate_plan: data.selectedHotel.rate_plan, // (object)
          }
        : {};

    return {
      serviceId: a.serviceId || undefined,
      serviceItemId: a.serviceItemId || undefined,
      itemModel: a.itemModel || undefined,
      isRemovable: a.isRemovable ?? false,
      useMinPrice: !!a.useMinPrice,
      useMaxPrice: !!a.useMaxPrice,

      // ✅ inject only for hotel on Day1 + LastDay
      ...hotelExtras,
    };
  }),

              })),
          };


        }),

        surcharges: data.surcharges
          .map((s) => ({
            windowType: s.windowType,
            amount: s.amount ? Number(s.amount) : 0,
            currency: s.currency,
            singleDate: s.windowType === "single" ? s.singleDate || undefined : undefined,
            startDate: s.windowType === "range" ? s.startDate || undefined : undefined,
            endDate: s.windowType === "range" ? s.endDate || undefined : undefined,
          }))
          .filter((s) => s.amount > 0),

        exclusions: data.exclusions,
        inclusions: buildInclusionsPayload(),
      };

      const fd = new FormData();
      fd.append("payload", JSON.stringify(payload));

      // Attach thumbnail only if user selected a new file
      if (data.thumbnail.file) fd.append("thumbnail_file", data.thumbnail.file, data.thumbnail.file.name);

      // ✅ Update endpoint (adjust if your backend uses different route)
      const id = data._id || (params as any)?.id || (tourPackage as any)?._id;
      const url = `${process.env.NEXT_PUBLIC_API_BASE}tour-packages/update/${id}`;

      const res = await fetch(url, { method: "PATCH", body: fd });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Request failed");
      }

      alert("Tour package updated successfully! 🎉");
      // router.push("/dashboard/tour-packages");
    } catch (err: any) {
      console.error(err);
      alert(`An error occurred: ${err?.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  const title = data.name.trim() || "Edit Tour Package";

  const today = new Date().toISOString().split("T")[0];

  /* ---------- Render ---------- */

  return (
    <form className="min-h-screen bg-gray-50" onSubmit={handleSubmit}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-gray-200">
        <div className="px-4 py-3 sm:px-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-emerald-600 text-white grid place-items-center text-sm font-bold shadow">
              {title[0]?.toUpperCase() || "T"}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-gray-900 truncate">Edit Tour Package — {title}</h1>
              <p className="text-[11px] text-gray-500 truncate">Update services, itinerary & dynamic pricing.</p>
            </div>

          </div>

          {/* Stepper */}
          <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {STEPS.map((s, i) => {
              const active = i === stepIndex;
              const done = i < stepIndex;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    if (submitting) return;
                    const allPrevValid = i <= stepIndex ? true : STEPS.slice(0, i).every((st) => isStepValid(st.key));
                    if (allPrevValid) setStepIndex(i);
                    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs whitespace-nowrap ${active
                      ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                      : done
                        ? "bg-green-50 border-green-500 text-green-700"
                        : "bg-white border-gray-200 text-gray-700"
                    }`}
                  disabled={submitting}
                >
                  <span className="grid place-items-center">{done ? <CheckCircle2 className="size-4" /> : s.icon}</span>
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Progress */}
          <div className="mt-3 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${submitting ? "bg-emerald-400" : "bg-emerald-600"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto sm:p-6 pb-36 lg:pb-64">
        {/* BASIC */}
        {step.key === "basic" && (
          <SectionCard title="Basic Details" subtitle="Core information about this tour package." icon={<FileText className="size-5 text-emerald-600" />} requiredHint>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Package Name *" required>
                  <input
                    type="text"
                    className="input"
                    value={data.name}
                    onChange={(e) => setTour({ name: e.target.value })}
                    placeholder="Luxury Goa Getaway"
                    disabled={submitting}
                  />
                </Field>

                <Field label="Category *" required>
                  <div className="relative">
                    <select
                      className="input appearance-none pr-10 bg-white text-sm touch-manipulation"
                      value={data.category}
                      onChange={(e) => setTour({ category: e.target.value })}
                      disabled={submitting}
                    >
                      {TOUR_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>

                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Min Pax *" required>
                  <input type="number" min={1} className="input" value={data.minPax} onChange={(e) => setTour({ minPax: e.target.value })} disabled={submitting} />
                </Field>
                <Field label="Max Pax">
                  <input type="number" min={0} className="input" value={data.maxPax} onChange={(e) => setTour({ maxPax: e.target.value })} disabled={submitting} />
                </Field>
                <Field label="Total Days *" required>
                  <input type="number" min={1} className="input" value={data.totalDays} onChange={(e) => setTour({ totalDays: e.target.value })} disabled={submitting} />
                </Field>
                <Field label="Total Nights *" required>
                  <input type="number" min={0} className="input" value={data.totalNights} onChange={(e) => setTour({ totalNights: e.target.value })} disabled={submitting} />
                </Field>

     <Field label="Start Date *" required>
  <input
    type="date"
    className="input"
    value={data.startDate}
    min={today}
    onChange={(e) => {
      const start = e.target.value;

      setData((prev) => {
        const nextEndDate = prev.endDate && prev.endDate < start ? "" : prev.endDate;

        // ✅ toggle ON => checkIn always = start
        if (prev.useStartAsCheckIn) {
          return {
            ...prev,
            startDate: start,
            endDate: nextEndDate,
            checkInDate: start,
          };
        }

        // ✅ toggle OFF => clamp existing checkIn to [start, end]
        const nextCheckIn = prev.checkInDate
          ? clampIsoDate(prev.checkInDate, start || undefined, nextEndDate || undefined)
          : (start || "");

        return {
          ...prev,
          startDate: start,
          endDate: nextEndDate,
          checkInDate: nextCheckIn,
        };
      });
    }}
    disabled={submitting}
  />
</Field>

<Field label="Check-in Date">
  <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Left: toggle */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          checked={!!data.useStartAsCheckIn}
          onChange={(e) => {
            const checked = e.target.checked;

            setData((prev) => {
              if (checked) {
                return {
                  ...prev,
                  useStartAsCheckIn: true,
                  checkInDate: prev.startDate || "",
                };
              }

              // ✅ turning OFF: ensure checkIn is valid (>= start, <= end)
              const safeCheckIn = prev.checkInDate
                ? clampIsoDate(prev.checkInDate, prev.startDate || undefined, prev.endDate || undefined)
                : (prev.startDate || "");

              return {
                ...prev,
                useStartAsCheckIn: false,
                checkInDate: safeCheckIn,
              };
            });
          }}
          disabled={submitting}
        />

        <div className="leading-tight">
          <p className="text-sm font-semibold text-gray-900">Use Start Date</p>
          <p className="text-[11px] text-gray-500">If off, choose a custom check-in date.</p>
        </div>
      </label>

      {/* Right: value / picker */}
      <div className="w-full sm:w-auto">
        {data.useStartAsCheckIn ? (
          <div className="h-10 w-full sm:w-[220px] rounded-xl border border-emerald-200 bg-emerald-50 px-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Check-in</span>
            <span className="text-sm font-bold text-emerald-900 tabular-nums">
              {data.startDate ? formatDateLabel(data.startDate) : "—"}
            </span>
          </div>
        ) : (
          <input
            type="date"
            className="input w-full sm:w-[220px]"
            value={data.checkInDate}
            min={data.startDate || today}
            max={data.endDate || undefined}
            onChange={(e) => {
              const v = e.target.value;
              setData((prev) => ({
                ...prev,
                checkInDate: clampIsoDate(v, prev.startDate || undefined, prev.endDate || undefined),
              }));
            }}
            disabled={submitting}
          />
        )}
      </div>
    </div>
  </div>
</Field>


                <Field label="End Date *" required>
                  <input
                    type="date"
                    className="input"
                    value={data.endDate}
                    min={data.startDate || today}
                    onChange={(e) => setTour({ endDate: e.target.value })}
                    disabled={submitting}
                  />
                </Field>

                <Field label="Service Price Mode">
  <div className="inline-flex rounded-xl border border-gray-300 overflow-hidden shadow-sm">
    <button
      type="button"
      disabled={submitting}
      onClick={() => setPricingMode("min")}
      className={[
        "px-4 py-2 text-sm font-semibold transition",
        data.pricingMode === "min"
          ? "bg-emerald-600 text-white"
          : "bg-white text-gray-700 hover:bg-gray-50",
      ].join(" ")}
    >
      Min Markup Price
    </button>

    <button
      type="button"
      disabled={submitting}
      onClick={() => setPricingMode("max")}
      className={[
        "px-4 py-2 text-sm font-semibold transition border-l border-gray-300",
        data.pricingMode === "max"
          ? "bg-emerald-600 text-white"
          : "bg-white text-gray-700 hover:bg-gray-50",
      ].join(" ")}
    >
      Max Markup Price
    </button>
  </div>

  <p className="text-[11px] text-gray-500 mt-1">
    Default checkboxes for newly added itinerary services.
  </p>
</Field>

                  <Field label="Markup Min Price (₹)">
                                    <div className="relative">
                                      <input
                                        type="number"
                                        className="input pl-9"
                                        min={0}
                                        value={data.markup_min_price ?? ""}
                                        onChange={(e) =>
                                          setTour({
                                            markup_min_price: e.target.value === "" ? null : Number(e.target.value),
                                          })
                                        }
                                        placeholder="e.g., 200"
                                        disabled={submitting}
                                      />
                                      <IndianRupee className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    </div>
                                  </Field>
                                  
                                  <Field label="Markup Max Price (₹)">
                                    <div className="relative">
                                      <input
                                        type="number"
                                        className="input pl-9"
                                        min={0}
                                        value={data.markup_max_price ?? ""}
                                        onChange={(e) =>
                                          setTour({
                                            markup_max_price: e.target.value === "" ? null : Number(e.target.value),
                                          })
                                        }
                                        placeholder="e.g., 500"
                                        disabled={submitting}
                                      />
                                      <IndianRupee className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    </div>
                                  </Field>

                                     <Field label="Hotel">
                                    <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm space-y-3">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="text-sm font-semibold text-gray-900">Hotel Selection</p>
                                          <p className="text-[11px] text-gray-500">Choose hotel + room + plan.</p>
                                        </div>
                                  
                                        <button
                                          type="button"
                                          onClick={openHotelModal}
                                          disabled={submitting}
                                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                                        >
                                          <Plus className="size-3.5" />
                                          {data.selectedHotel ? "Change Hotel" : "Add Hotel"}
                                        </button>
                                      </div>
                                  
                                      {data.selectedHotel ? (
                                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
                                          <p className="font-semibold text-gray-900">{data.selectedHotel.property_name}</p>
                                          <p className="mt-1">
                                            Room: <span className="font-semibold">{data.selectedHotel.room_type}</span> • Plan:{" "}
                                            <span className="font-semibold">{data.selectedHotel.rate_plan.plan_name}</span> •{" "}
                                            <span className="font-semibold">
                                              {data.selectedHotel.currency} {data.selectedHotel.rate_plan.price}
                                            </span>
                                          </p>
                                  
                                          <button
                                            type="button"
                                            onClick={() => setTour({ selectedHotel: null })}
                                            className="mt-2 inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                          >
                                            <X className="size-3.5" /> Remove hotel
                                          </button>
                                        </div>
                                      ) : (
                                        <p className="text-xs text-gray-500">No hotel selected.</p>
                                      )}
                                    </div>
                                  </Field>

                                  <Field label="Inclusions">
                                    <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm space-y-3">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="text-sm font-semibold text-gray-900">Create Inclusions</p>
                                          <p className="text-[11px] text-gray-500">
                                            Pick & Drop, Rentals, Food Services, Tour Manager
                                          </p>
                                        </div>
                                  
                                        <button
                                          type="button"
                                          onClick={openInclusionModal}
                                          disabled={submitting}
                                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                                        >
                                          <Plus className="size-3.5" />
                                          Add Inclusion
                                        </button>
                                      </div>
                                  
                                      {/* small summary */}
                                      <div className="text-xs text-gray-700 space-y-1">
                                        <p>
                                          <span className="font-semibold">Pick & Drop:</span>{" "}
                                          {data.inclusions.pickupanddrop?.serviceItemId ? "Selected" : "None"}
                                        </p>
                                        <p>
                                          <span className="font-semibold">Rentals:</span>{" "}
                                          {data.inclusions.rentals?.serviceItemId ? "Selected" : "None"}
                                        </p>
                                        <p>
                                          <span className="font-semibold">Food Plan:</span>{" "}
                                          {(data.inclusions.foodPlan?.length || 0) ? `${data.inclusions.foodPlan.length} day(s)` : "No dates yet"}
                                        </p>
                                      </div>
                                    </div>
                                  </Field>
              </div>

              <Field label="Description *" required>
                <div className="rounded-xl border border-gray-300 bg-white shadow-sm overflow-hidden">
                  <TinyMCETextEditor
                    value={descriptionHtml}
                    onChange={(html: string) => setDescriptionHtml(html)}
                    disabled={submitting}
                    placeholder="Experience luxury in Goa..."
                  />
                </div>
              </Field>


              {/* Thumbnail */}
              <Field label="Thumbnail Image" hint="Shows current thumbnail; upload to replace.">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <label className="block">
                    <div className="flex items-center gap-3 px-3 py-2 border-2 border-dashed border-emerald-300 rounded-xl cursor-pointer hover:border-emerald-500 bg-emerald-50/50">
                      <ImageIcon className="size-5 text-emerald-600" />
                      <div>
                        <p className="text-xs font-semibold text-emerald-900">
                          {data.thumbnail.file?.name || "Upload new thumbnail"}
                        </p>
                        <p className="text-[10px] text-emerald-900/70">JPG / PNG / WebP</p>
                      </div>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailChange} disabled={submitting} />
                  </label>

                  {/* preview: new file > existing url */}
                  {(data.thumbnail.preview || data.thumbnail.existingUrl) && (
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-24 rounded-xl overflow-hidden border bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={data.thumbnail.preview || data.thumbnail.existingUrl}
                          alt="Thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {data.thumbnail.preview && (
                        <button
                          type="button"
                          onClick={clearNewThumbnail}
                          disabled={submitting}
                          className="px-3 py-2 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          Remove new
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </Field>
            </div>
          </SectionCard>
        )}

        {/* ITINERARY */}
        {step.key === "services" && (
          <SectionCard title="Itinerary" subtitle="Define day-wise flow & map activities to services." icon={<ListChecks className="size-5 text-emerald-600" />}>
            <div className="space-y-6">
              <div className="space-y-3">
                {data.itinerary.map((d, idx) => {
                  const isOpen = openDays[idx] ?? true;

                  return (
                    <div key={idx} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                     {/* Day Header */}
                      <div className="py-3 border-b border-gray-100 bg-white sticky top-0 z-10">
                        {/* HEADER ROW */}
                        <div className="flex items-center justify-between gap-2 px-3">
                          {/* Left: Day toggle */}
                          <button
                            type="button"
                            onClick={() => toggleDayOpen(idx)}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                              isOpen
                                ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                                : "bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100"
                            }`}
                            aria-expanded={isOpen}
                          >
                            <ChevronDown
                              className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                            />
                            <span>Itinerary Day {idx + 1}</span>
                          </button>

                          {/* Right corner: mobile trash */}
                          <button
                            type="button"
                            onClick={() => removeItineraryDay(idx)}
                            disabled={submitting}
                            className="sm:hidden inline-flex items-center justify-center size-9 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                            aria-label={`Remove Itinerary Day ${idx + 1}`}
                            title="Remove day"
                          >
                            <Trash2 className="size-4" />
                          </button>

                          {/* Desktop remove */}
                          <button
                            type="button"
                            onClick={() => removeItineraryDay(idx)}
                            disabled={submitting}
                            className="hidden sm:inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                          >
                            <Trash2 className="size-3.5" />
                            Remove
                          </button>
                        </div>

                        {/* Title input row */}
                        <div className="px-3 mt-2">
                          <input
                            type="text"
                            className="input"
                            value={d.title}
                            onChange={(e) => updateItineraryDay(idx, { title: e.target.value })}
                            placeholder="Arrival in Goa"
                            disabled={submitting}
                          />
                        </div>
                      </div>
                      {isOpen && (
                        <div className="p-3 sm:p-4 space-y-4 bg-gray-50/40">
                          <div className="rounded-xl border border-gray-200 bg-white p-3">
                            <Field label="Description">
                              <textarea
                                className="textarea w-full"
                                value={d.description}
                                onChange={(e) => updateItineraryDay(idx, { description: e.target.value })}
                                placeholder="Arrive at Goa airport. Private transfer..."
                                disabled={submitting}
                              />
                            </Field>
                          </div>

                          <div className="rounded-xl border border-gray-200 bg-white">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-sm font-semibold text-gray-900">
                                Activities{" "}
                                <span className="text-xs text-gray-500">
                                  ({(d.timeSlots || []).reduce((sum, s) => sum + (s.activities?.length || 0), 0)})
                                </span>
                              </p>
                            </div>

                            <div className="space-y-4">
                              {(d.timeSlots || []).map((slot, slotIdx) => (
                                <div key={slot.id || `${idx}-${slotIdx}`} className="rounded-xl border border-gray-200 bg-white p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-semibold text-gray-900">
                                      Slot: {slot.from} - {slot.to}
                                      <span className="text-xs text-gray-500 ml-2">({slot.activities?.length || 0})</span>
                                    </p>

                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        disabled={submitting}
                                        onClick={() => {
                                          loadSlotToEditor(slot);
                                          setSlotEditor({ open: true, dayIdx: idx, slotId: slot.id });
                                        }}
                                        className="inline-flex items-center justify-center size-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                                        title="Edit slot time"
                                      >
                                        <Pencil className="size-4 text-gray-700" />
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => openServicePicker(idx, slotIdx)}
                                        disabled={submitting}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                                      >
                                        <Plus className="size-3.5" />
                                        Add
                                      </button>

                                      <button
                                        type="button"
                                        disabled={submitting}
                                        onClick={() => {
                                          if (slot.activities?.length && !confirm("This slot has activities. Remove anyway?")) return;
                                          removeTimeSlot(idx, slot.id);
                                        }}
                                        className="inline-flex items-center justify-center size-9 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                        title="Remove slot"
                                      >
                                        <Trash2 className="size-4" />
                                      </button>
                                    </div>
                                  </div>

                                  {slotEditor.open && slotEditor.dayIdx === idx && slotEditor.slotId === slot.id && (
                                    <div className="rounded-xl border border-gray-200 bg-white p-3 mb-3">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                          <p className="text-xs font-semibold text-gray-700 mb-1">From</p>
                                          <TimeSelect hour={fromHour} setHour={setFromHour} minute={fromMinute} setMinute={setFromMinute} ampm={fromAmpm} setAmpm={setFromAmpm} />
                                        </div>

                                        <div>
                                          <p className="text-xs font-semibold text-gray-700 mb-1">To</p>
                                          <TimeSelect hour={toHour} setHour={setToHour} minute={toMinute} setMinute={setToMinute} ampm={toAmpm} setAmpm={setToAmpm} />
                                        </div>
                                      </div>

                                      <div className="mt-3 flex items-center gap-2">
                                        <button
                                          type="button"
                                          disabled={submitting}
                                          onClick={() => {
                                            const err = hasOverlappingSlot(d.timeSlots || [], fromVal, toVal, slot.id);
                                            if (err) {
                                              alert(err);
                                              return;
                                            }

                                            updateItineraryDay(idx, {
                                              timeSlots: (d.timeSlots || []).map((s) => (s.id === slot.id ? { ...s, from: fromVal, to: toVal } : s)),
                                            });
                                            closeSlotEditor();
                                          }}
                                          className="px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                                        >
                                          Update slot
                                        </button>

                                        <button
                                          type="button"
                                          disabled={submitting}
                                          onClick={closeSlotEditor}
                                          className="px-3 py-2 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                                        >
                                          Cancel
                                        </button>

                                        <span className="text-[11px] text-gray-500 ml-auto">
                                          Selected: <span className="font-semibold">{fromVal} - {toVal}</span>
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  <div className="space-y-3">
                                    {(slot.activities || []).map((a, aIdx) => {
                                      // Resolve category from serviceId if present, else try to find by itemModel
                                      const selectedCategory =
                                        (a.serviceId && serviceCategories.find((c) => c._id === a.serviceId)) ||
                                        serviceCategories.find((c) => (ITEM_MODEL_BY_TITLE[c.title] ?? getItemModelForTitle(c.title)) === a.itemModel);

                                      const metaKey = selectedCategory ? SERVICE_META_KEY_BY_TITLE[selectedCategory.title] || "" : "";
                                      const itemsForCategory = metaKey && servicesMeta[metaKey] ? servicesMeta[metaKey] : [];
                                      const selectedItem = itemsForCategory.find((item) => item._id === a.serviceItemId);

                                    
                                      const card = selectedItem
                                          ? getServiceCardContent(metaKey, selectedItem)
                                          : null;

                                        // ✅ override price label using min/max checkboxes
                                        const priceLabel =
                                          selectedItem
                                            ? (formatPriceLabelFromChecks(selectedItem, a.useMinPrice, a.useMaxPrice) || card?.priceLabel || "")
                                            : (card?.priceLabel || "");


                                      return (
                                        <div key={`${idx}-${slotIdx}-${aIdx}`} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                                          <div className="px-3 sm:px-4 py-3 border-b border-gray-100 flex items-start gap-3">
                                            <div className="shrink-0">
                                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                                                {card?.mediaUrl ? (
                                                  // eslint-disable-next-line @next/next/no-img-element
                                                  <img src={card.mediaUrl} alt={card.title} className="w-full h-full object-cover" />
                                                ) : (
                                                  <div className="w-full h-full grid place-items-center text-[10px] text-gray-400">N/A</div>
                                                )}
                                              </div>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-semibold text-gray-900 truncate">{card?.title || "Selected activity"}</p>

                                                <button
                                                  type="button"
                                                  onClick={() => removeItineraryActivity(idx, slotIdx, aIdx)}
                                                  disabled={submitting}
                                                  className="inline-flex items-center justify-center size-8 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                                  aria-label="Remove activity"
                                                >
                                                  <X className="size-4" />
                                                </button>
                                              </div>

                                              <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                                {card?.subtitle || (a.serviceItemId ? `ID: ${a.serviceItemId}` : "No item selected")}
                                              </p>

                                         <div className="mt-2 space-y-2">
  {/* price pill stays first */}
  {priceLabel && (
    <span className="inline-flex text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
      {priceLabel}
    </span>
  )}

  {/* ✅ Mobile: min/max in one row. Desktop: normal wrap */}
  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
    {/* Row A: Min + Max (mobile single row) */}
    <div className="flex items-center gap-2 w-full sm:w-auto">
      <label className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 text-[11px] text-gray-700 bg-gray-50 border border-gray-200 px-2 py-1 rounded-full">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          checked={!!a.useMinPrice}
          onChange={(e) =>
            updateItineraryActivity(idx, slotIdx, aIdx, {
              useMinPrice: e.target.checked,
              useMaxPrice: e.target.checked ? false : a.useMaxPrice,
            })
          }
          disabled={submitting}
        />
        <span className="whitespace-nowrap">Min Markup</span>
      </label>

      <label className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 text-[11px] text-gray-700 bg-gray-50 border border-gray-200 px-2 py-1 rounded-full">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          checked={!!a.useMaxPrice}
          onChange={(e) =>
            updateItineraryActivity(idx, slotIdx, aIdx, {
              useMaxPrice: e.target.checked,
              useMinPrice: e.target.checked ? false : a.useMinPrice,
            })
          }
          disabled={submitting}
        />
        <span className="whitespace-nowrap">Max Markup</span>
      </label>
    </div>

    {/* Row B: customer removable below on mobile, inline on desktop */}
    <label className="w-full sm:w-auto inline-flex items-center gap-2 text-[11px] text-gray-700 bg-gray-50 border border-gray-200 px-2 py-1 rounded-full">
      <input
        type="checkbox"
        className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        checked={!!a.isRemovable}
        onChange={(e) =>
          updateItineraryActivity(idx, slotIdx, aIdx, { isRemovable: e.target.checked })
        }
        disabled={submitting}
      />
      <span className="whitespace-nowrap">Customer can remove</span>
    </label>
  </div>
</div>

                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}

                                    {(slot.activities || []).length === 0 && <div className="text-xs text-gray-500 py-2">No activities added for this slot.</div>}
                                  </div>
                                </div>
                              ))}

                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() => {
                                  const newSlot: DayTimeSlotUI = {
                                    id: crypto.randomUUID(),
                                    from: "10:00 AM",
                                    to: "1:30 PM",
                                    activities: [],
                                  };

                                  setData((prev) => ({
                                    ...prev,
                                    itinerary: prev.itinerary.map((day, i) => {
                                      if (i !== idx) return day;
                                      return { ...day, timeSlots: [...(day.timeSlots || []), newSlot] };
                                    }),
                                  }));

                                  ensureDayOpen(idx);
                                  loadSlotToEditor(newSlot);
                                  setSlotEditor({ open: true, dayIdx: idx, slotId: newSlot.id });
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                              >
                                <Plus className="size-3.5" />
                                Add Slot
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={addItineraryDay}
                    disabled={submitting}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                  >
                    <Plus className="size-3.5" />
                    Add Day
                  </button>
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {/* SURCHARGES */}
        {step.key === "surcharges" && (
          <SectionCard title="Surcharges" subtitle="Update exclusions, surges & options." icon={<IndianRupee className="size-5 text-emerald-600" />} requiredHint>
            <div className="space-y-6">
              <div className="rounded-xl border border-gray-200 bg-white p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Exclusions" hint="Matches 'exclusions' array.">
                  <TagsInput items={data.exclusions} onChange={(items) => setTour({ exclusions: items })} placeholder="Airfare" disabled={submitting} />
                </Field>
              </div>

              <div className="mt-3 border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-700 mb-2">Tour manager and Transport</p>
                <div className="flex flex-wrap gap-4">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      checked={data.hasTourGuide}
                      onChange={(e) => setTour({ hasTourGuide: e.target.checked })}
                      disabled={submitting}
                    />
                    <span>Tour Guide Included</span>
                  </label>

                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      checked={data.hasTransport}
                      onChange={(e) => setTour({ hasTransport: e.target.checked })}
                      disabled={submitting}
                    />
                    <span>Transport Included</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Surge Charges</h3>
                <button
                  type="button"
                  onClick={addSurcharge}
                  disabled={submitting}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                >
                  <Plus className="size-3.5" />
                  Add surge
                </button>
              </div>

              <div className="space-y-4">
                {data.surcharges.map((s, idx) => (
                  <div key={idx} className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-amber-900">Surge #{idx + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeSurcharge(idx)}
                        disabled={submitting}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                      >
                        <X className="size-3.5" />
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-1.5">Surge window</p>
                        <div className="flex items-center gap-4 text-xs mb-3">
                          <label className="inline-flex items-center gap-1.5">
                            <input
                              type="radio"
                              name={`surcharge-window-${idx}`}
                              className="size-3"
                              checked={s.windowType === "single"}
                              onChange={() => updateSurcharge(idx, { windowType: "single", startDate: "", endDate: "" })}
                              disabled={submitting}
                            />
                            <span>Single date</span>
                          </label>
                          <label className="inline-flex items-center gap-1.5">
                            <input
                              type="radio"
                              name={`surcharge-window-${idx}`}
                              className="size-3"
                              checked={s.windowType === "range"}
                              onChange={() => updateSurcharge(idx, { windowType: "range", singleDate: "" })}
                              disabled={submitting}
                            />
                            <span>Date range</span>
                          </label>
                        </div>

                        {s.windowType === "single" ? (
                          <Field label="Date">
                            <input type="date" className="input" value={s.singleDate} onChange={(e) => updateSurcharge(idx, { singleDate: e.target.value })} disabled={submitting} />
                          </Field>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <Field label="Start date">
                              <input type="date" className="input" value={s.startDate} onChange={(e) => updateSurcharge(idx, { startDate: e.target.value })} disabled={submitting} />
                            </Field>
                            <Field label="End date">
                              <input type="date" className="input" value={s.endDate} onChange={(e) => updateSurcharge(idx, { endDate: e.target.value })} disabled={submitting} />
                            </Field>
                          </div>
                        )}
                      </div>

                      <Field label="Surge amount">
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min={0}
                            inputMode="decimal"
                            className="input"
                            value={s.amount}
                            onChange={(e) => updateSurcharge(idx, { amount: e.target.value })}
                            placeholder="enter amount"
                            disabled={submitting}
                          />
                          <select className="input w-24" value={s.currency} onChange={(e) => updateSurcharge(idx, { currency: e.target.value })} disabled={submitting}>
                            <option value="INR">INR</option>
                            <option value="USD">USD</option>
                            <option value="AED">AED</option>
                          </select>
                        </div>
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        )}
      </main>

      {/* Service Picker Modal (same rules as add page) */}
      {servicePicker.open &&
        servicePicker.dayIdx !== null &&
        (() => {
          const titleNorm = (t: string) => normalizeTitle(t);

          const selectedWithTitle = servicePicker.selected.map((s) => ({ ...s, categoryTitleNorm: titleNorm(s.categoryTitle) }));
          const hasSelectedIn = (titles: string[]) => {
            const set = new Set(titles.map(titleNorm));
            return selectedWithTitle.some((s) => set.has(s.categoryTitleNorm));
          };

          const CAT = {
            HOTELS: "hotels",
            ACTIVITIES: "activities",
            LEISURE: "leisure activities",
            NIGHTLIFE: "nightlife",
            SIGHTSEEING: "sightseeing",
          };

          const isSightseeingTitle = (t: string) => titleNorm(t) === CAT.SIGHTSEEING;

          const nonSightseeingSelections = servicePicker.selected.filter(
            (s) => !isSightseeingTitle(s.categoryTitle)
          );

          const hasNonSightseeingSelected = nonSightseeingSelections.length > 0;

          // since non-sightseeing is only one, this is the currently chosen non-sightseeing category
          const selectedNonSightseeingCategoryId = nonSightseeingSelections[0]?.categoryId ?? null;


          const daytimeExclusiveGroup = [CAT.ACTIVITIES, CAT.LEISURE];
          const nightExclusiveGroup = [CAT.NIGHTLIFE, CAT.LEISURE];

          const day = data.itinerary?.[servicePicker.dayIdx ?? -1];
          const slot = day?.timeSlots?.[servicePicker.slotIdx ?? -1];
          const slotStartMin = slot?.from ? timeToMinutes(slot.from) : null;
          const isDaytime = slotStartMin !== null ? slotStartMin <= 18 * 60 : true;

          const isCategoryTabDisabled = (cat: ServiceCategory) => {
            const t = titleNorm(cat.title);

            // If user picked a non-sightseeing item:
            // - allow Sightseeing tab always
            // - allow the SAME non-sightseeing tab (so they can unselect the chosen item)
            // - disable all other tabs
            if (hasNonSightseeingSelected) {
              if (t === CAT.SIGHTSEEING) return false;
              if (cat._id === selectedNonSightseeingCategoryId) return false;
              return true;
            }

            // Otherwise apply your existing daytime/night rules (optional)
            if (isDaytime) {
              if (t === CAT.ACTIVITIES) return hasSelectedIn([CAT.LEISURE]);
              if (t === CAT.LEISURE) return hasSelectedIn([CAT.ACTIVITIES]);
              return false;
            }

            if (t === CAT.NIGHTLIFE) return hasSelectedIn([CAT.LEISURE]);
            if (t === CAT.LEISURE) return hasSelectedIn([CAT.NIGHTLIFE]);
            return false;
          };


          const filteredCategories = (serviceCategories || []).filter((c) => {
            const title = normalizeTitle(c?.title);
           if (["tour packages", "hotels"].includes(title)) return false;
            if (isDaytime) {
              if (title === "nightlife") return false;
              return true;
            }
            return title === "nightlife" || title === "leisure activities";
          });

          const safeActiveCategoryId =
            servicePicker.activeCategoryId && filteredCategories.some((c) => c._id === servicePicker.activeCategoryId)
              ? servicePicker.activeCategoryId
              : filteredCategories[0]?._id;

          const activeCategory =
            (safeActiveCategoryId && filteredCategories.find((c) => c._id === safeActiveCategoryId)) || filteredCategories[0];

          const activeMetaKey = activeCategory ? SERVICE_META_KEY_BY_TITLE[activeCategory.title] || "" : "";
          const activeItemsForCategory: ServiceMetaItem[] = activeMetaKey && servicesMeta[activeMetaKey] ? servicesMeta[activeMetaKey] : [];

          const toggleSelectItem = (category: ServiceCategory, item: ServiceMetaItem) => {
            setServicePicker((prev) => {
              if (!item._id) return prev;

              const catTitleNorm = titleNorm(category.title);
              const isSightseeing = catTitleNorm === CAT.SIGHTSEEING;

              const existsIdx = prev.selected.findIndex(
                (s) => s.categoryId === category._id && s.itemId === item._id
              );

              // If already selected -> unselect
              if (existsIdx >= 0) {
                const nextSel = [...prev.selected];
                nextSel.splice(existsIdx, 1);
                return { ...prev, selected: nextSel };
              }

              let nextSel = [...prev.selected];

              if (isSightseeing) {
                // ✅ Sightseeing = multi-select, don't touch other selections
                nextSel.push({
                  categoryId: category._id,
                  categoryTitle: category.title,
                  itemId: item._id,
                });
                return { ...prev, selected: nextSel };
              }

              // ✅ Non-sightseeing = only ONE total (but keep all sightseeing)
              nextSel = nextSel.filter((s) => titleNorm(s.categoryTitle) === CAT.SIGHTSEEING);

              nextSel.push({
                categoryId: category._id,
                categoryTitle: category.title,
                itemId: item._id,
              });

              return { ...prev, selected: nextSel };
            });
          };


          return (
            <div
              className="fixed inset-0 z-[9999]"
              aria-modal="true"
              role="dialog"
              onKeyDown={(e) => {
                if (e.key === "Escape") closeServicePicker();
              }}
            >
              <button type="button" aria-label="Close" onClick={closeServicePicker} className="absolute inset-0 bg-black/50" />

              <div className="absolute inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center p-0 md:p-6">
                <div className="relative w-full md:max-w-4xl lg:max-w-5xl bg-white rounded-3xl shadow-2xl max-h-[88vh] md:max-h-[84vh] flex flex-col">
                  <div className="md:hidden flex justify-center pt-3">
                    <div className="h-1 w-12 rounded-full bg-gray-300" />
                  </div>

                  <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-4 md:px-5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm md:text-base font-semibold text-gray-900 truncate">
                          Select Activities for Day {servicePicker.dayIdx + 1}
                        </h3>
                        <p className="text-[11px] md:text-xs text-gray-500 mt-0.5">
                          Pick one or more services and tap <span className="font-semibold">Done</span>.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={closeServicePicker}
                        className="shrink-0 inline-flex items-center justify-center size-9 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-[0.98]"
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    <div className="mt-3 relative">
                      {/* Left arrow (mobile) */}
                      <button
                        type="button"
                        onClick={scrollTabsToStart}
                        className="md:hidden absolute left-0 top-1/2 -translate-y-1/2 z-10 inline-flex items-center justify-center size-8 rounded-full bg-white border border-gray-200 shadow"
                        aria-label="Scroll tabs to start"
                      >
                        <ChevronLeft className="size-4 text-gray-700" />
                      </button>

                      {/* Right arrow (mobile) */}
                      <button
                        type="button"
                        onClick={scrollTabsToEnd}
                        className="md:hidden absolute right-0 top-1/2 -translate-y-1/2 z-10 inline-flex items-center justify-center size-8 rounded-full bg-white border border-gray-200 shadow"
                        aria-label="Scroll tabs to end"
                      >
                        <ChevronRight className="size-4 text-gray-700" />
                      </button>

                      {/* Tabs */}
                      <div
                        ref={tabsScrollRef}
                        className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-10 md:px-0"
                      >
                        {filteredCategories.map((cat) => {
                          const isActive = activeCategory && activeCategory._id === cat._id;
                          const tabDisabled = isCategoryTabDisabled(cat);

                          return (
                            <button
                              key={cat._id}
                              type="button"
                              disabled={tabDisabled}
                              onClick={() => {
                                if (tabDisabled) return;
                                setServicePicker((prev) => ({ ...prev, activeCategoryId: cat._id }));
                              }}
                              className={[
                                "px-3 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap transition",
                                tabDisabled
                                  ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                                  : isActive
                                    ? "bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm"
                                    : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100",
                              ].join(" ")}
                              title={tabDisabled ? "Disabled due to selection rule" : undefined}
                            >
                              {cat.title}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 md:px-5 py-4">
                    {!activeCategory || loadingServicesMeta ? (
                      <div className="py-10 text-center">
                        <p className="text-sm text-gray-600">Loading services…</p>
                      </div>
                    ) : activeItemsForCategory.length === 0 ? (
                      <div className="py-10 text-center">
                        <p className="text-sm text-gray-600">
                          No service items found for <span className="font-semibold">{activeCategory.title}</span>.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {activeItemsForCategory.map((item) => {
                          if (!item._id) return null;

                          const isSelected = servicePicker.selected.some((s) => s.categoryId === activeCategory._id && s.itemId === item._id);
                          const isSightseeing = titleNorm(activeCategory.title) === CAT.SIGHTSEEING;
                       const isNonFoodCategory = activeCategory.title !== "Food Service";
                        // ✅ used in ANOTHER SLOT of the SAME DAY
                        const isUsedInAnotherSlotSameDay =
                          isNonFoodCategory &&
                          data.itinerary?.[servicePicker.dayIdx]?.timeSlots?.some((s, sIdx) => {
                            if (sIdx === servicePicker.slotIdx) return false; // ignore current slot
                            return (s.activities || []).some(
                              (act) =>
                                act.serviceItemId === item._id &&
                                act.serviceId === activeCategory._id
                            );
                          });

                        // ✅ used in ANY SLOT of ANOTHER DAY (your old logic)
                        const isUsedOnAnotherDay =
                          isNonFoodCategory &&
                          data.itinerary.some((day, dayIdx) => {
                            if (dayIdx === servicePicker.dayIdx) return false;

                            return (day.timeSlots || []).some((slot) =>
                              (slot.activities || []).some(
                                (act) =>
                                  act.serviceItemId === item._id &&
                                  act.serviceId === activeCategory._id
                              )
                            );
                          });

                        // ✅ unified lock
                        const isUsedElsewhere = isUsedInAnotherSlotSameDay || isUsedOnAnotherDay;

                        // allow clicking if it's already selected in THIS slot (so user can unselect)
                        const disabledBecauseUsedElsewhere = isUsedElsewhere && !isSelected;

                        // keep your other rule too
                        const lockedByNonSightseeingRule =
                          hasNonSightseeingSelected && !isSightseeing && !isSelected;

                        const disabled = disabledBecauseUsedElsewhere || lockedByNonSightseeingRule;
                        ;


                          const { mediaUrl, title, subtitle, chip, priceLabel, ratingLabel } = getServiceCardContent(activeMetaKey, item);

                          return (
                            <button
                              key={item._id}
                              type="button"
                              disabled={disabled}
                              onClick={() => {
                                if (disabled) return;
                                toggleSelectItem(activeCategory, item);
                              }}
                              className={[
                                "group w-full text-left rounded-2xl border p-3 transition",
                                "focus:outline-none focus:ring-2 focus:ring-emerald-500/30",
                                disabled
                                  ? "border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed"
                                  : isSelected
                                    ? "border-emerald-400 bg-emerald-50 shadow-sm"
                                    : "border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300",
                              ].join(" ")}
                            >
                              <div className="flex gap-3">
                                <div className="shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                                  {mediaUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={mediaUrl} alt={title} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">No image</div>
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-gray-900 truncate">{title || "(Untitled item)"}</p>
                                      {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
                                     {disabledBecauseUsedElsewhere && (
                                        <p className="text-[11px] text-red-600 mt-1">
                                          {isUsedInAnotherSlotSameDay
                                            ? "Already used in another slot on this day"
                                            : "Already used on another day"}
                                        </p>
                                      )}

                                    </div>

                                    <div className="shrink-0 flex flex-col items-end gap-1">
                                      {priceLabel && <span className="text-xs font-semibold text-emerald-700 whitespace-nowrap">{priceLabel}</span>}
                                      <span className="inline-flex items-center justify-center">
                                        {!disabled && isSelected ? (
                                          <CheckCircle2 className="size-5 text-emerald-600" />
                                        ) : (
                                          <span className="size-5 rounded-full border border-gray-300 inline-block" />
                                        )}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                                      {activeCategory.title} • {ITEM_MODEL_BY_TITLE[activeCategory.title] ?? "Item model"}
                                    </span>

                                    {chip && <span className="inline-flex px-2 py-0.5 rounded-full bg-gray-100 text-[11px] text-gray-700">{chip}</span>}
                                    {ratingLabel && <span className="inline-flex px-2 py-0.5 rounded-full bg-amber-50 text-[11px] text-amber-800">{ratingLabel}</span>}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="sticky bottom-0 bg-white/90 backdrop-blur border-t border-gray-100 px-4 md:px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-gray-600">
                        Selected: <span className="font-semibold text-gray-900">{servicePicker.selected.length}</span>
                      </p>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={closeServicePicker}
                          className="px-4 py-2 text-xs md:text-sm font-semibold rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-[0.98]"
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          onClick={handleServicePickerDone}
                          disabled={servicePicker.selected.length === 0}
                          className={[
                            "px-4 py-2 text-xs md:text-sm font-semibold rounded-xl text-white active:scale-[0.98] transition",
                            servicePicker.selected.length === 0 ? "bg-emerald-300 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700",
                          ].join(" ")}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}


         {hotelModal.open && (
                  <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true">
                    <button className="absolute inset-0 bg-black/50" onClick={closeHotelModal} />
        
                    <div className="absolute inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center p-0 md:p-6">
                      <div className="relative w-full md:max-w-4xl bg-white rounded-3xl shadow-2xl max-h-[88vh] flex flex-col">
                        {/* Header */}
                        <div className="sticky top-0 bg-white/90 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">Select Hotel</p>
                            <p className="text-[11px] text-gray-500">
                              Step: {hotelModal.step === "hotel" ? "Hotel" : hotelModal.step === "room" ? "Room" : "Rate Plan"}
                            </p>
                          </div>
        
                          <div className="flex items-center gap-2">
                            {hotelModal.step !== "hotel" && (
                              <button
                                type="button"
                                onClick={() =>
                                  setHotelModal((p) => ({
                                    ...p,
                                    step: p.step === "plan" ? "room" : "hotel",
                                    ...(p.step === "plan" ? { planName: "" } : { roomId: "", planName: "" }),
                                  }))
                                }
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                              >
                                Back
                              </button>
                            )}
        
                            <button
                              type="button"
                              onClick={closeHotelModal}
                              className="inline-flex items-center justify-center size-9 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        </div>
        
                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-4 py-4">
                          {/* STEP 1: HOTEL LIST */}
                          {hotelModal.step === "hotel" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {hotelsList.map((h: any) => {
                                const isSelected = hotelModal.hotelId === h._id;
                                const img = h?.thumbnail?.image || h?.media_gallery?.room?.[0] || "";
        
                                return (
                                  <button
                                    key={h._id}
                                    type="button"
                                    onClick={() =>
                                      setHotelModal((p) => ({
                                        ...p,
                                        hotelId: h._id,
                                        roomId: "",
                                        planName: "",
                                        step: "room",
                                      }))
                                    }
                                    className={[
                                      "w-full text-left rounded-2xl border p-3 transition",
                                      isSelected ? "border-emerald-400 bg-emerald-50" : "border-gray-200 bg-white hover:bg-gray-50",
                                    ].join(" ")}
                                  >
                                    <div className="flex gap-3">
                                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                                        {img ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={img} alt={h.property_name} className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full grid place-items-center text-[10px] text-gray-400">N/A</div>
                                        )}
                                      </div>
        
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{h.property_name}</p>
                                        <p className="text-xs text-gray-500 truncate">
                                          {h.location?.address || ""} • {h.location?.city || ""}
                                        </p>
                                        <p className="text-[11px] text-gray-600 mt-1">
                                          Markup: ₹{h.markup_min_price} - ₹{h.markup_max_price}
                                        </p>
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
        
                          {/* STEP 2: ROOM TYPES */}
                          {hotelModal.step === "room" && selectedHotelObj && (
                            <div className="space-y-3">
                              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                                <p className="text-sm font-semibold text-gray-900">{selectedHotelObj.property_name}</p>
                                <p className="text-[11px] text-gray-600">
                                  {selectedHotelObj.location?.city} • Check-in {selectedHotelObj.check_in_time} • Check-out{" "}
                                  {selectedHotelObj.check_out_time}
                                </p>
                              </div>
        
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {(selectedHotelObj.rooms || []).map((r: any) => {
                                  const isSelected = hotelModal.roomId === r.room_id;
                                  const img = r?.image_link?.[0] || selectedHotelObj?.media_gallery?.room?.[0] || "";
        
                                  return (
                                    <button
                                      key={r.room_id}
                                      type="button"
                                      onClick={() =>
                                        setHotelModal((p) => ({
                                          ...p,
                                          roomId: r.room_id,
                                          planName: "",
                                          step: "plan",
                                        }))
                                      }
                                      className={[
                                        "w-full text-left rounded-2xl border p-3 transition",
                                        isSelected ? "border-emerald-400 bg-emerald-50" : "border-gray-200 bg-white hover:bg-gray-50",
                                      ].join(" ")}
                                    >
                                      <div className="flex gap-3">
                                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                                          {img ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={img} alt={r.room_type} className="w-full h-full object-cover" />
                                          ) : (
                                            <div className="w-full h-full grid place-items-center text-[10px] text-gray-400">N/A</div>
                                          )}
                                        </div>
        
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-semibold text-gray-900 truncate">{r.room_type}</p>
                                          <p className="text-xs text-gray-500">
                                            Occupancy: {r.occupancy_min}-{r.occupancy_max}
                                          </p>
                                          <p className="text-[11px] text-gray-600 mt-1">
                                            Currency: {r?.pricing?.currency || "INR"}
                                          </p>
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
        
                          {/* STEP 3: RATE PLANS */}
                          {hotelModal.step === "plan" && selectedHotelObj && selectedRoomObj && (
                            <div className="space-y-3">
                              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                                <p className="text-sm font-semibold text-gray-900">{selectedHotelObj.property_name}</p>
                                <p className="text-[11px] text-gray-600">
                                  Room: <span className="font-semibold">{selectedRoomObj.room_type}</span> • Occupancy{" "}
                                  {selectedRoomObj.occupancy_min}-{selectedRoomObj.occupancy_max}
                                </p>
                              </div>
        
                              <div className="space-y-2">
                                {(selectedRoomObj?.pricing?.rate_plans || []).map((p: any) => {
                                  const isSelected = hotelModal.planName === p.plan_name;
                                  return (
                                    <button
                                      key={p.plan_name}
                                      type="button"
                                      onClick={() => setHotelModal((x) => ({ ...x, planName: p.plan_name }))}
                                      className={[
                                        "w-full text-left rounded-xl border p-3 transition",
                                        isSelected ? "border-emerald-400 bg-emerald-50" : "border-gray-200 bg-white hover:bg-gray-50",
                                      ].join(" ")}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div>
                                          <p className="text-sm font-semibold text-gray-900">{p.plan_name}</p>
                                          {p.cancellation_policy && (
                                            <p className="text-[11px] text-gray-600 mt-0.5">{p.cancellation_policy}</p>
                                          )}
                                        </div>
                                        <p className="text-sm font-bold text-gray-900 whitespace-nowrap">
                                          {selectedRoomObj?.pricing?.currency || "INR"} {p.price}
                                        </p>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
        
                        {/* Footer */}
                        <div className="sticky bottom-0 bg-white/90 backdrop-blur border-t border-gray-100 px-4 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={closeHotelModal}
                              className="px-4 py-2 text-xs font-semibold rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              Cancel
                            </button>
        
                            <button
                              type="button"
                              disabled={!(selectedHotelObj && selectedRoomObj && selectedPlanObj)}
                             onClick={() => {
          if (!(selectedHotelObj && selectedRoomObj && selectedPlanObj)) return;
        
          const currency = selectedRoomObj?.pricing?.currency || "INR";
          const hotelCategoryId = hotelsCategory?._id || null;
        
          setData((prev) => {
            const next: TourPackageUI = {
              ...prev,
              selectedHotelCategoryId: hotelCategoryId, // ✅ save category id
              selectedHotel: {
                hotelItemId: selectedHotelObj._id,
                hotel_id: selectedHotelObj.hotel_id,
                property_name: selectedHotelObj.property_name,
        
                room_id: selectedRoomObj.room_id,
                room_type: selectedRoomObj.room_type,
                occupancy_min: selectedRoomObj.occupancy_min,
                occupancy_max: selectedRoomObj.occupancy_max,
        
                rate_plan: {
                  plan_name: selectedPlanObj.plan_name,
                  price: Number(selectedPlanObj.price) || 0,
                  cancellation_policy: selectedPlanObj.cancellation_policy,
                },
                currency,
              },
            };
        
            // ✅ auto place in Day1 Slot1 and LastDay Slot1
            return applySelectedHotelToDefaultSlots(next);
          });
        
          closeHotelModal();
        }}
        
                              className={[
                                "px-4 py-2 text-xs font-semibold rounded-xl text-white",
                                selectedHotelObj && selectedRoomObj && selectedPlanObj
                                  ? "bg-emerald-600 hover:bg-emerald-700"
                                  : "bg-emerald-300 cursor-not-allowed",
                              ].join(" ")}
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                  {inclusionModal.open && (
                  <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true">
                    <button className="absolute inset-0 bg-black/50" onClick={closeInclusionModal} />
                
                    <div className="absolute inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center p-0 md:p-6">
                      <div className="relative w-full md:max-w-5xl bg-white rounded-3xl shadow-2xl max-h-[88vh] flex flex-col">
                        {/* Header */}
                        <div className="sticky top-0 bg-white/90 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">Add Inclusions</p>
                            <p className="text-[11px] text-gray-500">
                              Select items per tab. Food is day-wise meals.
                            </p>
                          </div>
                
                          <button
                            type="button"
                            onClick={closeInclusionModal}
                            className="inline-flex items-center justify-center size-9 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                
                        {/* Tabs */}
                        <div className="px-4 pt-3">
                          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                            {[
                              { key: "pickupanddrop", label: "Pick & Drop" },
                              { key: "rentals", label: "Rentals" },
                              { key: "foodservices", label: "Food Services" },
                            ].map((t) => {
                              const active = inclusionModal.tab === (t.key as InclusionTabKey);
                              return (
                                <button
                                  key={t.key}
                                  type="button"
                                  onClick={() =>
                                    setInclusionModal((p) => ({ ...p, tab: t.key as InclusionTabKey }))
                                  }
                                  className={[
                                    "px-3 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap",
                                    active
                                      ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                                      : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100",
                                  ].join(" ")}
                                >
                                  {t.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                
                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-4 py-4">
                          {/* --- Pick & Drop / Rentals (single select) --- */}
                          {inclusionModal.tab !== "foodservices" &&
                            (() => {
                              const tab = inclusionModal.tab;
                
                              const cat =
                                tab === "pickupanddrop"
                                  ? catPickDrop
                                  : tab === "rentals"
                                  ? catRentals
                                  : null;
                
                              if (!cat) {
                                return <p className="text-sm text-gray-600">Category not found.</p>;
                              }
                
                              const metaKey = SERVICE_META_KEY_BY_TITLE[cat.title] || "";
                              const items = metaKey ? servicesMeta?.[metaKey] || [] : [];
                
                              const current =
                                tab === "pickupanddrop"
                                  ? data.inclusions.pickupanddrop
                                  : tab === "rentals"
                                  ? data.inclusions.rentals
                                  : null;
                
                              return (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-gray-900">{cat.title}</p>
                
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setData((prev) => ({
                                          ...prev,
                                          inclusions: {
                                            ...prev.inclusions,
                                            ...(tab === "pickupanddrop"
                                              ? { pickupanddrop: null }
                                              : { rentals: null }),
                                          },
                                        }));
                                      }}
                                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                    >
                                      Clear
                                    </button>
                                  </div>
                
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {items.map((item: any) => {
                                      if (!item?._id) return null;
                
                                      const isSelected = current?.serviceItemId === item._id;
                                      const card = getServiceCardContent(metaKey, item);
                const priceLabel =
                  isSelected
                    ? (formatPriceLabelFromChecks(item, !!current?.useMinPrice, !!current?.useMaxPrice) || card.priceLabel || "")
                    : (card.priceLabel || "");
                
                                      return (
                                        <button
                                          key={item._id}
                                          type="button"
                                          onClick={() => {
                                            const itemModel = getItemModelForTitle(cat.title);
                                            setData((prev) => ({
                                              ...prev,
                                              inclusions: {
                                                ...prev.inclusions,
                                                ...(tab === "pickupanddrop"
                  ? {
                      pickupanddrop: {
                        serviceId: cat._id,
                        serviceItemId: item._id,
                        itemModel,
                        useMinPrice: data.pricingMode === "min", // ✅ follow global mode
                        useMaxPrice: data.pricingMode === "max",
                      },
                    }
                  : {
                      rentals: {
                        serviceId: cat._id,
                        serviceItemId: item._id,
                        itemModel,
                        useMinPrice: data.pricingMode === "min",
                        useMaxPrice: data.pricingMode === "max",
                      },
                    }),
                                              },
                                            }));
                                          }}
                                          className={[
                                            "w-full text-left rounded-2xl border p-3 transition",
                                            isSelected
                                              ? "border-emerald-400 bg-emerald-50 shadow-sm"
                                              : "border-gray-200 bg-white hover:bg-gray-50",
                                          ].join(" ")}
                                        >
                                          <div className="flex gap-3">
                                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                                              {card.mediaUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                  src={card.mediaUrl}
                                                  alt={card.title}
                                                  className="w-full h-full object-cover"
                                                />
                                              ) : (
                                                <div className="w-full h-full grid place-items-center text-[10px] text-gray-400">
                                                  N/A
                                                </div>
                                              )}
                                            </div>
                
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                  <p className="text-sm font-semibold text-gray-900 truncate">
                                                    {card.title}
                                                  </p>
                                                  {card.subtitle && (
                                                    <p className="text-xs text-gray-500 truncate">
                                                      {card.subtitle}
                                                    </p>
                                                  )}
                                                  {isSelected && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <label className="inline-flex items-center gap-2 text-[11px] text-gray-700 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        checked={!!current?.useMinPrice}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setData((prev) => ({
                            ...prev,
                            inclusions: {
                              ...prev.inclusions,
                              ...(tab === "pickupanddrop"
                                ? {
                                    pickupanddrop: prev.inclusions.pickupanddrop
                                      ? {
                                          ...prev.inclusions.pickupanddrop,
                                          useMinPrice: checked,
                                          useMaxPrice: checked ? false : prev.inclusions.pickupanddrop.useMaxPrice,
                                        }
                                      : null,
                                  }
                                : {
                                    rentals: prev.inclusions.rentals
                                      ? {
                                          ...prev.inclusions.rentals,
                                          useMinPrice: checked,
                                          useMaxPrice: checked ? false : prev.inclusions.rentals.useMaxPrice,
                                        }
                                      : null,
                                  }),
                            },
                          }));
                        }}
                      />
                      Min Markup price
                    </label>
                
                    <label className="inline-flex items-center gap-2 text-[11px] text-gray-700 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        checked={!!current?.useMaxPrice}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setData((prev) => ({
                            ...prev,
                            inclusions: {
                              ...prev.inclusions,
                              ...(tab === "pickupanddrop"
                                ? {
                                    pickupanddrop: prev.inclusions.pickupanddrop
                                      ? {
                                          ...prev.inclusions.pickupanddrop,
                                          useMaxPrice: checked,
                                          useMinPrice: checked ? false : prev.inclusions.pickupanddrop.useMinPrice,
                                        }
                                      : null,
                                  }
                                : {
                                    rentals: prev.inclusions.rentals
                                      ? {
                                          ...prev.inclusions.rentals,
                                          useMaxPrice: checked,
                                          useMinPrice: checked ? false : prev.inclusions.rentals.useMinPrice,
                                        }
                                      : null,
                                  }),
                            },
                          }));
                        }}
                      />
                      Max Markup price
                    </label>
                  </div>
                )}
                
                                               
                                                  {priceLabel && (
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1">{priceLabel}</p>
                )}
                
                                                </div>
                
                                                <div className="shrink-0">
                                                  {isSelected ? (
                                                    <CheckCircle2 className="size-5 text-emerald-600" />
                                                  ) : (
                                                    <span className="size-5 rounded-full border border-gray-300 inline-block" />
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}
                
                          {/* --- Food Services (day-wise meals) --- */}
                          {inclusionModal.tab === "foodservices" &&
                            (() => {
                              const cat = catFood;
                              const metaKey = cat ? SERVICE_META_KEY_BY_TITLE[cat.title] : "foodservices";
                              const foodItems = metaKey ? servicesMeta?.[metaKey] || [] : [];
                
                              if (!data.startDate || !data.endDate) {
                                return (
                                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                    Please select Start Date and End Date to build day-wise Food Services.
                                  </div>
                                );
                              }
                
                              return (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-gray-900">
                                      Food Services (optional per meal)
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setData((prev) => ({
                                          ...prev,
                                          inclusions: {
                                            ...prev.inclusions,
                                            foodPlan: (prev.inclusions.foodPlan || []).map((d) => ({
                                              ...d,
                                              meals: { breakfast: [], lunch: [], dinner: [] },
                                            })),
                                          },
                                        }));
                                      }}
                                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                    >
                                      Clear all meals
                                    </button>
                                  </div>
                
                                  <div className="space-y-3">
                                    {(data.inclusions.foodPlan || []).map((d) => (
                                      <div
                                        key={d.dateIso}
                                        className="rounded-2xl border border-gray-200 bg-white p-3"
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <p className="text-sm font-semibold text-gray-900">
                                            Day {d.dayIndex + 1} •{" "}
                                            <span className="text-gray-600">
                                              {formatDateLabel(d.dateIso)}
                                            </span>
                                          </p>
                                        </div>
                
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                          {(["breakfast", "lunch", "dinner"] as MealKey[]).map((meal) => {
                                          const selectedItems = (d.meals?.[meal] || []) as FoodMealItemSelection[];
                                            return (
                                              <div
                                                key={meal}
                                                className="rounded-xl border border-gray-200 bg-gray-50 p-2"
                                              >
                                                <div className="flex items-center justify-between">
                                                  <p className="text-xs font-semibold text-gray-800 capitalize">
                                                    {meal}
                                                  </p>
                                                  <button
                                                    type="button"
                                                    onClick={() => openFoodMealPicker(d.dateIso, meal)}
                                                    className="px-2 py-1 text-[11px] font-semibold rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                                  >
                                                    Pick
                                                  </button>
                                                </div>
                
                                                {selectedItems.length ? (
                                                  <div className="mt-2 flex flex-wrap gap-1">
                {selectedItems.map((sel) => {
                  const it = foodItems.find((x: any) => x._id === sel.serviceItemId);
                  const label = it?.metaTitle || it?.name || "Food item";
                  const priceLabel = it
                    ? (formatPriceLabelFromChecks(it, sel.useMinPrice, sel.useMaxPrice) || "")
                    : "";
                  return (
                    <span
                      key={sel.serviceItemId}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border text-[11px] text-gray-700"
                      title={priceLabel || undefined}
                    >
                      {label}
                      {priceLabel ? <span className="text-[10px] text-emerald-700 font-semibold">({priceLabel})</span> : null}
                    </span>
                  );
                })}
                                                  </div>
                                                ) : (
                                                  <p className="mt-2 text-[11px] text-gray-500">
                                                    No items selected (optional).
                                                  </p>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                        </div>
                
                        {/* Footer */}
                        <div className="sticky bottom-0 bg-white/90 backdrop-blur border-t border-gray-100 px-4 py-3 flex justify-end">
                          <button
                            type="button"
                            onClick={closeInclusionModal}
                            className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {foodMealPicker.open && (
                  <div className="fixed inset-0 z-[10000]" role="dialog" aria-modal="true">
                    <button className="absolute inset-0 bg-black/50" onClick={closeFoodMealPicker} />
                
                    <div className="absolute inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center p-0 md:p-6">
                      <div className="relative w-full md:max-w-4xl bg-white rounded-3xl shadow-2xl max-h-[88vh] flex flex-col">
                        <div className="sticky top-0 bg-white/90 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              Select Food • {foodMealPicker.meal?.toUpperCase()} • {foodMealPicker.dateIso ? formatDateLabel(foodMealPicker.dateIso) : ""}
                            </p>
                            <p className="text-[11px] text-gray-500">Multi-select allowed. This meal is optional.</p>
                          </div>
                
                          <button
                            type="button"
                            onClick={closeFoodMealPicker}
                            className="inline-flex items-center justify-center size-9 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                
                        <div className="flex-1 overflow-y-auto px-4 py-4">
                          {(() => {
                            const cat = catFood;
                            const metaKey = cat ? SERVICE_META_KEY_BY_TITLE[cat.title] : "foodservices";
                            const items = metaKey ? (servicesMeta?.[metaKey] || []) : [];
                
                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {items.map((item: any) => {
                                  if (!item?._id) return null;
                                  const sel = foodMealPicker.selected.find((x) => x.serviceItemId === item._id);
                                  const isSelected = !!sel;
                                  const card = getServiceCardContent(metaKey, item);
                
                                  return (
                                    <button
                                      key={item._id}
                                      type="button"
                                      onClick={() => toggleFoodMealItem(item._id)}
                                      className={[
                                        "w-full text-left rounded-2xl border p-3 transition",
                                        isSelected ? "border-emerald-400 bg-emerald-50 shadow-sm" : "border-gray-200 bg-white hover:bg-gray-50",
                                      ].join(" ")}
                                    >
                                      <div className="flex gap-3">
                                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                                          {card.mediaUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={card.mediaUrl} alt={card.title} className="w-full h-full object-cover" />
                                          ) : (
                                            <div className="w-full h-full grid place-items-center text-[10px] text-gray-400">N/A</div>
                                          )}
                                        </div>
                
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                              <p className="text-sm font-semibold text-gray-900 truncate">{card.title}</p>
                                              {card.subtitle && <p className="text-xs text-gray-500 truncate">{card.subtitle}</p>}
                                              {card.priceLabel && <p className="text-[11px] text-emerald-700 font-semibold mt-1">{card.priceLabel}</p>}
                                              
                                            </div>
                                            
                
                                            <div className="shrink-0">
                                           {isSelected && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <label className="inline-flex items-center gap-2 text-[11px] text-gray-700 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        checked={!!sel?.useMinPrice}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFoodMealPicker((prev) => ({
                            ...prev,
                            selected: prev.selected.map((x) =>
                              x.serviceItemId !== item._id
                                ? x
                                : {
                                    ...x,
                                    useMinPrice: checked,
                                    useMaxPrice: checked ? false : x.useMaxPrice,
                                  }
                            ),
                          }));
                        }}
                      />
                      Min Markup
                    </label>
                
                    <label className="inline-flex items-center gap-2 text-[11px] text-gray-700 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        checked={!!sel?.useMaxPrice}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFoodMealPicker((prev) => ({
                            ...prev,
                            selected: prev.selected.map((x) =>
                              x.serviceItemId !== item._id
                                ? x
                                : {
                                    ...x,
                                    useMaxPrice: checked,
                                    useMinPrice: checked ? false : x.useMinPrice,
                                  }
                            ),
                          }));
                        }}
                      />
                      Max Markup
                    </label>
                  </div>
                )}
                
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                
                        <div className="sticky bottom-0 bg-white/90 backdrop-blur border-t border-gray-100 px-4 py-3 flex items-center justify-between">
                          <p className="text-xs text-gray-600">
                            Selected: <span className="font-semibold text-gray-900">{foodMealPicker.selected.length}</span>
                          </p>
                
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={closeFoodMealPicker}
                              className="px-4 py-2 text-xs font-semibold rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={saveFoodMealPicker}
                              className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

  {/* Sticky footer nav */}
<div className="footerWrap fixed bottom-0 left-0 right-0 z-40">
  <div className="mx-auto w-full max-w-4xl px-3 sm:px-6">
    <div className="footerCard rounded-2xl border border-gray-200 bg-white/95 backdrop-blur shadow-xl shadow-gray-900/10">
      {/* Bottom row: Back / Next */}
      <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={stepIndex === 0 || submitting}
            className={[
              "btnBase btnGhost",
              "min-w-[110px] sm:min-w-[120px]",
              stepIndex === 0 || submitting
                ? "btnDisabled"
                : "hover:bg-gray-50",
            ].join(" ")}
          >
            Back
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canGoNext || submitting}
            className={[
              "btnBase btnPrimary flex-1",
              !canGoNext || submitting
                ? "btnPrimaryDisabled"
                : "hover:bg-emerald-700 active:bg-emerald-800",
            ].join(" ")}
            aria-busy={submitting ? "true" : "false"}
          >
            {stepIndex < LAST_INDEX ? (
              <span className="inline-flex items-center justify-center gap-2">
                Continue
                <ChevronRight className="size-4 opacity-90" />
              </span>
            ) : (
              <span className="inline-flex items-center justify-center gap-2">
                {submitting && (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                )}
                {submitting ? "Updating..." : "Update Tour Package"}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

{/* Local styles (add inside your existing <style jsx>) */}
<style jsx>{`
  .footerWrap {
    padding-bottom: calc(env(safe-area-inset-bottom) + 0.5rem);
    background: linear-gradient(
      to top,
      rgba(249, 250, 251, 0.98),
      rgba(249, 250, 251, 0.75),
      rgba(249, 250, 251, 0)
    );
  }

  .footerCard {
    margin-bottom: 0.35rem;
  }

  /* Buttons */
  .btnBase {
    height: 44px;
    border-radius: 14px;
    padding: 0 14px;
    font-weight: 700;
    font-size: 14px;
    transition: transform 120ms ease, background 120ms ease, opacity 120ms ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .btnGhost {
    border: 1px solid rgb(209, 213, 219);
    color: rgb(55, 65, 81);
    background: white;
  }

  .btnPrimary {
    background: rgb(5, 150, 105);
    color: white;
    border: 1px solid rgba(5, 150, 105, 0.25);
  }

  .btnDisabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .btnPrimaryDisabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Desktop enhancements via media query */
  @media (min-width: 768px) {
    .footerWrap {
      padding-bottom: 1rem;
    }

    .footerCard {
      border-radius: 18px;
    }

    .btnBase {
      height: 46px;
      border-radius: 16px;
      font-size: 15px;
    }
  }
`}</style>

    </form>
  );
}

/* ---------- Reusable components ---------- */

function SectionCard({
  title,
  subtitle,
  requiredHint,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  requiredHint?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 first:mt-0">
      <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-visible">
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-8 grid place-items-center bg-emerald-50 rounded-lg">{icon}</div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{title}</h2>
              {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {requiredHint && <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">* Required</span>}
        </div>
        <div className="p-2 sm:p-5">{children}</div>
      </div>
    </section>
  );
}

function Field({
  label,
  required,
  hint,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-600">*</span>}
        </span>
        {hint && <span className="text-[11px] text-gray-500 text-right">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

/* ---------- TagsInput ---------- */

function TagsInput({
  items,
  onChange,
  placeholder,
  disabled,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");

  const addTag = () => {
    const v = value.trim();
    if (!v) return;
    if (items.includes(v)) {
      setValue("");
      return;
    }
    onChange([...items, v]);
    setValue("");
  };

  const removeTag = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!disabled) addTag();
    }
  };

  return (
    <div className="rounded-xl border border-gray-300 bg-white px-3 py-2 shadow-sm">
      <div className="flex items-center gap-2">
        <input
          type="text"
          className="flex-1 border-none outline-none focus:ring-0 text-sm placeholder:text-gray-400"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={addTag}
          disabled={disabled || !value.trim()}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${disabled || !value.trim() ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
        >
          Add
        </button>
      </div>

      {items.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {items.map((tag, idx) => (
            <span key={`${tag}-${idx}`} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-800">
              {tag}
              <button type="button" onClick={() => removeTag(idx)} disabled={disabled} className="flex items-center justify-center">
                <X className="size-3 text-gray-500 hover:text-gray-700" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
