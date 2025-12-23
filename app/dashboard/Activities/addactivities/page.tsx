// app/dashboard/activities/AddActivityFormMobile.tsx
"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Loader2,
  Clock3,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  HelpCircle,
  CalendarDays,
  Info,
  Users,
  Bus,
  Wallet,
  IndianRupee
} from "lucide-react";

import TinyMCETextEditor from "@/components/TinyMCETextEditor";


/* ----------------------------- Types & Shapes ----------------------------- */

type DurationType = "min" | "hrs";
type PickupType = "hotel" | "meetup" | "self";
type OperatingDay = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

type FAQ = { q: string; a: string };

type SurchargeWindow = "single" | "range";

interface Surcharge {
  windowType: SurchargeWindow;
  singleDate: string; // for single date window
  startDate: string; // for date range
  endDate: string; // for date range
  amount: string;
  currency: string;
}

interface TimelineItem {
  time: string;
  title: string;
  description: string;
  duration?: string;
}

interface WhatToExpectItem {
  title: string;
  description: string;
}

interface whyChooseItem {
  title: string;
  description: string;
}
interface SegregatedImageGroup {
  id: string;
  category: string;
  images: ImageFile[];
}


interface ActivityFormData {
  title: string;
  description: string; // html
  destination: string;
  category: string;
  vendorPrice: string;
  price: string;
  childPrice: string;
  seniorPrice: string;
  infantPrice: string;
  taxRate: string;
  taxIncluded: boolean;
  serviceCharges: string;
markup_min_price: number;
  markup_max_price: number;
  openTime: string;
  closeTime: string;
  duration: string;
  durationType: DurationType;
  operatingDays: OperatingDay[];
  timeSlots: string[];

  pickupLocation: string;
  dropLocation: string;
  pickupType: PickupType;
  pickupAreas: string[];
  meetupLocation: string;
  meetupAddress: string;
  meetingTime: string;

  groupSize: string;
  minParticipants: string;
  maxParticipants: string;

  // location (schema: location: { address, city, state, country })
  locationAddress: string;
  locationCity: string;
  locationState: string;
  locationCountry: string;

  highlights: string[];
  languages: string[];
  inclusions: string[];
  exclusions: string[];
  goodToKnow: string[];
  whatToBring: string[];
  safetyRequirements: string[];
  voucherInfo: string[];

  extendedDescription: string;

  // new schema fields
  whatToExpect: WhatToExpectItem[];
  whyChoose:whyChooseItem[];
  fitnessLevel: string;
  healthRestrictions: string;
  bestTimeToVisit: string;
  seasonalAvailability: string;
  accessibility: string;
  priceNote: string;

  // itinerary & operation process (timeline arrays)
  itinerary: TimelineItem[];
  operationProcess: TimelineItem[];

  cancellationPolicyShort: string;
  cancellationDetails: string[];

  rating: string;
  reviewCount: string;
  bookedCount: string;
  instantConfirmation: boolean;
  freeCancellation: boolean;
  operatedBy: string;

  llm_chips: FAQ[];
  faqs: FAQ[];
  surcharges: Surcharge[];
}

interface ImageFile {
  file: File;
  preview: string;
}

/* --------------------------------- Utils --------------------------------- */
const nn = (v: string | number | "" | null | undefined) =>
  v === "" || v == null ? NaN : Number(v);
const isFiniteNum = (v: any) => typeof v === "number" && Number.isFinite(v);

const sanitizeHtml = (html: string) =>
  html.replace(/[\n\r]/g, "").replace(/>\s+</g, "><");

const formatOperatingHours = (openTime: string, closeTime: string) => {
  if (!openTime || !closeTime) return "";
  // simple string join; you can later pretty-format AM/PM if needed
  return `${openTime} – ${closeTime}`;
};

/* ------------------------------ Presets ---------------------------------- */

const OPERATING_DAYS: OperatingDay[] = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];
const DEFAULT_SURCHARGE: Surcharge = {
  windowType: "single",
  singleDate: "",
  startDate: "",
  endDate: "",
  amount: "",
  currency: "INR",
};

const BLANK: ActivityFormData = {
  title: "",
  description: "",
  destination: "",
  category: "",
  vendorPrice: "",
  price: "",
  childPrice: "",
  seniorPrice: "",
  infantPrice: "",
  taxRate: "",
  taxIncluded: false,
  serviceCharges: "",

  openTime: "",
  closeTime: "",
  duration: "",
  durationType: "hrs",
  operatingDays: [],
  timeSlots: [],
 markup_min_price: null,
  markup_max_price: null,
  pickupLocation: "",
  dropLocation: "",
  pickupType: "meetup",
  pickupAreas: [],
  meetupLocation: "",
  meetupAddress: "",
  meetingTime: "",

  groupSize: "",
  minParticipants: "",
  maxParticipants: "",

  locationAddress: "",
  locationCity: "",
  locationState: "",
  locationCountry: "",

  highlights: [],
  languages: [],
  inclusions: [],
  exclusions: [],
  goodToKnow: [],
  whatToBring: [],
  safetyRequirements: [],
  voucherInfo: [],

  extendedDescription: "",

  whatToExpect: [{ title: "", description: "" }],
  whyChoose: [{ title: "", description: "" }],
  fitnessLevel: "",
  healthRestrictions: "",
  bestTimeToVisit: "",
  seasonalAvailability: "",
  accessibility: "",
  priceNote: "",

  itinerary: [{ time: "", title: "", description: "", duration: "" }],
  operationProcess: [{ time: "", title: "", description: "", duration: "" }],

  cancellationPolicyShort: "Full refund up to 48 hours before activity",
  cancellationDetails: [],

  rating: "",
  reviewCount: "",
  bookedCount: "",
  instantConfirmation: false,
  freeCancellation: false,
  operatedBy: "",
  surcharges: [DEFAULT_SURCHARGE],
  llm_chips: [{ q: "", a: "" }],
  faqs: [{ q: "", a: "" }],
};

const STEPS = [
  { key: "basic", label: "Basic", icon: <MapPin className="size-4" /> },
  { key: "llmChips", label: "LLM Chips", icon: <HelpCircle className="size-4" /> },
  { key: "details", label: "Details", icon: <Info className="size-4" /> },
  { key: "experience", label: "Experience", icon: <Users className="size-4" /> },
  { key: "surcharges", label: "Surcharges", icon: <Wallet className="size-4" /> },
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
        <span className="text-[11px] text-gray-400">{values.length} added</span>
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

export default function AddActivityFormMobile() {
  const router = useRouter();

  const [data, setData] = useState<ActivityFormData>(BLANK);
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  const [submitting, setSubmitting] = useState(false);

  // banner (thumbnail)
  const [thumbnail, setThumbnail] = useState<ImageFile | null>(null);
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string | null>(
    null
  );
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);

  // gallery (main images)
  const [newImages, setNewImages] = useState<ImageFile[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // guest images
  const [newGuestImages, setNewGuestImages] = useState<ImageFile[]>([]);
  const [existingGuestImageUrls, setExistingGuestImageUrls] = useState<string[]>(
    []
  );
  const guestFileInputRef = useRef<HTMLInputElement | null>(null);

  // videos
  interface VideoFile {
    file: File;
    preview: string;
  }

  const [newVideos, setNewVideos] = useState<VideoFile[]>([]);
  const [existingVideoUrls, setExistingVideoUrls] = useState<string[]>([]);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  // rich text: main description

  



  const addSurcharge = () =>
    setData((p) => ({
      ...p,
      surcharges: [...p.surcharges, { ...DEFAULT_SURCHARGE }],
    }));

  const removeSurcharge = (idx: number) =>
    setData((p) => {
      if (p.surcharges.length <= 1) {
        return { ...p, surcharges: [{ ...DEFAULT_SURCHARGE }] };
      }
      return {
        ...p,
        surcharges: p.surcharges.filter((_, i) => i !== idx),
      };
    });

  const updateSurcharge = (idx: number, next: Partial<Surcharge>) =>
    setData((p) => ({
      ...p,
      surcharges: p.surcharges.map((s, i) =>
        i === idx ? { ...s, ...next } : s
      ),
    }));

  // LLM chips + FAQs rich text
  const [llmChips, setLlmChips] = useState<FAQ[]>(BLANK.llm_chips);

  const [faqs, setFaqs] = useState<FAQ[]>(BLANK.faqs);
  

    // segregated images (category-wise)
  const [segregatedGroups, setSegregatedGroups] = useState<SegregatedImageGroup[]>([
    { id: "seg-0", category: "", images: [] },
  ]);

  const addSegGroup = () => {
    setSegregatedGroups((prev) => [
      ...prev,
      {
        id: `seg-${prev.length}`,
        category: "",
        images: [],
      },
    ]);
  };

  const removeSegGroup = (id: string) => {
    setSegregatedGroups((prev) => {
      // cleanup URLs
      const toRemove = prev.find((g) => g.id === id);
      toRemove?.images.forEach((img) => URL.revokeObjectURL(img.preview));
      const next = prev.filter((g) => g.id !== id);
      // keep at least one empty group
      return next.length ? next : [{ id: "seg-0", category: "", images: [] }];
    });
  };

  const updateSegGroupCategory = (id: string, category: string) => {
    setSegregatedGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, category } : g))
    );
  };

  const handleSegImagesUpload = (
    id: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    const mapped: ImageFile[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setSegregatedGroups((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, images: [...g.images, ...mapped] } : g
      )
    );
    e.target.value = "";
  };

  const removeSegImage = (groupId: string, idx: number) => {
    setSegregatedGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const img = g.images[idx];
        if (img?.preview) URL.revokeObjectURL(img.preview);
        return {
          ...g,
          images: g.images.filter((_, i) => i !== idx),
        };
      })
    );
  };


const addLlmChip = () => setLlmChips((p) => [...p, { q: "", a: "" }]);

const remLlmChip = (idx: number) =>
  setLlmChips((p) => (p.length <= 1 ? [{ q: "", a: "" }] : p.filter((_, i) => i !== idx)));

  const setLlmChip = (idx: number, next: Partial<FAQ>) =>
    setLlmChips((p) => p.map((c, i) => (i === idx ? { ...c, ...next } : c)));

const addFaq = () => setFaqs((p) => [...p, { q: "", a: "" }]);

const remFaq = (idx: number) =>
  setFaqs((p) => (p.length <= 1 ? [{ q: "", a: "" }] : p.filter((_, i) => i !== idx)));

  const setFaq = (idx: number, next: Partial<FAQ>) =>
    setFaqs((p) => p.map((c, i) => (i === idx ? { ...c, ...next } : c)));

  // whatToExpect handlers
  const addWhatToExpectItem = () =>
    setData((p) => ({
      ...p,
      whatToExpect: [...p.whatToExpect, { title: "", description: "" }],
    }));

  const removeWhatToExpectItem = (idx: number) =>
    setData((p) => {
      if (p.whatToExpect.length <= 1) {
        return { ...p, whatToExpect: [{ title: "", description: "" }] };
      }
      return {
        ...p,
        whatToExpect: p.whatToExpect.filter((_, i) => i !== idx),
      };
    });

  const updateWhatToExpectItem = (
    idx: number,
    next: Partial<WhatToExpectItem>
  ) =>
    setData((p) => ({
      ...p,
      whatToExpect: p.whatToExpect.map((it, i) =>
        i === idx ? { ...it, ...next } : it
      ),
    }));


      // whychoose handlers
  const addwhychooseItem = () =>
    setData((p) => ({
      ...p,
      whyChoose: [...p.whyChoose, { title: "", description: "" }],
    }));

  const removewhychooseItem = (idx: number) =>
    setData((p) => {
      if (p.whyChoose.length <= 1) {
        return { ...p, whyChoose: [{ title: "", description: "" }] };
      }
      return {
        ...p,
        whyChoose: p.whyChoose.filter((_, i) => i !== idx),
      };
    });

  const updatewhyChooseItem = (
    idx: number,
    next: Partial<WhatToExpectItem>
  ) =>
    setData((p) => ({
      ...p,
      whyChoose: p.whyChoose.map((it, i) =>
        i === idx ? { ...it, ...next } : it
      ),
    }));

  // itinerary handlers
  const addItineraryItem = () =>
    setData((p) => ({
      ...p,
      itinerary: [
        ...p.itinerary,
        { time: "", title: "", description: "", duration: "" },
      ],
    }));

  const removeItineraryItem = (idx: number) =>
    setData((p) => {
      if (p.itinerary.length <= 1) {
        return {
          ...p,
          itinerary: [{ time: "", title: "", description: "", duration: "" }],
        };
      }
      return {
        ...p,
        itinerary: p.itinerary.filter((_, i) => i !== idx),
      };
    });

  const updateItineraryItem = (idx: number, next: Partial<TimelineItem>) =>
    setData((p) => ({
      ...p,
      itinerary: p.itinerary.map((it, i) =>
        i === idx ? { ...it, ...next } : it
      ),
    }));

  // operation process handlers
  const addOperationItem = () =>
    setData((p) => ({
      ...p,
      operationProcess: [
        ...p.operationProcess,
        { time: "", title: "", description: "", duration: "" },
      ],
    }));

  const removeOperationItem = (idx: number) =>
    setData((p) => {
      if (p.operationProcess.length <= 1) {
        return {
          ...p,
          operationProcess: [
            { time: "", title: "", description: "", duration: "" },
          ],
        };
      }
      return {
        ...p,
        operationProcess: p.operationProcess.filter((_, i) => i !== idx),
      };
    });

  const updateOperationItem = (idx: number, next: Partial<TimelineItem>) =>
    setData((p) => ({
      ...p,
      operationProcess: p.operationProcess.map((it, i) =>
        i === idx ? { ...it, ...next } : it
      ),
    }));

  /* ------------------------------- Validation ------------------------------ */

  const isStepValid = (k: StepKey) => {
    if (k === "basic") {
      return (
        data.title.trim().length > 0 &&
        data.destination.trim().length > 0 &&
        data.category.trim().length > 0 &&
        isFiniteNum(nn(data.price)) &&
        nn(data.price) >= 0 &&
        isFiniteNum(nn(data.vendorPrice)) &&
        data.openTime.trim().length > 0 &&
        data.closeTime.trim().length > 0 &&
        isFiniteNum(nn(data.duration))
      );
    }
    return true;
  };

  const canSubmit = useMemo(() => {
    const basicOK = isStepValid("basic");
    const hasThumb = !!thumbnail || !!existingThumbnailUrl;
    return basicOK && hasThumb;
  }, [data, thumbnail, existingThumbnailUrl]);

  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  /* -------------------------------- Handlers ------------------------------ */

  const onText = (name: keyof ActivityFormData, val: any) =>
    setData((p) => ({ ...p, [name]: val }));

  const toggleOperatingDay = (d: OperatingDay) =>
    setData((p) => ({
      ...p,
      operatingDays: p.operatingDays.includes(d)
        ? p.operatingDays.filter((x) => x !== d)
        : [...p.operatingDays, d],
    }));

  const addStrItem =
    (key: keyof ActivityFormData) =>
    (v: string) =>
      setData((p) => ({
        ...p,
        [key]: [...(p[key] as string[]), v],
      }));

  const remStrItem =
    (key: keyof ActivityFormData) =>
    (i: number) =>
      setData((p) => ({
        ...p,
        [key]: (p[key] as string[]).filter((_, idx) => idx !== i),
      }));

  /* ------------------------------- Media ---------------------------------- */

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (thumbnail?.preview) URL.revokeObjectURL(thumbnail.preview);
    setThumbnail({ file, preview: URL.createObjectURL(file) });
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
  };

  const clearThumbnail = () => {
    if (thumbnail?.preview) URL.revokeObjectURL(thumbnail.preview);
    setThumbnail(null);
    setExistingThumbnailUrl(null);
  };

  const handleImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    const mapped = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setNewImages((prev) => [...prev, ...mapped]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeNewImage = (i: number) => {
    setNewImages((prev) => {
      URL.revokeObjectURL(prev[i]?.preview);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const handleGuestImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    const mapped = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setNewGuestImages((prev) => [...prev, ...mapped]);
    if (guestFileInputRef.current) guestFileInputRef.current.value = "";
  };

  const removeNewGuestImage = (i: number) => {
    setNewGuestImages((prev) => {
      URL.revokeObjectURL(prev[i]?.preview);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const handleVideosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    const mapped = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setNewVideos((prev) => [...prev, ...mapped]);
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const removeNewVideo = (i: number) => {
    setNewVideos((prev) => {
      URL.revokeObjectURL(prev[i]?.preview);
      return prev.filter((_, idx) => idx !== i);
    });
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
    if (!canSubmit) return;

    try {
      setSubmitting(true);

      const vendorPrice = Number(data.vendorPrice || 0);
      const price = Number(data.price || 0);
      const serviceCharges = data.serviceCharges
        ? Number(data.serviceCharges)
        : 0;
      const taxRate = data.taxRate ? Number(data.taxRate) : 0;
      const taxes = taxRate ? Math.round((price * taxRate) / 100) : 0;
      const totalPrice = price + serviceCharges + taxes;

      const payload: any = {
        title: data.title.trim(),
        description: data.description.trim(),
        destination: data.destination.trim(),
        category: data.category.trim(),
        vendorPrice,
        price,
        childPrice: data.childPrice ? Number(data.childPrice) : undefined,
        seniorPrice: data.seniorPrice ? Number(data.seniorPrice) : undefined,
        infantPrice: data.infantPrice ? Number(data.infantPrice) : undefined,
        taxRate,
        taxIncluded: !!data.taxIncluded,
        serviceCharges,
        markup_min_price: data.markup_min_price,
        markup_max_price: data.markup_max_price,
        openTime: data.openTime,
        closeTime: data.closeTime,
        duration: Number(data.duration || 0),
        durationType: data.durationType,
        operatingDays: data.operatingDays,
        operatingHours: formatOperatingHours(data.openTime, data.closeTime),
        timeSlots: data.timeSlots.map((s) => s.trim()).filter(Boolean),

        pickupLocation: data.pickupLocation.trim(),
        dropLocation: data.dropLocation.trim(),
        pickupType: data.pickupType,
        pickupAreas: data.pickupAreas.map((s) => s.trim()).filter(Boolean),
        meetupLocation: data.meetupLocation.trim() || undefined,
        meetupAddress: data.meetupAddress.trim() || undefined,
        meetingTime: data.meetingTime.trim() || undefined,

        groupSize: data.groupSize.trim() || undefined,
        minParticipants: data.minParticipants
          ? Number(data.minParticipants)
          : undefined,
        maxParticipants: data.maxParticipants
          ? Number(data.maxParticipants)
          : undefined,

        location: {
          address: data.locationAddress.trim(),
          city: data.locationCity.trim(),
          state: data.locationState.trim(),
          country: data.locationCountry.trim(),
        },

        highlights: data.highlights.map((s) => s.trim()).filter(Boolean),
        languages: data.languages.map((s) => s.trim()).filter(Boolean),
        inclusions: data.inclusions.map((s) => s.trim()).filter(Boolean),
        exclusions: data.exclusions.map((s) => s.trim()).filter(Boolean),
        goodToKnow: data.goodToKnow.map((s) => s.trim()).filter(Boolean),
        whatToBring: data.whatToBring.map((s) => s.trim()).filter(Boolean),
        safetyRequirements: data.safetyRequirements
          .map((s) => s.trim())
          .filter(Boolean),
        voucherInfo: data.voucherInfo.map((s) => s.trim()).filter(Boolean),

        extendedDescription: data.extendedDescription.trim(),

        whatToExpect: data.whatToExpect
          .map((w) => ({
            title: (w.title || "").trim(),
            description: (w.description || "").trim(),
          }))
          .filter((w) => w.title || w.description),
           whyChoose: data.whyChoose
          .map((w) => ({
            title: (w.title || "").trim(),
            description: (w.description || "").trim(),
          }))
          .filter((w) => w.title || w.description),
          

        fitnessLevel: data.fitnessLevel.trim() || undefined,
        healthRestrictions: data.healthRestrictions.trim() || undefined,
        bestTimeToVisit: data.bestTimeToVisit.trim() || undefined,
        seasonalAvailability: data.seasonalAvailability.trim() || undefined,
        accessibility: data.accessibility.trim() || undefined,
        priceNote: data.priceNote.trim() || undefined,

        itinerary: data.itinerary
          .map((it) => ({
            time: (it.time || "").trim(),
            title: (it.title || "").trim(),
            description: (it.description || "").trim(),
            duration: (it.duration || "").trim() || undefined,
          }))
          .filter((it) => it.time || it.title || it.description),

        operationProcess: data.operationProcess
          .map((it) => ({
            time: (it.time || "").trim(),
            title: (it.title || "").trim(),
            description: (it.description || "").trim(),
            duration: (it.duration || "").trim() || undefined,
          }))
          .filter((it) => it.time || it.title || it.description),

        cancellationPolicyShort: data.cancellationPolicyShort.trim(),
        cancellationDetails: data.cancellationDetails
          .map((s) => s.trim())
          .filter(Boolean),

        rating:
          data.rating === "" || data.rating == null
            ? 0
            : Math.max(0, Math.min(5, Number(data.rating))),
        reviewCount:
          data.reviewCount === "" || data.reviewCount == null
            ? 0
            : Math.max(0, Number(data.reviewCount)),
        bookedCount:
          data.bookedCount === "" || data.bookedCount == null
            ? 0
            : Math.max(0, Number(data.bookedCount)),
        instantConfirmation: !!data.instantConfirmation,
        freeCancellation: !!data.freeCancellation,
        operatedBy: data.operatedBy.trim() || undefined,

        priceBreakdown: {
          basePrice: price,
          serviceCharges,
          taxes,
          totalPrice,
        },

      llm_chips: llmChips
  .map((c) => ({
    q: (c.q || "").trim(),
    a: (c.a || "").trim(),
  }))
  .filter((c) => c.q || c.a),


     faqs: faqs
  .map((c) => ({
    q: (c.q || "").trim(),
    a: (c.a || "").trim(),
  }))
  .filter((c) => c.q || c.a),


        surcharges: data.surcharges
          .map((s) => ({
            windowType: s.windowType,
            amount: s.amount ? Number(s.amount) : 0,
            currency: s.currency,
            singleDate:
              s.windowType === "single" ? s.singleDate || undefined : undefined,
            startDate:
              s.windowType === "range" ? s.startDate || undefined : undefined,
            endDate:
              s.windowType === "range" ? s.endDate || undefined : undefined,
          }))
          .filter((s) => s.amount > 0),

           segregated_images: segregatedGroups
          .map((g) => ({
            category: g.category.trim(),
            imagesCount: g.images.length,
          }))
          .filter((g) => g.category && g.imagesCount > 0),
      };

      const form = new FormData();
      form.append("data", JSON.stringify(payload));

      if (thumbnail?.file) form.append("thumbnail", thumbnail.file);
      if (existingThumbnailUrl)
        form.append("thumbnail_keep", existingThumbnailUrl);

      // main gallery images
      existingImageUrls.forEach((url) => form.append("images_keep", url));
      newImages.forEach((img) => form.append("images", img.file));

      // guest images
      existingGuestImageUrls.forEach((url) =>
        form.append("guest_images_keep", url)
      );
      newGuestImages.forEach((img) => form.append("guest_images", img.file));

      // videos
      existingVideoUrls.forEach((url) => form.append("videos_keep", url));
      newVideos.forEach((vid) => form.append("videos", vid.file));

       segregatedGroups.forEach((group, gIdx) => {
        group.images.forEach((img) => {
          // backend can use field name + index to know which category it belongs to
          form.append(`segregated_images_${gIdx}`, img.file);
        });
      });
      form.append(
        "images_change_summary",
        JSON.stringify({
          kept_count: existingImageUrls.length,
          added_count: newImages.length,
          guest_kept_count: existingGuestImageUrls.length,
          guest_added_count: newGuestImages.length,
          videos_kept_count: existingVideoUrls.length,
          videos_added_count: newVideos.length,
          thumbnail_changed: !!thumbnail,
        })
      );

      // TODO: adjust backend route to match your API
      const url = `${process.env.NEXT_PUBLIC_API_BASE}activity/create`;
      const res = await fetch(url, { method: "POST", body: form });

      if (res.ok) {
        alert("Activity created successfully! 🎉");
        router.push("/dashboard/Activities");
      } else {
        const text = await res.text();
        console.error("Create failed:", text);
        alert(`Failed to create: ${text}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Unexpected error: ${err?.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  const resetAll = () => {
    setData(BLANK);
    // main images
    setNewImages([]);
    setExistingImageUrls([]);
    if (fileInputRef.current) fileInputRef.current.value = "";

    // guest images
    setNewGuestImages([]);
    setExistingGuestImageUrls([]);
    if (guestFileInputRef.current) guestFileInputRef.current.value = "";

    // videos
    newVideos.forEach((v) => URL.revokeObjectURL(v.preview));
    setNewVideos([]);
    setExistingVideoUrls([]);
    if (videoInputRef.current) videoInputRef.current.value = "";

    if (thumbnail?.preview) URL.revokeObjectURL(thumbnail.preview);
    setThumbnail(null);
    setExistingThumbnailUrl(null);
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
    setLlmChips(BLANK.llm_chips);
    setFaqs(BLANK.faqs);
  };

  /* --------------------------------- Render -------------------------------- */

  return (
    <form className="min-h-screen bg-gray-50" onSubmit={handleSubmit}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-gray-200">
        <div className="px-4 py-3 sm:px-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-blue-600 text-white grid place-items-center text-sm font-bold shadow">
              {(data.title?.[0] || "A").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-gray-900 truncate">
                Add Activity — {data.title || "New"}
              </h1>
              <p className="text-[11px] text-gray-500 truncate">
                Fill required sections and submit
              </p>
            </div>
            <button
              type="button"
              onClick={resetAll}
              disabled={submitting}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
                submitting
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
                    if (i <= stepIndex) setStepIndex(i);
                    else {
                      const allPrevValid = STEPS.slice(0, i).every((st) =>
                        isStepValid(st.key as StepKey)
                      );
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
                  <span className="grid place-items-center">
                    {done ? <CheckCircle2 className="size-4" /> : s.icon}
                  </span>
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Progress */}
          <div className="mt-3 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                submitting ? "bg-blue-400" : "bg-blue-600"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto p-4 sm:p-6 pb-36 lg:pb-64">
        {/* BASIC */}
        {step.key === "basic" && (
          <SectionCard
            title="Basic Information"
            subtitle="Core details, pricing and schedule."
            icon={<MapPin className="size-5 text-blue-600" />}
            requiredHint
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Title" required>
                <input
                  type="text"
                  className="input"
                  value={data.title}
                  onChange={(e) => onText("title", e.target.value)}
                  placeholder="Dudhsagar Waterfall Jeep Safari"
                  disabled={submitting}
                />
              </Field>

              <Field label="Destination" required>
                <input
                  type="text"
                  className="input"
                  value={data.destination}
                  onChange={(e) => onText("destination", e.target.value)}
                  placeholder="Goa, India"
                  disabled={submitting}
                />
              </Field>

              <Field label="Category" required>
                <select
                  className="input"
                  value={data.category}
                  onChange={(e) => onText("category", e.target.value)}
                  disabled={submitting}
                >
                  <option value="">Select category</option>
                  <option value="adventure">ADVENTURE SPORTS</option>
                  <option value="water_activity">WATER ACTIVITY</option>
                  <option value="water_sports">WATER SPORTS</option>
                  <option value="entertainment">ENTERTAINMENT</option>
                </select>
              </Field>

              <Field label="Vendor price" required hint="Internal cost">
                <input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  className="input"
                  value={data.vendorPrice}
                  onChange={(e) => onText("vendorPrice", e.target.value)}
                  placeholder="1500"
                  disabled={submitting}
                />
              </Field>

              <Field label="Selling price" required>
                <input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  className="input"
                  value={data.price}
                  onChange={(e) => onText("price", e.target.value)}
                  placeholder="1599"
                  disabled={submitting}
                />
              </Field>

              <Field label="Service charges">
                <input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  className="input"
                  value={data.serviceCharges}
                  onChange={(e) => onText("serviceCharges", e.target.value)}
                  placeholder="40"
                  disabled={submitting}
                />
              </Field>

              <Field label="Child price">
                <input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  className="input"
                  value={data.childPrice}
                  onChange={(e) => onText("childPrice", e.target.value)}
                  placeholder="899"
                  disabled={submitting}
                />
              </Field>

              <Field label="Senior price">
                <input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  className="input"
                  value={data.seniorPrice}
                  onChange={(e) => onText("seniorPrice", e.target.value)}
                  placeholder="1299"
                  disabled={submitting}
                />
              </Field>

              <Field label="Infant price">
                <input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  className="input"
                  value={data.infantPrice}
                  onChange={(e) => onText("infantPrice", e.target.value)}
                  placeholder="0"
                  disabled={submitting}
                />
              </Field>

              <Field label="Tax rate (%)">
                <input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  className="input"
                  value={data.taxRate}
                  onChange={(e) => onText("taxRate", e.target.value)}
                  placeholder="5"
                  disabled={submitting}
                />
              </Field>

              <Field label="Tax included in price?">
                <label className="inline-flex items-center gap-2 mt-1">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={data.taxIncluded}
                    onChange={(e) => onText("taxIncluded", e.target.checked)}
                    disabled={submitting}
                  />
                  <span className="text-sm text-gray-800">Yes, tax included</span>
                </label>
              </Field>

                 <Field label="Markup Min Price (₹)">
                              <div className="relative">
                                <input
                                  type="number"
                                  className="input pl-9"
                                  min={0}
                                  value={(data as any).markup_min_price ?? ""}
                                  onChange={(e) => onText("markup_min_price", e.target.value)}
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
                                  value={(data as any).markup_max_price ?? ""}
                                onChange={(e) => onText("markup_max_price", e.target.value)}
                                  placeholder="e.g., 500"
                                  disabled={submitting}
                                />
                                <IndianRupee className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              </div>
                            </Field>
            </div>

            {/* Schedule */}
            <div className="mt-6 border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="size-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-900">
                  Operating schedule
                </h3>
              </div>

              <Field label="Operating days" required>
                <div className="flex flex-wrap gap-1.5">
                  {/* All */}
                  {(() => {
                    const allSelected = OPERATING_DAYS.every((d) =>
                      data.operatingDays.includes(d)
                    );
                    return (
                      <button
                        type="button"
                        onClick={() =>
                          setData((p) => ({
                            ...p,
                            operatingDays: allSelected ? [] : [...OPERATING_DAYS],
                          }))
                        }
                        disabled={submitting}
                        className={`px-3 py-1.5 text-xs rounded-full border ${
                          allSelected
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-700 border-gray-300"
                        }`}
                      >
                        All
                      </button>
                    );
                  })()}

                  {OPERATING_DAYS.map((d) => {
                    const active = data.operatingDays.includes(d);
                    return (
                      <button
                        type="button"
                        key={d}
                        onClick={() => toggleOperatingDay(d)}
                        disabled={submitting}
                        className={`px-3 py-1.5 text-xs rounded-full border ${
                          active
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-700 border-gray-300"
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Open time" required>
                  <input
                    type="time"
                    className="input"
                    value={data.openTime}
                    onChange={(e) => onText("openTime", e.target.value)}
                    disabled={submitting}
                  />
                </Field>

                <Field label="Close time" required>
                  <input
                    type="time"
                    className="input"
                    value={data.closeTime}
                    onChange={(e) => onText("closeTime", e.target.value)}
                    disabled={submitting}
                  />
                </Field>
              </div>

              <div className="mt-4 max-w-sm">
                <Field label="Duration of activity" required>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        min={0}
                        inputMode="decimal"
                        className="input pr-14"
                        value={data.duration}
                        onChange={(e) => onText("duration", e.target.value)}
                        placeholder="6"
                        disabled={submitting}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 inline-flex items-center gap-1">
                        <Clock3 className="size-3.5" />
                        {data.durationType === "hrs" ? "hrs" : "min"}
                      </span>
                    </div>
                    <select
                      className="input w-24"
                      value={data.durationType}
                      onChange={(e) =>
                        onText("durationType", e.target.value as DurationType)
                      }
                      disabled={submitting}
                    >
                      <option value="hrs">hrs</option>
                      <option value="min">min</option>
                    </select>
                  </div>
                </Field>
              </div>

              <div className="mt-4">
                <TagComposer
                  label="Time slots"
                  values={data.timeSlots}
                  onAdd={addStrItem("timeSlots")}
                  onRemove={remStrItem("timeSlots")}
                  placeholder='e.g., 7:00 AM, 9:00 AM'
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Description */}
            <div className="mt-6">
             <Field label="Short description">
  <TinyMCETextEditor
    value={data.description}
    onChange={(html: string) => onText("description", html)}
    disabled={submitting}
  />
</Field>

            </div>
          </SectionCard>
        )}

        {/* LLM CHIPS + FAQ */}
        {step.key === "llmChips" && (
         <SectionCard
            title="LLM Chips & FAQs"
            subtitle="Predefined Q&A used by the assistant and on the product page."
            icon={<HelpCircle className="size-5 text-blue-600" />}
          >
            {/* LLM Chips */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">
                  LLM chips
                </span>
                <button
                  type="button"
                  onClick={addLlmChip}
                  disabled={submitting}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                >
                  <Plus className="size-3.5" />
                  Add chip
                </button>
              </div>

              <div className="space-y-3">
                {llmChips.map((c, i) => (
                  <div
                    key={`llm-chip-${i}`}
                    className="rounded-xl border border-gray-200 p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-600">
                        Chip #{i + 1}
                      </p>
                      <button
                        type="button"
                        onClick={() => remLlmChip(i)}
                        disabled={submitting}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                      >
                        <X className="size-3.5" />
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
                          placeholder="What does this activity include?"
                          disabled={submitting}
                        />
                      </Field>
                     <Field label="Answer / Response">
  <TinyMCETextEditor
    value={llmChips[i]?.a || ""}
    onChange={(html: string) => setLlmChip(i, { a: html })}
    disabled={submitting}
  />
</Field>

                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQs */}
            <div className="border-t border-gray-100 pt-4 mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">FAQs</span>
                <button
                  type="button"
                  onClick={addFaq}
                  disabled={submitting}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                >
                  <Plus className="size-3.5" />
                  Add FAQ
                </button>
              </div>

              <div className="space-y-3">
                {faqs.map((c, i) => (
                  <div
                    key={`faq-${i}`}
                    className="rounded-xl border border-gray-200 p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-600">
                        FAQ #{i + 1}
                      </p>
                      <button
                        type="button"
                        onClick={() => remFaq(i)}
                        disabled={submitting}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                      >
                        <X className="size-3.5" />
                        Remove
                      </button>
                    </div>
                    <div className="space-y-3">
                      <Field label="Question">
                        <input
                          type="text"
                          className="input w-full"
                          value={c.q}
                          onChange={(e) => setFaq(i, { q: e.target.value })}
                          placeholder="Is hotel pickup included?"
                          disabled={submitting}
                        />
                      </Field>
                     <Field label="Answer">
  <TinyMCETextEditor
    value={faqs[i]?.a || ""}
    onChange={(html: string) => setFaq(i, { a: html })}
    disabled={submitting}
  />
</Field>

                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard> 
        )}

        {/* DETAILS: logistics, participants, meta */}
        {step.key === "details" && (
          <SectionCard
            title="Logistics & Meta"
            subtitle="Pickup, participants, location and meta information."
            icon={<Bus className="size-5 text-blue-600" />}
          >
            <div className="space-y-5">
              {/* Location from schema.location */}
              <div className="border-b border-gray-100 pb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Activity location
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Address">
                    <input
                      type="text"
                      className="input"
                      value={data.locationAddress}
                      onChange={(e) =>
                        onText("locationAddress", e.target.value)
                      }
                      placeholder="Bhagwan Mahavir Wildlife Sanctuary, Mollem"
                      disabled={submitting}
                    />
                  </Field>
                  <Field label="City">
                    <input
                      type="text"
                      className="input"
                      value={data.locationCity}
                      onChange={(e) => onText("locationCity", e.target.value)}
                      placeholder="Goa"
                      disabled={submitting}
                    />
                  </Field>
                  <Field label="State">
                    <input
                      type="text"
                      className="input"
                      value={data.locationState}
                      onChange={(e) => onText("locationState", e.target.value)}
                      placeholder="Goa"
                      disabled={submitting}
                    />
                  </Field>
                  <Field label="Country">
                    <input
                      type="text"
                      className="input"
                      value={data.locationCountry}
                      onChange={(e) => onText("locationCountry", e.target.value)}
                      placeholder="India"
                      disabled={submitting}
                    />
                  </Field>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Pickup location" required>
                  <input
                    type="text"
                    className="input"
                    value={data.pickupLocation}
                    onChange={(e) => onText("pickupLocation", e.target.value)}
                    placeholder="From selected hotels / points"
                    disabled={submitting}
                  />
                </Field>
                <Field label="Drop location" required>
                  <input
                    type="text"
                    className="input"
                    value={data.dropLocation}
                    onChange={(e) => onText("dropLocation", e.target.value)}
                    placeholder="Hotel or central drop point"
                    disabled={submitting}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Pickup type">
                  <select
                    className="input"
                    value={data.pickupType}
                    onChange={(e) =>
                      onText("pickupType", e.target.value as PickupType)
                    }
                    disabled={submitting}
                  >
                    <option value="hotel">Hotel</option>
                    <option value="meetup">Meetup point</option>
                    <option value="self">Self arrival</option>
                  </select>
                </Field>

                <Field label="Group size">
                  <input
                    type="text"
                    className="input"
                    value={data.groupSize}
                    onChange={(e) => onText("groupSize", e.target.value)}
                    placeholder="Up to 6 per jeep"
                    disabled={submitting}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Min participants">
                  <input
                    type="number"
                    min={0}
                    inputMode="decimal"
                    className="input"
                    value={data.minParticipants}
                    onChange={(e) => onText("minParticipants", e.target.value)}
                    placeholder="1"
                    disabled={submitting}
                  />
                </Field>
                <Field label="Max participants">
                  <input
                    type="number"
                    min={0}
                    inputMode="decimal"
                    className="input"
                    value={data.maxParticipants}
                    onChange={(e) => onText("maxParticipants", e.target.value)}
                    placeholder="30"
                    disabled={submitting}
                  />
                </Field>
              </div>

              <TagComposer
                label="Pickup areas"
                values={data.pickupAreas}
                onAdd={addStrItem("pickupAreas")}
                onRemove={remStrItem("pickupAreas")}
                placeholder="e.g., Calangute, Candolim, Baga"
                disabled={submitting}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Meetup location (if any)">
                  <input
                    type="text"
                    className="input"
                    value={data.meetupLocation}
                    onChange={(e) => onText("meetupLocation", e.target.value)}
                    placeholder="Calangute Beach entrance"
                    disabled={submitting}
                  />
                </Field>
                <Field label="Meeting time">
                  <input
                    type="text"
                    className="input"
                    value={data.meetingTime}
                    onChange={(e) => onText("meetingTime", e.target.value)}
                    placeholder="7:00 AM"
                    disabled={submitting}
                  />
                </Field>
              </div>

              <Field label="Meetup address">
                <textarea
                  className="textarea w-full"
                  value={data.meetupAddress}
                  onChange={(e) => onText("meetupAddress", e.target.value)}
                  placeholder="Full address for meetup (if needed)"
                  disabled={submitting}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-gray-100 pt-4 mt-4">
                <Field label="Rating (0–5)">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={5}
                    className="input"
                    value={data.rating === "" ? "" : Number(data.rating)}
                    onChange={(e) =>
                      onText(
                        "rating",
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    placeholder="4.7"
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
                    onChange={(e) =>
                      onText(
                        "reviewCount",
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    placeholder="231"
                    disabled={submitting}
                  />
                </Field>
                <Field label="Booked count">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    className="input"
                    value={data.bookedCount === "" ? "" : Number(data.bookedCount)}
                    onChange={(e) =>
                      onText(
                        "bookedCount",
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    placeholder="1200"
                    disabled={submitting}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Instant confirmation">
                  <label className="inline-flex items-center gap-3 mt-1">
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={data.instantConfirmation}
                      onChange={(e) =>
                        onText("instantConfirmation", e.target.checked)
                      }
                      disabled={submitting}
                    />
                    <span className="text-sm text-gray-800">
                      Booking confirms instantly
                    </span>
                  </label>
                </Field>
                <Field label="Free cancellation">
                  <label className="inline-flex items-center gap-3 mt-1">
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={data.freeCancellation}
                      onChange={(e) =>
                        onText("freeCancellation", e.target.checked)
                      }
                      disabled={submitting}
                    />
                    <span className="text-sm text-gray-800">
                      Free cancellation as per policy
                    </span>
                  </label>
                </Field>
              </div>

              <Field label="Operated by">
                <input
                  type="text"
                  className="input"
                  value={data.operatedBy}
                  onChange={(e) => onText("operatedBy", e.target.value)}
                  placeholder="Goa Adventure Tours"
                  disabled={submitting}
                />
              </Field>
            </div>
          </SectionCard>
        )}

        {/* EXPERIENCE */}
        {step.key === "experience" && (
          <SectionCard
            title="Experience Content"
            subtitle="Highlights, inclusions, expectations and important notes."
            icon={<Users className="size-5 text-blue-600" />}
          >
            <div className="space-y-6">
              <TagComposer
                label="Highlights"
                values={data.highlights}
                onAdd={addStrItem("highlights")}
                onRemove={remStrItem("highlights")}
                placeholder="e.g., Jeep ride through jungle trails"
                disabled={submitting}
              />

              <TagComposer
                label="Languages"
                values={data.languages}
                onAdd={addStrItem("languages")}
                onRemove={remStrItem("languages")}
                placeholder="e.g., English, Hindi"
                disabled={submitting}
              />

              <TagComposer
                label="Inclusions"
                values={data.inclusions}
                onAdd={addStrItem("inclusions")}
                onRemove={remStrItem("inclusions")}
                placeholder="e.g., Jeep Safari, Forest Entry Fee"
                disabled={submitting}
              />

              <TagComposer
                label="Exclusions"
                values={data.exclusions}
                onAdd={addStrItem("exclusions")}
                onRemove={remStrItem("exclusions")}
                placeholder="e.g., Meals, Personal Expenses"
                disabled={submitting}
              />

              <TagComposer
                label="What to bring"
                values={data.whatToBring}
                onAdd={addStrItem("whatToBring")}
                onRemove={remStrItem("whatToBring")}
                placeholder="e.g., Water bottle, Towel, Swimwear"
                disabled={submitting}
              />

              <TagComposer
                label="Good to know"
                values={data.goodToKnow}
                onAdd={addStrItem("goodToKnow")}
                onRemove={remStrItem("goodToKnow")}
                placeholder="e.g., Wear comfortable shoes"
                disabled={submitting}
              />

              <TagComposer
                label="Safety requirements"
                values={data.safetyRequirements}
                onAdd={addStrItem("safetyRequirements")}
                onRemove={remStrItem("safetyRequirements")}
                placeholder="e.g., Follow guide instructions"
                disabled={submitting}
              />

              <TagComposer
                label="Voucher info"
                values={data.voucherInfo}
                onAdd={addStrItem("voucherInfo")}
                onRemove={remStrItem("voucherInfo")}
                placeholder="e.g., Mobile voucher accepted"
                disabled={submitting}
              />

              {/* What to Expect (schema.whatToExpect) */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    What to expect
                  </h3>
                  <button
                    type="button"
                    onClick={addWhatToExpectItem}
                    disabled={submitting}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                  >
                    <Plus className="size-3.5" />
                    Add item
                  </button>
                </div>
                <div className="space-y-3">
                  {data.whatToExpect.map((w, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-gray-200 p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-600">
                          Item #{idx + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeWhatToExpectItem(idx)}
                          disabled={submitting}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                        >
                          <X className="size-3.5" />
                          Remove
                        </button>
                      </div>
                      <div className="space-y-3">
                        <Field label="Title">
                          <input
                            type="text"
                            className="input"
                            value={w.title}
                            onChange={(e) =>
                              updateWhatToExpectItem(idx, {
                                title: e.target.value,
                              })
                            }
                            placeholder="Adventure Ride"
                            disabled={submitting}
                          />
                        </Field>
                        <Field label="Description">
                          <textarea
                            className="textarea w-full"
                            value={w.description}
                            onChange={(e) =>
                              updateWhatToExpectItem(idx, {
                                description: e.target.value,
                              })
                            }
                            placeholder="Expect some thrilling, bumpy off-road jungle tracks."
                            disabled={submitting}
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* whyChoose */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Why Choose
                  </h3>
                  <button
                    type="button"
                    onClick={addwhychooseItem}
                    disabled={submitting}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                  >
                    <Plus className="size-3.5" />
                    Add item
                  </button>
                </div>
                <div className="space-y-3">
                  {data.whyChoose.map((w, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-gray-200 p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-600">
                          Item #{idx + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => removewhychooseItem(idx)}
                          disabled={submitting}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                        >
                          <X className="size-3.5" />
                          Remove
                        </button>
                      </div>
                      <div className="space-y-3">
                        <Field label="Title">
                          <input
                            type="text"
                            className="input"
                            value={w.title}
                            onChange={(e) =>
                              updatewhyChooseItem(idx, {
                                title: e.target.value,
                              })
                            }
                            placeholder="Adventure Ride"
                            disabled={submitting}
                          />
                        </Field>
                        <Field label="Description">
                          <textarea
                            className="textarea w-full"
                            value={w.description}
                            onChange={(e) =>
                              updatewhyChooseItem(idx, {
                                description: e.target.value,
                              })
                            }
                            placeholder="Expect some thrilling, bumpy off-road jungle tracks."
                            disabled={submitting}
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              

              {/* Extended description */}
              <Field label="Extended description">
                <textarea
                  className="textarea w-full"
                  value={data.extendedDescription}
                  onChange={(e) =>
                    onText("extendedDescription", e.target.value)
                  }
                  placeholder="Tell the full story of the experience..."
                  disabled={submitting}
                />
              </Field>

              {/* Fitness / restrictions / accessibility / best time / seasonal / price note */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                <Field label="Fitness level">
                  <input
                    type="text"
                    className="input"
                    value={data.fitnessLevel}
                    onChange={(e) => onText("fitnessLevel", e.target.value)}
                    placeholder="Moderate"
                    disabled={submitting}
                  />
                </Field>
                <Field label="Accessibility">
                  <input
                    type="text"
                    className="input"
                    value={data.accessibility}
                    onChange={(e) => onText("accessibility", e.target.value)}
                    placeholder="Not wheelchair accessible"
                    disabled={submitting}
                  />
                </Field>
              </div>

              <Field label="Health restrictions">
                <textarea
                  className="textarea w-full"
                  value={data.healthRestrictions}
                  onChange={(e) =>
                    onText("healthRestrictions", e.target.value)
                  }
                  placeholder="Not suitable for pregnant women / heart patients, etc."
                  disabled={submitting}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Best time to visit">
                  <input
                    type="text"
                    className="input"
                    value={data.bestTimeToVisit}
                    onChange={(e) => onText("bestTimeToVisit", e.target.value)}
                    placeholder="October to February"
                    disabled={submitting}
                  />
                </Field>
                <Field label="Seasonal availability">
                  <input
                    type="text"
                    className="input"
                    value={data.seasonalAvailability}
                    onChange={(e) =>
                      onText("seasonalAvailability", e.target.value)
                    }
                    placeholder="Available all year / Not available during monsoon"
                    disabled={submitting}
                  />
                </Field>
              </div>

              <Field label="Price note">
                <input
                  type="text"
                  className="input w-full"
                  value={data.priceNote}
                  onChange={(e) => onText("priceNote", e.target.value)}
                  placeholder="Infants travel free / Includes underwater photos"
                  disabled={submitting}
                />
              </Field>

              {/* Itinerary */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Itinerary
                  </h3>
                  <button
                    type="button"
                    onClick={addItineraryItem}
                    disabled={submitting}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                  >
                    <Plus className="size-3.5" />
                    Add step
                  </button>
                </div>
                <div className="space-y-3">
                  {data.itinerary.map((it, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-gray-200 p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-600">
                          Step #{idx + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeItineraryItem(idx)}
                          disabled={submitting}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                        >
                          <X className="size-3.5" />
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <Field label="Time" className="sm:col-span-1">
                          <input
                            type="text"
                            className="input"
                            value={it.time}
                            onChange={(e) =>
                              updateItineraryItem(idx, { time: e.target.value })
                            }
                            placeholder="7:00 AM"
                            disabled={submitting}
                          />
                        </Field>
                        <Field label="Title" className="sm:col-span-3">
                          <input
                            type="text"
                            className="input"
                            value={it.title}
                            onChange={(e) =>
                              updateItineraryItem(idx, { title: e.target.value })
                            }
                            placeholder="Pickup from Hotel"
                            disabled={submitting}
                          />
                        </Field>
                      </div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <Field label="Description" className="sm:col-span-3">
                          <textarea
                            className="textarea w-full"
                            value={it.description}
                            onChange={(e) =>
                              updateItineraryItem(idx, {
                                description: e.target.value,
                              })
                            }
                            placeholder="Guests are picked up from hotels near Calangute, Baga, Candolim."
                            disabled={submitting}
                          />
                        </Field>
                        <Field label="Duration (optional)">
                          <input
                            type="text"
                            className="input"
                            value={it.duration || ""}
                            onChange={(e) =>
                              updateItineraryItem(idx, {
                                duration: e.target.value,
                              })
                            }
                            placeholder="1 hour"
                            disabled={submitting}
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Operation process */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Operation process
                  </h3>
                  <button
                    type="button"
                    onClick={addOperationItem}
                    disabled={submitting}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                  >
                    <Plus className="size-3.5" />
                    Add step
                  </button>
                </div>
                <div className="space-y-3">
                  {data.operationProcess.map((it, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-gray-200 p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-600">
                          Step #{idx + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeOperationItem(idx)}
                          disabled={submitting}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                        >
                          <X className="size-3.5" />
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <Field label="Time" className="sm:col-span-1">
                          <input
                            type="text"
                            className="input"
                            value={it.time}
                            onChange={(e) =>
                              updateOperationItem(idx, { time: e.target.value })
                            }
                            placeholder="4:00 AM"
                            disabled={submitting}
                          />
                        </Field>
                        <Field label="Title" className="sm:col-span-3">
                          <input
                            type="text"
                            className="input"
                            value={it.title}
                            onChange={(e) =>
                              updateOperationItem(idx, {
                                title: e.target.value,
                              })
                            }
                            placeholder="Meet the Guide"
                            disabled={submitting}
                          />
                        </Field>
                      </div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <Field label="Description" className="sm:col-span-3">
                          <textarea
                            className="textarea w-full"
                            value={it.description}
                            onChange={(e) =>
                              updateOperationItem(idx, {
                                description: e.target.value,
                              })
                            }
                            placeholder="Meet your guide at the assigned location at 6:00 AM sharp."
                            disabled={submitting}
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cancellation */}
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Cancellation policy
                </h3>
                <Field label="Short policy">
                  <input
                    type="text"
                    className="input w-full"
                    value={data.cancellationPolicyShort}
                    onChange={(e) =>
                      onText("cancellationPolicyShort", e.target.value)
                    }
                    placeholder="Full refund up to 24 hours before"
                    disabled={submitting}
                  />
                </Field>
                <div className="mt-3">
                  <TagComposer
                    label="Cancellation details"
                    values={data.cancellationDetails}
                    onAdd={addStrItem("cancellationDetails")}
                    onRemove={remStrItem("cancellationDetails")}
                    placeholder="e.g., No refund within 24 hours of travel"
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {/* SURCHARGES */}
        {step.key === "surcharges" && (
          <SectionCard
            title="Surcharge Charges"
            subtitle="Configure special pricing windows like holidays or peak days."
            icon={<Wallet className="size-5 text-blue-600" />}
          >
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
                <div
                  key={idx}
                  className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 sm:p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-amber-900">
                      Surge #{idx + 1}
                    </p>
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
                    {/* Surge window type + dates */}
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1.5">
                        Surge window
                      </p>
                      <div className="flex items-center gap-4 text-xs mb-3">
                        <label className="inline-flex items-center gap-1.5">
                          <input
                            type="radio"
                            name={`surcharge-window-${idx}`}
                            className="size-3"
                            checked={s.windowType === "single"}
                            onChange={() =>
                              updateSurcharge(idx, {
                                windowType: "single",
                                startDate: "",
                                endDate: "",
                              })
                            }
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
                            onChange={() =>
                              updateSurcharge(idx, {
                                windowType: "range",
                                singleDate: "",
                              })
                            }
                            disabled={submitting}
                          />
                          <span>Date range</span>
                        </label>
                      </div>

                      {s.windowType === "single" ? (
                        <Field label="Date">
                          <input
                            type="date"
                            className="input"
                            value={s.singleDate}
                            onChange={(e) =>
                              updateSurcharge(idx, { singleDate: e.target.value })
                            }
                            disabled={submitting}
                          />
                        </Field>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Start date">
                            <input
                              type="date"
                              className="input"
                              value={s.startDate}
                              onChange={(e) =>
                                updateSurcharge(idx, { startDate: e.target.value })
                              }
                              disabled={submitting}
                            />
                          </Field>
                          <Field label="End date">
                            <input
                              type="date"
                              className="input"
                              value={s.endDate}
                              onChange={(e) =>
                                updateSurcharge(idx, { endDate: e.target.value })
                              }
                              disabled={submitting}
                            />
                          </Field>
                        </div>
                      )}
                    </div>

                    {/* Surge amount */}
                    <Field label="Surge amount">
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={0}
                          inputMode="decimal"
                          className="input"
                          value={s.amount}
                          onChange={(e) =>
                            updateSurcharge(idx, { amount: e.target.value })
                          }
                          placeholder="enter amount"
                          disabled={submitting}
                        />
                        <select
                          className="input w-24"
                          value={s.currency}
                          onChange={(e) =>
                            updateSurcharge(idx, { currency: e.target.value })
                          }
                          disabled={submitting}
                        >
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
          </SectionCard>
        )}

        {/* MEDIA */}
        {step.key === "media" && (
          <SectionCard
            title="Media"
            subtitle="Thumbnail, gallery, guest images and videos."
            icon={<ImageIcon className="size-5 text-blue-600" />}
            requiredHint
          >
            {/* Thumbnail */}
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              Thumbnail (required)
            </h3>
            <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50/50 p-3 sm:p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {existingThumbnailUrl || thumbnail ? (
                  <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-blue-400 bg-white">
                    <img
                      src={thumbnail?.preview || existingThumbnailUrl || ""}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                      decoding="async"
                      loading="lazy"
                    />
                    <button
                      type="button"
                      onClick={clearThumbnail}
                      className="absolute top-1 right-1 size-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md active:scale-95"
                      title="Remove thumbnail"
                      aria-label="Remove thumbnail"
                      disabled={submitting}
                    >
                      <X className="size-4" strokeWidth={3} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                      <p className="text-white text-[10px] font-medium">
                        THUMBNAIL
                      </p>
                    </div>
                  </div>
                ) : (
                  <label className="block aspect-square">
                    <div className="flex flex-col items-center justify-center w-full h-full px-4 py-3 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer hover:border-blue-500 transition-colors bg-white hover:bg-blue-50">
                      <ImageIcon className="size-6 text-blue-400" />
                      <p className="mt-1 text-sm font-medium text-blue-900">
                        Add Thumbnail
                      </p>
                    </div>
                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailUpload}
                      className="hidden"
                      disabled={submitting}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Main gallery images */}
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Gallery images
            </h3>
            <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {existingImageUrls.map((url) => (
                <div
                  key={url}
                  className="relative aspect-square rounded-xl overflow-hidden border border-gray-300 bg-gray-50 shadow-sm"
                >
                  <img
                    src={url}
                    alt="Existing"
                    className="w-full h-full object-cover"
                  />
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
                  <img
                    src={img.preview}
                    alt={`New ${idx + 1}`}
                    className="w-full h-full object-cover opacity-80"
                  />
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
                    <p className="text-white text-[10px] font-medium truncate">
                      NEW
                    </p>
                  </div>
                </div>
              ))}

              <label className="block aspect-square">
                <div className="flex flex-col items-center justify-center w-full h-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 transition-colors bg-white hover:bg-gray-50">
                  <ImageIcon className="size-6 text-gray-400" />
                  <p className="mt-1 text-sm font-medium text-gray-700">
                    Add Image
                  </p>
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

            {/* Guest images */}
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Guest images
            </h3>
            <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {existingGuestImageUrls.map((url) => (
                <div
                  key={url}
                  className="relative aspect-square rounded-xl overflow-hidden border border-gray-300 bg-gray-50 shadow-sm"
                >
                  <img
                    src={url}
                    alt="Guest"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                    <p className="text-white text-[10px] font-medium">
                      EX
                    </p>
                  </div>
                </div>
              ))}

              {newGuestImages.map((img, idx) => (
                <div
                  key={img.preview}
                  className="relative aspect-square rounded-xl overflow-hidden border-2 border-dashed border-blue-400 bg-blue-50"
                >
                  <img
                    src={img.preview}
                    alt={`Guest ${idx + 1}`}
                    className="w-full h-full object-cover opacity-80"
                  />
                  <button
                    type="button"
                    onClick={() => removeNewGuestImage(idx)}
                    className="absolute top-1 right-1 size-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md active:scale-95"
                    title="Remove guest image"
                    aria-label="Remove guest image"
                    disabled={submitting}
                  >
                    <X className="size-4" strokeWidth={3} />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                    <p className="text-white text-[10px] font-medium truncate">
                      NEW
                    </p>
                  </div>
                </div>
              ))}

              <label className="block aspect-square">
                <div className="flex flex-col items-center justify-center w-full h-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 transition-colors bg-white hover:bg-gray-50">
                  <ImageIcon className="size-6 text-gray-400" />
                  <p className="mt-1 text-sm font-medium text-gray-700">
                    Add Guest Image
                  </p>
                </div>
                <input
                  ref={guestFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleGuestImagesUpload}
                  className="hidden"
                  disabled={submitting}
                />
              </label>
            </div>

            {/* Videos */}
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Videos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {existingVideoUrls.map((url) => (
                <div
                  key={url}
                  className="relative rounded-xl overflow-hidden border border-gray-300 bg-black"
                >
                  <video
                    src={url}
                    className="w-full h-full"
                    controls
                    preload="metadata"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                    <p className="text-white text-[10px] font-medium">EXISTING</p>
                  </div>
                </div>
              ))}

              {newVideos.map((vid, idx) => (
                <div
                  key={vid.preview}
                  className="relative rounded-xl overflow-hidden border-2 border-dashed border-blue-400 bg-black"
                >
                  <video
                    src={vid.preview}
                    className="w-full h-full opacity-80"
                    controls
                    preload="metadata"
                  />
                  <button
                    type="button"
                    onClick={() => removeNewVideo(idx)}
                    className="absolute top-1 right-1 size-6 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md active:scale-95"
                    title="Remove video"
                    aria-label="Remove video"
                    disabled={submitting}
                  >
                    <X className="size-4" strokeWidth={3} />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                    <p className="text-white text-[10px] font-medium truncate">
                      NEW
                    </p>
                  </div>
                </div>
              ))}

              <label className="block">
                <div className="flex flex-col items-center justify-center w-full h-full min-h-[120px] px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 transition-colors bg-white hover:bg-gray-50">
                  <ImageIcon className="size-6 text-gray-400" />
                  <p className="mt-1 text-sm font-medium text-gray-700">
                    Add Video
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    MP4 / MOV / WEBM
                  </p>
                </div>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={handleVideosUpload}
                  className="hidden"
                  disabled={submitting}
                />
              </label>
            </div>
          </SectionCard>
        )}
                {/* SEGREGATED MEDIA */}
        {step.key === "segregatedMedia" && (
          <SectionCard
            title="Segregated Images"
            subtitle="Group images by category (e.g., Nature, Waterfall, Guest Images)."
            icon={<ImageIcon className="size-5 text-blue-600" />}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Categories & Images
              </h3>
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
                <div
                  key={group.id}
                  className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 sm:p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-gray-700">
                      Category #{idx + 1}
                    </p>
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
                      onChange={(e) =>
                        updateSegGroupCategory(group.id, e.target.value)
                      }
                      placeholder="e.g., nature, waterfall, guest_images"
                      disabled={submitting}
                    />
                  </Field>

                  <div className="mt-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1.5">
                      Images ({group.images.length})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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
                            <p className="text-white text-[10px] font-medium truncate">
                              NEW
                            </p>
                          </div>
                        </div>
                      ))}

                      <label className="block aspect-square">
                        <div className="flex flex-col items-center justify-center w-full h-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 transition-colors bg-white hover:bg-gray-50">
                          <ImageIcon className="size-6 text-gray-400" />
                          <p className="mt-1 text-sm font-medium text-gray-700">
                            Add Image
                          </p>
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

      {/* Bottom bar */}
      <div className="fixed bottom-0 right-0 left-0 lg:left-64 z-40 bg-gray-50/95 backdrop-blur safe-bottom pt-2">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-2">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-900/5">
            <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="inline-flex items-center gap-2 text-xs text-gray-600 bg-gray-100 rounded-full px-3 py-1.5 font-semibold self-start sm:self-auto">
                <span
                  className={`size-2 rounded-full ${
                    isStepValid(step.key as StepKey)
                      ? "bg-green-500"
                      : "bg-amber-500"
                  }`}
                />
                {isStepValid(step.key as StepKey)
                  ? "Looks good"
                  : "Complete required fields"}
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
                      !canSubmit || submitting
                        ? "bg-blue-300"
                        : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      {submitting && (
                        <Loader2
                          className="size-4 animate-spin"
                          aria-hidden="true"
                        />
                      )}
                      {submitting ? "Creating..." : "Create Activity"}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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
            <div className="size-8 grid place-items-center bg-blue-50 rounded-lg">
              {icon}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{title}</h2>
              {subtitle && (
                <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          {requiredHint && (
            <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">
              * Required
            </span>
          )}
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
