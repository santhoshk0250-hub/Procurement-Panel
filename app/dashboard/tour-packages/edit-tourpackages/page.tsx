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

interface TourPackageUI {
  _id?: string; // for edit
  name: string;
  category: string;
  descriptionHtml: string;

  thumbnail: ThumbnailUI;

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


        slot.activities.push({
          serviceId: "", // categoryId will be resolved when user opens picker (optional)
          serviceItemId: a?.serviceItemId || "",
          itemModel: a?.type || "",
          isRemovable,
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

  return {
    _id: (pkg as any)?._id || (pkg as any)?.id || "",
    name: pkg?.name || "",
    category: pkg?.category || "Luxury",
    descriptionHtml: pkg?.description || "",
    thumbnail: {
      file: null,
      preview: undefined,
      existingUrl: (pkg as any)?.thumbnail_image || "",
    },
    minPax: String(pkg?.min_pax ?? ""),
    maxPax: String(pkg?.max_pax ?? ""),
    totalDays: String(pkg?.total_days ?? itineraryDays.length ?? ""),
    totalNights: String(pkg?.total_nights ?? ""),
    startDate: (pkg as any)?.start_date || "",
    endDate: (pkg as any)?.end_date || "",
markup_min_price: pkg?.markup_min_price || null,  
    markup_max_price: pkg?.markup_max_price || null,
    services: [], // will be computed from itinerary at submit (like add page)
    itinerary: itineraryDays,
    exclusions: Array.isArray(pkg?.exclusions) ? pkg.exclusions : [],
    surcharges,
    hasTourGuide: !!pkg?.inclusions?.tourGuide?.data,
    hasTransport: !!pkg?.inclusions?.transport?.data,
  };
}

/* =========================
   Component
   ========================= */

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
      .filter((a) => a.serviceId && a.serviceItemId)
      .map((a) => {
        const cat = serviceCategories.find((c) => c._id === a.serviceId);
        return {
          categoryId: a.serviceId,
          categoryTitle: cat?.title || "",
          itemId: a.serviceItemId,
        };
      });

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
              const itemModel = cat ? ITEM_MODEL_BY_TITLE[cat.title] ?? getItemModelForTitle(cat.title) : "";
              return { ...BLANK_IT_ACTIVITY, serviceId: sel.categoryId, serviceItemId: sel.itemId, itemModel };
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

        start_date: data.startDate || undefined,
        end_date: data.endDate || undefined,

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
                activities: (s.activities || [])
                  .filter((a) => a.itemModel || a.serviceItemId)
                  .map((a) => ({
                    serviceId: a.serviceId || undefined,
                    serviceItemId: a.serviceItemId || undefined,
                    itemModel: a.itemModel || undefined,
                    isRemovable: a.isRemovable,
                  })),
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
      router.push("/dashboard/tour-packages");
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

            <button
              type="button"
              onClick={() => {
                if (!tourPackage) return;

                const ui = mapStoreToUI(tourPackage);

                // reset all form data
                setData(ui);

                // reset TinyMCE value (HTML)
                setDescriptionHtml(ui.descriptionHtml || "");
              }}
              disabled={submitting || !tourPackage}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${submitting || !tourPackage
                  ? "border-gray-200 text-gray-400"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
            >
              Reset
            </button>

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
                      setTour({
                        startDate: start,
                        endDate: data.endDate && data.endDate < start ? "" : data.endDate,
                      });
                    }}
                    disabled={submitting}
                  />
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
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleDayOpen(idx)}
                              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${isOpen ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100"
                                }`}
                              aria-expanded={isOpen}
                            >
                              <ChevronDown className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                              <span>Itinerary Day {idx + 1}</span>
                            </button>
                          </div>

                          <div className="flex-1">
                            <input
                              type="text"
                              className="input"
                              value={d.title}
                              onChange={(e) => updateItineraryDay(idx, { title: e.target.value })}
                              placeholder="Arrival in Goa"
                              disabled={submitting}
                            />
                          </div>

                          <div className="flex gap-2 sm:justify-end">
                            <button
                              type="button"
                              onClick={() => removeItineraryDay(idx)}
                              disabled={submitting}
                              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                            >
                              <X className="size-3.5" />
                              Remove
                            </button>
                          </div>
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

                                      const card = selectedItem ? getServiceCardContent(metaKey, selectedItem) : null;

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

                                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                {card?.priceLabel && (
                                                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                                    {card.priceLabel}
                                                  </span>
                                                )}

                                                <label className="inline-flex items-center gap-2 text-[11px] text-gray-700 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                                                  <input
                                                    type="checkbox"
                                                    className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                                    checked={!!a.isRemovable}
                                                    onChange={(e) => updateItineraryActivity(idx, slotIdx, aIdx, { isRemovable: e.target.checked })}
                                                    disabled={submitting}
                                                  />
                                                  Customer can remove
                                                </label>
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
            if (title === "tour packages") return false; // always hide
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

      {/* Sticky footer nav */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-full max-w-4xl bg-gray-50/95 backdrop-blur safe-bottom pt-2">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 pb-2">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-900/5">
            <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="inline-flex items-center gap-2 text-xs text-gray-600 bg-gray-100 rounded-full px-3 py-1.5 font-semibold self-start sm:self-auto">
                <span className={`size-2 rounded-full ${isStepValid(step.key) ? "bg-green-500" : "bg-amber-500"}`} />
                {isStepValid(step.key) ? "Looks good" : "Complete required fields"}
              </span>

              <div className="flex w-full sm:w-auto gap-2 sm:ml-auto">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={stepIndex === 0 || submitting}
                  className={`flex-1 sm:flex-none px-4 py-3 text-sm font-medium rounded-xl border ${stepIndex === 0 || submitting ? "border-gray-200 text-gray-400" : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canGoNext || submitting}
                  className={`flex-1 sm:flex-none px-5 py-3 text-sm font-semibold rounded-xl text-white ${!canGoNext || submitting ? "bg-emerald-300 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
                    }`}
                  aria-busy={submitting ? "true" : "false"}
                >
                  {stepIndex < LAST_INDEX ? (
                    "Continue"
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                      {submitting ? "Updating..." : "Update Tour Package"}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Local styles */}
      <style jsx>{`
        .input {
          @apply w-full h-10 px-3 py-2 rounded-xl border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-[14px] leading-none placeholder:text-gray-400 transition-all;
          -webkit-tap-highlight-color: transparent;
        }
        .textarea {
          @apply w-full min-h-[100px] px-3 py-2 rounded-xl border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-[14px] placeholder:text-gray-400 transition-all resize-y;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .safe-bottom {
          padding-bottom: calc(env(safe-area-inset-bottom) + 0.5rem);
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
