"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TinyMCETextEditor from "@/components/TinyMCETextEditor";
import { Plus, X, CheckCircle2 } from "lucide-react";
import { useCouponStore } from "@/store/couponsStore";

/* =========================
   Store Coupon type (from your Zustand store)
   ========================= */
type MongoDate = string | { $date: string };
type IDType = string | { $oid: string };

type CouponType =
  | "FIXED_VALUE"
  | "PERCENTAGE"
  | "FREEBIE"
  | "BOGO"
  | "SERVICE_MONETARY";

type DiscountType = "fixed" | "percentage";
type Currency = "INR" | "USD" | "AED";

type StoreCoupon = {
  _id?: IDType;
  seq: number;
  coupon_type: CouponType;
  coupon_code: string;
  title: string;
  description: string;
  thumbnail?: string;

  discount: {
    type: DiscountType;
    value: number;
    currency: string;
    calculation_basis?: string;
    show_as_value_only?: boolean;
  };

  eligibility: {
    user_type: string;
    first_booking: boolean;
    min_cart_value: number;
    max_uses_per_user: number;
  };

  service_scope?: { level: "SERVICE" | "CART" | "HOTEL"; service_type?: string };
  pax_rules?: { min_pax?: number; max_pax?: number; allowed_pax_slabs?: string[] };
  day_rules?: { max_nights_allowed?: number | null; allowed_nights?: number[]; night_groups?: string[] };
  stacking_rules?: {
    can_stack_with_same_service: boolean;
    can_stack_with_other_services: boolean;
    can_stack_with_fixed_coupon: boolean;
    sum_multiple_services: boolean;
  };

  date_rules: {
    valid_from: MongoDate;
    valid_to: MongoDate;
    allowed_days: string[];
    blockout_allowed: boolean;
    weekday?: { enabled: boolean; min_markup: number; max_markup: number };
    weekend?: { enabled: boolean; min_markup: number; max_markup: number };
    blockout?: { enabled: boolean };
  };

  usage_limits: { total_uses: number; max_total_uses: number | null };
  terms_conditions: string[];

  allowed_services: {
    allowed_all: boolean;
    hotels: {
      allowed_all: boolean;
      hotel_categories: string[];
      allowed_hotel_ids: IDType[];
    };
  services: {
  activities: { allowed_all: boolean; ids: IDType[] };
  sightseeing: { allowed_all: boolean; ids: IDType[] };
  leisure_activities: { allowed_all: boolean; ids: IDType[] };
  nightlife: { allowed_all: boolean; ids: IDType[] };
  rentals: { allowed_all: boolean; ids: IDType[] };
  pickup_drop: { allowed_all: boolean; ids: IDType[] };
  food_services?: { allowed_all: boolean; ids: IDType[] };
  tour_manager?: { allowed_all: boolean; ids: IDType[] };
};

  };

  status: { is_active: boolean; is_deleted: boolean };
  createdAt?: MongoDate;
  updatedAt?: MongoDate;
  __v?: number;
};

/* =========================
   Services types + mapping
   (KEEPED for Services tab + modal)
   ========================= */

interface ServiceCategory {
  _id: string;
  title: string;
}

interface ServiceMetaItem {
  _id: string;
  title?: string;
  metaTitle?: string;
  name?: string;

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

  // Pickup & Drop
  vehicleOption?: any;
  vehicleOptions?: any[];

  // Tour manager
  tourManagerProfiles?: { profilePic?: string }[];
  general_info?: any;

  // Hotels
  media_gallery?: { room?: string[] };

  price_breakdown?: { totalPrice?: number };

  rating?: number;
  ratingCount?: number;
  reviewCount?: number;

  [key: string]: any;
}

type ServicesMetaMap = Record<string, ServiceMetaItem[]>;

type SelectedService = {
  categoryId: string;
  categoryTitle: string;
  itemId: string; // stored for backend, NOT shown in UI
  itemModel: string;
};

const normalizeTitle = (t: string) => (t || "").trim().toLowerCase();

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

/* 🔹 Map service "title" -> itemModel */
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

const getHotelStarCategory = (item: ServiceMetaItem) => {
  return (
    item.star_category ||
    item.starCategory ||
    item.hotel_star_category ||
    item.hotelCategory ||
    ""
  )
    .toString()
    .trim();
};

/* =========================
   Card content mapping
   (Fix images for Hotels / Pickup&Drop / Tour manager)
   ========================= */

const getServiceCardContent = (categoryKey: string, item: ServiceMetaItem) => {
  const key = (categoryKey || "").toLowerCase();

  const fallbackImage =
    item.thumbnail || item.thumbnailUrl || item.banner || item.images?.[0] || "";

  const ratingLabel =
    item.rating ?? item.ratingCount ?? item.reviewCount
      ? `${item.rating?.toFixed?.(1) ?? ""}★ (${
          item.reviewCount ?? item.ratingCount ?? 0
        } reviews)`
      : "";

  // ✅ Hotels: prefer media_gallery.room[0]
  if (key === "hotels" || key === "hotel") {
    const galleryImg = item?.media_gallery?.room?.[0] || "";
    const mediaUrl = galleryImg || fallbackImage;

    const price =
      item.priceBreakdown?.totalPrice ??
      item.priceBreakdown?.basePrice ??
      item.price;

    return {
      mediaUrl,
      title: item.metaTitle || item.title || item.name || "Hotel",
      subtitle: [item.destination, item.location?.city, item.city]
        .filter(Boolean)
        .join(" • "),
      chip: item.location?.city || item.city || "",
      priceLabel: price ? `From ₹${price}` : "",
      ratingLabel,
    };
  }

  // ✅ Pickup & Drop: prefer vehicleOption.images[0]
  if (key === "pickupanddrop") {
    const v = item.vehicleOption || item.vehicleOptions?.[0];
    const mediaUrl = v?.images?.[0] || fallbackImage;

    const price =
      v?.sellerBasePrice ??
      v?.basePrice ??
      item.priceBreakdown?.totalPrice;

    return {
      mediaUrl,
      title: v?.vehiclename || item.metaTitle || item.title || "Pickup & Drop",
      subtitle: [v?.vehicleType, v?.maxPax ? `Max ${v.maxPax} pax` : ""]
        .filter(Boolean)
        .join(" • "),
      chip: v?.availabilityStatus || "",
      priceLabel: price ? `From ₹${price}` : "",
      ratingLabel: v?.ratings
        ? `${v.ratings.average?.toFixed?.(1) ?? ""}★ (${
            v.ratings.totalReviews ?? 0
          } reviews)`
        : "",
    };
  }

  // ✅ Tour manager: prefer profilePic
  if (key === "tourmanager") {
    const mediaUrl = item.tourManagerProfiles?.[0]?.profilePic || fallbackImage;
    const price =
      item.price_breakdown?.totalPrice ?? item.priceBreakdown?.totalPrice;

    return {
      mediaUrl,
      title: item.metaTitle || item.title || "Tour Manager",
      subtitle: item.general_info ? "Full tour management" : "",
      chip: "",
      priceLabel: price ? `From ₹${price}` : "",
      ratingLabel: "",
    };
  }

  // ✅ default
  const price =
    item.priceBreakdown?.totalPrice ??
    item.priceBreakdown?.basePrice ??
    item.price;

  return {
    mediaUrl: fallbackImage,
    title: item.metaTitle || item.title || item.name || "Service item",
    subtitle: item.destination || item.location?.city || item.city || "",
    chip: "",
    priceLabel: price ? `From ₹${price}` : "",
    ratingLabel,
  };
};

/* =========================
   Edit Form types (UI state)
   ========================= */

type AllowedDays =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

type ServiceScopeLevel = "SERVICE" | "CART";
type ServiceType =
  | "ROOM"
  | "ACTIVITY"
  | "SIGHTSEEING"
  | "LEISURE_ACTIVITY"
  | "NIGHTLIFE"
  | "RENTAL"
  | "PICKUP_DROP";

type CalculationBasis = "MARKUP_DIFFERENCE";
type UserTypeOption = "NEW_USER" | "ALL";

/** ✅ allow_all keys for UI */
type AllowAllKey =
  | "hotels"
  | "activities"
  | "sightseeing"
  | "leisure_activities"
  | "nightlife"
  | "rentals"
  | "pickup_drop"
  | "food_services"
  | "tour_manager";

type AllowAllByService = Partial<Record<AllowAllKey, boolean>>;

interface CouponFormData {
  coupon_type: CouponType;
  coupon_code: string;
  title: string;
  description: string;

  thumbnail?: string;

  discount: {
    type: DiscountType;
    value: number | null;
    currency: Currency;
    calculation_basis?: CalculationBasis;
    show_as_value_only?: boolean;
  };

  service_scope?: {
    level: ServiceScopeLevel;
    service_type: ServiceType;
  };

  eligibility: {
    user_type: UserTypeOption; // single select (dropdown)
    first_booking: boolean;
    min_cart_value: number | null;
    max_uses_per_user: number | null;
  };

  pax_rules?: {
    min_pax: number | null;
    max_pax: number | null;
    allowed_pax_slabs: string[];
  };

  day_rules?: {
    max_nights_allowed: number | null;
    allowed_nights: number[];
    night_groups: string[];
  };

  date_rules: {
    valid_from: string; // datetime-local string
    valid_to: string; // datetime-local string
    allowed_days: AllowedDays[];
    blockout_allowed: boolean;

    weekday?: {
      enabled: boolean;
      min_markup: number | null;
      max_markup: number | null;
    };
    weekend?: {
      enabled: boolean;
      min_markup: number | null;
      max_markup: number | null;
    };
    blockout?: { enabled: boolean };
  };

  stacking_rules?: {
    can_stack_with_same_service: boolean;
    can_stack_with_other_services: boolean;
    can_stack_with_fixed_coupon: boolean;
    sum_multiple_services: boolean;
  };

  usage_limits: {
    total_uses: number | null;
    max_total_uses: number | null;
  };

  terms_conditions: string[];

  status: {
    is_active: boolean;
    is_deleted: boolean;
  };

  // Services tab state
  services: SelectedService[];
  hotel_categories: string[];

  allow_all_by_service: AllowAllByService;
}

interface ImageFile {
  file: File;
  preview: string;
}

/* =========================
   Defaults
   ========================= */

const DEFAULT_FORM: CouponFormData = {
  coupon_type: "FIXED_VALUE",
  coupon_code: "",
  title: "",
  description: "",
  thumbnail: "",

  hotel_categories: [],

  discount: {
    type: "fixed",
    value: null,
    currency: "INR",
    calculation_basis: undefined,
    show_as_value_only: false,
  },

  service_scope: {
    level: "SERVICE",
    service_type: "ROOM",
  },

  eligibility: {
    user_type: "ALL",
    first_booking: false,
    min_cart_value: null,
    max_uses_per_user: null,
  },

  pax_rules: {
    min_pax: null,
    max_pax: null,
    allowed_pax_slabs: [],
  },

  day_rules: {
    max_nights_allowed: null,
    allowed_nights: [],
    night_groups: [],
  },

  date_rules: {
    valid_from: "",
    valid_to: "",
    allowed_days: [],
    blockout_allowed: false,
    weekday: { enabled: true, min_markup: null, max_markup: null },
    weekend: { enabled: true, min_markup: null, max_markup: null },
    blockout: { enabled: false },
  },

  stacking_rules: {
    can_stack_with_same_service: true,
    can_stack_with_other_services: true,
    can_stack_with_fixed_coupon: false,
    sum_multiple_services: true,
  },

  usage_limits: {
    total_uses: 0,
    max_total_uses: null,
  },

  terms_conditions: [],

  status: {
    is_active: true,
    is_deleted: false,
  },

  services: [],

allow_all_by_service: {
  hotels: false,
  activities: false,
  sightseeing: false,
  leisure_activities: false,
  nightlife: false,
  rentals: false,
  pickup_drop: false,
  food_services: false,
  tour_manager: false,
},

};

/* =========================
   Helpers (dates + ids)
   ========================= */

function mongoDateToJSDate(v: MongoDate | undefined): Date | null {
  if (!v) return null;
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "object" && "$date" in v && v.$date) {
    const d = new Date(v.$date);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function toDateTimeLocalValue(d: Date | null) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function idToString(id: IDType | undefined): string {
  if (!id) return "";
  if (typeof id === "string") return id;
  if (typeof id === "object" && "$oid" in id && id.$oid) return id.$oid;
  return "";
}

function expandAllowedDaysForUI(input: string[] = []): AllowedDays[] {
  const set = new Set(input.map((d) => String(d).toLowerCase().trim()).filter(Boolean));

  // If DB has "weekend", UI should tick saturday + sunday
  if (set.has("weekend")) {
    set.delete("weekend");
    set.add("saturday");
    set.add("sunday");
  }

  // (optional) If someday DB stores "weekday", expand it too
  if (set.has("weekday")) {
    set.delete("weekday");
    set.add("monday");
    set.add("tuesday");
    set.add("wednesday");
    set.add("thursday");
    set.add("friday");
  }

  // keep only valid UI days
  const valid: AllowedDays[] = [
    "monday","tuesday","wednesday","thursday","friday","saturday","sunday",
  ];

  return valid.filter((d) => set.has(d));
}


/* =========================
   Main Edit Page Component
   ========================= */

export default function CouponEditPage() {
  const router = useRouter();

  const { coupon } = useCouponStore() as { coupon: StoreCoupon | null };

  // ------- STATE -------
  const [formData, setFormData] = useState<CouponFormData>({ ...DEFAULT_FORM });

  // Existing thumbnail (from DB) shown separately
  const [existingThumbnail, setExistingThumbnail] = useState<string>("");

  // New images selected by user (optional for EDIT)
  const [images, setImages] = useState<ImageFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
const hasExistingThumb = !!existingThumbnail;
const hasNewThumb = images.length > 0;

  // Services data (KEEP)
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [servicesMeta, setServicesMeta] = useState<ServicesMetaMap>({});
  const [loadingServices, setLoadingServices] = useState(false);

  // Tabs
  const tabs = ["Basics", "Eligibility", "Services", "Images"] as const;
  type Tab = (typeof tabs)[number];
  const [activeTab, setActiveTab] = useState<Tab>("Basics");

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isServiceMonetary = formData.coupon_type === "SERVICE_MONETARY";

  const WEEKDAYS: AllowedDays[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const WEEKEND: AllowedDays[] = ["saturday", "sunday"];

  const hasAll = (arr: AllowedDays[], target: AllowedDays[]) =>
    target.every((d) => arr.includes(d));
  const removeMany = (arr: AllowedDays[], target: AllowedDays[]) =>
    arr.filter((d) => !target.includes(d));
  const addMany = (arr: AllowedDays[], target: AllowedDays[]) =>
    Array.from(new Set([...arr, ...target]));

  const setAllowedDays = (nextDays: AllowedDays[]) =>
    setFormData((p) => ({ ...p, date_rules: { ...p.date_rules, allowed_days: nextDays } }));

  const isWeekdayGroupChecked = useMemo(
    () => hasAll(formData.date_rules.allowed_days as AllowedDays[], WEEKDAYS),
    [formData.date_rules.allowed_days]
  );
  const isWeekendGroupChecked = useMemo(
    () => hasAll(formData.date_rules.allowed_days as AllowedDays[], WEEKEND),
    [formData.date_rules.allowed_days]
  );

  /* =========================
     1) Prefill from Store coupon
     ========================= */
  useEffect(() => {
    if (!coupon?._id) return;

    const validFrom = toDateTimeLocalValue(mongoDateToJSDate(coupon.date_rules?.valid_from));
    const validTo = toDateTimeLocalValue(mongoDateToJSDate(coupon.date_rules?.valid_to));

const svc = coupon.allowed_services?.services;

const allowAll: AllowAllByService = {
  hotels: !!coupon.allowed_services?.hotels?.allowed_all,
  activities: !!svc?.activities?.allowed_all,
  sightseeing: !!svc?.sightseeing?.allowed_all,
  leisure_activities: !!svc?.leisure_activities?.allowed_all,
  nightlife: !!svc?.nightlife?.allowed_all,
  rentals: !!svc?.rentals?.allowed_all,
  pickup_drop: !!svc?.pickup_drop?.allowed_all,

  // ✅ ADD (support both possible keys)
  food_services: !!svc?.food_services?.allowed_all,
  tour_manager: !!svc?.tour_manager?.allowed_all,
};


    // Convert allowed_services ids -> SelectedService list
    const selected: SelectedService[] = [];

    const pushMany = (categoryTitle: string, ids: IDType[] | undefined) => {
      const arr = (ids || []).map(idToString).filter(Boolean);
      for (const itemId of arr) {
        selected.push({
          categoryId: "", // will be set later once categories are fetched (not required for submit)
          categoryTitle,
          itemId,
          itemModel: ITEM_MODEL_BY_TITLE[categoryTitle] ?? "",
        });
      }
    };

    // Hotels
    pushMany("Hotels", coupon.allowed_services?.hotels?.allowed_hotel_ids);

    // Services
    pushMany("Activities", coupon.allowed_services?.services?.activities?.ids);
    pushMany("Sightseeing", coupon.allowed_services?.services?.sightseeing?.ids);
    pushMany("Leisure Activities", coupon.allowed_services?.services?.leisure_activities?.ids);
    pushMany("Nightlife", coupon.allowed_services?.services?.nightlife?.ids);
    pushMany("Rentals", coupon.allowed_services?.services?.rentals?.ids);
    pushMany("Pick & Drop", coupon.allowed_services?.services?.pickup_drop?.ids);
    pushMany("Food Service",coupon.allowed_services?.services?.food_services?.ids);
    pushMany("Tour Manager",coupon.allowed_services?.services?.tour_manager?.ids);


    setExistingThumbnail(coupon.thumbnail || "");
const rawUserType = coupon.eligibility?.user_type;

// supports BOTH: "ALL" or ["ALL"]
const normalizedUserType =(Array.isArray(rawUserType) ? rawUserType[0] : rawUserType) || "ALL";
    setFormData({
      ...DEFAULT_FORM,
      coupon_type: coupon.coupon_type,
      coupon_code: coupon.coupon_code || "",
      title: coupon.title || "",
      description: coupon.description || "",
      thumbnail: coupon.thumbnail || "",

      discount: {
        type: coupon.discount?.type || "fixed",
        value: typeof coupon.discount?.value === "number" ? coupon.discount.value : null,
        currency: (coupon.discount?.currency as Currency) || "INR",
        calculation_basis: (coupon.discount?.calculation_basis as CalculationBasis) || undefined,
        show_as_value_only: !!coupon.discount?.show_as_value_only,
      },

      service_scope: coupon.service_scope
        ? {
            level:
              (coupon.service_scope.level as "SERVICE" | "CART") === "CART"
                ? "CART"
                : "SERVICE",
            service_type: (coupon.service_scope.service_type as ServiceType) || "ROOM",
          }
        : DEFAULT_FORM.service_scope,

      eligibility: {
       user_type: (normalizedUserType.toUpperCase() as UserTypeOption) || "ALL",
        first_booking: !!coupon.eligibility?.first_booking,
        min_cart_value:
          typeof coupon.eligibility?.min_cart_value === "number"
            ? coupon.eligibility.min_cart_value
            : null,
        max_uses_per_user:
          typeof coupon.eligibility?.max_uses_per_user === "number"
            ? coupon.eligibility.max_uses_per_user
            : null,
      },

      pax_rules: coupon.pax_rules
        ? {
            min_pax: coupon.pax_rules.min_pax ?? null,
            max_pax: coupon.pax_rules.max_pax ?? null,
            allowed_pax_slabs: coupon.pax_rules.allowed_pax_slabs ?? [],
          }
        : DEFAULT_FORM.pax_rules,

      day_rules: coupon.day_rules
        ? {
            max_nights_allowed:
              coupon.day_rules.max_nights_allowed ?? null,
            allowed_nights: coupon.day_rules.allowed_nights ?? [],
            night_groups: coupon.day_rules.night_groups ?? [],
          }
        : DEFAULT_FORM.day_rules,

      stacking_rules: coupon.stacking_rules
        ? { ...coupon.stacking_rules }
        : DEFAULT_FORM.stacking_rules,

      date_rules: {
        valid_from: validFrom,
        valid_to: validTo,
        allowed_days: expandAllowedDaysForUI(coupon.date_rules?.allowed_days || []),
        blockout_allowed: !!coupon.date_rules?.blockout_allowed,

        weekday: coupon.date_rules?.weekday
          ? {
              enabled: !!coupon.date_rules.weekday.enabled,
              min_markup:
                typeof coupon.date_rules.weekday.min_markup === "number"
                  ? coupon.date_rules.weekday.min_markup
                  : null,
              max_markup:
                typeof coupon.date_rules.weekday.max_markup === "number"
                  ? coupon.date_rules.weekday.max_markup
                  : null,
            }
          : DEFAULT_FORM.date_rules.weekday,

        weekend: coupon.date_rules?.weekend
          ? {
              enabled: !!coupon.date_rules.weekend.enabled,
              min_markup:
                typeof coupon.date_rules.weekend.min_markup === "number"
                  ? coupon.date_rules.weekend.min_markup
                  : null,
              max_markup:
                typeof coupon.date_rules.weekend.max_markup === "number"
                  ? coupon.date_rules.weekend.max_markup
                  : null,
            }
          : DEFAULT_FORM.date_rules.weekend,

        blockout: coupon.date_rules?.blockout
          ? { enabled: !!coupon.date_rules.blockout.enabled }
          : DEFAULT_FORM.date_rules.blockout,
      },

      usage_limits: {
        total_uses:
          typeof coupon.usage_limits?.total_uses === "number"
            ? coupon.usage_limits.total_uses
            : null,
        max_total_uses:
          typeof coupon.usage_limits?.max_total_uses === "number"
            ? coupon.usage_limits.max_total_uses
            : coupon.usage_limits?.max_total_uses === null
            ? null
            : null,
      },

      terms_conditions: coupon.terms_conditions || [],

      status: {
        is_active: !!coupon.status?.is_active,
        is_deleted: !!coupon.status?.is_deleted,
      },

      hotel_categories: coupon.allowed_services?.hotels?.hotel_categories || [],
      services: selected,

      allow_all_by_service: allowAll,
    });
  }, [coupon]);

  /* =========================
     2) Fetch service categories & meta
     (HIDE "Tour Packages" category)
     ========================= */
  useEffect(() => {
    const run = async () => {
      try {
        setLoadingServices(true);

        const [catRes, metaRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_BASE}tour-packages/services`),
          fetch(`${process.env.NEXT_PUBLIC_API_BASE}tour-packages/services/meta`),
        ]);

        if (!catRes.ok) throw new Error("Failed to fetch service categories");
        if (!metaRes.ok) throw new Error("Failed to fetch services meta");

        const catJson = await catRes.json();
        const metaJson = await metaRes.json();

        const cats = Array.isArray(catJson.data) ? catJson.data : [];
        const filteredCats = cats.filter(
          (c: ServiceCategory) => normalizeTitle(c?.title) !== "tour packages"
        );

        // ✅ Put Hotels first in modal tabs
        const sortedCats = [...filteredCats].sort((a, b) => {
          const aIsHotel = normalizeTitle(a?.title) === "hotels";
          const bIsHotel = normalizeTitle(b?.title) === "hotels";
          if (aIsHotel && !bIsHotel) return -1;
          if (!aIsHotel && bIsHotel) return 1;
          return 0;
        });

        setServiceCategories(sortedCats);
        setServicesMeta(metaJson.data || {});
      } catch (e) {
        console.error("Error loading services:", e);
      } finally {
        setLoadingServices(false);
      }
    };

    run();
  }, []);

  /* =========================
     3) After categories load: fill missing categoryId for preselected items
     (important for remove logic + modal)
     ========================= */
  useEffect(() => {
    if (!serviceCategories.length) return;

    setFormData((p) => {
      const next = (p.services || []).map((s) => {
        if (s.categoryId) return s;
        const match = serviceCategories.find(
          (c) => normalizeTitle(c.title) === normalizeTitle(s.categoryTitle)
        );
        return { ...s, categoryId: match?._id || "" };
      });
      return { ...p, services: next };
    });
  }, [serviceCategories.length]);

  // ------- DERIVED -------
  const requiredOk = useMemo(() => {
    // ✅ For EDIT: images not required
    const titleOk = formData.title.trim().length > 0;
    const codeOk = formData.coupon_code.trim().length > 0;
    return titleOk && codeOk;
  }, [formData.title, formData.coupon_code]);

  /* =========================
     Handlers
     ========================= */

  const setTop = (next: Partial<CouponFormData>) =>
    setFormData((p) => ({ ...p, ...next }));

  const setDiscount = (next: Partial<CouponFormData["discount"]>) =>
    setFormData((p) => ({ ...p, discount: { ...p.discount, ...next } }));

  const setEligibility = (next: Partial<CouponFormData["eligibility"]>) =>
    setFormData((p) => ({ ...p, eligibility: { ...p.eligibility, ...next } }));

  const setDateRules = (next: Partial<CouponFormData["date_rules"]>) =>
    setFormData((p) => ({ ...p, date_rules: { ...p.date_rules, ...next } }));

  const setUsageLimits = (next: Partial<CouponFormData["usage_limits"]>) =>
    setFormData((p) => ({ ...p, usage_limits: { ...p.usage_limits, ...next } }));

  const setStatus = (next: Partial<CouponFormData["status"]>) =>
    setFormData((p) => ({ ...p, status: { ...p.status, ...next } }));

  const setServiceScope = (
    next: Partial<NonNullable<CouponFormData["service_scope"]>>
  ) =>
    setFormData((p) => ({
      ...p,
      service_scope: { ...(p.service_scope || DEFAULT_FORM.service_scope!), ...next },
    }));

  const setPaxRules = (
    next: Partial<NonNullable<CouponFormData["pax_rules"]>>
  ) =>
    setFormData((p) => ({
      ...p,
      pax_rules: { ...(p.pax_rules || DEFAULT_FORM.pax_rules!), ...next },
    }));

  const setDayRules = (
    next: Partial<NonNullable<CouponFormData["day_rules"]>>
  ) =>
    setFormData((p) => ({
      ...p,
      day_rules: { ...(p.day_rules || DEFAULT_FORM.day_rules!), ...next },
    }));

  const setStackingRules = (
    next: Partial<NonNullable<CouponFormData["stacking_rules"]>>
  ) =>
    setFormData((p) => ({
      ...p,
      stacking_rules: {
        ...(p.stacking_rules || DEFAULT_FORM.stacking_rules!),
        ...next,
      },
    }));

  const setWeekdayMarkup = (
    next: Partial<NonNullable<CouponFormData["date_rules"]["weekday"]>>
  ) =>
    setFormData((p) => ({
      ...p,
      date_rules: {
        ...p.date_rules,
        weekday: { ...(p.date_rules.weekday || DEFAULT_FORM.date_rules.weekday!), ...next },
      },
    }));

  const setWeekendMarkup = (
    next: Partial<NonNullable<CouponFormData["date_rules"]["weekend"]>>
  ) =>
    setFormData((p) => ({
      ...p,
      date_rules: {
        ...p.date_rules,
        weekend: { ...(p.date_rules.weekend || DEFAULT_FORM.date_rules.weekend!), ...next },
      },
    }));

  const setBlockoutObj = (
    next: Partial<NonNullable<CouponFormData["date_rules"]["blockout"]>>
  ) =>
    setFormData((p) => ({
      ...p,
      date_rules: {
        ...p.date_rules,
        blockout: { ...(p.date_rules.blockout || DEFAULT_FORM.date_rules.blockout!), ...next },
      },
    }));

  /* =========================
     Coupon type switch behavior
     ========================= */
  const onCouponTypeChange = (ct: CouponType) => {
    setFormData((p) => {
      const next: CouponFormData = { ...p, coupon_type: ct };

      if (ct === "PERCENTAGE") {
        next.discount = { ...next.discount, type: "percentage" };
      } else if (ct === "FIXED_VALUE") {
        next.discount = { ...next.discount, type: "fixed" };
      } else if (ct === "SERVICE_MONETARY") {
        next.discount = {
          ...next.discount,
          type: "fixed",
          calculation_basis: "MARKUP_DIFFERENCE",
          show_as_value_only: true,
        };

        next.service_scope = next.service_scope || {
          level: "SERVICE",
          service_type: "ROOM",
        };
        next.pax_rules =
          next.pax_rules || { min_pax: 1, max_pax: 1, allowed_pax_slabs: ["1"] };
        next.day_rules =
          next.day_rules || { max_nights_allowed: null, allowed_nights: [], night_groups: [] };
        next.stacking_rules =
          next.stacking_rules || ({ ...DEFAULT_FORM.stacking_rules } as NonNullable<CouponFormData["stacking_rules"]>);
        next.date_rules = {
          ...next.date_rules,
          weekday: next.date_rules.weekday || { enabled: true, min_markup: null, max_markup: null },
          weekend: next.date_rules.weekend || { enabled: true, min_markup: null, max_markup: null },
          blockout: next.date_rules.blockout || { enabled: false },
        };
      }

      return next;
    });
  };

  /* =========================
     Image handlers (EDIT: optional)
     ========================= */
 const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // ✅ allow only one image: revoke old preview if any, then replace
  setImages((prev) => {
    prev.forEach((img) => URL.revokeObjectURL(img.preview));
    return [{ file, preview: URL.createObjectURL(file) }];
  });

  if (fileInputRef.current) fileInputRef.current.value = "";
};


  const removeNewImage = (index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index]?.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const goNextTab = () => {
    const order: Tab[] = ["Basics", "Eligibility", "Services", "Images"];
    const idx = order.indexOf(activeTab);
    const next = order[Math.min(idx + 1, order.length - 1)];
    setActiveTab(next);
  };

  /* =========================
     Service Picker Modal state
     ========================= */
  const [servicePicker, setServicePicker] = useState<{
    open: boolean;
    activeCategoryId: string | null;
    selected: { categoryId: string; categoryTitle: string; itemId: string }[];
    hotelCategories: string[];
    allowAll: AllowAllByService;
  }>({
    open: false,
    activeCategoryId: null,
    selected: [],
    hotelCategories: [],
    allowAll: {},
  });

  const openServicePicker = () => {
    const fallback = serviceCategories[0]?._id || null;

    const preselected = (formData.services || []).map((s) => ({
      categoryId: s.categoryId,
      categoryTitle: s.categoryTitle,
      itemId: s.itemId,
    }));

    setServicePicker({
      open: true,
      activeCategoryId: fallback,
      selected: preselected,
      hotelCategories: formData.hotel_categories || [],
      allowAll: formData.allow_all_by_service || {},
    });
  };

  const closeServicePicker = () =>
    setServicePicker({
      open: false,
      activeCategoryId: null,
      selected: [],
      hotelCategories: [],
      allowAll: {},
    });

  const handleServicePickerDone = () => {
    const selections = servicePicker.selected;

    const next: SelectedService[] = selections.map((sel) => ({
      categoryId: sel.categoryId,
      categoryTitle: sel.categoryTitle,
      itemId: sel.itemId,
      itemModel: ITEM_MODEL_BY_TITLE[sel.categoryTitle] ?? "",
    }));

    setFormData((p) => ({
      ...p,
      services: next,
      hotel_categories: servicePicker.hotelCategories || [],
      allow_all_by_service: servicePicker.allowAll || {},
    }));
    closeServicePicker();
  };

  const getMetaForSelected = (sel: SelectedService) => {
    const metaKey = SERVICE_META_KEY_BY_TITLE[sel.categoryTitle] || "";
    const items = metaKey ? servicesMeta[metaKey] || [] : [];
    const item = items.find((it) => it._id === sel.itemId);
    if (!item) return null;
    return { metaKey, item };
  };

  /* =========================
     Build allowed_services (NEW BACKEND SHAPE)
     ========================= */
  const buildAllowedServicesNewShape = (
    selected: SelectedService[],
    hotelCategories: string[] = [],
    allowAll: AllowAllByService = {}
  ) => {
    const hotelsAllowAll = allowAll.hotels ?? false;

    const activitiesAllowAll = allowAll.activities ?? false;
    const sightseeingAllowAll = allowAll.sightseeing ?? false;
    const leisureAllowAll = allowAll.leisure_activities ?? false;
    const nightlifeAllowAll = allowAll.nightlife ?? false;
    const rentalsAllowAll = allowAll.rentals ?? false;
    const pickupDropAllowAll = allowAll.pickup_drop ?? false;
    const foodServicesAllowAll = allowAll.food_services ?? false;
    const tourManagerAllowAll = allowAll.tour_manager ?? false;

    const hotelIds: string[] = [];
    const activityIds: string[] = [];
    const sightseeingIds: string[] = [];
    const leisureIds: string[] = [];
    const nightlifeIds: string[] = [];
    const rentalIds: string[] = [];
    const pickupDropIds: string[] = [];
const foodServiceIds: string[] = [];
const tourManagerIds: string[] = [];

    for (const s of selected) {
      const t = normalizeTitle(s.categoryTitle);

      if (t === "hotels" || t === "hotel") hotelIds.push(s.itemId);
      else if (t === "activities") activityIds.push(s.itemId);
      else if (t === "sightseeing") sightseeingIds.push(s.itemId);
      else if (t === "leisure activities" || t === "leisureactivities")
        leisureIds.push(s.itemId);
      else if (t === "nightlife") nightlifeIds.push(s.itemId);
      else if (t === "rentals" || t === "rental") rentalIds.push(s.itemId);
      else if (
        t === "pick & drop" ||
        t === "pick and drop" ||
        t === "pickup & drop" ||
        t === "pickupanddrop"
      ) {
        pickupDropIds.push(s.itemId);
      }
      else if (t === "food service" || t === "food services" || t === "foodservice" || t === "foodservices") {
  foodServiceIds.push(s.itemId);
} else if (t === "tour manager" || t === "tourmanager") {
  tourManagerIds.push(s.itemId);
}

    }

  const rootAllowedAll =
  hotelsAllowAll &&
  activitiesAllowAll &&
  sightseeingAllowAll &&
  leisureAllowAll &&
  nightlifeAllowAll &&
  rentalsAllowAll &&
  pickupDropAllowAll &&
  foodServicesAllowAll &&
  tourManagerAllowAll;


    return {
      allowed_all: rootAllowedAll,

      hotels: {
        allowed_all: hotelsAllowAll,
        hotel_categories: hotelsAllowAll ? [] : hotelCategories || [],
        allowed_hotel_ids: hotelsAllowAll ? [] : hotelIds,
      },

      services: {
        activities: { allowed_all: activitiesAllowAll, ids: activitiesAllowAll ? [] : activityIds },
        sightseeing: { allowed_all: sightseeingAllowAll, ids: sightseeingAllowAll ? [] : sightseeingIds },
        leisure_activities: { allowed_all: leisureAllowAll, ids: leisureAllowAll ? [] : leisureIds },
        nightlife: { allowed_all: nightlifeAllowAll, ids: nightlifeAllowAll ? [] : nightlifeIds },
        rentals: { allowed_all: rentalsAllowAll, ids: rentalsAllowAll ? [] : rentalIds },
        pickup_drop: { allowed_all: pickupDropAllowAll, ids: pickupDropAllowAll ? [] : pickupDropIds },
        food_services: { allowed_all: foodServicesAllowAll, ids: foodServicesAllowAll ? [] : foodServiceIds },
tour_manager: { allowed_all: tourManagerAllowAll, ids: tourManagerAllowAll ? [] : tourManagerIds },
      },
    };
  };

  /* =========================
     Submit (EDIT)
     - PATCH with FormData
     - Images optional
     ========================= */
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!coupon?._id) {
      alert("No coupon found in store. Please open Edit from listing page.");
      return;
    }

    if (!requiredOk || isSubmitting) {
      if (!requiredOk) alert("Please fill required fields: Title & Coupon Code.");
      return;
    }

    const couponId = idToString(coupon._id);
    if (!couponId) {
      alert("Invalid coupon id");
      return;
    }
    

    setIsSubmitting(true);
    try {
      const payload: any = {
        coupon_type: formData.coupon_type,
        coupon_code: formData.coupon_code.trim(),
        title: formData.title.trim(),
        description: formData.description?.trim() || "",
        thumbnail: existingThumbnail || formData.thumbnail || "",

        discount: {
          type: formData.discount.type,
          value: Number(formData.discount.value ?? 0) || 0,
          currency: formData.discount.currency,
          ...(isServiceMonetary
            ? {
                calculation_basis: formData.discount.calculation_basis ?? "MARKUP_DIFFERENCE",
                show_as_value_only: !!formData.discount.show_as_value_only,
              }
            : {}),
        },

        eligibility: {
          user_type: [formData.eligibility.user_type].filter(Boolean),
          first_booking: !!formData.eligibility.first_booking,
          min_cart_value:
            formData.eligibility.min_cart_value === null || formData.eligibility.min_cart_value === undefined
              ? 0
              : Number(formData.eligibility.min_cart_value) || 0,
          max_uses_per_user:
            formData.eligibility.max_uses_per_user === null || formData.eligibility.max_uses_per_user === undefined
              ? 0
              : Number(formData.eligibility.max_uses_per_user) || 0,
        },

        date_rules: {
          valid_from: formData.date_rules.valid_from || "",
          valid_to: formData.date_rules.valid_to || "",
          allowed_days: formData.date_rules.allowed_days || [],
          blockout_allowed: !!formData.date_rules.blockout_allowed,

          ...(isServiceMonetary
            ? {
                weekday: {
                  enabled: !!formData.date_rules.weekday?.enabled,
                  min_markup: Number(formData.date_rules.weekday?.min_markup ?? 0) || 0,
                  max_markup: Number(formData.date_rules.weekday?.max_markup ?? 0) || 0,
                },
                weekend: {
                  enabled: !!formData.date_rules.weekend?.enabled,
                  min_markup: Number(formData.date_rules.weekend?.min_markup ?? 0) || 0,
                  max_markup: Number(formData.date_rules.weekend?.max_markup ?? 0) || 0,
                },
                blockout: { enabled: !!formData.date_rules.blockout?.enabled },
              }
            : {}),
        },

        usage_limits: {
          total_uses:
            formData.usage_limits.total_uses === null || formData.usage_limits.total_uses === undefined
              ? 0
              : Number(formData.usage_limits.total_uses) || 0,
          max_total_uses:
            formData.usage_limits.max_total_uses === null || formData.usage_limits.max_total_uses === undefined
              ? null
              : Number(formData.usage_limits.max_total_uses),
        },

        terms_conditions: (formData.terms_conditions || []).filter(Boolean),

        allowed_services: buildAllowedServicesNewShape(
          formData.services || [],
          formData.hotel_categories || [],
          formData.allow_all_by_service || {}
        ),

        status: {
          is_active: !!formData.status.is_active,
          is_deleted: !!formData.status.is_deleted,
        },
      };

      if (isServiceMonetary) {
        payload.service_scope = {
          level: formData.service_scope?.level ?? "SERVICE",
          service_type: formData.service_scope?.service_type ?? "ROOM",
        };

        payload.pax_rules = {
          min_pax: Number(formData.pax_rules?.min_pax ?? 1) || 1,
          max_pax: Number(formData.pax_rules?.max_pax ?? 1) || 1,
          allowed_pax_slabs: (formData.pax_rules?.allowed_pax_slabs || []).filter(Boolean),
        };

        payload.day_rules = {
          max_nights_allowed:
            formData.day_rules?.max_nights_allowed === null || formData.day_rules?.max_nights_allowed === undefined
              ? null
              : Number(formData.day_rules?.max_nights_allowed),
          allowed_nights: (formData.day_rules?.allowed_nights || [])
            .map((n) => Number(n))
            .filter((n) => Number.isFinite(n)),
          night_groups: (formData.day_rules?.night_groups || []).filter(Boolean),
        };

        payload.stacking_rules = {
          can_stack_with_same_service: !!formData.stacking_rules?.can_stack_with_same_service,
          can_stack_with_other_services: !!formData.stacking_rules?.can_stack_with_other_services,
          can_stack_with_fixed_coupon: !!formData.stacking_rules?.can_stack_with_fixed_coupon,
          sum_multiple_services: !!formData.stacking_rules?.sum_multiple_services,
        };
      }

      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

      const submitFormData = new FormData();
      submitFormData.append("data", JSON.stringify(payload));

      // ✅ only append images if user added new ones
      if (images.length) {
        images.forEach((img) => submitFormData.append("images", img.file));
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}coupons/update/${couponId}`,
        {
          method: "PATCH",
          body: submitFormData,
        }
      );

      if (response.ok) {
        router.push("/dashboard/coupons");
        return;
      } else {
        const msg = await safeErrorText(response);
        alert(msg || "Failed to update coupon");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* =========================
     Guard: if store is empty
     ========================= */
  if (!coupon) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50 p-6">
        <div className="max-w-md w-full rounded-2xl border bg-white p-5 shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900">No coupon in store</h1>
          <p className="text-sm text-gray-600 mt-2">
            Please go back to Coupons list and click <span className="font-semibold">Edit</span> again.
          </p>
          <button
            type="button"
            className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
            onClick={() => router.push("/dashboard/coupons")}
          >
            Back to coupons
          </button>
        </div>
      </div>
    );
  }

  /* =========================
     UI
     ========================= */
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-0 sm:px-4 md:px-4">
      <div className="w-full max-w-6xl ml-auto rounded-none sm:rounded-2xl bg-white p-4 sm:p-6 md:p-8 shadow-none sm:shadow-lg min-h-screen sm:min-h-0">
        <form
          className="bg-white rounded-none sm:rounded-2xl shadow-none sm:shadow-md space-y-4 sm:space-y-6"
          onSubmit={(e) => e.preventDefault()}  
          aria-busy={isSubmitting}
          onKeyDown={(e) => {
            if (e.key === "Enter" && activeTab !== "Images") e.preventDefault();
          }}
        >
          {/* Loading overlay */}
          {isSubmitting && (
            <div className="fixed inset-0 z-[60] bg-white/70 backdrop-blur-sm grid place-items-center">
              <div className="flex items-center gap-3 px-4 py-2 rounded-xl border bg-white shadow">
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" opacity="0.25" />
                  <path d="M22 12a10 10 0 0 1-10 10" strokeWidth="2" />
                </svg>
                <span className="text-sm text-gray-700 font-medium">Updating coupon…</span>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-6">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-blue-600 text-white grid place-items-center text-sm font-semibold shadow-sm">
                CE
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 leading-tight">
                  Edit Coupon
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">
                  Seq #{coupon.seq} • Code: {coupon.coupon_code}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push("/dashboard/coupons")}
              className="px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-[.99] touch-manipulation"
              aria-label="Back"
              disabled={isSubmitting}
            >
              Back
            </button>
          </div>

          <main className="pb-4 sm:pb-6">
            {/* Tabs */}
            <div role="tablist" aria-label="Coupon form sections" className="mt-4 grid grid-cols-4 gap-2">
              {tabs.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === t}
                  onClick={() => setActiveTab(t)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    activeTab === t
                      ? "bg-blue-600 text-white border-blue-600 shadow"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                  disabled={isSubmitting}
                >
                  {t}
                </button>
              ))}
            </div>

            <fieldset disabled={isSubmitting} className="contents">
              {/* =========================
                  BASICS
                 ========================= */}
              {activeTab === "Basics" && (
                <>
                  <SectionCard title="Basic Information" subtitle="Core coupon info." requiredHint>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Coupon Type" required>
                        <select
                          className="input"
                          value={formData.coupon_type}
                          onChange={(e) => onCouponTypeChange(e.target.value as CouponType)}
                        >
                          <option value="FIXED_VALUE">FIXED_VALUE</option>
                          <option value="PERCENTAGE">PERCENTAGE</option>
                          <option value="SERVICE_MONETARY">SERVICE_MONETARY</option>
                          <option value="FREEBIE">FREEBIE</option>
                          <option value="BOGO">BOGO</option>
                        </select>
                      </Field>

                      <Field label="Coupon Code" required>
                        <input
                          type="text"
                          value={formData.coupon_code}
                          onChange={(e) => setTop({ coupon_code: e.target.value })}
                          className="input uppercase tracking-wider"
                          placeholder="FIRST500"
                          autoCapitalize="characters"
                        />
                      </Field>

                      <Field label="Title" required>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setTop({ title: e.target.value })}
                          className="input"
                          placeholder="First Booking Offer"
                          autoComplete="off"
                        />
                      </Field>

                      {/* Description full width */}
                      <div className="sm:col-span-2">
                        <Field label="Description">
                          <div className="border rounded-xl bg-white">
                            <TinyMCETextEditor
                              value={formData.description || ""}
                              onChange={(html) => setFormData((p) => ({ ...p, description: html }))}
                              placeholder="Write coupon description..."
                            />
                          </div>
                        </Field>
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard title="Discount" subtitle="Discount configuration.">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Field label="Discount Type" required>
                        <select
                          className="input"
                          value={formData.discount.type}
                          onChange={(e) => setDiscount({ type: e.target.value as DiscountType })}
                          disabled={isServiceMonetary}
                        >
                          <option value="fixed">fixed</option>
                          <option value="percentage">percentage</option>
                        </select>
                      </Field>

                      <Field label="Value" required>
                        <input
                          type="number"
                          min={0}
                          inputMode="decimal"
                          className="input"
                          value={formData.discount.value ?? ""}
                          onChange={(e) =>
                            setDiscount({ value: e.target.value === "" ? null : Number(e.target.value) })
                          }
                          placeholder={formData.discount.type === "percentage" ? "e.g., 10" : "e.g., 500"}
                        />
                      </Field>

                      <Field label="Currency">
                        <select
                          className="input"
                          value={formData.discount.currency}
                          onChange={(e) => setDiscount({ currency: e.target.value as Currency })}
                        >
                          <option value="INR">INR</option>
                          <option value="USD">USD</option>
                          <option value="AED">AED</option>
                        </select>
                      </Field>

                      {isServiceMonetary && (
                        <>
                          <Field label="Calculation Basis">
                            <select
                              className="input"
                              value={formData.discount.calculation_basis ?? "MARKUP_DIFFERENCE"}
                              onChange={(e) => setDiscount({ calculation_basis: e.target.value as CalculationBasis })}
                            >
                              <option value="MARKUP_DIFFERENCE">MARKUP_DIFFERENCE</option>
                            </select>
                          </Field>

                          <div className="sm:col-span-2">
                            <ToggleRow
                              label="Show as value only"
                              checked={!!formData.discount.show_as_value_only}
                              onChange={(v) => setDiscount({ show_as_value_only: v })}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </SectionCard>

                  {isServiceMonetary && (
                    <SectionCard title="Service Scope" subtitle="SERVICE_MONETARY scope and type.">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Level" required>
                          <select
                            className="input"
                            value={formData.service_scope?.level ?? "SERVICE"}
                            onChange={(e) => setServiceScope({ level: e.target.value as ServiceScopeLevel })}
                          >
                            <option value="SERVICE">SERVICE</option>
                            <option value="CART">CART</option>
                          </select>
                        </Field>

                        <Field label="Service Type" required>
                          <select
                            className="input"
                            value={formData.service_scope?.service_type ?? "ROOM"}
                            onChange={(e) => setServiceScope({ service_type: e.target.value as ServiceType })}
                          >
                            <option value="ROOM">ROOM</option>
                            <option value="ACTIVITY">ACTIVITY</option>
                            <option value="SIGHTSEEING">SIGHTSEEING</option>
                            <option value="LEISURE_ACTIVITY">LEISURE_ACTIVITY</option>
                            <option value="NIGHTLIFE">NIGHTLIFE</option>
                            <option value="RENTAL">RENTAL</option>
                            <option value="PICKUP_DROP">PICKUP_DROP</option>
                          </select>
                        </Field>
                      </div>
                    </SectionCard>
                  )}

                  <SectionCard title="Date Rules" subtitle="Validity dates + allowed days.">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Valid From">
                        <input
                          type="datetime-local"
                          className="input"
                          value={formData.date_rules.valid_from}
                          onChange={(e) => setDateRules({ valid_from: e.target.value })}
                        />
                      </Field>

                      <Field label="Valid To">
                        <input
                          type="datetime-local"
                          className="input"
                          value={formData.date_rules.valid_to}
                          onChange={(e) => setDateRules({ valid_to: e.target.value })}
                        />
                      </Field>

                      <div className="sm:col-span-2">
                        <Field label="Allowed Days">
                          <div className="flex flex-wrap gap-2">
                            {/* Weekday group */}
                            <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
                              <input
                                type="checkbox"
                                checked={isWeekdayGroupChecked}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  const current = (formData.date_rules.allowed_days || []) as AllowedDays[];

                                  if (checked) {
                                    const withoutWeekend = removeMany(current, WEEKEND);
                                    setAllowedDays(addMany(withoutWeekend, WEEKDAYS));
                                  } else {
                                    setAllowedDays(removeMany(current, WEEKDAYS));
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">weekday</span>
                            </label>

                            {/* Weekend group */}
                            <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
                              <input
                                type="checkbox"
                                checked={isWeekendGroupChecked}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  const current = (formData.date_rules.allowed_days || []) as AllowedDays[];

                                  if (checked) {
                                    const withoutWeekdays = removeMany(current, WEEKDAYS);
                                    setAllowedDays(addMany(withoutWeekdays, WEEKEND));
                                  } else {
                                    setAllowedDays(removeMany(current, WEEKEND));
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">weekend</span>
                            </label>

                            {/* Individual days */}
                            {(
                              ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as AllowedDays[]
                            ).map((day) => (
                              <label
                                key={day}
                                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2"
                              >
                                <input
                                  type="checkbox"
                                  checked={formData.date_rules.allowed_days.includes(day)}
                                  onChange={(e) => {
                                    const checked = e.target.checked;

                                    setDateRules({
                                      allowed_days: checked
                                        ? Array.from(new Set([...formData.date_rules.allowed_days, day]))
                                        : formData.date_rules.allowed_days.filter((d) => d !== day),
                                    });
                                  }}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">{day}</span>
                              </label>
                            ))}
                          </div>
                        </Field>
                      </div>

                      <div className="sm:col-span-2">
                        <ToggleRow
                          label="Blockout Allowed"
                          checked={formData.date_rules.blockout_allowed}
                          onChange={(v) => setDateRules({ blockout_allowed: v })}
                        />
                      </div>

                      {isServiceMonetary && (
                        <div className="sm:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-gray-200 bg-white p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-gray-900">Weekday Markup</p>
                              <ToggleRow
                                label="Enabled"
                                checked={!!formData.date_rules.weekday?.enabled}
                                onChange={(v) => setWeekdayMarkup({ enabled: v })}
                              />
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <Field label="Min Markup">
                                <input
                                  type="number"
                                  className="input"
                                  value={formData.date_rules.weekday?.min_markup ?? ""}
                                  onChange={(e) =>
                                    setWeekdayMarkup({ min_markup: e.target.value === "" ? null : Number(e.target.value) })
                                  }
                                />
                              </Field>
                              <Field label="Max Markup">
                                <input
                                  type="number"
                                  className="input"
                                  value={formData.date_rules.weekday?.max_markup ?? ""}
                                  onChange={(e) =>
                                    setWeekdayMarkup({ max_markup: e.target.value === "" ? null : Number(e.target.value) })
                                  }
                                />
                              </Field>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-gray-200 bg-white p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-gray-900">Weekend Markup</p>
                              <ToggleRow
                                label="Enabled"
                                checked={!!formData.date_rules.weekend?.enabled}
                                onChange={(v) => setWeekendMarkup({ enabled: v })}
                              />
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <Field label="Min Markup">
                                <input
                                  type="number"
                                  className="input"
                                  value={formData.date_rules.weekend?.min_markup ?? ""}
                                  onChange={(e) =>
                                    setWeekendMarkup({ min_markup: e.target.value === "" ? null : Number(e.target.value) })
                                  }
                                />
                              </Field>
                              <Field label="Max Markup">
                                <input
                                  type="number"
                                  className="input"
                                  value={formData.date_rules.weekend?.max_markup ?? ""}
                                  onChange={(e) =>
                                    setWeekendMarkup({ max_markup: e.target.value === "" ? null : Number(e.target.value) })
                                  }
                                />
                              </Field>
                            </div>
                          </div>

                          <div className="md:col-span-2">
                            <ToggleRow
                              label="Blockout object enabled"
                              checked={!!formData.date_rules.blockout?.enabled}
                              onChange={(v) => setBlockoutObj({ enabled: v })}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </SectionCard>

                  {isServiceMonetary && (
                    <>
                      <SectionCard title="Pax Rules" subtitle="SERVICE_MONETARY passenger constraints.">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Field label="Min Pax">
                            <input
                              type="number"
                              className="input"
                              value={formData.pax_rules?.min_pax ?? ""}
                              onChange={(e) => setPaxRules({ min_pax: e.target.value === "" ? null : Number(e.target.value) })}
                              placeholder="e.g., 1"
                            />
                          </Field>
                          <Field label="Max Pax">
                            <input
                              type="number"
                              className="input"
                              value={formData.pax_rules?.max_pax ?? ""}
                              onChange={(e) => setPaxRules({ max_pax: e.target.value === "" ? null : Number(e.target.value) })}
                              placeholder="e.g., 6"
                            />
                          </Field>

                          <div className="sm:col-span-2">
                            <Field label="Allowed Pax Slabs" hint='Examples: "1", "2", "3-5"'>
                              <TagsInput
                                items={formData.pax_rules?.allowed_pax_slabs || []}
                                onChange={(items) => setPaxRules({ allowed_pax_slabs: items })}
                                placeholder="e.g., 1"
                                disabled={isSubmitting}
                              />
                            </Field>
                          </div>
                        </div>
                      </SectionCard>

                      <SectionCard title="Day Rules" subtitle="SERVICE_MONETARY nights constraints.">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Field label="Max Nights Allowed" hint="null = no limit">
                            <input
                              type="number"
                              className="input"
                              value={formData.day_rules?.max_nights_allowed ?? ""}
                              onChange={(e) =>
                                setDayRules({ max_nights_allowed: e.target.value === "" ? null : Number(e.target.value) })
                              }
                              placeholder="e.g., 8"
                            />
                          </Field>

                          <div className="sm:col-span-2">
                            <Field label="Allowed Nights (numbers)" hint='Add as tags: "1", "2", "3"'>
                              <TagsInput
                                items={(formData.day_rules?.allowed_nights || []).map(String)}
                                onChange={(items) =>
                                  setDayRules({
                                    allowed_nights: items.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0),
                                  })
                                }
                                placeholder="e.g., 1"
                                disabled={isSubmitting}
                              />
                            </Field>
                          </div>

                          <div className="sm:col-span-2">
                            <Field label="Night Groups" hint='Examples: "1", "2", "3-5"'>
                              <TagsInput
                                items={formData.day_rules?.night_groups || []}
                                onChange={(items) => setDayRules({ night_groups: items })}
                                placeholder="e.g., 3-5"
                                disabled={isSubmitting}
                              />
                            </Field>
                          </div>
                        </div>
                      </SectionCard>

                      <SectionCard title="Stacking Rules" subtitle="SERVICE_MONETARY stacking rules.">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <ToggleRow
                            label="Can stack with same service"
                            checked={!!formData.stacking_rules?.can_stack_with_same_service}
                            onChange={(v) => setStackingRules({ can_stack_with_same_service: v })}
                          />
                          <ToggleRow
                            label="Can stack with other services"
                            checked={!!formData.stacking_rules?.can_stack_with_other_services}
                            onChange={(v) => setStackingRules({ can_stack_with_other_services: v })}
                          />
                          <ToggleRow
                            label="Can stack with fixed coupon"
                            checked={!!formData.stacking_rules?.can_stack_with_fixed_coupon}
                            onChange={(v) => setStackingRules({ can_stack_with_fixed_coupon: v })}
                          />
                          <ToggleRow
                            label="Sum multiple services"
                            checked={!!formData.stacking_rules?.sum_multiple_services}
                            onChange={(v) => setStackingRules({ sum_multiple_services: v })}
                          />
                        </div>
                      </SectionCard>
                    </>
                  )}

                  <SectionCard title="Terms & Conditions" subtitle="Add bullet lines (array).">
                    <TagsInput
                      items={formData.terms_conditions}
                      onChange={(items) => setTop({ terms_conditions: items })}
                      placeholder="e.g., Valid on first booking only"
                      disabled={isSubmitting}
                    />
                  </SectionCard>
                </>
              )}

              {/* =========================
                  ELIGIBILITY
                 ========================= */}
              {activeTab === "Eligibility" && (
                <>
                  <SectionCard title="Eligibility" subtitle="Who qualifies and limits per user?">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="User Type" required>
                        <select
                          className="input"
                          value={formData.eligibility.user_type}
                          onChange={(e) => setEligibility({ user_type: e.target.value as UserTypeOption })}
                          disabled={isSubmitting}
                        >
                          <option value="NEW_USER">New User</option>
                          <option value="ALL">All</option>
                        </select>
                      </Field>

                      <div className="sm:col-span-2">
                        <ToggleRow
                          label="First Booking"
                          checked={formData.eligibility.first_booking}
                          onChange={(v) => setEligibility({ first_booking: v })}
                        />
                      </div>

                      <Field label="Min Cart Value">
                        <input
                          type="number"
                          inputMode="decimal"
                          className="input"
                          value={formData.eligibility.min_cart_value ?? ""}
                          onChange={(e) =>
                            setEligibility({ min_cart_value: e.target.value === "" ? null : Number(e.target.value) })
                          }
                          placeholder="e.g., 3000"
                        />
                      </Field>

                      <Field label="Max Uses Per User">
                        <input
                          type="number"
                          inputMode="numeric"
                          className="input"
                          value={formData.eligibility.max_uses_per_user ?? ""}
                          onChange={(e) =>
                            setEligibility({ max_uses_per_user: e.target.value === "" ? null : Number(e.target.value) })
                          }
                          placeholder="e.g., 1"
                        />
                      </Field>
                    </div>
                  </SectionCard>

                  <SectionCard title="Usage Limits" subtitle="Global usage counters.">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Total Uses">
                        <input
                          type="number"
                          inputMode="numeric"
                          className="input"
                          value={formData.usage_limits.total_uses ?? ""}
                          onChange={(e) =>
                            setUsageLimits({ total_uses: e.target.value === "" ? null : Number(e.target.value) })
                          }
                          placeholder="e.g., 0"
                        />
                      </Field>

                      <Field label="Max Total Uses">
                        <input
                          type="number"
                          inputMode="numeric"
                          className="input"
                          value={formData.usage_limits.max_total_uses ?? ""}
                          onChange={(e) =>
                            setUsageLimits({ max_total_uses: e.target.value === "" ? null : Number(e.target.value) })
                          }
                          placeholder="e.g., 10000"
                        />
                      </Field>
                    </div>
                  </SectionCard>
                </>
              )}

              {/* =========================
                  SERVICES TAB
                 ========================= */}
              {activeTab === "Services" && (
                <SectionCard title="Services" subtitle="Select services for this coupon (optional).">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700">
                      Selected:{" "}
                      <span className="font-semibold">
                        {formData.services.length + (formData.hotel_categories?.length ?? 0)}
                      </span>
                    </p>

                    <button
                      type="button"
                      onClick={openServicePicker}
                      disabled={isSubmitting || loadingServices || serviceCategories.length === 0}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-60"
                    >
                      <Plus className="h-4 w-4" />
                      Edit Services
                    </button>
                  </div>

                  {/* allow-all badges */}
                  <div className="mb-3 flex flex-wrap gap-2">
                    {Object.entries(formData.allow_all_by_service || {})
                      .filter(([, v]) => !!v)
                      .map(([k]) => (
                        <span
                          key={k}
                          className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"
                        >
                          Allow all: {k}
                        </span>
                      ))}
                  </div>

                  {/* Hotel star categories */}
                  {(formData.hotel_categories?.length ?? 0) > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Hotel Star Categories:</p>
                      <div className="flex flex-wrap gap-2">
                        {formData.hotel_categories.map((cat) => (
                          <span
                            key={cat}
                            className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.services.length === 0 && (formData.hotel_categories?.length ?? 0) === 0 ? (
                    <div className="text-sm text-gray-500">No services selected yet.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {formData.services.map((sel) => {
                        const found = getMetaForSelected(sel);
                        const metaKey = found?.metaKey || "";
                        const item = found?.item;

                        const card = item ? getServiceCardContent(metaKey, item) : null;

                        return (
                          <div
                            key={`${sel.categoryTitle}-${sel.itemId}`}
                            className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                          >
                            <div className="p-3 flex gap-3">
                              <div className="shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                                {card?.mediaUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={card.mediaUrl} alt={card.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                                    No image
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                      {card?.title || sel.categoryTitle}
                                    </p>
                                    {card?.subtitle && <p className="text-xs text-gray-500 truncate">{card.subtitle}</p>}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFormData((p) => ({
                                        ...p,
                                        services: p.services.filter(
                                          (x) => !(x.categoryTitle === sel.categoryTitle && x.itemId === sel.itemId)
                                        ),
                                      }))
                                    }
                                    className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                    aria-label="Remove service"
                                    title="Remove"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>

                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span className="text-[11px] font-semibold text-gray-700 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                                    {sel.categoryTitle}
                                  </span>

                                  {card?.priceLabel && (
                                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                      {card.priceLabel}
                                    </span>
                                  )}

                                  {card?.ratingLabel && (
                                    <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                      {card.ratingLabel}
                                    </span>
                                  )}

                                  {card?.chip && (
                                    <span className="text-[11px] text-gray-700 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                                      {card.chip}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </SectionCard>
              )}

              {/* =========================
                  IMAGES TAB (EDIT: optional)
                 ========================= */}
       {activeTab === "Images" && (
  <SectionCard
    title="Thumbnail (single)"
  >
{/* ===== Existing thumbnail preview (same UI as New Thumbnail Preview) ===== */}
{hasExistingThumb && !hasNewThumb && (
  <div className="mt-4">
    <p className="text-sm font-medium text-gray-700 mb-2">
      Existing Thumbnail Preview
    </p>

    <div className="relative w-full max-w-sm rounded-xl overflow-hidden border border-gray-200 bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={existingThumbnail}
        alt="Existing thumbnail preview"
        className="w-full h-40 object-cover"
      />

      <button
        type="button"
        onClick={() => setExistingThumbnail("")}
        className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg"
        title="Remove existing image"
        aria-label="Remove existing image"
      >
        ×
      </button>
    </div>
  </div>
)}


    {/* ===== Upload area (ONLY if NO existing thumbnail AND no new image yet) ===== */}
    {!hasExistingThumb && !hasNewThumb && (
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          Upload New Thumbnail
        </p>

        <label className="block">
          <div className="flex items-center justify-center w-full px-4 py-10 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 transition-colors bg-white">
            <div className="text-center">
              <p className="mt-2 text-sm text-gray-700">Tap to upload a thumbnail</p>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB • Only one image</p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </label>
      </div>
    )}

    {/* ===== New thumbnail preview (single) ===== */}
    {hasNewThumb && (
      <div className="mt-4">
        <p className="text-sm font-medium text-gray-700 mb-2">
          New Thumbnail Preview
        </p>

        <div className="relative w-full max-w-sm rounded-xl overflow-hidden border border-gray-200 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[0].preview}
            alt="New thumbnail preview"
            className="w-full h-40 object-cover"
          />

          <button
            type="button"
            onClick={() => removeNewImage(0)}
            className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg"
            title="Remove new image"
            aria-label="Remove new image"
          >
            ×
          </button>
        </div>
      </div>
    )}
  </SectionCard>
)}


            </fieldset>
          </main>

          {/* Sticky action bar */}
          <div className="fixed inset-x-0 bottom-0 z-40">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-4">
              <div className="rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-900/5">
                <div className="p-3 sm:p-4 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 rounded-full px-2.5 py-1">
                      <span className={`size-1.5 rounded-full ${requiredOk ? "bg-green-500" : "bg-amber-500"}`} />
                      {activeTab === "Images"
                        ? requiredOk
                          ? "Ready to update"
                          : "Fill required fields"
                        : "Continue to next"}
                    </span>
                  </div>

                  {activeTab !== "Images" ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => router.push("/dashboard/coupons")}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 w-full sm:w-auto disabled:opacity-60"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={goNextTab}
                        disabled={isSubmitting}
                        className="px-5 py-2 text-sm font-semibold rounded-xl text-white w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
                      >
                        Continue
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => router.push("/dashboard/coupons")}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 w-full sm:w-auto disabled:opacity-60"
                      >
                        Cancel
                      </button>
                      <button
                          type="button"
                          onClick={() => handleSubmit()}
                          disabled={!requiredOk || isSubmitting}
                          className={`px-5 py-2 text-sm font-semibold rounded-xl text-white w-full sm:w-auto transition-colors inline-flex items-center justify-center gap-2 ${
                            !requiredOk || isSubmitting
                              ? "bg-blue-300 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-700"
                          }`}
                        >
                          {isSubmitting ? "Updating…" : "Update Coupon"}
                        </button>

                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* =========================
              Services Modal (UPDATED allow_all keys)
             ========================= */}
          {servicePicker.open && (
            <div
              className="fixed inset-0 z-[9999]"
              aria-modal="true"
              role="dialog"
              onKeyDown={(e) => {
                if (e.key === "Escape") closeServicePicker();
              }}
            >
              <button
                type="button"
                aria-label="Close"
                onClick={closeServicePicker}
                className="absolute inset-0 bg-black/50"
              />

              <div className="absolute inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center p-0 md:p-6">
                <div className="relative w-full md:max-w-4xl bg-white rounded-3xl shadow-2xl max-h-[88vh] flex flex-col">
                  <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-4 md:px-5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm md:text-base font-semibold text-gray-900 truncate">
                          Select Services
                        </h3>
                        <p className="text-[11px] md:text-xs text-gray-500 mt-0.5">
                          Choose services and tap <span className="font-semibold">Done</span>.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={closeServicePicker}
                        className="shrink-0 inline-flex items-center justify-center size-9 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
                        title="Close"
                        aria-label="Close"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-1">
                      {serviceCategories.map((cat) => {
                        const isActive = servicePicker.activeCategoryId === cat._id;
                        return (
                          <button
                            key={cat._id}
                            type="button"
                            onClick={() => setServicePicker((p) => ({ ...p, activeCategoryId: cat._id }))}
                            className={[
                              "px-3 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap transition",
                              isActive
                                ? "bg-blue-50 border-blue-400 text-blue-700"
                                : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100",
                            ].join(" ")}
                          >
                            {cat.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 md:px-5 py-4">
                    {loadingServices ? (
                      <div className="py-10 text-center text-sm text-gray-600">Loading services…</div>
                    ) : (() => {
                        const activeCategory =
                          serviceCategories.find((c) => c._id === servicePicker.activeCategoryId) || serviceCategories[0];

                        if (!activeCategory) {
                          return <div className="py-10 text-center text-sm text-gray-600">No categories found.</div>;
                        }

                        const title = activeCategory.title;

                        // map modal tab -> allow_all key + meta key
                        const metaKey = SERVICE_META_KEY_BY_TITLE[title] || "";

                        // map metaKey -> allowAllKey
                        const allowKey: AllowAllKey | null = (() => {
                          if (metaKey === "hotels") return "hotels";
                          if (metaKey === "activities") return "activities";
                          if (metaKey === "sightseeingpackages") return "sightseeing";
                          if (metaKey === "leisureactivities") return "leisure_activities";
                          if (metaKey === "nightlife") return "nightlife";
                          if (metaKey === "rentals") return "rentals";
                          if (metaKey === "pickupanddrop") return "pickup_drop";
                           if (metaKey === "foodservices") return "food_services";
                          if (metaKey === "tourmanager") return "tour_manager";
                          return null; // ignore foodservices/tourmanager in allow_all
                        })();

                        const items: ServiceMetaItem[] = metaKey ? servicesMeta[metaKey] || [] : [];
                        const isHotelsTab = metaKey === "hotels";
                        const allowAllForTab = allowKey ? !!servicePicker.allowAll?.[allowKey] : false;

                        const hotelStarOptions = (() => {
                          if (!isHotelsTab) return [];
                          const set = new Set<string>();
                          for (const it of items) {
                            const cat = getHotelStarCategory(it);
                            if (cat) set.add(cat);
                          }
                          return Array.from(set);
                        })();

                        const toggleSelect = (itemId: string) => {
                          setServicePicker((prev) => {
                            const existsIdx = prev.selected.findIndex(
                              (s) => s.categoryId === activeCategory._id && s.itemId === itemId
                            );
                            if (existsIdx >= 0) {
                              const nextSel = [...prev.selected];
                              nextSel.splice(existsIdx, 1);
                              return { ...prev, selected: nextSel };
                            }
                            return {
                              ...prev,
                              selected: [
                                ...prev.selected,
                                { categoryId: activeCategory._id, categoryTitle: activeCategory.title, itemId },
                              ],
                            };
                          });
                        };

                        if (items.length === 0) {
                          return (
                            <div className="py-10 text-center text-sm text-gray-600">
                              No items found for <span className="font-semibold">{activeCategory.title}</span>.
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-4">
                            {/* Allow all toggle */}
                            {allowKey && (
                              <div className="rounded-2xl border border-gray-200 bg-white p-3">
                                <label className="flex items-center justify-between">
                                  <span className="text-sm font-semibold text-gray-900">
                                    Allow all {activeCategory.title}
                                  </span>
                                  <input
                                    type="checkbox"
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                    checked={allowAllForTab}
                                    onChange={(e) => {
                                      const checked = e.target.checked;

                                      setServicePicker((prev) => {
                                        const nextSelected = checked
                                          ? prev.selected.filter((s) => s.categoryId !== activeCategory._id)
                                          : prev.selected;

                                        const nextHotelCategories =
                                          allowKey === "hotels" && checked ? [] : prev.hotelCategories;

                                        return {
                                          ...prev,
                                          selected: nextSelected,
                                          hotelCategories: nextHotelCategories,
                                          allowAll: { ...(prev.allowAll || {}), [allowKey]: checked },
                                        };
                                      });
                                    }}
                                  />
                                </label>
                                <p className="text-[11px] text-gray-500 mt-2">
                                  If enabled, IDs will not be stored for this section.
                                </p>
                              </div>
                            )}

                            {/* Hotels: Star categories */}
                            {isHotelsTab && !allowAllForTab && hotelStarOptions.length > 0 && (
                              <div className="rounded-2xl border border-gray-200 bg-white p-3">
                                <p className="text-sm font-semibold text-gray-900 mb-2">
                                  Select Star Categories
                                </p>

                                <div className="flex flex-wrap gap-2">
                                  {hotelStarOptions.map((cat) => {
                                    const checked = servicePicker.hotelCategories.includes(cat);

                                    return (
                                      <button
                                        key={cat}
                                        type="button"
                                        onClick={() => {
                                          setServicePicker((prev) => {
                                            const nextCats = checked
                                              ? prev.hotelCategories.filter((x) => x !== cat)
                                              : [...prev.hotelCategories, cat];

                                            const nextSelected = checked
                                              ? prev.selected
                                              : prev.selected.filter((s) => {
                                                  if (normalizeTitle(s.categoryTitle) !== "hotels") return true;

                                                  const hotelItem = items.find((it) => it._id === s.itemId);
                                                  if (!hotelItem) return true;

                                                  return getHotelStarCategory(hotelItem) !== cat;
                                                });

                                            return { ...prev, hotelCategories: nextCats, selected: nextSelected };
                                          });
                                        }}
                                        className={[
                                          "px-3 py-1.5 rounded-full border text-xs font-semibold transition",
                                          checked
                                            ? "bg-blue-50 border-blue-400 text-blue-700"
                                            : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100",
                                        ].join(" ")}
                                      >
                                        {cat}
                                      </button>
                                    );
                                  })}
                                </div>

                                <p className="text-[11px] text-gray-500 mt-2">
                                  If you select a star category, hotels under that category will be disabled below.
                                </p>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {items.map((item) => {
                                if (!item._id) return null;

                                const hotelCat = isHotelsTab ? getHotelStarCategory(item) : "";
                                const isBlockedByCategory =
                                  isHotelsTab && hotelCat && servicePicker.hotelCategories.includes(hotelCat);

                                const isSelected = servicePicker.selected.some(
                                  (s) => s.categoryId === activeCategory._id && s.itemId === item._id
                                );

                                const { mediaUrl, title, subtitle, chip, priceLabel, ratingLabel } =
                                  getServiceCardContent(metaKey, item);

                                const disabled = allowAllForTab || isBlockedByCategory;

                                return (
                                  <button
                                    key={item._id}
                                    type="button"
                                    disabled={disabled}
                                    aria-disabled={disabled}
                                    onClick={() => {
                                      if (disabled) return;
                                      toggleSelect(item._id);
                                    }}
                                    className={[
                                      "w-full text-left rounded-2xl border p-3 transition",
                                      disabled
                                        ? "border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed"
                                        : isSelected
                                        ? "border-blue-400 bg-blue-50 shadow-sm"
                                        : "border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300",
                                    ].join(" ")}
                                  >
                                    <div className="flex gap-3">
                                      <div className="shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                                        {mediaUrl ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={mediaUrl} alt={title} className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                                            No image
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
                                            {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}

                                            {isHotelsTab && hotelCat && (
                                              <p className="text-[11px] text-gray-600 mt-1">
                                                Category: <span className="font-semibold">{hotelCat}</span>
                                                {isBlockedByCategory && (
                                                  <span className="ml-2 text-[11px] text-red-600 font-semibold">
                                                    (Disabled)
                                                  </span>
                                                )}
                                              </p>
                                            )}
                                          </div>

                                          <div className="shrink-0 flex flex-col items-end gap-1">
                                            {priceLabel && (
                                              <span className="text-xs font-semibold text-blue-700 whitespace-nowrap">
                                                {priceLabel}
                                              </span>
                                            )}
                                            {isSelected ? (
                                              <CheckCircle2 className="h-5 w-5 text-blue-600" />
                                            ) : (
                                              <span className="inline-block w-5 h-5 rounded-full border border-gray-300" />
                                            )}
                                          </div>
                                        </div>

                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                          {chip && (
                                            <span className="inline-flex px-2 py-0.5 rounded-full bg-gray-100 text-[11px] text-gray-700">
                                              {chip}
                                            </span>
                                          )}
                                          {ratingLabel && (
                                            <span className="inline-flex px-2 py-0.5 rounded-full bg-amber-50 text-[11px] text-amber-800">
                                              {ratingLabel}
                                            </span>
                                          )}
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
                  </div>

                  <div className="sticky bottom-0 bg-white/90 backdrop-blur border-t border-gray-100 px-4 md:px-5 py-3">
                    {(() => {
                      const canDone =
                        servicePicker.selected.length > 0 ||
                        (servicePicker.hotelCategories?.length ?? 0) > 0 ||
                        Object.values(servicePicker.allowAll || {}).some(Boolean);

                      return (
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs text-gray-600">
                            Selected:{" "}
                            <span className="font-semibold text-gray-900">
                              {servicePicker.selected.length + (servicePicker.hotelCategories?.length ?? 0)}
                            </span>
                          </p>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={closeServicePicker}
                              className="px-4 py-2 text-xs md:text-sm font-semibold rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              Cancel
                            </button>

                            <button
                              type="button"
                              onClick={handleServicePickerDone}
                              disabled={!canDone}
                              className={[
                                "px-4 py-2 text-xs md:text-sm font-semibold rounded-xl text-white transition",
                                !canDone ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700",
                              ].join(" ")}
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          <style jsx>{`
            .input {
              @apply w-full px-3 py-2.5 sm:py-2 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base touch-manipulation;
            }
            .no-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .no-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>
        </form>
      </div>
    </div>
  );
}

/* =========================
   Utilities
   ========================= */

async function safeErrorText(res: Response) {
  try {
    const txt = await res.text();
    return txt;
  } catch {
    return "";
  }
}

/* =========================
   Reusables
   ========================= */

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
    <section className="mt-5" style={{ padding: 0 }}>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-gray-100 bg-gradient-to-b from-white to-gray-50">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{title}</h2>
              {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
            {requiredHint && <span className="text-[11px] text-gray-500">Fields marked with * are required</span>}
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

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2.5">
      <span className="text-sm text-gray-700">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}

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

  const removeTag = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

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
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
            disabled || !value.trim()
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          Add
        </button>
      </div>

      {items.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {items.map((tag, idx) => (
            <span
              key={`${tag}-${idx}`}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-800"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(idx)}
                disabled={disabled}
                className="flex items-center justify-center"
                title="Remove"
              >
                <X className="h-3 w-3 text-gray-500 hover:text-gray-700" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
