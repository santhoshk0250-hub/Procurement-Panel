"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Utensils,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Loader2,
  Flame,
  Salad,
  Clock3,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  HelpCircle,
  IndianRupee,
} from "lucide-react";
import { useFoodServiceStore } from "@/store/usefoodservice";

// 🔤 Rich text editor
import TinyMCETextEditor from "@/components/TinyMCETextEditor";

/* ----------------------------- Types & Shapes ----------------------------- */

type Category = "breakfast" | "lunch" | "dinner" | "snacks" | "beverages";
type SpiceLevel = "mild" | "medium" | "hot" | "extra-hot";
type AddonCategory = "topping" | "sauce" | "side";

interface DietaryInfo {
  vegetarian: boolean;
  vegan: boolean;
  glutenFree: boolean;
  halal: boolean;
}

type FAQ = { q: string; a: string };

interface SegregatedImageGroup {
  id: string;
  category: string;
  existingImages: string[]; // URLs from backend
  images: ImageFile[]; // newly uploaded files
}

/** ✅ Price Breakdown UI shape
 * - taxes is PERCENT in UI
 * - totalPrice is auto-calculated
 */
interface PriceBreakdownForm {
  basePrice: string;
  serviceCharges: string;
  taxes: string; // percent (UI)
  totalPrice: string; // auto
  markup_min_price: string;
  markup_max_price: string;
}

interface FoodFormData {
  name: string;
  description: string;

  // root price (we will keep in sync with basePrice)
  price: string;

  // ✅ NEW
  priceBreakdown: PriceBreakdownForm;

  bannerUrl?: string | null;
  images: string[];

  // keeping these because your existing API might still expect them
  markup_min_price: number | null;
  markup_max_price: number | null;

  category: Category | "";
  cuisineTags: string[];
  ingredients: string[];
  allergens: string[];
  rating?: number | "";
  reviewCount?: number | "";
  isAvailable: boolean;
  preparationTime: string;
  spiceLevel: SpiceLevel;
  dietaryInfo: DietaryInfo;
  addonIds: string[];
  llm_chips?: FAQ[];
}

interface ImageFile {
  file: File;
  preview: string;
}

interface Addon {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category?: AddonCategory;
  isAvailable?: boolean;
  image?: string;
}

interface LocalAddon {
  tempId: string;
  name: string;
  description: string;
  price: string;
  category: AddonCategory;
  isAvailable: boolean;
  selected: boolean;
}

/* --------------------------------- Utils --------------------------------- */
const nn = (v: string | number | "" | null | undefined) =>
  v === "" || v == null ? NaN : Number(v);
const isFiniteNum = (v: any) => typeof v === "number" && Number.isFinite(v);

const sanitizeHtml = (html: string) =>
  html.replace(/[\n\r]/g, "").replace(/>\s+</g, "><");

/* --------------------------------- Presets -------------------------------- */
const CATEGORIES: Category[] = ["breakfast", "lunch", "dinner", "snacks", "beverages"];
const SPICE_LEVELS: SpiceLevel[] = ["mild", "medium", "hot", "extra-hot"];

/* --------------------------------- Steps --------------------------------- */
const STEPS = [
  { key: "basic", label: "Basic", icon: <Utensils className="size-4" /> },
  { key: "llmChips", label: "LLM Chips", icon: <HelpCircle className="size-4" /> },
  { key: "details", label: "Details", icon: <Salad className="size-4" /> },
  { key: "dietary", label: "Dietary", icon: <Flame className="size-4" /> },
  { key: "media", label: "Media", icon: <ImageIcon className="size-4" /> },
  { key: "segregatedMedia", label: "Segregated Images", icon: <ImageIcon className="size-4" /> },
] as const;

type StepKey = (typeof STEPS)[number]["key"];
const LAST = STEPS.length - 1;

/* ------------------------------ Tag Composer ----------------------------- */
function TagComposer({
  label,
  values,
  onAdd,
  onRemove,
  placeholder,
  disabled,
}: {
  label: string;
  values: string[];
  onAdd: (v: string) => void;
  onRemove: (idx: number) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-[11px] text-gray-400">{values.length} selected</span>
      </div>
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder={placeholder || "Type & press Enter"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const v = draft.trim();
              if (!v) return;
              onAdd(v);
              setDraft("");
            }
          }}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => {
            const v = draft.trim();
            if (!v) return;
            onAdd(v);
            setDraft("");
          }}
          disabled={disabled}
          className="px-3 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300"
        >
          Add
        </button>
      </div>
      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {values.map((v, i) => (
            <span
              key={`${v}-${i}`}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-full border border-gray-300 bg-gray-50"
            >
              {v}
              <button
                type="button"
                className="ml-1 rounded-full p-0.5 hover:bg-gray-200"
                onClick={() => onRemove(i)}
                disabled={disabled}
                aria-label={`Remove ${v}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Main UI -------------------------------- */
export default function EditFoodServiceFormMobile() {
  const router = useRouter();
  const { food } = useFoodServiceStore() as { food: any | null | undefined };

  const noFood = !food || !food._id;

  const [data, setData] = useState<FoodFormData>(() => {
    const pb = food?.priceBreakdown ?? null;

    const basePrice =
      pb?.basePrice != null
        ? String(pb.basePrice)
        : food?.price != null
        ? String(food.price)
        : "";

    const serviceCharges = pb?.serviceCharges != null ? String(pb.serviceCharges) : "0";

    // We store taxes as % in UI.
    // If backend stores amount, we cannot reliably infer percent without additional info.
    // So default to 0% unless your API also returns a percent.
    const taxesPercent = pb?.taxes != null ? String(pb.taxes) : "0";

    const markupMin =
      pb?.markup_min_price != null
        ? String(pb.markup_min_price)
        : food?.markup_min_price != null
        ? String(food.markup_min_price)
        : "";

    const markupMax =
      pb?.markup_max_price != null
        ? String(pb.markup_max_price)
        : food?.markup_max_price != null
        ? String(food.markup_max_price)
        : "";

    const totalPrice = pb?.totalPrice != null ? String(pb.totalPrice) : "";

    if (!food) {
      return {
        name: "",
        description: "",
        price: "",
        priceBreakdown: {
          basePrice: "",
          serviceCharges: "0",
          taxes: "0",
          totalPrice: "",
          markup_min_price: "",
          markup_max_price: "",
        },
        bannerUrl: null,
        images: [],
        category: "",
        cuisineTags: [],
        ingredients: [],
        allergens: [],
        rating: "",
        reviewCount: "",
        isAvailable: true,
        preparationTime: "",
        spiceLevel: "mild",
        markup_min_price: null,
        markup_max_price: null,
        dietaryInfo: { vegetarian: false, vegan: false, glutenFree: false, halal: false },
        addonIds: [],
      };
    }

    return {
      name: String(food.name ?? ""),
      description: String(food.description ?? ""),
      price: basePrice, // keep root price = basePrice
      priceBreakdown: {
        basePrice,
        serviceCharges,
        taxes: taxesPercent, // percent UI
        totalPrice,
        markup_min_price: markupMin,
        markup_max_price: markupMax,
      },
      bannerUrl: String(food.banner ?? "") || null,
      images: Array.isArray(food.images) ? food.images : [],
      category: (food.category ?? "") as Category,
      cuisineTags: Array.isArray(food.cuisine) ? food.cuisine : [],
      ingredients: Array.isArray(food.ingredients) ? food.ingredients : [],
      allergens: Array.isArray(food.allergens) ? food.allergens : [],
      rating: Number.isFinite(Number(food.rating)) ? Number(food.rating) : "",
      reviewCount: Number.isFinite(Number(food.reviewCount)) ? Number(food.reviewCount) : "",
      isAvailable: !!food.isAvailable,
      preparationTime: String(food.preparationTime ?? ""),
      markup_min_price: Number.isFinite(Number(food.markup_min_price)) ? Number(food.markup_min_price) : null,
      markup_max_price: Number.isFinite(Number(food.markup_max_price)) ? Number(food.markup_max_price) : null,
      spiceLevel: (food.spiceLevel ?? "mild") as SpiceLevel,
      dietaryInfo: {
        vegetarian: !!food?.dietaryInfo?.vegetarian,
        vegan: !!food?.dietaryInfo?.vegan,
        glutenFree: !!food?.dietaryInfo?.glutenFree,
        halal: !!food?.dietaryInfo?.halal,
      },
      addonIds: Array.isArray(food.addons) ? food.addons : [],
    };
  });

  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  const [submitting, setSubmitting] = useState(false);

  // LLM chips
  const [llmChips, setLlmChips] = useState<FAQ[]>(
    food?.llm_chips && food.llm_chips.length ? food.llm_chips : [{ q: "", a: "" }]
  );

  const addLlmChip = () => setLlmChips((p) => [...p, { q: "", a: "" }]);
  const remLlmChip = (idx: number) =>
    setLlmChips((p) => (p.length <= 1 ? [{ q: "", a: "" }] : p.filter((_, i) => i !== idx)));
  const setLlmChip = (idx: number, next: Partial<FAQ>) =>
    setLlmChips((p) => p.map((c, i) => (i === idx ? { ...c, ...next } : c)));

  // gallery
  const [newImages, setNewImages] = useState<ImageFile[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>(
    Array.isArray(food?.images) ? food!.images : []
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // banner
  const [newBanner, setNewBanner] = useState<ImageFile | null>(null);
  const [existingBannerUrl, setExistingBannerUrl] = useState<string | null>(food?.banner || null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  // Add-ons
  const [addons, setAddons] = useState<Addon[]>(
    Array.isArray(food?.addonsFull) ? (food!.addonsFull as Addon[]) : []
  );
  const [addonsLoading, setAddonsLoading] = useState(false);
  const [addonsError, setAddonsError] = useState<string | null>(null);

  // Local add-ons
  const [localAddons, setLocalAddons] = useState<LocalAddon[]>([]);

  // Dropdown state
  const [addonQuery, setAddonQuery] = useState("");
  const [addonsOpen, setAddonsOpen] = useState(false);
  const [addonsOpenUp, setAddonsOpenUp] = useState(false);
  const addonsDropdownRef = useRef<HTMLDivElement | null>(null);
  const addonsTriggerRef = useRef<HTMLButtonElement | null>(null);

  // Create add-on modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<{
    name: string;
    description: string;
    price: string;
    category: AddonCategory | "";
    isAvailable: boolean;
  }>({ name: "", description: "", price: "", category: "", isAvailable: true });

  const resetCreateForm = () =>
    setCreateForm({ name: "", description: "", price: "", category: "", isAvailable: true });

  // segregated images
  const [segregatedGroups, setSegregatedGroups] = useState<SegregatedImageGroup[]>(() => {
    const seg = food?.segregated_images || food?.segregatedImages;
    if (Array.isArray(seg) && seg.length > 0) {
      return seg.map((g: any, idx: number) => ({
        id: `seg-${idx}`,
        category: g.category || "",
        existingImages: Array.isArray(g.urls) ? g.urls : [],
        images: [],
      }));
    }
    return [{ id: "seg-0", category: "", existingImages: [], images: [] }];
  });

  const addSegGroup = () => {
    setSegregatedGroups((prev) => [
      ...prev,
      { id: `seg-${prev.length}`, category: "", existingImages: [], images: [] },
    ]);
  };

  const removeSegGroup = (id: string) => {
    setSegregatedGroups((prev) => {
      const toRemove = prev.find((g) => g.id === id);
      toRemove?.images.forEach((img) => URL.revokeObjectURL(img.preview));
      const next = prev.filter((g) => g.id !== id);
      return next.length ? next : [{ id: "seg-0", category: "", existingImages: [], images: [] }];
    });
  };

  const updateSegGroupCategory = (id: string, category: string) => {
    setSegregatedGroups((prev) => prev.map((g) => (g.id === id ? { ...g, category } : g)));
  };

  const handleSegImagesUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    const mapped: ImageFile[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setSegregatedGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, images: [...g.images, ...mapped] } : g))
    );
    e.target.value = "";
  };

  const removeSegImage = (groupId: string, idx: number) => {
    setSegregatedGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const img = g.images[idx];
        if (img?.preview) URL.revokeObjectURL(img.preview);
        return { ...g, images: g.images.filter((_, i) => i !== idx) };
      })
    );
  };

  const removeExistingSegImage = (groupId: string, url: string) => {
    setSegregatedGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, existingImages: g.existingImages.filter((u) => u !== url) } : g
      )
    );
  };

  // Close dropdown on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!addonsOpen) return;
      const target = e.target as Node;
      if (addonsDropdownRef.current && !addonsDropdownRef.current.contains(target)) {
        setAddonsOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [addonsOpen]);

  // Auto placement
  useEffect(() => {
    if (!addonsOpen || !addonsTriggerRef.current) return;
    const rect = addonsTriggerRef.current.getBoundingClientRect();
    const ESTIMATED_PANEL_HEIGHT = 320;
    const hasRoomBelow = window.innerHeight - rect.bottom > ESTIMATED_PANEL_HEIGHT;
    setAddonsOpenUp(!hasRoomBelow);
  }, [addonsOpen, addonQuery, addons.length, localAddons.length]);

  // Fetch all add-ons
  useEffect(() => {
    let cancelled = false;
    async function fetchAllAddons() {
      try {
        setAddonsLoading(true);
        setAddonsError(null);

        const base = process.env.NEXT_PUBLIC_API_BASE;
        if (!base) throw new Error("Missing NEXT_PUBLIC_API_BASE");

        const firstUrl = `${base}addons/getall?page=1&limit=100`;
        const firstRes = await fetch(firstUrl, { method: "GET" });
        if (!firstRes.ok) throw new Error(`Fetch failed: ${await firstRes.text()}`);

        const firstJson = await firstRes.json();
        const list: Addon[] = firstJson?.data ?? [];
        const pages = Number(firstJson?.pagination?.pages ?? 1);

        for (let p = 2; p <= pages; p++) {
          const url = `${base}addons/getall?page=${p}&limit=100`;
          const res = await fetch(url, { method: "GET" });
          if (!res.ok) continue;
          const j = await res.json();
          if (Array.isArray(j?.data)) list.push(...j.data);
        }

        const map = new Map<string, Addon>();
        (Array.isArray(food?.addonsFull) ? (food!.addonsFull as Addon[]) : []).forEach((a) => map.set(a._id, a));
        list.forEach((a) => {
          if (!map.has(a._id)) map.set(a._id, a);
        });

        if (!cancelled) setAddons(Array.from(map.values()));
      } catch (err: any) {
        if (!cancelled) setAddonsError(err?.message || "Failed to load add-ons");
      } finally {
        if (!cancelled) setAddonsLoading(false);
      }
    }

    fetchAllAddons();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [food?._id]);

  /* -------------------------- Price Breakdown Helpers -------------------------- */
  const onPB = (name: keyof PriceBreakdownForm, val: any) =>
    setData((p) => ({ ...p, priceBreakdown: { ...p.priceBreakdown, [name]: val } }));

  const pbTaxAmount = useMemo(() => {
    const b = nn(data.priceBreakdown.basePrice);
    const s = nn(data.priceBreakdown.serviceCharges);
    const pct = nn(data.priceBreakdown.taxes); // percent
    if (!Number.isFinite(b) || !Number.isFinite(s) || !Number.isFinite(pct)) return "";
    const taxable = Math.max(0, b + s);
    const taxAmt = Math.max(0, (taxable * pct) / 100);
    return String(Math.round(taxAmt * 100) / 100);
  }, [data.priceBreakdown.basePrice, data.priceBreakdown.serviceCharges, data.priceBreakdown.taxes]);

  const pbTotal = useMemo(() => {
    const b = nn(data.priceBreakdown.basePrice);
    const s = nn(data.priceBreakdown.serviceCharges);
    const taxAmt = nn(pbTaxAmount);
    if (!Number.isFinite(b) || !Number.isFinite(s) || !Number.isFinite(taxAmt)) return "";
    return String(Math.max(0, b + s + taxAmt));
  }, [data.priceBreakdown.basePrice, data.priceBreakdown.serviceCharges, pbTaxAmount]);

  // keep totalPrice + root price + root markups synced
  useEffect(() => {
    setData((p) => ({
      ...p,
      price: p.priceBreakdown.basePrice || p.price,
      markup_min_price:
        p.priceBreakdown.markup_min_price === "" ? p.markup_min_price : Number(p.priceBreakdown.markup_min_price || 0),
      markup_max_price:
        p.priceBreakdown.markup_max_price === "" ? p.markup_max_price : Number(p.priceBreakdown.markup_max_price || 0),
      priceBreakdown: {
        ...p.priceBreakdown,
        totalPrice: pbTotal,
      },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pbTotal]);

  /* ------------------------------- Validation ------------------------------ */
  const isStepValid = (k: StepKey) => {
    if (k === "basic") {
      const baseOk =
        data.name.trim().length > 0 &&
        data.category !== "" &&
        isFiniteNum(nn(data.priceBreakdown.basePrice)) &&
        nn(data.priceBreakdown.basePrice) >= 0 &&
        isFiniteNum(nn(data.preparationTime)) &&
        nn(data.preparationTime) >= 0;

      const scOk =
        data.priceBreakdown.serviceCharges === "" ||
        (isFiniteNum(nn(data.priceBreakdown.serviceCharges)) && nn(data.priceBreakdown.serviceCharges) >= 0);

      const taxOk =
        data.priceBreakdown.taxes === "" ||
        (isFiniteNum(nn(data.priceBreakdown.taxes)) && nn(data.priceBreakdown.taxes) >= 0);

      const totalOk = pbTotal !== "" && isFiniteNum(nn(pbTotal)) && nn(pbTotal) >= 0;

      return baseOk && scOk && taxOk && totalOk;
    }
    return true;
  };

  const canSubmit = useMemo(() => {
    const basicOK = isStepValid("basic");
    const hasBanner = !!newBanner || !!existingBannerUrl;
    return basicOK && hasBanner;
  }, [newBanner, existingBannerUrl, data, pbTotal]);

  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  /* --------------------------------- Handlers ------------------------------ */
  const onText = (name: keyof FoodFormData, val: any) => setData((p) => ({ ...p, [name]: val }));

  const addCuisine = (v: string) => setData((p) => ({ ...p, cuisineTags: [...p.cuisineTags, v] }));
  const remCuisine = (i: number) =>
    setData((p) => ({ ...p, cuisineTags: p.cuisineTags.filter((_, idx) => idx !== i) }));

  const addIngredient = (v: string) => setData((p) => ({ ...p, ingredients: [...p.ingredients, v] }));
  const remIngredient = (i: number) =>
    setData((p) => ({ ...p, ingredients: p.ingredients.filter((_, idx) => idx !== i) }));

  const addAllergen = (v: string) => setData((p) => ({ ...p, allergens: [...p.allergens, v] }));
  const remAllergen = (i: number) =>
    setData((p) => ({ ...p, allergens: p.allergens.filter((_, idx) => idx !== i) }));

  // Add-ons
  const toggleAddon = (id: string) => {
    setData((p) => {
      const exists = p.addonIds.includes(id);
      const addonIds = exists ? p.addonIds.filter((x) => x !== id) : [...p.addonIds, id];
      return { ...p, addonIds };
    });
  };

  const toggleLocalAddon = (tempId: string) => {
    setLocalAddons((prev) => prev.map((a) => (a.tempId === tempId ? { ...a, selected: !a.selected } : a)));
  };

  const saveLocalAddon = () => {
    setCreateErr(null);
    const name = createForm.name.trim();
    const category = createForm.category;
    const priceStr = (createForm.price ?? "").toString().trim();

    if (!name) return setCreateErr("Name is required");
    if (!category) return setCreateErr("Category is required");
    if (priceStr === "" || Number.isNaN(Number(priceStr)) || Number(priceStr) < 0)
      return setCreateErr("Price must be a valid, non-negative number");

    setCreateLoading(true);
    const newLocal: LocalAddon = {
      tempId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      description: createForm.description.trim(),
      price: priceStr,
      category,
      isAvailable: !!createForm.isAvailable,
      selected: true,
    };

    setLocalAddons((prev) => [newLocal, ...prev]);
    setCreateLoading(false);
    setCreateOpen(false);
    resetCreateForm();
    setAddonsOpen(true);
  };

  // Selected summary
  const addonsSelectedSummary = useMemo(() => {
    const existingNames = data.addonIds
      .map((id) => addons.find((a) => a._id === id)?.name)
      .filter(Boolean) as string[];
    const localNames = localAddons.filter((a) => a.selected).map((a) => a.name);
    const names = [...existingNames, ...localNames];
    if (addonsLoading) return "Loading add-ons…";
    if (addonsError) return "Failed to load add-ons";
    if (names.length === 0) return "Select add-ons";
    if (names.length <= 2) return names.join(", ");
    return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
  }, [data.addonIds, addons, localAddons, addonsLoading, addonsError]);

  /* ------------------------------- Media Uploads --------------------------- */
  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (newBanner?.preview) URL.revokeObjectURL(newBanner.preview);
    setNewBanner({ file, preview: URL.createObjectURL(file) });
    if (bannerInputRef.current) bannerInputRef.current.value = "";
  };

  const clearBanner = () => {
    if (newBanner?.preview) URL.revokeObjectURL(newBanner.preview);
    setNewBanner(null);
    setExistingBannerUrl(null);
  };

  const handleImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    const mapped = files.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setNewImages((prev) => [...prev, ...mapped]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeNewImage = (i: number) => {
    setNewImages((prev) => {
      URL.revokeObjectURL(prev[i]?.preview);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const removeExistingImage = (url: string) => {
    setExistingImageUrls((prev) => prev.filter((u) => u !== url));
  };

  /* --------------------------------- Nav ---------------------------------- */
  const goNext = () => {
    if (!isStepValid(step.key)) return;
    if (stepIndex >= LAST) return;
    setStepIndex((i) => Math.min(LAST, i + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setStepIndex((i) => Math.max(0, i - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* -------------------------------- Submit -------------------------------- */
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canSubmit || noFood) return;

    try {
      setSubmitting(true);

      // ✅ Compute amount values for DB schema
      const basePriceNum = Number(data.priceBreakdown.basePrice || 0);
      const serviceChargesNum = Number(data.priceBreakdown.serviceCharges || 0);
      const taxPercentNum = Number(data.priceBreakdown.taxes || 0);

      const taxable = Math.max(0, basePriceNum + serviceChargesNum);
      const taxAmountNum = Math.max(0, (taxable * taxPercentNum) / 100);
      const totalPriceNum = Math.max(0, taxable + taxAmountNum);

      const markupMinNum = Number(data.priceBreakdown.markup_min_price || 0);
      const markupMaxNum = Number(data.priceBreakdown.markup_max_price || 0);

      const payload: any = {
        name: data.name.trim(),
        description: data.description.trim(),

        // keep root price for your old code paths
        price: basePriceNum,

        // ✅ required by mongoose schema
        priceBreakdown: {
          basePrice: basePriceNum,
          serviceCharges: serviceChargesNum,
          taxes: Number(data.priceBreakdown.taxes), // amount
          totalPrice: Number((Math.round(totalPriceNum * 100) / 100).toFixed(2)),
          markup_min_price: markupMinNum,
          markup_max_price: markupMaxNum,
        },

        // keeping these too (backward compat)
        markup_min_price: markupMinNum,
        markup_max_price: markupMaxNum,

        category: data.category,
        cuisine: data.cuisineTags.map((s) => s.trim()).filter(Boolean),
        ingredients: data.ingredients.map((s) => s.trim()).filter(Boolean),
        allergens: data.allergens.map((s) => s.trim()).filter(Boolean),
        rating: data.rating === "" || data.rating == null ? 0 : Math.max(0, Math.min(5, Number(data.rating))),
        reviewCount: data.reviewCount === "" || data.reviewCount == null ? 0 : Math.max(0, Number(data.reviewCount)),
        isAvailable: !!data.isAvailable,
        preparationTime: Number(data.preparationTime || 0),
        spiceLevel: data.spiceLevel,
        dietaryInfo: {
          vegetarian: !!data.dietaryInfo.vegetarian,
          vegan: !!data.dietaryInfo.vegan,
          glutenFree: !!data.dietaryInfo.glutenFree,
          halal: !!data.dietaryInfo.halal,
        },
        llm_chips: llmChips
          .map((c) => ({
            q: (c.q || "").trim(),
            a: sanitizeHtml((c.a || "").trim()),
          }))
          .filter((c) => c.q || c.a),

        addons: data.addonIds.filter(Boolean),
        newaddons: localAddons
          .filter((a) => a.selected)
          .map(({ name, description, price, category, isAvailable }) => ({
            name,
            description,
            price,
            category,
            isAvailable,
          })),

        segregated_images: segregatedGroups
          .map((g) => ({
            category: g.category.trim(),
            urls: g.existingImages,
          }))
          .filter((g) => g.category || g.urls.length > 0),
      };

      const form = new FormData();
      form.append("data", JSON.stringify(payload));

      if (newBanner?.file) form.append("banner", newBanner.file);
      if (existingBannerUrl) form.append("banner_keep", existingBannerUrl);

      existingImageUrls.forEach((url) => form.append("images_keep", url));
      newImages.forEach((img) => form.append("images", img.file));

      segregatedGroups.forEach((group, gIdx) => {
        group.images.forEach((img) => {
          form.append(`segregated_images_${gIdx}`, img.file);
        });
      });

      form.append(
        "images_change_summary",
        JSON.stringify({
          kept_count: existingImageUrls.length,
          added_count: newImages.length,
          banner_changed: !!newBanner,
        })
      );

      const url = `${process.env.NEXT_PUBLIC_API_BASE}food-services/update/${food._id}`;
      const res = await fetch(url, { method: "PATCH", body: form });

      if (res.ok) {
        alert("Food item updated successfully! 🎉");
        router.push("/dashboard/Food-service");
      } else {
        const text = await res.text();
        console.error("Update failed:", text);
        alert(`Failed to update: ${text}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Unexpected error: ${err?.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  const resetAll = () => {
    if (!food) return;

    const pb = food?.priceBreakdown ?? null;
    const basePrice =
      pb?.basePrice != null ? String(pb.basePrice) : food?.price != null ? String(food.price) : "";
    const serviceCharges = pb?.serviceCharges != null ? String(pb.serviceCharges) : "0";
    const taxesPercent = pb?.taxesPercent != null ? String(pb.taxesPercent) : "0";

    const markupMin =
      pb?.markup_min_price != null
        ? String(pb.markup_min_price)
        : food?.markup_min_price != null
        ? String(food.markup_min_price)
        : "";
    const markupMax =
      pb?.markup_max_price != null
        ? String(pb.markup_max_price)
        : food?.markup_max_price != null
        ? String(food.markup_max_price)
        : "";

    setData({
      name: String(food.name ?? ""),
      description: String(food.description ?? ""),
      price: basePrice,
      priceBreakdown: {
        basePrice,
        serviceCharges,
        taxes: taxesPercent,
        totalPrice: pb?.totalPrice != null ? String(pb.totalPrice) : "",
        markup_min_price: markupMin,
        markup_max_price: markupMax,
      },
      bannerUrl: String(food.banner ?? "") || null,
      images: Array.isArray(food.images) ? food.images : [],
      category: (food.category ?? "") as Category,
      cuisineTags: Array.isArray(food.cuisine) ? food.cuisine : [],
      ingredients: Array.isArray(food.ingredients) ? food.ingredients : [],
      allergens: Array.isArray(food.allergens) ? food.allergens : [],
      rating: Number.isFinite(Number(food.rating)) ? Number(food.rating) : "",
      reviewCount: Number.isFinite(Number(food.reviewCount)) ? Number(food.reviewCount) : "",
      isAvailable: !!food.isAvailable,
      preparationTime: String(food.preparationTime ?? ""),
      markup_min_price: Number.isFinite(Number(food.markup_min_price)) ? Number(food.markup_min_price) : null,
      markup_max_price: Number.isFinite(Number(food.markup_max_price)) ? Number(food.markup_max_price) : null,
      spiceLevel: (food.spiceLevel ?? "mild") as SpiceLevel,
      dietaryInfo: {
        vegetarian: !!food?.dietaryInfo?.vegetarian,
        vegan: !!food?.dietaryInfo?.vegan,
        glutenFree: !!food?.dietaryInfo?.glutenFree,
        halal: !!food?.dietaryInfo?.halal,
      },
      addonIds: Array.isArray(food.addons) ? food.addons : [],
    });

    setNewImages([]);
    setExistingImageUrls(Array.isArray(food.images) ? food.images : []);

    if (newBanner?.preview) URL.revokeObjectURL(newBanner.preview);
    setNewBanner(null);
    setExistingBannerUrl(food.banner || null);

    if (fileInputRef.current) fileInputRef.current.value = "";
    if (bannerInputRef.current) bannerInputRef.current.value = "";

    setLocalAddons([]);
    setAddonQuery("");
  };

  if (noFood) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900 font-medium">
            No food selected to edit. Please open this page after selecting a food item.
          </p>
        </div>
      </div>
    );
  }

  /* --------------------------------- Render -------------------------------- */
  return (
    <form className="min-h-screen bg-gray-50" onSubmit={handleSubmit}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-gray-200">
        <div className="px-4 py-3 sm:px-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-blue-600 text-white grid place-items-center text-sm font-bold shadow">
              {(data.name?.[0] || "F").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-gray-900 truncate">
                Edit Food Item — {data.name || "Untitled"}
              </h1>
              <p className="text-[11px] text-gray-500 truncate">Update fields and save</p>
            </div>
            <button
              type="button"
              onClick={resetAll}
              disabled={submitting}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
                submitting ? "border-gray-200 text-gray-400" : "border-gray-300 text-gray-700 hover:bg-gray-50"
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
                    if (i <= stepIndex) setStepIndex(i);
                    else {
                      const allPrevValid = STEPS.slice(0, i).every((st) => isStepValid(st.key as StepKey));
                      if (allPrevValid) setStepIndex(i);
                    }
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs whitespace-nowrap ${
                    active
                      ? "bg-blue-50 border-blue-500 text-blue-700"
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
              className={`h-full transition-all ${submitting ? "bg-blue-400" : "bg-blue-600"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto p-4 sm:p-6 pb-36">
        {/* BASIC */}
        {step.key === "basic" && (
                <SectionCard
                  title="Basic Information"
                  subtitle="Name, price, price breakdown, category and availability."
                  icon={<Utensils className="size-5 text-blue-600" />}
                  requiredHint
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Name" required>
                      <input
                        type="text"
                        className="input"
                        value={data.name}
                        onChange={(e) => onText("name", e.target.value)}
                        placeholder="Paneer Tikka"
                        disabled={submitting}
                      />
                    </Field>
      
                    {/* Keep top price input, sync it with basePrice */}
                    {/* <Field label="Price (₹)" required hint="Synced with Base Price">
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        className="input"
                        value={data.price}
                        onChange={(e) => {
                          const v = e.target.value;
                          setData((p) => ({
                            ...p,
                            price: v,
                            priceBreakdown: { ...p.priceBreakdown, basePrice: v },
                          }));
                        }}
                        placeholder="199"
                        disabled={submitting}
                      />
                    </Field> */}
      
                    {/* PRICE BREAKDOWN AFTER PRICE */}
                    <div className="sm:col-span-2">
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">Price Breakdown</p>
                            <p className="text-[11px] text-gray-500">Total auto-calculates: base + service + taxes</p>
                          </div>
                        </div>
      
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Field label="Base Price (₹)" required>
                            <div className="relative">
                              <input
                                type="number"
                                className="input pl-9"
                                min={0}
                                value={data.priceBreakdown.basePrice}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setData((p) => ({
                                    ...p,
                                    price: v,
                                    priceBreakdown: { ...p.priceBreakdown, basePrice: v },
                                  }));
                                }}
                                placeholder="e.g., 199"
                                disabled={submitting}
                              />
                              <IndianRupee className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                          </Field>
      
                          <Field label="Service Charges (₹)">
                            <div className="relative">
                              <input
                                type="number"
                                className="input pl-9"
                                min={0}
                                value={data.priceBreakdown.serviceCharges}
                                onChange={(e) => onPB("serviceCharges", e.target.value)}
                                placeholder="e.g., 10"
                                disabled={submitting}
                              />
                              <IndianRupee className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                          </Field>
      
                        <Field label="Taxes (%)">
                            <div className="relative">
                              <input
                                type="number"
                                className="input pr-12"
                                min={0}
                                step="0.01"
                                value={data.priceBreakdown.taxes} // percent
                                onChange={(e) => onPB("taxes", e.target.value)}
                                placeholder="e.g., 5"
                                disabled={submitting}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-semibold">
                                %
                              </span>
                            </div>
                            {/* optional helper line */}
                            <p className="mt-1 text-[11px] text-gray-500">
                              Tax amount: ₹{pbTaxAmount || "0"}
                            </p>
                          </Field>
      
                          <Field label="Total Price (₹)" required hint="Auto-calculated">
                            <div className="relative">
                              <input
                                type="number"
                                className="input pl-9"
                                value={data.priceBreakdown.totalPrice}
                                readOnly
                                disabled
                              />
                              <IndianRupee className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                          </Field>
      
                          <Field label="Markup Min Price (₹)" required>
                            <div className="relative">
                              <input
                                type="number"
                                className="input pl-9"
                                min={0}
                                value={data.priceBreakdown.markup_min_price}
                                onChange={(e) => onPB("markup_min_price", e.target.value)}
                                placeholder="e.g., 200"
                                disabled={submitting}
                              />
                              <IndianRupee className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                          </Field>
      
                          <Field label="Markup Max Price (₹)" required>
                            <div className="relative">
                              <input
                                type="number"
                                className="input pl-9"
                                min={0}
                                value={data.priceBreakdown.markup_max_price}
                                onChange={(e) => onPB("markup_max_price", e.target.value)}
                                placeholder="e.g., 500"
                                disabled={submitting}
                              />
                              <IndianRupee className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                          </Field>
                        </div>
                      </div>
                    </div>
      
                    <Field label="Category" required>
                      <select
                        className="input"
                        value={data.category}
                        onChange={(e) => onText("category", e.target.value as Category)}
                        disabled={submitting}
                      >
                        <option value="">Select category</option>
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </Field>
      
                    <Field label="Spice level">
                      <select
                        className="input"
                        value={data.spiceLevel}
                        onChange={(e) => onText("spiceLevel", e.target.value as SpiceLevel)}
                        disabled={submitting}
                      >
                        {SPICE_LEVELS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </Field>
      
                    <Field label="Available now?">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onText("isAvailable", !data.isAvailable)}
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold ${
                            data.isAvailable ? "border-green-500 bg-green-50 text-green-700" : "border-gray-300 bg-white text-gray-700"
                          }`}
                        >
                          <Check className={`size-4 ${data.isAvailable ? "opacity-100" : "opacity-30"}`} />
                          {data.isAvailable ? "Available" : "Mark available"}
                        </button>
                      </div>
                    </Field>
      
                    <Field label="Preparation time (minutes)" required>
                      <div className="relative">
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          className="input pr-14"
                          value={data.preparationTime}
                          onChange={(e) => onText("preparationTime", e.target.value)}
                          placeholder="15"
                          disabled={submitting}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 inline-flex items-center gap-1">
                          <Clock3 className="size-3.5" /> mins
                        </span>
                      </div>
                    </Field>
                  </div>
      
                  <div className="mt-4">
                    <Field label="Description">
                      <div className="rounded-xl border border-gray-300 bg-white">
                        <TinyMCETextEditor
                          value={data.description || ""}
                          onChange={(html) => setData((p) => ({ ...p, description: html }))}
                          placeholder="Write a short description…"
                        />
                      </div>
                    </Field>
                  </div>
                </SectionCard>
              )}

        {/* DETAILS */}
        {step.key === "details" && (
          <SectionCard
            title="Cuisines, Ingredients & Allergens"
            subtitle="Tag the dish for quick discovery."
            icon={<Salad className="size-5 text-blue-600" />}
            requiredHint
          >
            <div className="space-y-5">
              <TagComposer
                label="Cuisine tags (required)"
                values={data.cuisineTags}
                onAdd={(v) => addCuisine(v)}
                onRemove={(i) => remCuisine(i)}
                placeholder="e.g., North Indian, Italian, Thai"
                disabled={submitting}
              />

              <TagComposer
                label="Ingredients"
                values={data.ingredients}
                onAdd={(v) => addIngredient(v)}
                onRemove={(i) => remIngredient(i)}
                placeholder="e.g., Paneer, Tomato, Basil"
                disabled={submitting}
              />

              <TagComposer
                label="Allergens"
                values={data.allergens}
                onAdd={(v) => addAllergen(v)}
                onRemove={(i) => remAllergen(i)}
                placeholder="e.g., Nuts, Gluten, Dairy"
                disabled={submitting}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Rating (0–5)">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={5}
                    className="input"
                    value={data.rating === "" ? "" : Number(data.rating)}
                    onChange={(e) => onText("rating", e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="4.5"
                    disabled={submitting}
                  />
                </Field>

                <Field label="Review count">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    className="input"
                    value={data.reviewCount === "" ? "" : Number(data.reviewCount)}
                    onChange={(e) => onText("reviewCount", e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0"
                    disabled={submitting}
                  />
                </Field>
              </div>

              {/* Add-ons dropdown */}
              <div ref={addonsDropdownRef} className="relative">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-700">Add-ons</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400">
                      {data.addonIds.length + localAddons.filter((a) => a.selected).length} selected
                    </span>
                    <button
                      type="button"
                      onClick={() => setCreateOpen(true)}
                      className="size-8 grid place-items-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50"
                      title="Add new add-on"
                      aria-label="Add add-on"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>

                <button
                  ref={addonsTriggerRef}
                  type="button"
                  onClick={() => setAddonsOpen((v) => !v)}
                  disabled={addonsLoading || !!addonsError || submitting}
                  className={`w-full h-12 px-4 py-3 rounded-xl border bg-white text-left flex items-center justify-between ${
                    addonsLoading || submitting
                      ? "border-gray-200 text-gray-400"
                      : "border-gray-300 text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  <span className="truncate">{addonsSelectedSummary}</span>
                  {addonsOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </button>

                {addonsOpen && !addonsLoading && !addonsError && (
                  <div
                    className={`absolute z-[80] w-full rounded-2xl border border-gray-200 bg-white shadow-lg ${
                      addonsOpenUp ? "bottom-full mb-2" : "top-full mt-2"
                    }`}
                  >
                    <div className="p-2 border-b border-gray-100">
                      <input
                        className="input h-10"
                        placeholder="Search add-ons by name…"
                        value={addonQuery}
                        onChange={(e) => setAddonQuery(e.target.value)}
                        disabled={submitting}
                      />
                    </div>

                    <ul className="max-h-72 overflow-auto overscroll-contain" role="listbox" aria-multiselectable="true">
                      {localAddons
                        .filter((a) => a.name.toLowerCase().includes(addonQuery.trim().toLowerCase()))
                        .map((a) => (
                          <li key={a.tempId} role="option" aria-selected={a.selected}>
                            <label className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-gray-50">
                              <input
                                type="checkbox"
                                className="size-4"
                                checked={a.selected}
                                onChange={() => toggleLocalAddon(a.tempId)}
                                disabled={submitting}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {a.name} <span className="text-[10px] text-blue-600">(new)</span>
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  ₹{a.price} • {a.category} {a.isAvailable ? "" : "• Unavailable"}
                                </p>
                              </div>
                            </label>
                          </li>
                        ))}

                      {addons
                        .filter((a) => a.name.toLowerCase().includes(addonQuery.trim().toLowerCase()))
                        .map((a) => {
                          const checked = data.addonIds.includes(a._id);
                          const disabledItem = submitting || a.isAvailable === false;
                          return (
                            <li key={a._id} role="option" aria-selected={checked}>
                              <label className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-gray-50">
                                <input
                                  type="checkbox"
                                  className="size-4"
                                  checked={checked}
                                  onChange={() => toggleAddon(a._id)}
                                  disabled={disabledItem}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{a.name}</p>
                                  <p className="text-xs text-gray-500 truncate">
                                    ₹{a.price}
                                    {a.category ? ` • ${a.category}` : ""}
                                    {a.isAvailable === false ? " • Unavailable" : ""}
                                  </p>
                                </div>
                              </label>
                            </li>
                          );
                        })}

                      {localAddons.filter((a) => a.name.toLowerCase().includes(addonQuery.trim().toLowerCase())).length ===
                        0 &&
                        addons.filter((a) => a.name.toLowerCase().includes(addonQuery.trim().toLowerCase())).length ===
                          0 && <li className="px-4 py-3 text-sm text-gray-500">No add-ons found.</li>}
                    </ul>

                    <div className="flex items-center justify-between gap-2 p-2 border-t border-gray-100">
                      <button
                        type="button"
                        className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
                        onClick={() => setCreateOpen(true)}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Plus className="size-4" /> New add-on
                        </span>
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
                          onClick={() => setAddonsOpen(false)}
                        >
                          Done
                        </button>
                        <button
                          type="button"
                          className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
                          onClick={() => {
                            setAddonQuery("");
                            setData((p) => ({ ...p, addonIds: [] }));
                            setLocalAddons((prev) => prev.map((a) => ({ ...a, selected: false })));
                          }}
                          disabled={submitting}
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {(data.addonIds.length > 0 || localAddons.some((a) => a.selected)) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {localAddons
                      .filter((a) => a.selected)
                      .map((a) => (
                        <span
                          key={a.tempId}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-full border border-gray-300 bg-gray-50"
                        >
                          {a.name} <span className="text-[10px] text-blue-600">(new)</span>
                          <button
                            type="button"
                            className="ml-1 rounded-full p-0.5 hover:bg-gray-200"
                            onClick={() => toggleLocalAddon(a.tempId)}
                            disabled={submitting}
                            aria-label={`Remove ${a.name}`}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </span>
                      ))}

                    {data.addonIds.map((id) => {
                      const a = addons.find((x) => x._id === id);
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-full border border-gray-300 bg-gray-50"
                        >
                          {a?.name ?? id}
                          <button
                            type="button"
                            className="ml-1 rounded-full p-0.5 hover:bg-gray-200"
                            onClick={() => toggleAddon(id)}
                            disabled={submitting}
                            aria-label={`Remove ${a?.name ?? id}`}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </SectionCard>
        )}

        {/* LLM Chips */}
        {step.key === "llmChips" && (
          <SectionCard
            title="LLM Chips"
            subtitle="Predefined Q&A snippets for the assistant."
            icon={<HelpCircle className="size-5 text-blue-600" />}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-800">Chips</span>
              <button
                type="button"
                onClick={addLlmChip}
                disabled={submitting}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
              >
                <Plus className="size-3.5" />
                Add Chip
              </button>
            </div>

            <div className="space-y-3">
              {llmChips.map((c, i) => (
                <div key={`llm-chip-${i}`} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-600">Chip #{i + 1}</p>
                    <button
                      type="button"
                      onClick={() => remLlmChip(i)}
                      disabled={submitting}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                    >
                      <Trash2 className="size-3.5" />
                      Remove
                    </button>
                  </div>
                  <div className="space-y-3">
                    <Field label="Question / Prompt">
                      <input
                        type="text"
                        className="input w-full"
                        value={c.q}
                        onChange={(e) => setLlmChip(i, { q: e.target.value })}
                        placeholder="e.g., Do you offer Jain or vegan meals?"
                        disabled={submitting}
                      />
                    </Field>
                    <Field label="Answer / Response">
                      <div className="rounded-xl border border-gray-300 bg-white p-2">
                        <TinyMCETextEditor
                          value={c.a || ""}
                          onChange={(html) => setLlmChip(i, { a: html })}
                          placeholder="Write the assistant’s response…"
                        />
                      </div>
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* DIETARY */}
        {step.key === "dietary" && (
          <SectionCard
            title="Dietary Information"
            subtitle="Mark applicable dietary properties."
            icon={<Flame className="size-5 text-blue-600" />}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {([
                ["vegetarian", "Vegetarian"],
                ["vegan", "Vegan"],
                ["glutenFree", "Gluten-free"],
                ["halal", "Halal"],
              ] as const).map(([key, label]) => (
                <label key={key} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 bg-white">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={(data.dietaryInfo as any)[key]}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        dietaryInfo: { ...p.dietaryInfo, [key]: e.target.checked },
                      }))
                    }
                    disabled={submitting}
                  />
                  <span className="text-sm text-gray-800">{label}</span>
                </label>
              ))}
            </div>
          </SectionCard>
        )}

        {/* MEDIA */}
        {step.key === "media" && (
          <SectionCard
            title="Media"
            subtitle="Upload a banner and gallery images."
            icon={<ImageIcon className="size-5 text-blue-600" />}
            requiredHint
          >
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Banner</h3>
            <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50/50 p-3 sm:p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {existingBannerUrl || newBanner ? (
                  <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-blue-400 bg-white">
                    <img
                      src={newBanner?.preview || existingBannerUrl || ""}
                      alt="Banner"
                      className="w-full h-full object-cover"
                      decoding="async"
                      loading="lazy"
                    />
                    <button
                      type="button"
                      onClick={clearBanner}
                      className="absolute top-1 right-1 size-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md active:scale-95"
                      title="Remove banner"
                      aria-label="Remove banner"
                      disabled={submitting}
                    >
                      <X className="size-4" strokeWidth={3} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                      <p className="text-white text-[10px] font-medium">BANNER</p>
                    </div>
                  </div>
                ) : (
                  <label className="block aspect-square">
                    <div className="flex flex-col items-center justify-center w-full h-full px-4 py-3 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer hover:border-blue-500 transition-colors bg-white hover:bg-blue-50">
                      <ImageIcon className="size-6 text-blue-400" />
                      <p className="mt-1 text-sm font-medium text-blue-900">Add Banner</p>
                    </div>
                    <input
                      ref={bannerInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      className="hidden"
                      disabled={submitting}
                    />
                  </label>
                )}
              </div>
            </div>

            <h3 className="text-sm font-semibold text-gray-900 mb-2">Gallery Images</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {existingImageUrls.map((url) => (
                <div
                  key={url}
                  className="relative aspect-square rounded-xl overflow-hidden border border-gray-300 bg-gray-50 shadow-sm"
                >
                  <img src={url} alt="Existing" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(url)}
                    className="absolute top-1 right-1 size-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md active:scale-95"
                    title="Remove existing image"
                    aria-label="Remove existing image"
                    disabled={submitting}
                  >
                    <X className="size-4" strokeWidth={3} />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                    <p className="text-white text-[10px] font-medium">EXISTING</p>
                  </div>
                </div>
              ))}

              {newImages.map((img, idx) => (
                <div
                  key={img.preview}
                  className="relative aspect-square rounded-xl overflow-hidden border-2 border-dashed border-blue-400 bg-blue-50"
                >
                  <img src={img.preview} alt={`New ${idx + 1}`} className="w-full h-full object-cover opacity-80" />
                  <button
                    type="button"
                    onClick={() => removeNewImage(idx)}
                    className="absolute top-1 right-1 size-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md active:scale-95"
                    title="Remove image"
                    aria-label="Remove image"
                    disabled={submitting}
                  >
                    <X className="size-4" strokeWidth={3} />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                    <p className="text-white text-[10px] font-medium truncate">NEW</p>
                  </div>
                </div>
              ))}

              <label className="block aspect-square">
                <div className="flex flex-col items-center justify-center w-full h-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 transition-colors bg-white hover:bg-gray-50">
                  <ImageIcon className="size-6 text-gray-400" />
                  <p className="mt-1 text-sm font-medium text-gray-700">Add Image</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImagesUpload}
                  className="hidden"
                  disabled={submitting}
                />
              </label>
            </div>
          </SectionCard>
        )}

        {/* SEGREGATED */}
        {step.key === "segregatedMedia" && (
          <SectionCard
            title="Segregated Images"
            subtitle="Group images by category (e.g., Nature, Waterfall, Guest Images)."
            icon={<ImageIcon className="size-5 text-blue-600" />}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Categories & Images</h3>
              <button
                type="button"
                onClick={addSegGroup}
                disabled={submitting}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
              >
                <Plus className="size-3.5" />
                Add Category
              </button>
            </div>

            <div className="space-y-4">
              {segregatedGroups.map((group, idx) => (
                <div key={group.id} className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-gray-700">Category #{idx + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeSegGroup(group.id)}
                      disabled={submitting}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                    >
                      <X className="size-3.5" />
                      Remove
                    </button>
                  </div>

                  <Field label="Category name" required>
                    <input
                      type="text"
                      className="input"
                      value={group.category}
                      onChange={(e) => updateSegGroupCategory(group.id, e.target.value)}
                      placeholder="e.g., nature, waterfall, guest_images"
                      disabled={submitting}
                    />
                  </Field>

                  <div className="mt-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1.5">
                      Images ({group.existingImages.length + group.images.length})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {group.existingImages.map((url) => (
                        <div
                          key={url}
                          className="relative aspect-square rounded-xl overflow-hidden border border-gray-300 bg-gray-50 shadow-sm"
                        >
                          <img src={url} alt="Existing" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeExistingSegImage(group.id, url)}
                            className="absolute top-1 right-1 size-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md active:scale-95"
                            title="Remove image"
                            aria-label="Remove image"
                            disabled={submitting}
                          >
                            <X className="size-4" strokeWidth={3} />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                            <p className="text-white text-[10px] font-medium">EXISTING</p>
                          </div>
                        </div>
                      ))}

                      {group.images.map((img, imgIdx) => (
                        <div
                          key={img.preview}
                          className="relative aspect-square rounded-xl overflow-hidden border-2 border-dashed border-blue-400 bg-blue-50"
                        >
                          <img
                            src={img.preview}
                            alt={`Segregated ${idx + 1}-${imgIdx + 1}`}
                            className="w-full h-full object-cover opacity-80"
                          />
                          <button
                            type="button"
                            onClick={() => removeSegImage(group.id, imgIdx)}
                            className="absolute top-1 right-1 size-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md active:scale-95"
                            title="Remove image"
                            aria-label="Remove image"
                            disabled={submitting}
                          >
                            <X className="size-4" strokeWidth={3} />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                            <p className="text-white text-[10px] font-medium truncate">NEW</p>
                          </div>
                        </div>
                      ))}

                      <label className="block aspect-square">
                        <div className="flex flex-col items-center justify-center w-full h-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 transition-colors bg-white hover:bg-gray-50">
                          <ImageIcon className="size-6 text-gray-400" />
                          <p className="mt-1 text-sm font-medium text-gray-700">Add Image</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => handleSegImagesUpload(group.id, e)}
                          disabled={submitting}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </main>

      {/* Sticky footer */}
      <div className="fixed bottom-0 right-0 left-0 lg:left-64 z-40 bg-gray-50/95 backdrop-blur safe-bottom pt-2">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-2">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-900/5">
            <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="inline-flex items-center gap-2 text-xs text-gray-600 bg-gray-100 rounded-full px-3 py-1.5 font-semibold self-start sm:self-auto">
                <span className={`size-2 rounded-full ${isStepValid(step.key as StepKey) ? "bg-green-500" : "bg-amber-500"}`} />
                {isStepValid(step.key as StepKey) ? "Looks good" : "Complete required fields"}
              </span>

              <div className="flex w-full sm:w-auto gap-2 sm:ml-auto">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={stepIndex === 0 || submitting}
                  className={`flex-1 sm:flex-none px-4 py-3 text-sm font-medium rounded-xl border ${
                    stepIndex === 0 || submitting
                      ? "border-gray-200 text-gray-400"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Back
                </button>

                {stepIndex < LAST ? (
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!isStepValid(step.key as StepKey) || submitting}
                    className={`flex-1 sm:flex-none px-5 py-3 text-sm font-semibold rounded-xl text-white ${
                      !isStepValid(step.key as StepKey) || submitting
                        ? "bg-blue-300 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                    }`}
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!canSubmit || submitting}
                    className={`flex-1 sm:flex-none px-5 py-3 text-sm font-semibold rounded-xl text-white ${
                      !canSubmit || submitting ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                      {submitting ? "Saving..." : "Save Changes"}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Add-on Modal (LOCAL only) */}
      {createOpen && (
        <div className="fixed inset-0 z-[90]">
          <div className="absolute inset-0 bg-black/40" onClick={() => !createLoading && setCreateOpen(false)} />
          <div className="absolute inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[520px] top-16 bottom-16 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">New Add-on</h3>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="size-8 grid place-items-center rounded-lg hover:bg-gray-100"
                disabled={createLoading}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 overflow-auto max-h-[70vh]">
              {createErr && (
                <div className="rounded-lg border border-red-200 bg-red-50 text-sm text-red-700 px-3 py-2">
                  {createErr}
                </div>
              )}

              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Name *</span>
                <input
                  className="input"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Extra Cheese"
                  disabled={createLoading}
                />
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Description</span>
                <textarea
                  className="textarea"
                  value={createForm.description}
                  onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Add extra cheese"
                  disabled={createLoading}
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</span>
                  <input
                    type="number"
                    min={0}
                    inputMode="decimal"
                    className="input"
                    value={createForm.price}
                    onChange={(e) => setCreateForm((p) => ({ ...p, price: e.target.value }))}
                    placeholder="50"
                    disabled={createLoading}
                  />
                </label>

                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1">Category *</span>
                  <select
                    className="input"
                    value={createForm.category}
                    onChange={(e) => setCreateForm((p) => ({ ...p, category: e.target.value as AddonCategory }))}
                    disabled={createLoading}
                  >
                    <option value="">Select category</option>
                    <option value="topping">topping</option>
                    <option value="sauce">sauce</option>
                    <option value="side">side</option>
                  </select>
                </label>
              </div>

              <label className="inline-flex items-center gap-3">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={createForm.isAvailable}
                  onChange={(e) => setCreateForm((p) => ({ ...p, isAvailable: e.target.checked }))}
                  disabled={createLoading}
                />
                <span className="text-sm text-gray-800">Available</span>
              </label>
            </div>

            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 text-sm"
                disabled={createLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveLocalAddon}
                className={`px-4 py-2 rounded-xl text-sm font-semibold text-white ${
                  createLoading ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
                }`}
                disabled={createLoading}
              >
                <span className="inline-flex items-center gap-2">
                  {createLoading && <Loader2 className="size-4 animate-spin" />}
                  Save Add-on
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Local styles */}
      <style jsx>{`
        .input {
          @apply w-full h-12 px-4 py-3 rounded-xl border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-[16px] leading-none placeholder:text-gray-400 transition-all;
          -webkit-tap-highlight-color: transparent;
        }
        .textarea {
          @apply w-full min-h-[112px] px-4 py-3 rounded-xl border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-[16px] placeholder:text-gray-400 transition-all resize-y;
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

/* ------------------------------ Reusables ------------------------------ */
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
            <div className="size-8 grid place-items-center bg-blue-50 rounded-lg">{icon}</div>
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
