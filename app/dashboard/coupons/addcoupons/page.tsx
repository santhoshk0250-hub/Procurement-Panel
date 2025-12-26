"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TinyMCETextEditor from "@/components/TinyMCETextEditor";
import { Plus, X, CheckCircle2 } from "lucide-react";

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
  // adjust keys based on your backend response
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
    item.thumbnail ||
    item.thumbnailUrl ||
    item.banner ||
    item.images?.[0] ||
    "";

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

    const price = v?.sellerBasePrice ?? v?.basePrice ?? item.priceBreakdown?.totalPrice;

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
    const price = item.price_breakdown?.totalPrice ?? item.priceBreakdown?.totalPrice;

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
   UPDATED COUPON SCHEMA TYPES
   (covers FIXED_VALUE / PERCENTAGE / SERVICE_MONETARY)
   ========================= */

type CouponType = "FIXED_VALUE" | "PERCENTAGE" | "FREEBIE" | "BOGO" | "SERVICE_MONETARY";

type DiscountType = "fixed" | "percentage";
type Currency = "INR" | "USD" | "AED";

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

interface CouponFormData {
  coupon_type: CouponType;
  coupon_code: string;
  title: string;
  description: string;

  discount: {
    type: DiscountType;
    value: number | null;
    currency: Currency;

    // SERVICE_MONETARY fields
    calculation_basis?: CalculationBasis;
    show_as_value_only?: boolean;
  };

  // SERVICE_MONETARY fields
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
    allowed_pax_slabs: string[]; // ["1","2","3-5",...]
  };

  day_rules?: {
    max_nights_allowed: number | null;
    allowed_nights: number[]; // [1,2,3,...]
    night_groups: string[]; // ["1","2","3-5",...]
  };

  date_rules: {
    valid_from: string; // datetime-local string
    valid_to: string; // datetime-local string
    allowed_days: AllowedDays[];
    blockout_allowed: boolean;

    // SERVICE_MONETARY extended day markup rules
    weekday?: { enabled: boolean; min_markup: number | null; max_markup: number | null };
    weekend?: { enabled: boolean; min_markup: number | null; max_markup: number | null };
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

  terms_conditions: string[]; // array in schema

  status: {
    is_active: boolean;
    is_deleted: boolean;
  };

  // ✅ keep Services tab state same:
  services: SelectedService[]; // used to build allowed_services on submit
  hotel_categories: string[]; // selected hotel star categories from modal
}

interface ImageFile {
  file: File;
  preview: string;
}

const DEFAULT_FORM: CouponFormData = {
  coupon_type: "FIXED_VALUE",
  coupon_code: "",
  title: "",
  description: "",
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
};

export default function CouponFormMobile() {
  // ------- STATE -------
  const [formData, setFormData] = useState<CouponFormData>({ ...DEFAULT_FORM });

  const [images, setImages] = useState<ImageFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const router = useRouter();

  const isServiceMonetary = formData.coupon_type === "SERVICE_MONETARY";

  const WEEKDAYS: AllowedDays[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const WEEKEND: AllowedDays[] = ["saturday", "sunday"];

  const hasAll = (arr: AllowedDays[], target: AllowedDays[]) => target.every((d) => arr.includes(d));
  const removeMany = (arr: AllowedDays[], target: AllowedDays[]) => arr.filter((d) => !target.includes(d));
  const addMany = (arr: AllowedDays[], target: AllowedDays[]) => Array.from(new Set([...arr, ...target]));

  // Only store individual days in state.
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
     Fetch service categories & meta
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
        const filteredCats = cats.filter((c: ServiceCategory) => normalizeTitle(c?.title) !== "tour packages");

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
     Service Picker Modal state (KEEP)
     ========================= */
  const [servicePicker, setServicePicker] = useState<{
    open: boolean;
    activeCategoryId: string | null;
    selected: { categoryId: string; categoryTitle: string; itemId: string }[];
    hotelCategories: string[]; // star categories selection (Hostel / 2 Star / 3 Star ...)
  }>({ open: false, activeCategoryId: null, selected: [], hotelCategories: [] });

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
    });
  };

  const closeServicePicker = () =>
    setServicePicker({ open: false, activeCategoryId: null, selected: [], hotelCategories: [] });

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

  // ------- DERIVED -------
  const requiredOk = useMemo(() => {
    const titleOk = formData.title.trim().length > 0;
    const codeOk = formData.coupon_code.trim().length > 0;
    const imagesOk = images.length > 0; // images required (KEEP)
    return titleOk && codeOk && imagesOk;
  }, [formData.title, formData.coupon_code, images.length]);

  /* =========================
     Handlers
     ========================= */

  const setTop = (next: Partial<CouponFormData>) => setFormData((p) => ({ ...p, ...next }));

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

  const setServiceScope = (next: Partial<NonNullable<CouponFormData["service_scope"]>>) =>
    setFormData((p) => ({ ...p, service_scope: { ...(p.service_scope || DEFAULT_FORM.service_scope!), ...next } }));

  const setPaxRules = (next: Partial<NonNullable<CouponFormData["pax_rules"]>>) =>
    setFormData((p) => ({ ...p, pax_rules: { ...(p.pax_rules || DEFAULT_FORM.pax_rules!), ...next } }));

  const setDayRules = (next: Partial<NonNullable<CouponFormData["day_rules"]>>) =>
    setFormData((p) => ({ ...p, day_rules: { ...(p.day_rules || DEFAULT_FORM.day_rules!), ...next } }));

  const setStackingRules = (next: Partial<NonNullable<CouponFormData["stacking_rules"]>>) =>
    setFormData((p) => ({ ...p, stacking_rules: { ...(p.stacking_rules || DEFAULT_FORM.stacking_rules!), ...next } }));

  const setWeekdayMarkup = (next: Partial<NonNullable<CouponFormData["date_rules"]["weekday"]>>) =>
    setFormData((p) => ({
      ...p,
      date_rules: {
        ...p.date_rules,
        weekday: { ...(p.date_rules.weekday || DEFAULT_FORM.date_rules.weekday!), ...next },
      },
    }));

  const setWeekendMarkup = (next: Partial<NonNullable<CouponFormData["date_rules"]["weekend"]>>) =>
    setFormData((p) => ({
      ...p,
      date_rules: {
        ...p.date_rules,
        weekend: { ...(p.date_rules.weekend || DEFAULT_FORM.date_rules.weekend!), ...next },
      },
    }));

  const setBlockoutObj = (next: Partial<NonNullable<CouponFormData["date_rules"]["blockout"]>>) =>
    setFormData((p) => ({
      ...p,
      date_rules: {
        ...p.date_rules,
        blockout: { ...(p.date_rules.blockout || DEFAULT_FORM.date_rules.blockout!), ...next },
      },
    }));

  /* =========================
     Coupon type switch behavior (keep schema consistent)
     ========================= */
  const onCouponTypeChange = (ct: CouponType) => {
    setFormData((p) => {
      const next: CouponFormData = { ...p, coupon_type: ct };

      // Align discount.type with coupon_type
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

        next.service_scope = next.service_scope || { level: "SERVICE", service_type: "ROOM" };
        next.pax_rules = next.pax_rules || { min_pax: 1, max_pax: 1, allowed_pax_slabs: ["1"] };
        next.day_rules = next.day_rules || { max_nights_allowed: null, allowed_nights: [], night_groups: [] };
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
     Image handlers (KEEP)
     ========================= */
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;

    const mapped = files.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setImages((prev) => [...prev, ...mapped]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index]?.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const resetForm = () => {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
    setActiveTab("Basics");
    setFormData({ ...DEFAULT_FORM });
  };

  const goNextTab = () => {
    const order: Tab[] = ["Basics", "Eligibility", "Services", "Images"];
    const idx = order.indexOf(activeTab);
    const next = order[Math.min(idx + 1, order.length - 1)];
    setActiveTab(next);
  };

  /* =========================
     Build allowed_services from selected services
     (extended to include hotel_categories for SERVICE_MONETARY schema)
     ========================= */
  const buildAllowedServices = (selected: SelectedService[], hotelCategories: string[] = []) => {
    const hasAny = selected.length > 0 || (hotelCategories?.length || 0) > 0;

    if (!hasAny) {
      return {
        allowed_all: true,
        hotels: {
          allowed_all: true,
          hotel_categories: [] as string[],
          allowed_hotel_ids: [] as string[],
        },
        services: {
          allowed_all: true,
          activity_ids: [] as string[],
          sightseeing_ids: [] as string[],
          leisure_activity_ids: [] as string[],
          nightlife_ids: [] as string[],
          rental_ids: [] as string[],
          pickup_drop_ids: [] as string[],
        },
      };
    }

    const hotels: string[] = [];
    const activity_ids: string[] = [];
    const sightseeing_ids: string[] = [];
    const leisure_activity_ids: string[] = [];
    const nightlife_ids: string[] = [];
    const rental_ids: string[] = [];
    const pickup_drop_ids: string[] = [];

    for (const s of selected) {
      const t = normalizeTitle(s.categoryTitle);

      // Hotels
      if (t === "hotels" || t === "hotel") {
        hotels.push(s.itemId);
        continue;
      }

      // Activities
      if (t === "activities") {
        activity_ids.push(s.itemId);
        continue;
      }

      // Sightseeing
      if (t === "sightseeing") {
        sightseeing_ids.push(s.itemId);
        continue;
      }

      // Leisure Activities
      if (t === "leisure activities" || t === "leisureactivities") {
        leisure_activity_ids.push(s.itemId);
        continue;
      }

      // Nightlife
      if (t === "nightlife") {
        nightlife_ids.push(s.itemId);
        continue;
      }

      // Rentals
      if (t === "rentals" || t === "rental") {
        rental_ids.push(s.itemId);
        continue;
      }

      // Pick & Drop
      if (
        t === "pick & drop" ||
        t === "pick and drop" ||
        t === "pickup & drop" ||
        t === "pickupanddrop"
      ) {
        pickup_drop_ids.push(s.itemId);
        continue;
      }

      // Tour Manager is not in allowed_services.services list in your schema.
    }

    return {
      allowed_all: false,
      hotels: {
        allowed_all: hotels.length === 0 && (hotelCategories?.length || 0) === 0,
        hotel_categories: hotelCategories || [],
        allowed_hotel_ids: hotels,
      },

      services: {
        allowed_all:
          activity_ids.length === 0 &&
          sightseeing_ids.length === 0 &&
          leisure_activity_ids.length === 0 &&
          nightlife_ids.length === 0 &&
          rental_ids.length === 0 &&
          pickup_drop_ids.length === 0,
        activity_ids,
        sightseeing_ids,
        leisure_activity_ids,
        nightlife_ids,
        rental_ids,
        pickup_drop_ids,
      },
    };
  };

  /* =========================
     Submit
     ========================= */
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Only allow submit on the last tab
    if (activeTab !== "Images") return;

    if (!requiredOk || isSubmitting) {
      if (!requiredOk) alert("Please fill all required fields: Title, Coupon Code, and at least one Image.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        coupon_type: formData.coupon_type,
        coupon_code: formData.coupon_code.trim(),
        title: formData.title.trim(),
        description: formData.description?.trim() || "",

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

        allowed_services: buildAllowedServices(formData.services || [], formData.hotel_categories || []),

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

      // Clean undefined
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

      const submitFormData = new FormData();
      submitFormData.append("data", JSON.stringify(payload));
      images.forEach((img) => submitFormData.append("images", img.file));

      const response = await fetch((process.env.NEXT_PUBLIC_API_BASE as string) + "coupons/add", {
        method: "POST",
        body: submitFormData,
      });

      if (response.ok) {
        // router.push("/dashboard/coupons");
        return;
      } else {
        const msg = await safeErrorText(response);
        alert(msg || "Failed to create coupon");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* =========================
     UI
     ========================= */
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-0 sm:px-4 md:px-4">
      <div className="w-full max-w-6xl ml-auto rounded-none sm:rounded-2xl bg-white p-4 sm:p-6 md:p-8 shadow-none sm:shadow-lg min-h-screen sm:min-h-0">
        <form
          className="bg-white rounded-none sm:rounded-2xl shadow-none sm:shadow-md space-y-4 sm:space-y-6"
          onSubmit={handleSubmit}
          aria-busy={isSubmitting}
          onKeyDown={(e) => {
            // Prevent Enter from submitting until Images tab
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
                <span className="text-sm text-gray-700 font-medium">Creating coupon…</span>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-6">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-blue-600 text-white grid place-items-center text-sm font-semibold shadow-sm">
                CF
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 leading-tight">Add New Coupon</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Mobile-first, accessible, and responsive</p>
              </div>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-[.99] touch-manipulation"
              aria-label="Reset form"
              disabled={isSubmitting}
            >
              Reset
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

            {/* Disable inputs while submitting */}
            <fieldset disabled={isSubmitting} className="contents">
              {/* =========================
                  BASICS
                 ========================= */}
              {activeTab === "Basics" && (
                <>
                  <SectionCard title="Basic Information" subtitle="Core coupon info." requiredHint>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Coupon Type" required>
                        <select className="input" value={formData.coupon_type} onChange={(e) => onCouponTypeChange(e.target.value as CouponType)}>
                          <option value="FIXED_VALUE">FIXED_VALUE</option>
                          <option value="PERCENTAGE">PERCENTAGE</option>
                          <option value="SERVICE_MONETARY">SERVICE_MONETARY</option>
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

                      {/* Make Description full width */}
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
                          disabled={isServiceMonetary} // schema always fixed for SERVICE_MONETARY examples
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
                          onChange={(e) => setDiscount({ value: e.target.value === "" ? null : Number(e.target.value) })}
                          placeholder={formData.discount.type === "percentage" ? "e.g., 10" : "e.g., 500"}
                        />
                      </Field>

                      <Field label="Currency">
                        <select className="input" value={formData.discount.currency} onChange={(e) => setDiscount({ currency: e.target.value as Currency })}>
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
                        <input type="datetime-local" className="input" value={formData.date_rules.valid_from} onChange={(e) => setDateRules({ valid_from: e.target.value })} />
                      </Field>

                      <Field label="Valid To">
                        <input type="datetime-local" className="input" value={formData.date_rules.valid_to} onChange={(e) => setDateRules({ valid_to: e.target.value })} />
                      </Field>

                      <div className="sm:col-span-2">
                        <div className="sm:col-span-2">
                          <Field label="Allowed Days">
                            <div className="flex flex-wrap gap-2">
                              {/* ✅ Weekday group (Mon-Fri) */}
                              <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={isWeekdayGroupChecked}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    const current = (formData.date_rules.allowed_days || []) as AllowedDays[];

                                    if (checked) {
                                      // Select Mon-Fri and clear weekend (mutual exclusive)
                                      const withoutWeekend = removeMany(current, WEEKEND);
                                      setAllowedDays(addMany(withoutWeekend, WEEKDAYS));
                                    } else {
                                      // Remove Mon-Fri only
                                      setAllowedDays(removeMany(current, WEEKDAYS));
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">weekday</span>
                              </label>

                              {/* ✅ Weekend group (Sat-Sun) */}
                              <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={isWeekendGroupChecked}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    const current = (formData.date_rules.allowed_days || []) as AllowedDays[];

                                    if (checked) {
                                      // Select Sat-Sun and clear weekdays (mutual exclusive)
                                      const withoutWeekdays = removeMany(current, WEEKDAYS);
                                      setAllowedDays(addMany(withoutWeekdays, WEEKEND));
                                    } else {
                                      // Remove Sat-Sun only
                                      setAllowedDays(removeMany(current, WEEKEND));
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">weekend</span>
                              </label>

                              {/* ✅ Individual days */}
                              {(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as AllowedDays[]).map((day) => (
                                <label key={day} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
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
                                  onChange={(e) => setWeekdayMarkup({ min_markup: e.target.value === "" ? null : Number(e.target.value) })}
                                />
                              </Field>
                              <Field label="Max Markup">
                                <input
                                  type="number"
                                  className="input"
                                  value={formData.date_rules.weekday?.max_markup ?? ""}
                                  onChange={(e) => setWeekdayMarkup({ max_markup: e.target.value === "" ? null : Number(e.target.value) })}
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
                                  onChange={(e) => setWeekendMarkup({ min_markup: e.target.value === "" ? null : Number(e.target.value) })}
                                />
                              </Field>
                              <Field label="Max Markup">
                                <input
                                  type="number"
                                  className="input"
                                  value={formData.date_rules.weekend?.max_markup ?? ""}
                                  onChange={(e) => setWeekendMarkup({ max_markup: e.target.value === "" ? null : Number(e.target.value) })}
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
                              onChange={(e) => setDayRules({ max_nights_allowed: e.target.value === "" ? null : Number(e.target.value) })}
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
                        <ToggleRow label="First Booking" checked={formData.eligibility.first_booking} onChange={(v) => setEligibility({ first_booking: v })} />
                      </div>

                      <Field label="Min Cart Value">
                        <input
                          type="number"
                          inputMode="decimal"
                          className="input"
                          value={formData.eligibility.min_cart_value ?? ""}
                          onChange={(e) => setEligibility({ min_cart_value: e.target.value === "" ? null : Number(e.target.value) })}
                          placeholder="e.g., 3000"
                        />
                      </Field>

                      <Field label="Max Uses Per User">
                        <input
                          type="number"
                          inputMode="numeric"
                          className="input"
                          value={formData.eligibility.max_uses_per_user ?? ""}
                          onChange={(e) => setEligibility({ max_uses_per_user: e.target.value === "" ? null : Number(e.target.value) })}
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
                          onChange={(e) => setUsageLimits({ total_uses: e.target.value === "" ? null : Number(e.target.value) })}
                          placeholder="e.g., 0"
                        />
                      </Field>

                      <Field label="Max Total Uses">
                        <input
                          type="number"
                          inputMode="numeric"
                          className="input"
                          value={formData.usage_limits.max_total_uses ?? ""}
                          onChange={(e) => setUsageLimits({ max_total_uses: e.target.value === "" ? null : Number(e.target.value) })}
                          placeholder="e.g., 10000"
                        />
                      </Field>
                    </div>
                  </SectionCard>
                </>
              )}

              {/* =========================
                  SERVICES TAB (UPDATED)
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
                      Add Services
                    </button>
                  </div>

                  {/* ✅ Show selected hotel star categories */}
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
                          <div key={`${sel.categoryId}-${sel.itemId}`} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                            <div className="p-3 flex gap-3">
                              <div className="shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                                {card?.mediaUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={card.mediaUrl} alt={card.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">No image</div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{card?.title || sel.categoryTitle}</p>
                                    {card?.subtitle && <p className="text-xs text-gray-500 truncate">{card.subtitle}</p>}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFormData((p) => ({
                                        ...p,
                                        services: p.services.filter((x) => !(x.categoryId === sel.categoryId && x.itemId === sel.itemId)),
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
                                    <span className="text-[11px] text-gray-700 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">{card.chip}</span>
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
                  IMAGES TAB (DO NOT CHANGE)
                 ========================= */}
              {activeTab === "Images" && (
                <SectionCard title="Images (required)" subtitle="Add marketing creatives or banners.">
                  {images.length === 0 ? (
                    <div>
                      <label className="block">
                        <div className="flex items-center justify-center w-full px-4 py-10 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 transition-colors bg-white">
                          <div className="text-center">
                            <svg className="mx-auto h-10 w-10 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                              <path
                                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            <p className="mt-2 text-sm text-gray-700">Tap to upload images</p>
                            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB • You can choose multiple</p>
                          </div>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                      </label>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {images.map((image, index) => (
                        <div key={index} className="relative rounded-xl overflow-hidden border border-gray-200 bg-white">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={image.preview} alt={`Image ${index + 1}`} className="w-full h-28 object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg"
                            title="Remove image"
                            aria-label="Remove image"
                          >
                            ×
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                            <p className="text-white text-[11px] truncate" title={image.file.name}>
                              {image.file.name}
                            </p>
                          </div>
                        </div>
                      ))}
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
                      {activeTab === "Images" ? (requiredOk ? "Ready to submit" : "Fill required fields") : "Continue to next"}
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
                        type="submit"
                        disabled={!requiredOk || isSubmitting}
                        className={`px-5 py-2 text-sm font-semibold rounded-xl text-white w-full sm:w-auto transition-colors inline-flex items-center justify-center gap-2 ${
                          !requiredOk || isSubmitting ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                        }`}
                      >
                        {isSubmitting ? (
                          <>
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <circle cx="12" cy="12" r="10" strokeWidth="2" opacity="0.25" />
                              <path d="M22 12a10 10 0 0 1-10 10" strokeWidth="2" />
                            </svg>
                            Creating…
                          </>
                        ) : (
                          "Create Coupon"
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* =========================
              Services Modal (UPDATED)
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
              {/* Backdrop */}
              <button type="button" aria-label="Close" onClick={closeServicePicker} className="absolute inset-0 bg-black/50" />

              {/* Panel */}
              <div className="absolute inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center p-0 md:p-6">
                <div className="relative w-full md:max-w-4xl bg-white rounded-3xl shadow-2xl max-h-[88vh] flex flex-col">
                  {/* Header */}
                  <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-4 md:px-5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm md:text-base font-semibold text-gray-900 truncate">Select Services</h3>
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

                    {/* Tabs */}
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
                              isActive ? "bg-blue-50 border-blue-400 text-blue-700" : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100",
                            ].join(" ")}
                          >
                            {cat.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto px-4 md:px-5 py-4">
                    {loadingServices ? (
                      <div className="py-10 text-center text-sm text-gray-600">Loading services…</div>
                    ) : (() => {
                        const activeCategory =
                          serviceCategories.find((c) => c._id === servicePicker.activeCategoryId) || serviceCategories[0];

                        if (!activeCategory) {
                          return <div className="py-10 text-center text-sm text-gray-600">No categories found.</div>;
                        }

                        const activeMetaKey = SERVICE_META_KEY_BY_TITLE[activeCategory.title] || "";
                        const items: ServiceMetaItem[] = activeMetaKey ? servicesMeta[activeMetaKey] || [] : [];

                        const isHotelsTab = activeMetaKey === "hotels";

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
                            const existsIdx = prev.selected.findIndex((s) => s.categoryId === activeCategory._id && s.itemId === itemId);
                            if (existsIdx >= 0) {
                              const nextSel = [...prev.selected];
                              nextSel.splice(existsIdx, 1);
                              return { ...prev, selected: nextSel };
                            }
                            return {
                              ...prev,
                              selected: [...prev.selected, { categoryId: activeCategory._id, categoryTitle: activeCategory.title, itemId }],
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
                            {/* ✅ Hotels tab: Star Category selector */}
                            {isHotelsTab && hotelStarOptions.length > 0 && (
                              <div className="rounded-2xl border border-gray-200 bg-white p-3">
                                <p className="text-sm font-semibold text-gray-900 mb-2">Select Star Categories</p>

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

                                            // ✅ if category selected, remove already selected hotels of that same category
                                            const nextSelected = checked
                                              ? prev.selected
                                              : prev.selected.filter((s) => {
                                                  // only filter in Hotels category
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
                                          checked ? "bg-blue-50 border-blue-400 text-blue-700" : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100",
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

                            {/* ✅ Hotel list / normal list (same UI) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {items.map((item) => {
                                if (!item._id) return null;

                                const hotelCat = isHotelsTab ? getHotelStarCategory(item) : "";
                                const isBlockedByCategory = isHotelsTab && hotelCat && servicePicker.hotelCategories.includes(hotelCat);

                                const isSelected = servicePicker.selected.some((s) => s.categoryId === activeCategory._id && s.itemId === item._id);

                                const { mediaUrl, title, subtitle, chip, priceLabel, ratingLabel } = getServiceCardContent(activeMetaKey, item);

                                return (
                                  <button
                                    key={item._id}
                                    type="button"
                                    disabled={isBlockedByCategory}
                                    aria-disabled={isBlockedByCategory}
                                    onClick={() => {
                                      if (isBlockedByCategory) return;
                                      toggleSelect(item._id);
                                    }}
                                    className={[
                                      "w-full text-left rounded-2xl border p-3 transition",
                                      isBlockedByCategory
                                        ? "border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed"
                                        : isSelected
                                        ? "border-blue-400 bg-blue-50 shadow-sm"
                                        : "border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300",
                                    ].join(" ")}
                                  >
                                    <div className="flex gap-3">
                                      {/* Image */}
                                      <div className="shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                                        {mediaUrl ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={mediaUrl} alt={title} className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">No image</div>
                                        )}
                                      </div>

                                      {/* Info */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
                                            {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}

                                            {/* ✅ show star category label in hotels */}
                                            {isHotelsTab && hotelCat && (
                                              <p className="text-[11px] text-gray-600 mt-1">
                                                Category: <span className="font-semibold">{hotelCat}</span>
                                                {isBlockedByCategory && <span className="ml-2 text-[11px] text-red-600 font-semibold">(Disabled)</span>}
                                              </p>
                                            )}
                                          </div>

                                          <div className="shrink-0 flex flex-col items-end gap-1">
                                            {priceLabel && <span className="text-xs font-semibold text-blue-700 whitespace-nowrap">{priceLabel}</span>}
                                            {isSelected ? <CheckCircle2 className="h-5 w-5 text-blue-600" /> : <span className="inline-block w-5 h-5 rounded-full border border-gray-300" />}
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

                  {/* Footer (UPDATED: Done enabled when star category selected) */}
                  <div className="sticky bottom-0 bg-white/90 backdrop-blur border-t border-gray-100 px-4 md:px-5 py-3">
                    {(() => {
                      const canDone =
                        servicePicker.selected.length > 0 || (servicePicker.hotelCategories?.length ?? 0) > 0;

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

          {/* Local styles */}
          <style jsx>{`
            .input {
              @apply w-full px-3 py-2.5 sm:py-2 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base touch-manipulation;
            }
            .textarea {
              @apply w-full min-h-[96px] px-3 py-2.5 sm:py-2 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base touch-manipulation;
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

/* =========================
   TagsInput for arrays (terms_conditions, user_type, slabs, etc.)
   ========================= */
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
            <span key={`${tag}-${idx}`} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-800">
              {tag}
              <button type="button" onClick={() => removeTag(idx)} disabled={disabled} className="flex items-center justify-center" title="Remove">
                <X className="h-3 w-3 text-gray-500 hover:text-gray-700" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
