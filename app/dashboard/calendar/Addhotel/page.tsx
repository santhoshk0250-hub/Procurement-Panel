"use client";

import React, { useState,useEffect,useRef  } from "react";
import useSWRMutation from "swr/mutation";
import { useRouter } from "next/navigation";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { TextField, IconButton, Popover, Box, Chip,Typography,Button } from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { DateCalendar, PickersDay } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import axios from "axios";
import { useSnackbar } from "notistack";
import { postInstance } from "@/lib/swr";
import { showToast } from "@/providers/ToastProvider";
import { v4 as uuidv4 } from "uuid";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";


/* ----------------- Types ----------------- */
type LoyaltyProgram = {
  program_name?: string;
  points_accrual?: boolean;
  points_redemption?: boolean;
};

type RailwayDistance = {
  name: string;
  distance_km: number;
};

type Location = {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  distance_from_airport_km?: number;
  distance_from_city_center_km?: number;
  popular_landmarks_nearby?: string[];
  distance_from_railway_station?: RailwayDistance[];
};

type GalleryMedia = {
  thumbnail: File | null;
  videos: File | null;
};

type GalleryPreviews = {
  thumbnail: string;
  videos: string; // video preview urls
};




type ContactInfo = {
  phone?: string;
  email?: string;
};
type MediaGallery = {
  room: File[];
  lobby: File[];
  leisure_images:File[];
  pool_area: File[];
  restaurants: File[];
  beach_view: File[];
  property_video_tour?: File | null;
};

type HotelPayload = {
  hotel_id: string;
  property_name: string;
  chain_brand?: string;
  destination_id?: string;
  market_id?: string;
  loyalty_program?: LoyaltyProgram;
  location?: Location;
  star_category?: string;
  check_in_time?: string;
  check_out_time?: string;
  total_rooms?: number;
  accessibility_features?: string[];
  parking_facility?: string;
  safety_features?: string[];
  contact_info?: ContactInfo;
  hotel_amenities?: HotelAmenity[];
  media_gallery?: MediaGallery;
  awards_and_recognition?: Award[];
  rooms?: Room[];
  dining?: Dining[];
  wellness?: Wellness; 
  familyServices?:FamilyServices;
  transport?: Transport;
events_conferences?: EventsConferences;
experiences?: Experience[];
policies?: Policies;
 staff_languages?: string[];       
  sustainability?: Sustainability;
    reviews?: Reviews;  
  pet_policy?: PetPolicy;
};

type HotelResponse = {
  success: boolean;
  message: string;
  data?: HotelPayload;
};



type Award = {
  award_name: string;
};

type RatePlan = {
  plan_name: string;
  price: number;
  cancellation_policy?: string;
};

type Pricing = {
  currency?: string;
  tax_percent_for_stay?: number;
  service_charge?: number;
  dynamic_pricing_flag?: boolean;
  rate_plans?: RatePlan[];
  hotel_bf_price?: number;
  hotel_lunch_price?: number;
  hotel_dinner_price?: number;
  discounts_offers?: { offer_code?: string; discount_percent?: number; valid_till?: string }[];
  early_checkin_fee?: number;
  late_checkout_fee?: number;
};

type AvailabilityBlock = {
  from?: string;
  to?: string;
  rooms_available?: number;
  not_available?: boolean; // <-- checkbox
};

type BlackoutBlock = {
  from?: string;
  to?: string;
  surcharge_rate?: number; // <-- blackout surcharge per block
  not_available?: boolean; // <-- mark whole range as unavailable
};

type Availability = {
  availability_status?: "Available" | "Sold Out" | "On Request" | "Not Available";
  rooms_available?: number;
  last_updated?: string;

  // Blackout sections
  blackout_blocks?: BlackoutBlock[]; // ⬅️ multiple blackout blocks
  special_blackout_blocks?: BlackoutBlock[]; // ⬅️ multiple "special" blackout blocks

  festive_surcharge?: {
    Diwali?: number;
    Christmas?: number;
    NewYear?: number;
  };
  weekend_rate_flag?: boolean;

  // Normal blocks
  blocks?: AvailabilityBlock[]; // ⬅️ multiple date-wise availability blocks
};



type Bathroom = {
  has_bathtub?: boolean;
  has_separate_shower?: boolean;
  has_rain_shower?: boolean;
  toiletries_brand?: string;
};

type Bedding = {
  options?: string[];
  request_based?: boolean;
};

type Room = {
  room_type?: string;
  room_size?: string;
  occupancy_min?: number;
  occupancy_max?: number;
  bed_type?: string;
  view_type?: string;
  smoking_policy?: "Smoking" | "Non-Smoking" | "Designated Areas";
  total_room?: string;
  extra_bed_availability?: boolean;
  extra_bed_price?: number;
  kids_policy?: string;
  in_room_facilities?: string[];
  amenities?: string[];
  nearby_prime_location?: string;
  bathroom_details?: Bathroom;
  bedding_configuration?: Bedding;
  floor_level?: string;
  pricing?: Pricing;
  availability?: Availability;
  image_link?: File[];           // multiple room images (local uploads)
  room_layout_image?: File[];
};

type Dining = {
  name: string;
  cuisine: string[];
  meal_times: string[];
  operating_hours: string;
  dress_code: string;
  reservation_policy: string;
  menu_link: string;
  specialty: string;
  special_dishes: string[];
  average_price_per_person: number | "";
};

type Wellness = {
  spa: {
    name: string;
    opening_hours: string;
    treatments: string[];
    treatment_menu_link: string;
  };
  gym: {
    name: string;
    opening_hours: string;
    equipment: string[];
    trainer_provided: boolean;
  };
};

type Babysitting = {
  available: boolean; 
  charge?: number;
  charge_unit?: string;
  advance_booking_required?: string;
};

type FamilyServices = {
  kids_policy?: string;
  babysitting_service: Babysitting; 
  kids_menu_available?: boolean;
};

type Transport = {
  airport_pickup: boolean;
  airport_pickup_price?: number;
  shuttle_service?: string;
  car_rental_available: boolean;
};
type SurchargeWindow = "single" | "range";
interface Surcharge {
  windowType: SurchargeWindow;
  singleDate: string; // for single date window
  startDate: string;  // for date range
  endDate: string;    // for date range
  amount: string;
  currency: string;
}


type EventsPricingModel = {
  model_type: string;
  price?: number;
  duration_hours?: number;
  includes?: string[];
  notes?: string;
  description?: string;
  contact_email?: string;
  surcharges?: Surcharge[];
};

type EventsConferences = {
  banquet_halls?: number;
  meeting_rooms?: number;
  max_capacity?: number;
  business_facilities?: string[];
  pricing_models: EventsPricingModel[];
};

type Experience = {
  activity: string;
  price?: number;
  duration?: string;
};

type Policies = {
  cancellation_policy?: string;
  id_requirement?: string;
  smoking_policy?: string;
};

type Sustainability = {
  eco_certified?: boolean;
  green_practices?: string[];
};

type Reviews = {
  review_score?: number;
  review_count?: number;
  top_positive_review?: string;
  top_negative_review?: string;
  guest_reviews_link?: string;
};

type PetRestrictions = {
  max_weight_kg?: number;
  vaccination_required?: boolean;
  restricted_breeds?: string[];
};

type PetExtraCharges = {
  per_pet_per_night?: number;
  cleaning_fee?: number;
};

type PetPolicy = {
  allowed?: boolean;
  types_allowed?: string[];
  restrictions?: PetRestrictions;
  extra_charges?: PetExtraCharges;
  notes?: string;
};

export type HotelAmenity = {
  name: string;
  details?: string;
};

interface AmenitiesProps {
  amenities: HotelAmenity[];
  setAmenities: (amenities: HotelAmenity[]) => void;
}

type TabId =
  | "about"
  |"gallery"
  | "location"
  | "features"
  | "media"
  | "rooms"
  | "availability"
  | "pricing"
  | "dining"
  | "services"
  | "events"
  | "experiences"
  | "policies";

/* ----------------- SWR Fetcher ----------------- */
async function addHotelFetcher(url: string, { arg }: { arg: HotelPayload }) {
  return postInstance<HotelResponse>(url, arg);
}

/* ----------------- Component ----------------- */
const AddHotelPage: React.FC = () => {
  const router = useRouter();

  // Hotel fields
  // const [hotelId, setHotelId] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [chainBrand, setChainBrand] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [marketId, setMarketId] = useState("");
// Markup fields
const [markupMinPrice, setMarkupMinPrice] = useState<number | "">("");
const [markupMaxPrice, setMarkupMaxPrice] = useState<number | "">("");
// ✅ state
const [galleryMedia, setGalleryMedia] = useState<GalleryMedia>({
  thumbnail: null,
  videos: null,
});

const [galleryPreviews, setGalleryPreviews] = useState<GalleryPreviews>({
  thumbnail: "",
  videos: null,
});
  // Loyalty Program fields
  const [programName, setProgramName] = useState("");
  const [pointsAccrual, setPointsAccrual] = useState(false);
  const [pointsRedemption, setPointsRedemption] = useState(false);

  // Location fields
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [pincode, setPincode] = useState("");
  const [latitude, setLatitude] = useState<number | "">("");
  const [longitude, setLongitude] = useState<number | "">("");
  const [airportDistance, setAirportDistance] = useState<number | "">("");
  const [cityCenterDistance, setCityCenterDistance] = useState<number | "">("");
  const [landmarks, setLandmarks] = useState<string>("");

  const [starCategory, setStarCategory] = useState<string | "">("");
   const options = [
    { label: "Hostel", value: "hostel" },
    { label: "2", value: "2" },
    { label: "3", value: "3" },
    { label: "4", value: "4" },
  ];
const [checkInTime, setCheckInTime] = useState<Dayjs | null>(null);
const [checkOutTime, setCheckOutTime] = useState<Dayjs | null>(null);
  const [totalRooms, setTotalRooms] = useState<number | "">("");
  const [description, setDescription] = useState<string[]>([]);


  // Features
  const [accessibilityFeatures, setAccessibilityFeatures] = useState("");
  const [parkingFacility, setParkingFacility] = useState("");
  const [safetyFeatures, setSafetyFeatures] = useState("");

  // Contact Info
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Railway stations list
  const [railwayStations, setRailwayStations] = useState<RailwayDistance[]>([
    { name: "", distance_km: 0 },
  ]);

   // Hotel amenities list

   const [newAmenity, setNewAmenity] = useState("");
  const [showInput, setShowInput] = useState(false);

  const addAmenity = () => {
    if (newAmenity.trim() !== "") {
      setAmenities([...amenities, { name: newAmenity.trim() }]);
      setNewAmenity("");
      setShowInput(false);
    }
  };

  const removeAmenity = (index: number) => {
    const updated = [...amenities];
    updated.splice(index, 1);
    setAmenities(updated);
  };
const [amenities, setAmenities] = useState<HotelAmenity[]>([
  { name: "Free Wi-Fi" },
  { name: "Swimming Pool" },
  { name: "Fitness Center" },
  { name: "Parking Facility" },
  { name: "Restaurant" },
  { name: "Bar/Lounge" },
  { name: "Room Service" },
  { name: "24-Hour Front Desk" },
  { name: "Spa & Wellness Center" },
  { name: "Airport Shuttle" },
  { name: "Airport/Railway Station Pick and Drop" },
  { name: "Business Center" },
  { name: "Conference Rooms" },
  { name: "Laundry Service" },
  { name: "Pet-Friendly" },
  { name: "Air Conditioning" },
  { name: "Non-Smoking Rooms" },
  { name: "Breakfast Included" },
  { name: "Mini Bar" },
  { name: "Tea/Coffee Maker" },
  { name: "Complimentary Toiletries" },
  { name: "Family Rooms" },
  { name: "Daily Housekeeping" },
  { name: "Luggage Storage" },
  { name: "Elevator/Lift" },
  { name: "Shuttle Service (Local)" },
  { name: "Car Rental Service" },
  { name: "Currency Exchange" },
  { name: "ATM on Site" },
  { name: "Library/Reading Room" },
  { name: "Children’s Play Area" },
  { name: "Baby Sitting/Child Services" },
  { name: "Smoking Area" }
]);

const addSurcharge = (modelIdx: number) => {
  setEventsConferences(prev => {
    const pricing_models = [...prev.pricing_models];
    const model = { ...pricing_models[modelIdx] };
    const surcharges = model.surcharges ? [...model.surcharges] : [];

    surcharges.push({
      windowType: "single",
      singleDate: "",
      startDate: "",
      endDate: "",
      amount: "",
      currency: "INR",
    });

    model.surcharges = surcharges;
    pricing_models[modelIdx] = model;
    return { ...prev, pricing_models };
  });
};

const removeSurcharge = (modelIdx: number, surchargeIdx: number) => {
  setEventsConferences(prev => {
    const pricing_models = [...prev.pricing_models];
    const model = { ...pricing_models[modelIdx] };
    const surcharges = model.surcharges ? [...model.surcharges] : [];

    surcharges.splice(surchargeIdx, 1);
    model.surcharges = surcharges;
    pricing_models[modelIdx] = model;
    return { ...prev, pricing_models };
  });
};

const updateSurcharge = (
  modelIdx: number,
  surchargeIdx: number,
  updates: Partial<Surcharge>
) => {
  setEventsConferences(prev => {
    const pricing_models = [...prev.pricing_models];
    const model = { ...pricing_models[modelIdx] };
    const surcharges = model.surcharges ? [...model.surcharges] : [];

    surcharges[surchargeIdx] = {
      ...surcharges[surchargeIdx],
      ...updates,
    };

    model.surcharges = surcharges;
    pricing_models[modelIdx] = model;
    return { ...prev, pricing_models };
  });
};

const [selectedRoom, setSelectedRoom] = useState(0); // default Room 1

    const [mediaGallery, setMediaGallery] = useState<MediaGallery>({
    room:[],
    lobby: [],
    leisure_images:[],
    pool_area: [],
    restaurants: [],
    beach_view: [],
    property_video_tour: null,
    });

    const [previews, setPreviews] = useState({
    room:[],
    lobby: [],
    leisure_images:[],
    pool_area: [],
    restaurants: [],
    beach_view: [],
    property_video_tour: "",
    });
  const [awards, setAwards] = useState<Award[]>([{ award_name: "" }]);

const [rooms, setRooms] = useState<Room[]>([
  {
    occupancy_min: 1,
    occupancy_max: 2,
    smoking_policy: "Non-Smoking",
    image_link: [],
    room_layout_image: [],
    availability: {
      availability_status: "Available",
      rooms_available: 0,
      blocks: [
        {
          from: "",
          to: "",
          rooms_available: 0, // must be a number
          not_available: false,
        },
      ], // ⬅️ initialize with 1 block

      blackout_blocks: [
        {
          from: "",
          to: "",
          surcharge_rate: 0, // must be a number
          not_available: false,
        },
      ],
      special_blackout_blocks : [
        {
          from: "",
          to: "",
          surcharge_rate: 0, // must be a number
          not_available: false,
        },
      ], 
    },
  },
]);



const [dinings, setDinings] = useState<Dining[]>([
    {
      name: "",
      cuisine: [],
      meal_times: [],
      operating_hours: "",
      dress_code: "",
      reservation_policy: "",
      menu_link: "",
      specialty: "",
      special_dishes: [],
      average_price_per_person: "",
    },
  ]);
  const [wellness, setWellness] = useState<Wellness>({
    spa: {
      name: "",
      opening_hours: "",
      treatments: [],
      treatment_menu_link: "",
    },
    gym: {
      name: "",
      opening_hours: "",
      equipment: [],
      trainer_provided: false,
    },
  });

  const [familyServices, setFamilyServices] = useState<FamilyServices>({
    kids_policy: "",
    kids_menu_available: false,
    babysitting_service: {
      available: false,
      charge: undefined,
      charge_unit: "per hour", // default
      advance_booking_required: "",
    },
  });

  const [transport, setTransport] = useState<Transport>({
          airport_pickup: false,
          airport_pickup_price: undefined,
          shuttle_service: "",
          car_rental_available: true,
        });

const [eventsConferences, setEventsConferences] = useState<EventsConferences>({
  banquet_halls: undefined,
  meeting_rooms: undefined,
  max_capacity: undefined,
  business_facilities: [],
  pricing_models: [
    {
      model_type: "",
      price: undefined,
      duration_hours: undefined,
      includes: [],
      notes: "",
      description: "",
      contact_email: "",
       surcharges: [],
    },
  ],
});

const [experiences, setExperiences] = useState<Experience[]>([
  { activity: "", price: undefined, duration: "" },
]);

const [policies, setPolicies] = useState<Policies>({
  cancellation_policy: "",
  id_requirement: "",
  smoking_policy: "",
});

const [staffLanguages, setStaffLanguages] = useState<string[]>([]);
const [sustainability, setSustainability] = useState<Sustainability>({
  eco_certified: false,
  green_practices: [],
});

// const [reviews, setReviews] = useState<Reviews>({
//   review_score: undefined,
//   review_count: undefined,
//   top_positive_review: "",
//   top_negative_review: "",
//   guest_reviews_link: "",
// });

const [petPolicy, setPetPolicy] = useState<PetPolicy>({
  allowed: false,
  types_allowed: [],
  restrictions: {
    max_weight_kg: undefined,
    vaccination_required: false,
    restricted_breeds: [],
  },
  extra_charges: {
    per_pet_per_night: undefined,
    cleaning_fee: undefined,
  },
  notes: "",
});
	const [truebutton, setTruebutton] = useState(false)
  const [spaOpeningTime, setSpaOpeningTime] = useState<Dayjs | null>(
  wellness.spa.opening_hours ? dayjs(wellness.spa.opening_hours, "HH:mm") : null
);
const [gymOpeningTime, setGymOpeningTime] = useState<Dayjs | null>(
  wellness.gym.opening_hours ? dayjs(wellness.gym.opening_hours, "HH:mm") : null
);
const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
const [specialAnchorEl, setSpecialAnchorEl] = useState<HTMLElement | null>(null);
const [Loader,setLoader]=useState<boolean>(false);

const tabs: { id: TabId; label: string }[] = [
  { id: "about", label: "About" },
  {id:"gallery",label:"Gallery"},
  { id: "location", label: "Location" },
  { id: "features", label: "Features" },
  { id: "media", label: "Media" },
  { id: "rooms", label: "Rooms" },
  { id: "availability", label: "Availability" },
  { id: "pricing", label: "Pricing" },
  { id: "dining", label: "Dining" },
  { id: "services", label: "Services" },
  { id: "events", label: "Events" },
  { id: "experiences", label: "Experiences" },
  { id: "policies", label: "Policies and Staff" },
  // { id: "reviews", label: "Reviews" },
];
  const handleOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const open = Boolean(anchorEl);
const { enqueueSnackbar } = useSnackbar();
useEffect(() => {
  setCheckInTime(dayjs("14:00", "HH:mm"));
  setCheckOutTime(dayjs("12:00", "HH:mm"));
}, []);

  const { trigger, isMutating } = useSWRMutation("/hotels/addhotel", addHotelFetcher);

  const handleAddRailwayStation = () => {
    setRailwayStations([...railwayStations, { name: "", distance_km: 0 }]);
  };

  const handleRemoveRailwayStation = (index: number) => {
    setRailwayStations(railwayStations.filter((_, i) => i !== index));
  };

const handleStationChange = (
  index: number,
  field: keyof RailwayDistance,
  value: string | number
) => {
  const updated = [...railwayStations];
  if (field === "distance_km") {
    updated[index][field] = Number(value) as RailwayDistance[typeof field];
  } else {
    updated[index][field] = value as RailwayDistance[typeof field];
  }
  setRailwayStations(updated);
};

 const handleAddAmenity = () => {
    setAmenities([...amenities, { name: "", details: "" }]);
  };
  const handleRemoveAmenity = (index: number) => {
    setAmenities(amenities.filter((_, i) => i !== index));
  };
  const handleAmenityChange = (index: number, field: keyof HotelAmenity, value: string) => {
    const updated = [...amenities];
    updated[index][field] = value;
    setAmenities(updated);
  };

    const handleAddAward = () => setAwards([...awards, { award_name: "" }]);
  const handleRemoveAward = (index: number) =>
    setAwards(awards.filter((_, i) => i !== index));
    const handleAwardChange = <K extends keyof Award>(
    index: number,
    field: K,
    value: Award[K]
    ) => {
    const updated = [...awards];
    updated[index][field] = value;
    setAwards(updated);
    };
  const handleAddRoom = () => {
  setRooms([
    ...rooms,
    {
      room_type: "",
      room_size: "",
      occupancy_min: 1,
      occupancy_max: 2,
      bed_type: "",
      smoking_policy: "Non-Smoking",
      extra_bed_availability: false,
      extra_bed_price: 0,
      image_link: [],
      room_layout_image: [],
      in_room_facilities: [],
      amenities: [],
      nearby_prime_location: "",
      bathroom_details: {
        has_bathtub: false,
        has_separate_shower: false,
        has_rain_shower: false,
        toiletries_brand: "",
      },
      bedding_configuration: {
        options: [],
        request_based: false,
      },
      pricing: {
        currency: "",
        tax_percent_for_stay: 0,
        service_charge: 0,
        dynamic_pricing_flag: false,
        rate_plans: [
          { plan_name: "Room only", price: 0, cancellation_policy: "" }
        ],
        hotel_bf_price: 0,
        hotel_lunch_price: 0,
        hotel_dinner_price: 0,
        early_checkin_fee: 0,
        late_checkout_fee: 0,
      },
      availability: {
        availability_status: "Available",
        rooms_available: 0,
        last_updated: "",
        weekend_rate_flag: false,
        festive_surcharge: { Diwali: 0, Christmas: 0, NewYear: 0 },

        // ✅ initialize blocks so UI doesn’t break
        blocks: [
          { from: "", to: "", rooms_available: 0, not_available: false },
        ],
        blackout_blocks: [
          { from: "", to: "", surcharge_rate: 0, not_available: false },
        ],
        special_blackout_blocks: [
          { from: "", to: "", surcharge_rate: 0, not_available: false },
        ],
      },
    },
  ]);
};

  
   const handleRemoveRoom = (idx: number) => {
    setRooms(rooms.filter((_, i) => i !== idx));
  };

const handleRoomChange = <K extends keyof Room>(
  idx: number,
  field: K,
  value: Room[K]
) => {
  const updated = [...rooms];
  updated[idx] = { ...updated[idx], [field]: value };
  setRooms(updated);
};

  const handleBathroomChange = (idx: number, field: keyof Bathroom, value: any) => {
    const updated = [...rooms];
    updated[idx].bathroom_details = { ...updated[idx].bathroom_details, [field]: value };
    setRooms(updated);
  };

  const handleBeddingChange = (idx: number, field: keyof Bedding, value: any) => {
    const updated = [...rooms];
    updated[idx].bedding_configuration = { ...updated[idx].bedding_configuration, [field]: value };
    setRooms(updated);
  };

  // ---------- Gallery handlers ----------
const uploadGalleryThumbnail = (file: File | null) => {
  if (!file) return;

  // replace existing thumbnail
  setGalleryMedia((prev) => ({ ...prev, thumbnail: file }));

  // replace preview url
  if (galleryPreviews.thumbnail) URL.revokeObjectURL(galleryPreviews.thumbnail);
  setGalleryPreviews((prev) => ({ ...prev, thumbnail: URL.createObjectURL(file) }));
};

const uploadGalleryVideo = (file: File | null) => {
  if (!file) return;

  // replace existing preview url
  if (galleryPreviews.videos) URL.revokeObjectURL(galleryPreviews.videos);

  setGalleryMedia((prev) => ({ ...prev, videos: file }));
  setGalleryPreviews((prev) => ({ ...prev, videos: URL.createObjectURL(file) }));
};

const removeGalleryVideo = () => {
  if (galleryPreviews.videos) URL.revokeObjectURL(galleryPreviews.videos);
  setGalleryMedia((prev) => ({ ...prev, videos: null }));
  setGalleryPreviews((prev) => ({ ...prev, videos: "" }));
};


const removeGalleryThumbnail = () => {
  if (galleryPreviews.thumbnail) URL.revokeObjectURL(galleryPreviews.thumbnail);
  setGalleryMedia((prev) => ({ ...prev, thumbnail: null }));
  setGalleryPreviews((prev) => ({ ...prev, thumbnail: "" }));
};

  /* ------------- Pricing Handlers ------------- */
const handlePricingChange = (idx: number, field: keyof Pricing, value: any) => {
  const updatedRooms = [...rooms];
  updatedRooms[idx].pricing = {
    ...updatedRooms[idx].pricing,
    [field]: value,
  };
  setRooms(updatedRooms);
};

const handleAddRatePlan = (roomIdx: number) => {
  setRooms((prev) =>
    prev.map((room, idx) => {
      if (idx !== roomIdx) return room;

      const existingPlans = room.pricing?.rate_plans ?? [];
      const newPlan = {
        plan_name: `Room only`, // <-- default text (or use Plan ${existingPlans.length + 1})
        price: 0,
        cancellation_policy: "",
      };

      return {
        ...room,
        pricing: {
          ...(room.pricing ?? {}),
          rate_plans: [...existingPlans, newPlan],
        },
      };
    })
  );
};


const handleRemoveRatePlan = (roomIdx: number, planIdx: number) => {
  // Prevent removing the default "Room only" plan (always at index 0)
  if (planIdx === 0) {
    return;
  }
  const updatedRooms = [...rooms];
  const ratePlans = updatedRooms[roomIdx].pricing?.rate_plans || [];
  ratePlans.splice(planIdx, 1);
  updatedRooms[roomIdx].pricing!.rate_plans = ratePlans;
  setRooms(updatedRooms);
};

const handleRatePlanChange = (
  roomIdx: number,
  planIdx: number,
  field: keyof RatePlan,
  value: any
) => {
  const updatedRooms = [...rooms];
  const ratePlans = updatedRooms[roomIdx].pricing?.rate_plans || [];
  // Prevent editing plan_name for the default "Room only" plan (always at index 0)
  if (planIdx === 0 && field === "plan_name") {
    return;
  }
  ratePlans[planIdx] = { ...ratePlans[planIdx], [field]: value };
  updatedRooms[roomIdx].pricing!.rate_plans = ratePlans;
  setRooms(updatedRooms);
};

/* ------------- Availability Handlers ------------- */
const handleAvailabilityChange = (idx: number, field: keyof Availability, value: any) => {
  const updatedRooms = [...rooms];
  updatedRooms[idx].availability = {
    ...updatedRooms[idx].availability,
    [field]: value,
  };
  setRooms(updatedRooms);
};

/* ------------- Festive Surcharge Handlers ------------- */
const handleFestiveChange = (idx: number, field: keyof NonNullable<Availability["festive_surcharge"]>, value: number) => {
  const updatedRooms = [...rooms];
  const oldSurcharge = updatedRooms[idx].availability?.festive_surcharge || {};
  updatedRooms[idx].availability = {
    ...updatedRooms[idx].availability,
    festive_surcharge: { ...oldSurcharge, [field]: value },
  };
  setRooms(updatedRooms);
};

   // Handle Image Uploads (Lobby, Pool, Restaurants, Beach)
 const handleImageUpload = (field: keyof MediaGallery, files: FileList | null) => {
  if (!files) return;
  const fileArray = Array.from(files);
  const urls = fileArray.map((file) => URL.createObjectURL(file));

  setMediaGallery((prev) => ({
    ...prev,
    [field]: [...(prev[field] as File[]), ...fileArray], // store binary files
  }));

  setPreviews((prev) => ({
    ...prev,
    [field]: [...(prev[field] as string[]), ...urls], // store preview URLs
  }));
};

// For single file video upload
const handleVideoUpload = (file: File | null) => {
  if (!file) return;
  setMediaGallery((prev) => ({
    ...prev,
    property_video_tour: file, // binary file
  }));
  setPreviews((prev) => ({
    ...prev,
    property_video_tour: URL.createObjectURL(file), // preview URL
  }));
};
// Add multiple room images
const handleRoomImagesChange = (roomIndex: number, files: File[]) => {
  setRooms((prevRooms) =>
    prevRooms.map((room, idx) =>
      idx === roomIndex ? { ...room, image_link: files } : room
    )
  );
};

// Add multiple room layout images
const handleRoomLayoutImagesChange = (roomIndex: number, newFiles: File[]) => {
  setRooms((prevRooms) =>
    prevRooms.map((room, idx) =>
      idx === roomIndex
        ? {
            ...room,
            room_layout_image: [
              ...(room.room_layout_image || []), // keep old files
              ...newFiles, // append new ones
            ],
          }
        : room
    )
  );
};


// Remove one room image
const handleRemoveRoomImage = (roomIndex: number, imageIndex: number) => {
  setRooms((prevRooms) =>
    prevRooms.map((room, idx) =>
      idx === roomIndex
        ? {
            ...room,
            image_link: room.image_link?.filter((_, i) => i !== imageIndex),
          }
        : room
    )
  );
};

// Remove one room layout image
const handleRemoveRoomLayoutImage = (roomIndex: number, imageIndex: number) => {
  setRooms((prevRooms) =>
    prevRooms.map((room, idx) =>
      idx === roomIndex
        ? {
            ...room,
            room_layout_image: room.room_layout_image?.filter(
              (_, i) => i !== imageIndex
            ),
          }
        : room
    )
  );
};

const handleDiningChange = (
    idx: number,
    field: keyof Dining,
    value: any
  ) => {
    const updated = [...dinings];
    updated[idx][field] = value;
    setDinings(updated);
  };
  const handleAddDining = () => {
    setDinings([
      ...dinings,
      {
        name: "",
        cuisine: [],
        meal_times: [],
        operating_hours: "",
        dress_code: "",
        reservation_policy: "",
        menu_link: "",
        specialty: "",
        special_dishes: [],
        average_price_per_person: "",
      },
    ]);
  };

  const handleRemoveDining = (idx: number) => {
    setDinings(dinings.filter((_, i) => i !== idx));
  };

  const removeImage = (type: keyof MediaGallery, index: number) => {
  setPreviews((prev) => {
    const current = prev[type];
    if (Array.isArray(current)) {
      return {
        ...prev,
        [type]: current.filter((_, i) => i !== index),
      };
    }
    return prev;
  });

  setMediaGallery((prev) => {
    const current = prev[type];
    if (Array.isArray(current)) {
      return {
        ...prev,
        [type]: current.filter((_, i) => i !== index),
      };
    }
    return prev;
  });
};



  const removeVideo = () => {
  setPreviews((prev) => ({ ...prev, property_video_tour: "" }));
  setMediaGallery((prev) => ({ ...prev, property_video_tour: null }));
};

const isFormValid = () => {
  // Property name
  if (!propertyName) return false;

  // Location (basic)
  if (!address || !city || !state || !country || !pincode) return false;

  // Media check (at least one room image or layout image)
  const hasRoomMedia =
    rooms.some(
      (room) =>
        (room.room_layout_image && room.room_layout_image.length > 0) ||
        (room.image_link && room.image_link.length > 0)
    ) || false;

  if (!hasRoomMedia) return false;

  // Hotel main media gallery check (at least one)
  const hasMainMedia =
    mediaGallery.room?.length > 0;

  if (!hasMainMedia) return false;

  // Rooms must exist
  // const hasValidRooms = rooms.some((room) => room.room_id && room.room_id.trim() !== "");
  // if (!hasValidRooms) return false;


  return true;
};


 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoader(true);

  try {
    const formData = new FormData();

    // Required hotel info
    // formData.append("hotel_id", hotelId);
    formData.append("property_name", propertyName);
    if (chainBrand) formData.append("chain_brand", chainBrand);

    // Destination / Market
    if (destinationId) formData.append("destination_id", destinationId);
    if (marketId) formData.append("market_id", marketId);
if (markupMinPrice !== "") formData.append("markup_min_price", String(markupMinPrice));
if (markupMaxPrice !== "") formData.append("markup_max_price", String(markupMaxPrice));

    // Loyalty program (nested object as JSON)
    if (programName) {
      formData.append(
        "loyalty_program",
        JSON.stringify({
          program_name: programName,
          points_accrual: pointsAccrual,
          points_redemption: pointsRedemption,
        })
      );
    }

    // Location object
    formData.append(
      "location",
      JSON.stringify({
        address,
        city,
        state,
        country,
        pincode,
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
        distance_from_airport_km: airportDistance
          ? Number(airportDistance)
          : undefined,
        distance_from_city_center_km: cityCenterDistance
          ? Number(cityCenterDistance)
          : undefined,
        popular_landmarks_nearby: landmarks
          ? landmarks.split(",").map((l) => l.trim())
          : [],
        distance_from_railway_station: railwayStations.filter(
          (rs) => rs.name && rs.distance_km > 0
        ),
      })
    );

    // Extra hotel details
    if (starCategory) formData.append("star_category", String(starCategory));
   if (checkInTime) {
     formData.append("check_in_time", checkInTime.format("hh:mm A")); 
      }

      if (checkOutTime) {
        formData.append("check_out_time", checkOutTime.format("hh:mm A")); 
      }

    if (totalRooms) formData.append("total_rooms", String(totalRooms));
    if (description.length > 0) {
      // Format description as markdown list
      const descriptionText = description
        .filter(point => point.trim().length > 0)
        .map(point => `- ${point.trim()}`)
        .join('\n');
      formData.append("description", descriptionText);
    }


    if (accessibilityFeatures)
      formData.append(
        "accessibility_features",
        JSON.stringify(accessibilityFeatures.split(",").map((f) => f.trim()))
      );

    if (parkingFacility)
      formData.append("parking_facility", parkingFacility);

    if (safetyFeatures)
      formData.append(
        "safety_features",
        JSON.stringify(safetyFeatures.split(",").map((f) => f.trim()))
      );

    if (phone || email) {
      formData.append(
        "contact_info",
        JSON.stringify({ phone, email })
      );
    }

    // Hotel amenities (array of objects)
    if (amenities.length > 0) {
      formData.append("hotel_amenities", JSON.stringify(amenities));
    }

    // Awards
    if (awards.length > 0) {
      formData.append(
        "awards_and_recognition",
        JSON.stringify(awards.filter((a) => a.award_name))
      );
    }

    // ---------- Gallery formData ----------
    if (galleryMedia.thumbnail) {
      formData.append("gallery[thumbnail]", galleryMedia.thumbnail);
    }
    if (galleryMedia.videos) {
      formData.append("gallery[videos]", galleryMedia.videos);
    }


    // Media Gallery: handle multiple images + video
    if (mediaGallery.room) {
      mediaGallery.room.forEach((file: File) =>
        formData.append("media_gallery[room]", file)
      );
    }
    if (mediaGallery.lobby) {
      mediaGallery.lobby.forEach((file: File) =>
        formData.append("media_gallery[lobby]", file)
      );
    }
     if (mediaGallery.leisure_images) {
      mediaGallery.leisure_images.forEach((file: File) =>
        formData.append("media_gallery[leisure_images]", file)
      );
    }
    if (mediaGallery.pool_area) {
      mediaGallery.pool_area.forEach((file: File) =>
        formData.append("media_gallery[pool_area]", file)
      );
    }
    if (mediaGallery.restaurants) {
      mediaGallery.restaurants.forEach((file: File) =>
        formData.append("media_gallery[restaurants]", file)
      );
    }
    if (mediaGallery.beach_view) {
      mediaGallery.beach_view.forEach((file: File) =>
        formData.append("media_gallery[beach_view]", file)
      );
    }
    if (mediaGallery.property_video_tour) {
      formData.append(
        "media_gallery[property_video_tour]",
        mediaGallery.property_video_tour as File
      );
    }

    //room section
     rooms.forEach((room, idx) => {
      // 1. Append room details (excluding files)
      formData.append(
        `rooms[${idx}]`,
        JSON.stringify({
          room_type: room.room_type,
          room_size: room.room_size,
          occupancy_min: room.occupancy_min,
          occupancy_max: room.occupancy_max,
          bed_type: room.bed_type,
          total_room: room.total_room,
          view_type: room.view_type,
          smoking_policy: room.smoking_policy,
          extra_bed_availability: room.extra_bed_availability,
          extra_bed_price: room.extra_bed_price,
          kids_policy: room.kids_policy,
          in_room_facilities: room.in_room_facilities || [],
          amenities: room.amenities || [],
          nearby_prime_location: room.nearby_prime_location,
          bathroom_details: room.bathroom_details,
          bedding_configuration: room.bedding_configuration,
          floor_level: room.floor_level,
          pricing: room.pricing,
          availability: room.availability,
        })
      );

      // 2. Append room layout images
      if (room.room_layout_image && room.room_layout_image.length > 0) {
        room.room_layout_image.forEach((file: File) => {
          formData.append(`rooms[${idx}][room_layout_images]`, file);
        });
      }

      // 3. Append room images
      if (room.image_link && room.image_link.length > 0) {
        room.image_link.forEach((file: File) => {
          formData.append(`rooms[${idx}][images]`, file);
        });
      }
    });

    // Dining Details
if (dinings.length > 0) {
  formData.append(
    "dining",
    JSON.stringify(
      dinings.map((dining) => ({
        name: dining.name,
        cuisine: dining.cuisine || [],
        meal_times: dining.meal_times || [],
        operating_hours: dining.operating_hours || "",
        dress_code: dining.dress_code || "",
        reservation_policy: dining.reservation_policy || "",
        menu_link: dining.menu_link || "",
        specialty: dining.specialty || "",
        special_dishes: dining.special_dishes || [],
        average_price_per_person: dining.average_price_per_person || 0,
      }))
    )
  );
}


if (wellness) {
  formData.append(
    "wellness",
    JSON.stringify({
      spa: {
        name: wellness.spa.name,
        opening_hours: wellness.spa.opening_hours,
        treatments: wellness.spa.treatments,
        treatment_menu_link: wellness.spa.treatment_menu_link,
      },
      gym: {
        name: wellness.gym.name,
        opening_hours: wellness.gym.opening_hours,
        equipment: wellness.gym.equipment,
        trainer_provided: wellness.gym.trainer_provided,
      },
    })
  );
}

if (familyServices) {
  formData.append(
    "family_services",
    JSON.stringify({
      kids_policy: familyServices.kids_policy,
      kids_menu_available: familyServices.kids_menu_available,
      babysitting_service: familyServices.kids_menu_available
        ? {
            available: familyServices.babysitting_service.available,
            charge: familyServices.babysitting_service.charge,
            charge_unit: familyServices.babysitting_service.charge_unit,
            advance_booking_required:
              familyServices.babysitting_service.advance_booking_required,
          }
        : undefined,
    })
  );
}

if (transport) {
  formData.append(
    "transport",
    JSON.stringify({
      airport_pickup: transport.airport_pickup,
      airport_pickup_price: transport.airport_pickup
        ? transport.airport_pickup_price
        : undefined,
      shuttle_service: transport.shuttle_service,
      car_rental_available: transport.car_rental_available,
    })
  );
}

if (eventsConferences) {
  formData.append(
    "events_conferences",
    JSON.stringify({
      banquet_halls: eventsConferences.banquet_halls,
      meeting_rooms: eventsConferences.meeting_rooms,
      max_capacity: eventsConferences.max_capacity,
      business_facilities: eventsConferences.business_facilities || [],
      pricing_models: eventsConferences.pricing_models.map((model) => ({
        model_type: model.model_type,
        price: model.price,
        duration_hours: model.duration_hours,
        includes: model.includes || [],
        notes: model.notes,
        description: model.description,
        contact_email: model.contact_email,
        surcharges: model.surcharges || [],
      })),
    })
  );
}

if (experiences && experiences.length > 0) {
  formData.append(
    "experiences",
    JSON.stringify(
      experiences.map((exp) => ({
        activity: exp.activity,
        price: exp.price,
        duration: exp.duration,
      }))
    )
  );
}

if (policies) {
      formData.append(
        "policies",
        JSON.stringify({
          cancellation_policy: policies.cancellation_policy,
          id_requirement: policies.id_requirement,
          smoking_policy: policies.smoking_policy,
        })
      );
    }

    // Staff Languages
if (staffLanguages && staffLanguages.length > 0) {
  formData.append("staff_languages", JSON.stringify(staffLanguages));
}

// Sustainability
if (sustainability) {
  formData.append(
    "sustainability",
    JSON.stringify({
      eco_certified: sustainability.eco_certified,
      green_practices: sustainability.green_practices || [],
    })
  );
}

// Reviews
// if (reviews) {
//   formData.append(
//     "reviews",
//     JSON.stringify({
//       review_score: reviews.review_score,
//       review_count: reviews.review_count,
//       top_positive_review: reviews.top_positive_review,
//       top_negative_review: reviews.top_negative_review,
//       guest_reviews_link: reviews.guest_reviews_link,
//     })
//   );
// }
// Pet Policy
if (petPolicy) {
  formData.append(
    "pet_policy",
    JSON.stringify({
      allowed: petPolicy.allowed,
      types_allowed: petPolicy.types_allowed || [],
      restrictions: petPolicy.restrictions
        ? {
            max_weight_kg: petPolicy.restrictions.max_weight_kg,
            vaccination_required: petPolicy.restrictions.vaccination_required,
            restricted_breeds: petPolicy.restrictions.restricted_breeds || [],
          }
        : undefined,
      extra_charges: petPolicy.extra_charges
        ? {
            per_pet_per_night: petPolicy.extra_charges.per_pet_per_night,
            cleaning_fee: petPolicy.extra_charges.cleaning_fee,
          }
        : undefined,
      notes: petPolicy.notes,
    })
  );
}


    // 🔥 Finally trigger SWR mutation
   axios.post( process.env.NEXT_PUBLIC_API_BASE + "hotels/addhotel",formData, { withCredentials: true, headers: { "Content-Type": "multipart/form-data" },})
      .then((res) => {
      showToast.success("Hotel added successfully!");
        router.push("/dashboard/calendar");
      })
      .catch((err) => {
        setTruebutton(false);

        if (
          err.response?.data?.error?.includes(
            "Cast to ObjectId failed for value"
          )
        ) {
      showToast.error(err.response?.message || "Failed to add hotel");
        } else {
    showToast.error(err.response.message || "Something went wrong");
          console.error("❌ Upload error:", err);
        }
      })
      .finally(() => {
    setLoader(false);
      });
  } catch (error: any) {
    console.error("❌ Unexpected error:", error);
    showToast.error(error.message || "Something went wrong");
    setTruebutton(false);
  }
};

const handleSpaChange = (field: keyof Wellness['spa'], value: any) => {
    setWellness({ ...wellness, spa: { ...wellness.spa, [field]: value } });
  };

  const handleGymChange = (field: keyof Wellness['gym'], value: any) => {
    setWellness({ ...wellness, gym: { ...wellness.gym, [field]: value } });
  }

   const yearOptions = Array.from({ length: new Date().getFullYear() - 2000 + 1 }, (_, i) => 2000 + i);
  const [activeTab, setActiveTab] = useState<"about" |"gallery" |"location" | "features" | "media" | "rooms"|"availability"|"pricing"|"dining"|"services"|"events"|"experiences"|"policies" >("about");

const handleAddBlock = (roomIdx: number) => {
  const updatedRooms = [...rooms];

  // ensure availability exists
  if (!updatedRooms[roomIdx].availability) {
    updatedRooms[roomIdx].availability = { blocks: [] };
  }

  // ensure blocks array exists
  if (!updatedRooms[roomIdx].availability.blocks) {
    updatedRooms[roomIdx].availability.blocks = [];
  }

  updatedRooms[roomIdx].availability.blocks.push({
    from: "",
    to: "",
    rooms_available: 0, // must be a number
  });

  setRooms(updatedRooms);
};


const handleBlockChange = (
  roomIdx: number,
  blockIdx: number,
  field: keyof AvailabilityBlock,
  value: string | number | boolean // ✅ added boolean
) => {
  const updatedRooms = [...rooms];

  const blocks = updatedRooms[roomIdx].availability?.blocks;
  if (!blocks) return;

  // update the field
  (blocks[blockIdx] as any)[field] = value;

  setRooms(updatedRooms);
};

const handleAddBlackoutBlock = (roomIdx: number) => {
  const updatedRooms = [...rooms];

  // ensure availability exists
  if (!updatedRooms[roomIdx].availability) {
    updatedRooms[roomIdx].availability = { blackout_blocks: [] };
  }

  // ensure blackout_blocks array exists
  if (!updatedRooms[roomIdx].availability.blackout_blocks) {
    updatedRooms[roomIdx].availability.blackout_blocks = [];
  }

  // push new blackout block
  updatedRooms[roomIdx].availability.blackout_blocks.push({
    from: "",
    to: "",
    surcharge_rate: 0, // must be a number
    not_available: false,
  });

  setRooms(updatedRooms);
};

const handleBlackoutChange = (
  roomIdx: number,
  blockIdx: number,
  field: keyof BlackoutBlock,
  value: string | number | boolean
) => {
  const updatedRooms = [...rooms];

  const blackoutBlocks = updatedRooms[roomIdx].availability?.blackout_blocks;
  if (!blackoutBlocks) return;

  // update the field
  (blackoutBlocks[blockIdx] as any)[field] = value;

  setRooms(updatedRooms);
};

const handleAddSpecialBlackoutBlock = (roomIdx: number) => {
  const updatedRooms = [...rooms];

  // ensure availability exists
  if (!updatedRooms[roomIdx].availability) {
    updatedRooms[roomIdx].availability = { special_blackout_blocks: [] };
  }

  // ensure blackout_blocks array exists
  if (!updatedRooms[roomIdx].availability.special_blackout_blocks) {
    updatedRooms[roomIdx].availability.special_blackout_blocks = [];
  }

  // push new blackout block
  updatedRooms[roomIdx].availability.special_blackout_blocks.push({
    from: "",
    to: "",
    surcharge_rate: 0, // must be a number
    not_available: false,
  });

  setRooms(updatedRooms);
};

const handleSpecialBlackoutChange = (
  roomIdx: number,
  blockIdx: number,
  field: keyof BlackoutBlock,
  value: string | number | boolean
) => {
  const updatedRooms = [...rooms];

  const blackoutBlocks = updatedRooms[roomIdx].availability?.special_blackout_blocks;
  if (!blackoutBlocks) return;

  // update the field
  (blackoutBlocks[blockIdx] as any)[field] = value;

  setRooms(updatedRooms);
};

 const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Function to check scroll position
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === "left" ? -200 : 200,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);
    }
    return () => {
      if (el) el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);


  return (
     <div className="flex min-h-screen items-center justify-center bg-gray-100 px-0 sm:px-4 md:px-4">
      <div className="w-full max-w-6xl ml-auto rounded-none sm:rounded-2xl bg-white p-4 sm:p-6 md:p-8 shadow-none sm:shadow-lg min-h-screen sm:min-h-0">

        
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 text-center">Add Hotel</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-none sm:rounded-2xl shadow-none sm:shadow-md space-y-4 sm:space-y-6">
  {/* ---------------- Tabs ---------------- */}
<div className="relative">
      {/* Left Scroll Arrow */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow rounded-full p-1 md:hidden"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
      )}

      {/* Tabs Container */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto border-b mb-4 space-x-2 sm:space-x-4
                   [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden
                   md:flex-wrap md:overflow-x-visible scroll-smooth"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-4 py-2 font-medium whitespace-nowrap ${
              activeTab === tab.id
                ? "border-b-2 border-blue-500 text-blue-500"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Right Scroll Arrow */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow rounded-full p-1 md:hidden"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      )}

      {/* Tab Content */}
      <div className="mt-3 sm:mt-4">
        {activeTab === "about"}
        {activeTab === "gallery"}
        {activeTab === "location"}
        {activeTab === "features"}
        {activeTab === "media"}
        {activeTab === "rooms"}
        {activeTab === "availability"}
        {activeTab === "pricing"}
        {activeTab === "dining"}
        {activeTab === "services"}
        {activeTab === "events"}
        {activeTab === "experiences"}
        {activeTab === "policies"}
      </div>
    </div>

  {/* ---------------- About Tab ---------------- */}
  {activeTab === "about" && (
  <div className="space-y-4 sm:space-y-6">
   
     {/* <div > */}
      {/*<div>
        <label className="block text-sm font-medium text-gray-700">Hotel ID *</label>
        <input
          type="text"
          value={hotelId}
          onChange={(e) => setHotelId(e.target.value)}
          className="mt-1 w-full rounded-lg border px-3 py-2.5 sm:py-2 focus:ring-2 focus:ring-blue-500 text-base touch-manipulation"
          required
        />
      </div> */}
    {/* </div> */}

      {/* Property Name + Chain Brand */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
     <div>
        <label className="block text-sm font-medium text-gray-700">Property Name *</label>
        <input
          type="text"
          value={propertyName}
          onChange={(e) => setPropertyName(e.target.value)}
          className="mt-1 w-full rounded-lg border px-3 py-2.5 sm:py-2 focus:ring-2 focus:ring-blue-500 text-base touch-manipulation"
          required
        />
      </div>
       <div>
      <label className="block text-sm font-medium text-gray-700">Chain Brand</label>
      <input
        type="text"
        value={chainBrand}
        onChange={(e) => setChainBrand(e.target.value)}
        className="mt-1 w-full rounded-lg border px-3 py-2.5 sm:py-2 focus:ring-2 focus:ring-blue-500 text-base touch-manipulation"
      />
    </div>
    </div>

    {/* Destination ID + Market ID */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Destination ID</label>
        <input
          type="text"
          value={destinationId}
          onChange={(e) => setDestinationId(e.target.value)}
          className="mt-1 w-full rounded-lg border px-3 py-2.5 sm:py-2 focus:ring-2 focus:ring-blue-500 text-base touch-manipulation"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Market ID</label>
        <input
          type="text"
          value={marketId}
          onChange={(e) => setMarketId(e.target.value)}
          className="mt-1 w-full rounded-lg border px-3 py-2.5 sm:py-2 focus:ring-2 focus:ring-blue-500 text-base touch-manipulation"
        />
      </div>
    </div>

      {/* Star Category + Total Rooms */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
   <div>
      <label className="block text-sm font-medium text-gray-700">
        Star Category
      </label>
      <select
        value={starCategory}
        onChange={(e) => setStarCategory(e.target.value)}
        className="mt-1 w-full rounded-lg border px-3 py-2.5 sm:py-2 focus:ring-2 focus:ring-blue-500 text-base touch-manipulation"
      >
        <option value="">Select Category</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.value !== "hostel"
              ? `${opt.label} ` + "★".repeat(Number(opt.label))
              : opt.label}
          </option>
        ))}
      </select>
    </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Total Rooms</label>
        <input
          type="number"
          value={totalRooms}
          onChange={(e) => setTotalRooms(e.target.value ? Number(e.target.value) : "")}
          className="mt-1 w-full rounded-lg border px-3 py-2.5 sm:py-2 focus:ring-2 focus:ring-blue-500 text-base touch-manipulation"
        />
      </div>
    </div>

    {/* Check-in & Check-out */}
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TimePicker
          label="Check-in Time"
          value={checkInTime}
          onChange={(newValue) => setCheckInTime(newValue)}
          ampm
          slotProps={{
            textField: {
              className: "mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500",
            },
          }}
        />
        <TimePicker
          label="Check-out Time"
          value={checkOutTime}
          onChange={(newValue) => setCheckOutTime(newValue)}
          ampm
          slotProps={{
            textField: {
              className: "mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500",
            },
          }}
        />
      </div>
    </LocalizationProvider>

    {/* Markup Min/Max Price */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div>
    <label className="block text-sm font-medium text-gray-700">
      Markup Min Price
    </label>
    <input
      type="number"
      min={0}
      value={markupMinPrice}
      onChange={(e) =>
        setMarkupMinPrice(e.target.value ? Number(e.target.value) : "")
      }
      className="mt-1 w-full rounded-lg border px-3 py-2.5 sm:py-2 focus:ring-2 focus:ring-blue-500 text-base touch-manipulation"
      placeholder="e.g. 100"
    />
  </div>

  <div>
    <label className="block text-sm font-medium text-gray-700">
      Markup Max Price
    </label>
    <input
      type="number"
      min={0}
      value={markupMaxPrice}
      onChange={(e) =>
        setMarkupMaxPrice(e.target.value ? Number(e.target.value) : "")
      }
      className="mt-1 w-full rounded-lg border px-3 py-2.5 sm:py-2 focus:ring-2 focus:ring-blue-500 text-base touch-manipulation"
      placeholder="e.g. 500"
    />
  </div>
</div>


    {/* About This Space */}
<div className="border-t pt-4">
  <h2 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">About this space</h2>
  <div className="space-y-3">
    {description.map((point, index) => (
      <div key={index} className="flex items-start gap-2">
        <div className="flex-1 flex items-center gap-2">
          <span className="text-gray-500 mt-2">•</span>
          <input
            type="text"
            placeholder={`Point ${index + 1}...`}
            value={point}
            onChange={(e) => {
              const newDescription = [...description];
              newDescription[index] = e.target.value;
              setDescription(newDescription);
            }}
            className="flex-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            const newDescription = description.filter((_, i) => i !== index);
            setDescription(newDescription);
          }}
          className="mt-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
          aria-label="Remove point"
        >
          <X size={20} />
        </button>
      </div>
    ))}
    <button
      type="button"
      onClick={() => setDescription([...description, ""])}
      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors border border-blue-200"
    >
      <Plus size={18} />
      <span>Add Point</span>
    </button>
    {description.length === 0 && (
      <p className="text-sm text-gray-500 italic">Click "Add Point" to add description points</p>
    )}
  </div>
</div>


    {/* Loyalty Program */}
    <div className="border-t pt-4">
      <h2 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">Loyalty Program</h2>
      <input
        type="text"
        placeholder="Program Name"
        value={programName}
        onChange={(e) => setProgramName(e.target.value)}
        className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 mb-2"
      />
      <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={pointsAccrual}
            onChange={(e) => setPointsAccrual(e.target.checked)}
            className="h-4 w-4 text-blue-600"
          />
          <span>Points Accrual</span>
        </label>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={pointsRedemption}
            onChange={(e) => setPointsRedemption(e.target.checked)}
            className="h-4 w-4 text-blue-600"
          />
          <span>Points Redemption</span>
        </label>
      </div>
    </div>
  </div>
)}
  {/* ---------------- About Tab ---------------- */}

{activeTab === "gallery" && (
  <div className="space-y-8">
    {/* ---------- Thumbnail (required) ---------- */}
    <div>
      <h2 className="text-lg font-semibold text-gray-700 mb-2">
        Thumbnail (required)
      </h2>

      <div className="border rounded-xl p-4">
        <div className="flex items-start gap-4">
          {/* thumbnail preview tile */}
          <div className="relative w-28 h-28 rounded-xl overflow-hidden border bg-gray-50">
            {galleryPreviews.thumbnail ? (
              <>
                <img
                  src={galleryPreviews.thumbnail}
                  alt="thumbnail"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={removeGalleryThumbnail}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-700"
                  aria-label="Remove thumbnail"
                >
                  ✕
                </button>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                No thumbnail
              </div>
            )}
          </div>

          {/* upload button */}
          <div>
            <label className="inline-flex items-center gap-2 cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              <span className="text-sm font-medium">
                {galleryPreviews.thumbnail ? "Replace" : "+ Upload"}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => uploadGalleryThumbnail(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-500 mt-2">
              Best: square image (e.g., 800×800)
            </p>
          </div>
        </div>
      </div>
    </div>
   {/* ---------- Videos (single) ---------- */}
<div>
  <h2 className="text-lg font-semibold text-gray-700 mb-2">Video</h2>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {galleryPreviews.videos ? (
      <div className="relative rounded-xl overflow-hidden border bg-gray-50">
        <video controls src={galleryPreviews.videos} className="w-full h-40 object-cover" />
        <button
          type="button"
          onClick={removeGalleryVideo}
          className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-700"
          aria-label="Remove video"
        >
          ✕
        </button>
      </div>
    ) : null}

    <label className="cursor-pointer rounded-xl border-2 border-dashed bg-white h-40 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50">
      <div className="text-2xl">🎥</div>
      <div className="text-sm font-medium mt-1">
        {galleryPreviews.videos ? "Replace Video" : "Add Video"}
      </div>
      <input
        type="file"
        accept="video/*"
        onChange={(e) => uploadGalleryVideo(e.target.files?.[0] || null)}
        className="hidden"
      />
    </label>
  </div>
</div>

  </div>
)}

  {/* ---------------- Location Tab ---------------- */}
 {activeTab === "location" && (
  <div className="space-y-4 sm:space-y-6">
    <h2 className="text-base sm:text-lg font-semibold text-gray-700">Location *</h2>

    {/* Address */}
    <div>
      <label className="block text-sm font-medium text-gray-700">Address *</label>
      <input
        type="text"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className="mt-1 w-full rounded-lg border px-3 py-2.5 sm:py-2 focus:ring-2 focus:ring-blue-500 text-base touch-manipulation"
      />
    </div>

    {/* City + State */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">City *</label>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="mt-1 w-full rounded-lg border px-3 py-2.5 sm:py-2 focus:ring-2 focus:ring-blue-500 text-base touch-manipulation"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">State *</label>
        <input
          type="text"
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="mt-1 w-full rounded-lg border px-3 py-2.5 sm:py-2 focus:ring-2 focus:ring-blue-500 text-base touch-manipulation"
        />
      </div>
    </div>

    {/* Country + Pincode */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Country *</label>
        <input
          type="text"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="mt-1 w-full rounded-lg border px-3 py-2.5 sm:py-2 focus:ring-2 focus:ring-blue-500 text-base touch-manipulation"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Pincode *</label>
        <input
          type="text"
          value={pincode}
          onChange={(e) => setPincode(e.target.value)}
          className="mt-1 w-full rounded-lg border px-3 py-2.5 sm:py-2 focus:ring-2 focus:ring-blue-500 text-base touch-manipulation"
        />
      </div>
    </div>

    {/* Latitude + Longitude */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Latitude</label>
        <input
          type="number"
          value={latitude}
          onChange={(e) => setLatitude(e.target.value ? Number(e.target.value) : "")}
          className="mt-1 w-full rounded-lg border px-3 py-2.5 sm:py-2 focus:ring-2 focus:ring-blue-500 text-base touch-manipulation"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Longitude</label>
        <input
          type="number"
          value={longitude}
          onChange={(e) => setLongitude(e.target.value ? Number(e.target.value) : "")}
          className="mt-1 w-full rounded-lg border px-3 py-2.5 sm:py-2 focus:ring-2 focus:ring-blue-500 text-base touch-manipulation"
        />
      </div>
    </div>

    {/* Airport + City Center Distance */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Distance from Airport (km)
        </label>
        <input
          type="number"
          value={airportDistance}
          onChange={(e) => setAirportDistance(e.target.value ? Number(e.target.value) : "")}
          className="mt-1 w-full rounded-lg border px-3 py-2.5 sm:py-2 focus:ring-2 focus:ring-blue-500 text-base touch-manipulation"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Distance from City Center (km)
        </label>
        <input
          type="number"
          value={cityCenterDistance}
          onChange={(e) => setCityCenterDistance(e.target.value ? Number(e.target.value) : "")}
          className="mt-1 w-full rounded-lg border px-3 py-2.5 sm:py-2 focus:ring-2 focus:ring-blue-500 text-base touch-manipulation"
        />
      </div>
    </div>

    {/* Landmarks */}
    <div>
      <label className="block text-sm font-medium text-gray-700">Popular Landmarks</label>
      <input
        type="text"
        placeholder="Comma separated"
        value={landmarks}
        onChange={(e) => setLandmarks(e.target.value)}
        className="mt-1 w-full rounded-lg border px-3 py-2.5 sm:py-2 focus:ring-2 focus:ring-blue-500 text-base touch-manipulation"
      />
    </div>

    {/* Railway Stations */}
    <div>
      <h3 className="text-md font-semibold text-gray-700 mb-2">Railway Stations</h3>
      {railwayStations.map((station, index) => (
        <div key={index} className="flex flex-col sm:flex-row sm:space-x-2 mb-2">
          <input
            type="text"
            placeholder="Station Name"
            value={station.name}
            onChange={(e) => handleStationChange(index, "name", e.target.value)}
            className="flex-1 rounded-lg border px-3 py-2 mb-2 sm:mb-0"
          />
          <input
            type="number"
            placeholder="Distance (km)"
            value={station.distance_km || ""}
            onChange={(e) => handleStationChange(index, "distance_km", e.target.value)}
            className="w-full sm:w-32 rounded-lg border px-3 py-2 mb-2 sm:mb-0"
          />
          <button
            type="button"
            onClick={() => handleRemoveRailwayStation(index)}
            className="px-3 py-2 bg-red-500 text-white rounded-lg"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAddRailwayStation}
        className="mt-2 px-3 py-2 bg-green-600 text-white rounded-lg"
      >
        + Add Station
      </button>
    </div>

  
  </div>
)}

{/* ---------------- Features Tab ---------------- */}
{activeTab === "features" && (
  <div className="space-y-8">
    {/* Features */}
    <div>
      <h2 className="text-base sm:text-lg font-semibold text-gray-700 mb-3 sm:mb-4">Features</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Accessibility Features
          </label>
          <input
            type="text"
            placeholder="Comma separated"
            value={accessibilityFeatures}
            onChange={(e) => setAccessibilityFeatures(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2.5 sm:py-2 focus:ring-2 focus:ring-blue-500 text-base touch-manipulation"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Parking Facility
          </label>
          <input
            type="text"
            value={parkingFacility}
            onChange={(e) => setParkingFacility(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2.5 sm:py-2 focus:ring-2 focus:ring-blue-500 text-base touch-manipulation"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Safety Features
          </label>
          <input
            type="text"
            placeholder="Comma separated"
            value={safetyFeatures}
            onChange={(e) => setSafetyFeatures(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2.5 sm:py-2 focus:ring-2 focus:ring-blue-500 text-base touch-manipulation"
          />
        </div>
      </div>
    </div>

    {/* Contact Info */}
    <div>
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Contact Info</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2.5 sm:py-2 focus:ring-2 focus:ring-blue-500 text-base touch-manipulation"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2.5 sm:py-2 focus:ring-2 focus:ring-blue-500 text-base touch-manipulation"
          />
        </div>
      </div>
    </div>

    {/* Hotel Amenities */}
    {/* <div>
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Hotel Amenities</h2>
      {amenities.map((amenity, idx) => (
        <div
          key={idx}
          className="border rounded-lg p-4 mb-3 bg-gray-50 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Amenity Name
              </label>
              <input
                type="text"
                value={amenity.name}
                onChange={(e) => handleAmenityChange(idx, "name", e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2.5 sm:py-2 focus:ring-2 focus:ring-blue-500 text-base touch-manipulation"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Amenity Details
              </label>
              <input
                type="text"
                value={amenity.details}
                onChange={(e) => handleAmenityChange(idx, "details", e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2.5 sm:py-2 focus:ring-2 focus:ring-blue-500 text-base touch-manipulation"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleRemoveAmenity(idx)}
            className="text-red-500 text-sm hover:underline"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAddAmenity}
        className="mt-2 text-blue-600 text-sm hover:underline"
      >
        + Add Amenity
      </button>
    </div> */}
    <div>
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Hotel Amenities</h2>

      <div className="flex flex-wrap gap-2 mb-4 rounded-lg p-4">
        {amenities.map((amenity, idx) => (
          <div
            key={idx}
            className="flex items-center border hover:bg-gray-100 transition-colors duration-200 px-4 py-2 rounded-lg cursor-pointer"
          >
            <span>{amenity.name}</span>
            <button
            type="button"
              onClick={() => removeAmenity(idx)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ❌
            </button>
          </div>
        ))}
      </div>

      {showInput ? (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="New Amenity"
            value={newAmenity}
            onChange={(e) => setNewAmenity(e.target.value)}
            className="w-64 rounded-lg border px-3 py-2"
          />
          <button
           type="button"
            onClick={addAmenity}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Add
          </button>
        </div>
      ) : (
        <button
         type="button"
          onClick={() => setShowInput(true)}
          className="text-blue-600 text-sm hover:underline"
        >
          + Add Amenity
        </button>
      )}
    </div>
  </div>
)}
        
{/* ---------------- Media Tab ---------------- */}
  {activeTab === "media" && (
    <div className="space-y-4">
      {/* Media Gallery */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Media Gallery</h2>
        <div>
          {/* ===== Room Images ===== */}
    <label className="block text-sm font-medium text-gray-700">Rooms Images *</label>
    <div className="inline-block mb-2">
      <label className="flex items-center gap-2 cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
        <span className="text-sm font-medium">+ Upload</span>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleImageUpload("room", e.target.files)}
          className="hidden"
        />
      </label>
    </div>
    <div className="flex gap-2 flex-wrap">
      {previews.room?.map((url, i) => (
        <div key={i} className="relative">
          <img
            src={url}
            alt="room"
            className="h-20 w-20 rounded object-cover border"
          />
          <button
            type="button"
            onClick={() => removeImage("room", i)}
            className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  </div>

          {/* ===== Lobby Images ===== */}
  <div>
    <label className="block text-sm font-medium text-gray-700">Lobby Images</label>
    <div className="inline-block mb-2">
      <label className="flex items-center gap-2 cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
        <span className="text-sm font-medium">+ Upload</span>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleImageUpload("lobby", e.target.files)}
          className="hidden"
        />
      </label>
    </div>
    <div className="flex gap-2 flex-wrap">
      {previews.lobby?.map((url, i) => (
        <div key={i} className="relative">
          <img
            src={url}
            alt="lobby"
            className="h-20 w-20 rounded object-cover border"
          />
          <button
            type="button"
            onClick={() => removeImage("lobby", i)}
            className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  </div>

   <div>
    <label className="block text-sm font-medium text-gray-700">Leisure Images</label>
    <div className="inline-block mb-2">
      <label className="flex items-center gap-2 cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
        <span className="text-sm font-medium">+ Upload</span>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleImageUpload("leisure_images", e.target.files)}
          className="hidden"
        />
      </label>
    </div>
    <div className="flex gap-2 flex-wrap">
      {previews.leisure_images?.map((url, i) => (
        <div key={i} className="relative">
          <img
            src={url}
            alt="leisure_images"
            className="h-20 w-20 rounded object-cover border"
          />
          <button
            type="button"
            onClick={() => removeImage("leisure_images", i)}
            className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  </div>

  

  {/* ===== Pool Area Images ===== */}
  <div>
    <label className="block text-sm font-medium text-gray-700">Pool Area Images</label>
    <div className="inline-block mb-2">
      <label className="flex items-center gap-2 cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
        <span className="text-sm font-medium">+ Upload</span>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleImageUpload("pool_area", e.target.files)}
          className="hidden"
        />
      </label>
    </div>
    <div className="flex gap-2 flex-wrap">
      {previews.pool_area?.map((url, i) => (
        <div key={i} className="relative">
          <img
            src={url}
            alt="pool area"
            className="h-20 w-20 rounded object-cover border"
          />
          <button
            type="button"
            onClick={() => removeImage("pool_area", i)}
            className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  </div>

  {/* ===== Restaurant Images ===== */}
  <div>
    <label className="block text-sm font-medium text-gray-700">Restaurant Images</label>
    <div className="inline-block mb-2">
      <label className="flex items-center gap-2 cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
        <span className="text-sm font-medium">+ Upload</span>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleImageUpload("restaurants", e.target.files)}
          className="hidden"
        />
      </label>
    </div>
    <div className="flex gap-2 flex-wrap">
      {previews.restaurants?.map((url, i) => (
        <div key={i} className="relative">
          <img
            src={url}
            alt="restaurant"
            className="h-20 w-20 rounded object-cover border"
          />
          <button
            type="button"
            onClick={() => removeImage("restaurants", i)}
            className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  </div>

  {/* ===== Beach View Images ===== */}
  <div>
    <label className="block text-sm font-medium text-gray-700">Beach View Images</label>
    <div className="inline-block mb-2">
      <label className="flex items-center gap-2 cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
        <span className="text-sm font-medium">+ Upload</span>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleImageUpload("beach_view", e.target.files)}
          className="hidden"
        />
      </label>
    </div>
    <div className="flex gap-2 flex-wrap">
      {previews.beach_view?.map((url, i) => (
        <div key={i} className="relative">
          <img
            src={url}
            alt="beach view"
            className="h-20 w-20 rounded object-cover border"
          />
          <button
            type="button"
            onClick={() => removeImage("beach_view", i)}
            className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  </div>

  {/* ===== Property Video Tour ===== */}
  <div>
    <label className="block text-sm font-medium text-gray-700">Property Video Tour</label>

    {!previews.property_video_tour && (
      <div className="inline-block mb-2">
        <label className="flex items-center gap-2 cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <span className="text-sm font-medium">+ Upload Video</span>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => handleVideoUpload(e.target.files?.[0] || null)}
            className="hidden"
          />
        </label>
      </div>
    )}

    {previews.property_video_tour && (
      <div className="relative inline-block mt-2">
        <video
          controls
          src={previews.property_video_tour}
          className="rounded w-64"
        />
        <button
          type="button"
          onClick={removeVideo}
          className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
        >
          ✕
        </button>
      </div>
    )}
  </div>

      </div>

      {/* Awards & Recognition */}
      <div className="border-t pt-4">
        <h2 className="text-lg font-semibold">Awards & Recognition</h2>
        {awards.map((award, idx) => (
          <div key={idx} className="grid grid-cols-2 gap-2 mb-2">
            <input
              type="text"
              placeholder="Award Name"
              value={award.award_name}
              onChange={(e) => handleAwardChange(idx, "award_name", e.target.value)}
              className="border rounded px-3 py-2"
            />
            <button
              type="button"
              onClick={() => handleRemoveAward(idx)}
              className="col-span-2 text-red-500 text-sm"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={handleAddAward}
          className="mt-2 text-blue-600 text-sm"
        >
          + Add Award
        </button>
      </div>
    </div>
  )}
{/* ---------------- Rooms section ---------------- */}
{activeTab === "rooms" && (
  <div className="space-y-8">
    <h2 className="text-xl font-bold text-gray-800">Rooms</h2>

    {rooms.map((room, idx) => (
      <div
        key={idx}
        className="border p-4 rounded-lg bg-gray-50 space-y-6 shadow-sm"
      >
        {/* Header */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-700">
            Room Type {idx + 1} *
          </h3>
          <button
            type="button"
            onClick={() => handleRemoveRoom(idx)}
            className="text-red-600 hover:underline text-sm"
          >
            Remove
          </button>
        </div>

        {/* 🔹 Basic Info */}
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-2">
            Basic Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Room Type"
              value={room.room_type || ""}
              onChange={(e) =>
                handleRoomChange(idx, "room_type", e.target.value)
              }
              className="input-field"
            />
            <input
              type="text"
              placeholder="Room Size"
              value={room.room_size || ""}
              onChange={(e) =>
                handleRoomChange(idx, "room_size", e.target.value)
              }
              className="input-field"
            />
          </div>
        </div>

        {/* 🔹 Occupancy & Bed */}
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-2">
            Occupancy & Bed
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              type="number"
              placeholder="Occupancy Min"
              value={room.occupancy_min || ""}
              onChange={(e) =>
                handleRoomChange(idx, "occupancy_min", Number(e.target.value))
              }
              className="input-field"
            />
            <input
              type="number"
              placeholder="Occupancy Max"
              value={room.occupancy_max || ""}
              onChange={(e) =>
                handleRoomChange(idx, "occupancy_max", Number(e.target.value))
              }
              className="input-field"
            />
            <input
              type="text"
              placeholder="Bed Type"
              value={room.bed_type || ""}
              onChange={(e) =>
                handleRoomChange(idx, "bed_type", e.target.value)
              }
              className="input-field"
            />
          </div>
        </div>

        {/* 🔹 Smoking Policy */}
<div className="flex flex-col md:flex-row gap-4">
  {/* Smoking Policy */}
  <div className="flex-1">
    <h4 className="text-md font-medium text-gray-800 mb-2">Smoking Policy</h4>
    <select
      value={room.smoking_policy}
      onChange={(e) =>
        handleRoomChange(
          idx,
          "smoking_policy",
          e.target.value as "Non-Smoking" | "Smoking" | "Designated Areas"
        )
      }
      className="input-field w-full"
    >
      <option value="Non-Smoking">Non-Smoking</option>
      <option value="Smoking">Smoking</option>
      <option value="Designated Areas">Designated Areas</option>
    </select>
  </div>

  {/* Total Rooms */}
  <div className="flex-1">
    <label className="block text-sm font-medium text-gray-700 mb-2">Total Rooms</label>
    <input
      type="number"
      placeholder="Total Rooms"
      value={room.total_room || ""}
      onChange={(e) => handleRoomChange(idx, "total_room", e.target.value)}
      className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
    />
  </div>
</div>


        {/* 🔹 Extra Bed */}
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-2">Extra Bed</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center space-x-2">
              <input
                id={`extraBed-${idx}`}
                type="checkbox"
                checked={room.extra_bed_availability || false}
                onChange={(e) =>
                  handleRoomChange(
                    idx,
                    "extra_bed_availability",
                    e.target.checked
                  )
                }
                className="h-5 w-5 text-blue-600 border-gray-300 rounded"
              />
              <span className="text-gray-700 font-medium">
                Extra Bed Available
              </span>
            </label>

            {room.extra_bed_availability && (
              <input
                type="number"
                placeholder="Extra Bed Price"
                value={room.extra_bed_price || ""}
                onChange={(e) =>
                  handleRoomChange(
                    idx,
                    "extra_bed_price",
                    Number(e.target.value)
                  )
                }
                className="input-field"
              />
            )}
          </div>
        </div>

        {/* 🔹 Room Layout Images */}
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-2">
            Room Layout Images *
          </h4>
          <label
            htmlFor={`roomLayoutInput-${idx}`}
            className="btn-upload"
          >
            + Add Layout Images
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              handleRoomLayoutImagesChange(idx, files);
              e.target.value = "";
            }}
            className="hidden"
            id={`roomLayoutInput-${idx}`}
          />
            {room.room_layout_image && room.room_layout_image.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {room.room_layout_image.map((img, i) => (
                <div key={i} className="relative">
                  <img
                    src={typeof img === "string" ? img : URL.createObjectURL(img)}
                    alt={`Layout ${i + 1}`}
                    className="w-24 h-24 object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveRoomLayoutImage(idx, i)}
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 🔹 Room Images */}
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-2">Room Images *</h4>
          <label htmlFor={`roomImages-${idx}`} className="btn-upload">
            + Add Room Images
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              handleRoomImagesChange(idx, files);
              e.target.value = "";
            }}
            className="hidden"
            id={`roomImages-${idx}`}
          />
         {room.image_link && room.image_link.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {room.image_link.map((img, i) => (
                <div key={i} className="relative">
                  <img
                    src={typeof img === "string" ? img : URL.createObjectURL(img)}
                    alt={`Room ${i + 1}`}
                    className="w-24 h-24 object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveRoomImage(idx, i)}
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
       {/* ✅ In-Room Facilities */}
<div className="border-t mt-4 pt-4">
  <h3 className="text-lg font-semibold text-gray-800 mb-2">In-Room Facilities</h3>
  <input
    type="text"
    placeholder="e.g., Air Conditioning, Free Wi-Fi, Flat-screen TV, Mini Bar"
    value={room.in_room_facilities?.join(", ") || ""}
    onChange={(e) =>
      handleRoomChange(
        idx,
        "in_room_facilities",
        e.target.value.split(",").map((f) => f.trim())
      )
    }
    className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
  />
</div>

{/* ✅ Amenities */}
<div className="border-t mt-4 pt-4">
  <h3 className="text-lg font-semibold text-gray-800 mb-2">Amenities</h3>
  <input
    type="text"
    placeholder="e.g., Swimming Pool, Spa, Gym, Free Parking, Restaurant"
    value={room.amenities?.join(", ") || ""}
    onChange={(e) =>
      handleRoomChange(
        idx,
        "amenities",
        e.target.value.split(",").map((a) => a.trim())
      )
    }
    className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
  />
</div>

{/* ✅ Nearby Prime Location */}
<div className="border-t mt-4 pt-4">
  <h3 className="text-lg font-semibold text-gray-800 mb-2">Nearby Prime Location</h3>
  <input
    type="text"
    placeholder="e.g., Near Airport, City Center, Railway Station, Metro Station"
    value={room.nearby_prime_location || ""}
    onChange={(e) => handleRoomChange(idx, "nearby_prime_location", e.target.value)}
    className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
  />
</div>

{/* ✅ Bathroom Details */}
<div className="border-t mt-4 pt-4">
  <h3 className="text-lg font-semibold text-gray-800 mb-2">Bathroom Details</h3>
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={room.bathroom_details?.has_bathtub || false}
        onChange={(e) => handleBathroomChange(idx, "has_bathtub", e.target.checked)}
      />
      <span>Bathtub</span>
    </label>
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={room.bathroom_details?.has_separate_shower || false}
        onChange={(e) => handleBathroomChange(idx, "has_separate_shower", e.target.checked)}
      />
      <span>Separate Shower</span>
    </label>
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={room.bathroom_details?.has_rain_shower || false}
        onChange={(e) => handleBathroomChange(idx, "has_rain_shower", e.target.checked)}
      />
      <span>Rain Shower</span>
    </label>
    <input
      type="text"
      placeholder="Toiletries Brand"
      value={room.bathroom_details?.toiletries_brand || ""}
      onChange={(e) => handleBathroomChange(idx, "toiletries_brand", e.target.value)}
      className="rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
    />
  </div>
</div>

{/* ✅ Bedding Configuration */}
<div className="border-t mt-4 pt-4">
  <h3 className="text-lg font-semibold text-gray-800 mb-2">Bedding Configuration</h3>
  <input
    type="text"
    placeholder="e.g., King Bed, Twin Beds, Queen Bed, Sofa Bed"
    value={room.bedding_configuration?.options?.join(", ") || ""}
    onChange={(e) =>
      handleBeddingChange(
        idx,
        "options",
        e.target.value.split(",").map((opt) => opt.trim())
      )
    }
    className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
  />
  <label className="flex items-center gap-2 mt-2">
    <input
      type="checkbox"
      checked={room.bedding_configuration?.request_based || false}
      onChange={(e) => handleBeddingChange(idx, "request_based", e.target.checked)}
    />
    <span>Request Based (e.g., convert King into Twin on request)</span>
  </label>
</div>

{/* ✅ Pricing Section */}

              </div>
    ))}

    <button
      type="button"
      onClick={handleAddRoom}
      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
    >
      + Add Room
    </button>
  </div>
)}

{/* ---------------- Availability section ---------------- */}
{activeTab === "availability" && (
  <div className="space-y-6 p-4">
    {/* Room Selector */}
    <div className="flex flex-wrap gap-2 mb-6">
      {rooms.map((_, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => setSelectedRoom(idx)} // <-- add state
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
            ${selectedRoom === idx
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
        >
          Room Type {idx + 1}
        </button>
      ))}
    </div>

    {/* Show only selected room */}
    {rooms.map((room, idx) =>
      selectedRoom === idx ? (
        <div key={idx} className="space-y-6">
          {/* Room Header */}
          <h3 className="text-lg font-semibold text-gray-700">
            Room Type {idx + 1} Availability *
          </h3>

          {/* Availability Section */}
          <div className="border-t mt-4 pt-4 space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Availability Dates
            </h3>

            {/* -------- Blocks Section -------- */}
            <div className="space-y-3">
              {room.availability?.blocks?.map((block, blockIdx) => (
                <div
                  key={blockIdx}
                  className="flex flex-col gap-4 border p-4 rounded-lg shadow-sm bg-gray-50"
                >
                  {/* Not Available Checkbox */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`block-na-${idx}-${blockIdx}`}
                      checked={block.not_available || false}
                      onChange={(e) =>
                        handleBlockChange(
                          idx,
                          blockIdx,
                          "not_available",
                          e.target.checked
                        )
                      }
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label
                      htmlFor={`block-na-${idx}-${blockIdx}`}
                      className="text-sm font-medium text-gray-800"
                    >
                      Mark this block as Not Available
                    </label>
                  </div>

                  {/* From / To / Rooms */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        From
                      </label>
                      <input
                        type="date"
                        value={block.from || ""}
                        onChange={(e) =>
                          handleBlockChange(idx, blockIdx, "from", e.target.value)
                        }
                        className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        To
                      </label>
                      <input
                        type="date"
                        value={block.to || ""}
                        onChange={(e) =>
                          handleBlockChange(idx, blockIdx, "to", e.target.value)
                        }
                        className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Rooms Available (Max)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 10"
                        min={0}
                        max={room.availability?.rooms_available || 100}
                        value={block.rooms_available ?? ""}
                        onChange={(e) =>
                          handleBlockChange(
                            idx,
                            blockIdx,
                            "rooms_available",
                            Number(e.target.value)
                          )
                        }
                        className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Block */}
              <button
                type="button"
                onClick={() => handleAddBlock(idx)}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                + Add Block
              </button>
            </div>

            {/* -------- Blackout Dates -------- */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Blackout Dates
              </h2>
              <div className="space-y-3">
                {room.availability?.blackout_blocks?.map((block, blockIdx) => (
                  <div
                    key={blockIdx}
                    className="flex flex-col gap-4 border p-4 rounded-lg shadow-sm bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`blackout-na-${idx}-${blockIdx}`}
                        checked={block.not_available || false}
                        onChange={(e) =>
                          handleBlackoutChange(
                            idx,
                            blockIdx,
                            "not_available",
                            e.target.checked
                          )
                        }
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label
                        htmlFor={`blackout-na-${idx}-${blockIdx}`}
                        className="text-sm font-medium text-gray-800"
                      >
                        Mark this blackout as Not Available
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                          Blackout From
                        </label>
                        <input
                          type="date"
                          value={block.from || ""}
                          onChange={(e) =>
                            handleBlackoutChange(
                              idx,
                              blockIdx,
                              "from",
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                          Blackout To
                        </label>
                        <input
                          type="date"
                          value={block.to || ""}
                          onChange={(e) =>
                            handleBlackoutChange(
                              idx,
                              blockIdx,
                              "to",
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                          Blackout Surcharge Rate (%)
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 20"
                          min={0}
                          value={block.surcharge_rate ?? ""}
                          onChange={(e) =>
                            handleBlackoutChange(
                              idx,
                              blockIdx,
                              "surcharge_rate",
                              Number(e.target.value)
                            )
                          }
                          className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => handleAddBlackoutBlock(idx)}
                  className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  + Add Blackout Block
                </button>
              </div>
            </div>

            {/* -------- Special Blackout Dates -------- */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Special Blackout Dates
              </h2>
              <div className="space-y-3">
                {room.availability?.special_blackout_blocks?.map(
                  (block, blockIdx) => (
                    <div
                      key={blockIdx}
                      className="flex flex-col gap-4 border p-4 rounded-lg shadow-sm bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`special-blackout-na-${idx}-${blockIdx}`}
                          checked={block.not_available || false}
                          onChange={(e) =>
                            handleSpecialBlackoutChange(
                              idx,
                              blockIdx,
                              "not_available",
                              e.target.checked
                            )
                          }
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label
                          htmlFor={`special-blackout-na-${idx}-${blockIdx}`}
                          className="text-sm font-medium text-gray-800"
                        >
                          Mark this Special blackout as Not Available
                        </label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            Special Blackout From
                          </label>
                          <input
                            type="date"
                            value={block.from || ""}
                            onChange={(e) =>
                              handleSpecialBlackoutChange(
                                idx,
                                blockIdx,
                                "from",
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            Special Blackout To
                          </label>
                          <input
                            type="date"
                            value={block.to || ""}
                            onChange={(e) =>
                              handleSpecialBlackoutChange(
                                idx,
                                blockIdx,
                                "to",
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            Special Blackout Surcharge Rate (%)
                          </label>
                          <input
                            type="number"
                            placeholder="e.g. 20"
                            min={0}
                            value={block.surcharge_rate ?? ""}
                            onChange={(e) =>
                              handleSpecialBlackoutChange(
                                idx,
                                blockIdx,
                                "surcharge_rate",
                                Number(e.target.value)
                              )
                            }
                            className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )
                )}

                <button
                  type="button"
                  onClick={() => handleAddSpecialBlackoutBlock(idx)}
                  className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  + Add Special Blackout Block
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null
    )}
  </div>
)}


{activeTab === "pricing" && (
  <div className="space-y-6 p-4">
    {/* Room Selector */}
    <div className="flex flex-wrap gap-2 mb-6">
      {rooms.map((_, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => setSelectedRoom(idx)} // <-- use same state
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
            ${selectedRoom === idx
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
        >
          Room Type {idx + 1}
        </button>
      ))}
    </div>

    {/* Show only selected room */}
    {rooms.map((room, idx) =>
      selectedRoom === idx ? (
        <div key={idx} className="space-y-6">
          {/* Room Header */}
          <h3 className="text-lg font-semibold text-gray-700">
            Room Type 
            {idx + 1} Pricing *
          </h3>

          {/* Pricing Section */}
          <div className="border-t mt-4 pt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Pricing</h3>

            {/* Currency + Tax */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Currency"
                value={room.pricing?.currency || ""}
                onChange={(e) => handlePricingChange(idx, "currency", e.target.value)}
                className="rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Tax Percent"
                value={room.pricing?.tax_percent_for_stay || ""}
                onChange={(e) =>
                  handlePricingChange(idx, "tax_percent_for_stay", Number(e.target.value))
                }
                className="rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Service Charge + Dynamic Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <input
                type="number"
                placeholder="Service Charge"
                value={room.pricing?.service_charge || ""}
                onChange={(e) =>
                  handlePricingChange(idx, "service_charge", Number(e.target.value))
                }
                className="rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={room.pricing?.dynamic_pricing_flag || false}
                  onChange={(e) =>
                    handlePricingChange(idx, "dynamic_pricing_flag", e.target.checked)
                  }
                />
                <span>Dynamic Pricing</span>
              </label>
            </div>

            {/* ✅ Rate Plans */}
            <div className="mt-4">
              <h4 className="font-medium text-gray-700 mb-2">Rate Plans</h4>
              {room.pricing?.rate_plans?.map((plan, pIdx) => {
                const isDefaultPlan = pIdx === 0 && plan.plan_name === "Room only";
                return (
                  <div key={pIdx} className="flex gap-3 mb-2 items-start">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
                      <input
                        type="text"
                        placeholder="Plan Name"
                        value={plan.plan_name}
                        onChange={(e) =>
                          handleRatePlanChange(idx, pIdx, "plan_name", e.target.value)
                        }
                        // disabled={isDefaultPlan}
                        className={`rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 ${
                          isDefaultPlan ? "bg-gray-100 cursor-not-allowed" : ""
                        }`}
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        value={plan.price}
                        onChange={(e) =>
                          handleRatePlanChange(idx, pIdx, "price", Number(e.target.value))
                        }
                        className="rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Cancellation Policy"
                        value={plan.cancellation_policy || ""}
                        onChange={(e) =>
                          handleRatePlanChange(idx, pIdx, "cancellation_policy", e.target.value)
                        }
                        className="rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {!isDefaultPlan && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRatePlan(idx, pIdx)}
                        className="mt-2 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                        aria-label="Remove rate plan"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => handleAddRatePlan(idx)}
                className="mt-2 rounded-lg bg-green-600 px-3 py-1 text-white hover:bg-green-700"
              >
                + Add Rate Plan
              </button>
            </div>

            {/* Hotel Meals */}
            <div className="grid grid-cols-3 gap-2 mt-2">
              <input
                type="number"
                placeholder="Breakfast Price"
                value={room.pricing?.hotel_bf_price || ""}
                onChange={(e) =>
                  handlePricingChange(idx, "hotel_bf_price", Number(e.target.value))
                }
                className="rounded-lg border px-2 py-1 focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Lunch Price"
                value={room.pricing?.hotel_lunch_price || ""}
                onChange={(e) =>
                  handlePricingChange(idx, "hotel_lunch_price", Number(e.target.value))
                }
                className="rounded-lg border px-2 py-1 focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Dinner Price"
                value={room.pricing?.hotel_dinner_price || ""}
                onChange={(e) =>
                  handlePricingChange(idx, "hotel_dinner_price", Number(e.target.value))
                }
                className="rounded-lg border px-2 py-1 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Early/Late Check fees */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <input
                type="number"
                placeholder="Early Check-in Fee"
                value={room.pricing?.early_checkin_fee || ""}
                onChange={(e) =>
                  handlePricingChange(idx, "early_checkin_fee", Number(e.target.value))
                }
                className="rounded-lg border px-2 py-1 focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Late Checkout Fee"
                value={room.pricing?.late_checkout_fee || ""}
                onChange={(e) =>
                  handlePricingChange(idx, "late_checkout_fee", Number(e.target.value))
                }
                className="rounded-lg border px-2 py-1 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      ) : null
    )}
  </div>
)}


{/* ---------------- Dining section ---------------- */}
{activeTab === "dining" && (
  <div className="space-y-6">
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">Dining Details</h2>

      {dinings.map((dining, idx) => (
        <div
          key={idx}
          className="relative border border-gray-300 rounded-lg p-4 mb-6 shadow-sm bg-white"
        >
          {/* Delete button */}
          {dinings.length > 1 && (
            <button
              type="button"
              onClick={() => handleRemoveDining(idx)}
              className="absolute top-2 right-2 text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dining Name */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Dining Name
              </label>
              <input
                type="text"
                value={dining.name}
                onChange={(e) => handleDiningChange(idx, "name", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Cuisine */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Cuisine (comma separated)
              </label>
              <input
                type="text"
                value={dining.cuisine.join(", ")}
                onChange={(e) =>
                  handleDiningChange(
                    idx,
                    "cuisine",
                    e.target.value.split(",").map((c) => c.trim())
                  )
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Meal Times */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Meal Times (comma separated)
              </label>
              <input
                type="text"
                value={dining.meal_times.join(", ")}
                onChange={(e) =>
                  handleDiningChange(
                    idx,
                    "meal_times",
                    e.target.value.split(",").map((m) => m.trim())
                  )
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Operating Hours */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Operating Hours
              </label>
              <input
                type="text"
                value={dining.operating_hours}
                onChange={(e) =>
                  handleDiningChange(idx, "operating_hours", e.target.value)
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Dress Code */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Dress Code
              </label>
              <input
                type="text"
                value={dining.dress_code}
                onChange={(e) =>
                  handleDiningChange(idx, "dress_code", e.target.value)
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Reservation Policy */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Reservation Policy
              </label>
              <input
                type="text"
                value={dining.reservation_policy}
                onChange={(e) =>
                  handleDiningChange(idx, "reservation_policy", e.target.value)
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Menu Link */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Menu Link
              </label>
              <input
                type="text"
                value={dining.menu_link}
                onChange={(e) =>
                  handleDiningChange(idx, "menu_link", e.target.value)
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Specialty */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Specialty
              </label>
              <input
                type="text"
                value={dining.specialty}
                onChange={(e) =>
                  handleDiningChange(idx, "specialty", e.target.value)
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Special Dishes */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Special Dishes (comma separated)
              </label>
              <input
                type="text"
                value={dining.special_dishes.join(", ")}
                onChange={(e) =>
                  handleDiningChange(
                    idx,
                    "special_dishes",
                    e.target.value.split(",").map((s) => s.trim())
                  )
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Average Price Per Person */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Average Price Per Person
              </label>
              <input
                type="number"
                value={dining.average_price_per_person || ""}
                onChange={(e) =>
                  handleDiningChange(
                    idx,
                    "average_price_per_person",
                    e.target.value === "" ? 0 : Number(e.target.value)
                  )
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      ))}

      {/* Add Dining Button */}
      <button
        type="button"
        onClick={handleAddDining}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Dining
      </button>
    </div>
  </div>
)}
{/* ---------------- Services section ---------------- */}

{activeTab === "services" && (
  <div className="space-y-8">
    {/* Wellness */}
    <div className="p-4 border rounded-lg shadow-sm bg-white space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Wellness</h2>

      {/* Spa Section */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Spa Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Spa Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Spa Name
            </label>
            <input
              type="text"
              value={wellness.spa.name}
              onChange={(e) => handleSpaChange("name", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Spa Opening Hours */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Opening Hours
            </label>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <TimePicker
                value={spaOpeningTime}
                onChange={(newValue) => {
                  setSpaOpeningTime(newValue);
                  handleSpaChange(
                    "opening_hours",
                    newValue ? newValue.format("HH:mm") : ""
                  );
                }}
                ampm
                slotProps={{
                  textField: {
                    className:
                      "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400",
                  },
                }}
              />
            </LocalizationProvider>
          </div>

          {/* Treatments */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Treatments (comma separated)
            </label>
            <input
              type="text"
              value={wellness.spa.treatments.join(",")}
              onChange={(e) =>
                handleSpaChange(
                  "treatments",
                  e.target.value.split(",").map((t) => t.trim())
                )
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Treatment Menu Link */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Treatment Menu Link
            </label>
            <input
              type="text"
              value={wellness.spa.treatment_menu_link}
              onChange={(e) =>
                handleSpaChange("treatment_menu_link", e.target.value)
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>
      </div>

      {/* Gym Section */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Gym Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Gym Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gym Name
            </label>
            <input
              type="text"
              value={wellness.gym.name}
              onChange={(e) => handleGymChange("name", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Gym Opening Hours */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Opening Hours
            </label>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <TimePicker
                value={gymOpeningTime}
                onChange={(newValue) => {
                  setGymOpeningTime(newValue);
                  handleGymChange(
                    "opening_hours",
                    newValue ? newValue.format("HH:mm") : ""
                  );
                }}
                ampm
                slotProps={{
                  textField: {
                    className:
                      "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400",
                  },
                }}
              />
            </LocalizationProvider>
          </div>

          {/* Equipment */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Equipment (comma separated)
            </label>
            <input
              type="text"
              value={wellness.gym.equipment.join(",")}
              onChange={(e) =>
                handleGymChange(
                  "equipment",
                  e.target.value.split(",").map((eq) => eq.trim())
                )
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Trainer Provided */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={wellness.gym.trainer_provided}
              onChange={(e) =>
                handleGymChange("trainer_provided", e.target.checked)
              }
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-400"
            />
            <label className="text-sm font-medium text-gray-700">
              Trainer Provided
            </label>
          </div>
        </div>
      </div>
    </div>

    {/* Family Services */}
    <div className="p-4 border rounded-lg shadow-sm bg-white">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Family Services
      </h2>

      {/* Kids Policy */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Kids Policy
        </label>
        <input
          type="text"
          className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
          placeholder="Enter kids policy"
          value={familyServices.kids_policy || ""}
          onChange={(e) =>
            setFamilyServices({ ...familyServices, kids_policy: e.target.value })
          }
        />
      </div>

      {/* Kids Menu Available */}
      <div className="mb-4 flex items-center space-x-2">
        <input
          type="checkbox"
          checked={familyServices.kids_menu_available || false}
          onChange={(e) =>
            setFamilyServices({
              ...familyServices,
              kids_menu_available: e.target.checked,
            })
          }
          className="h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-400 border-gray-300 rounded"
        />
        <label className="text-sm font-medium text-gray-700">
          Kids Menu Available
        </label>
      </div>

      {/* Babysitting */}
      {familyServices.kids_menu_available && (
        <div className="p-4 border rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">
            Babysitting Service
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Available */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={familyServices.babysitting_service?.available || false}
                onChange={(e) =>
                  setFamilyServices({
                    ...familyServices,
                    babysitting_service: {
                      ...familyServices.babysitting_service,
                      available: e.target.checked,
                    },
                  })
                }
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-400"
              />
              <label className="text-sm font-medium text-gray-700">
                Available
              </label>
            </div>

            {/* Charge */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Charge
              </label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
                placeholder="Enter charge"
                value={familyServices.babysitting_service?.charge || ""}
                onChange={(e) =>
                  setFamilyServices({
                    ...familyServices,
                    babysitting_service: {
                      ...familyServices.babysitting_service,
                      charge: e.target.value ? Number(e.target.value) : undefined,
                    },
                  })
                }
              />
            </div>

            {/* Charge Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Charge Unit
              </label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
                placeholder="per hour"
                value={familyServices.babysitting_service?.charge_unit || ""}
                onChange={(e) =>
                  setFamilyServices({
                    ...familyServices,
                    babysitting_service: {
                      ...familyServices.babysitting_service,
                      charge_unit: e.target.value,
                    },
                  })
                }
              />
            </div>

            {/* Advance Booking */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Advance Booking Required
              </label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
                placeholder="Yes / No / Depends"
                value={
                  familyServices.babysitting_service?.advance_booking_required ||
                  ""
                }
                onChange={(e) =>
                  setFamilyServices({
                    ...familyServices,
                    babysitting_service: {
                      ...familyServices.babysitting_service,
                      advance_booking_required: e.target.value,
                    },
                  })
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Transport Services */}
    <div className="p-4 border rounded-lg shadow-sm bg-white">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Transport Services
      </h2>

      {/* Airport Pickup */}
      <div className="mb-4 flex items-center space-x-2">
        <input
          type="checkbox"
          checked={transport.airport_pickup}
          onChange={(e) =>
            setTransport({ ...transport, airport_pickup: e.target.checked })
          }
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-400"
        />
        <label className="text-sm font-medium text-gray-700">
          Airport Pickup Available
        </label>
      </div>

      {/* Airport Pickup Price */}
      {transport.airport_pickup && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Airport Pickup Price
          </label>
          <input
            type="number"
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
            placeholder="Enter pickup price"
            value={transport.airport_pickup_price || ""}
            onChange={(e) =>
              setTransport({
                ...transport,
                airport_pickup_price: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
          />
        </div>
      )}

      {/* Shuttle Service */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Shuttle Service
        </label>
        <input
          type="text"
          className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
          placeholder="Enter shuttle service details"
          value={transport.shuttle_service || ""}
          onChange={(e) =>
            setTransport({ ...transport, shuttle_service: e.target.value })
          }
        />
      </div>

      {/* Car Rental */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={transport.car_rental_available}
          onChange={(e) =>
            setTransport({ ...transport, car_rental_available: e.target.checked })
          }
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-400"
        />
        <label className="text-sm font-medium text-gray-700">
          Car Rental Available
        </label>
      </div>
    </div>
  </div>
)}
{/* ---------------- Events section ---------------- */}

 {activeTab === "events" && (
  <div className="space-y-6">
    <div className="p-6 border rounded-lg shadow-md bg-white">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">
        Events & Conferences
      </h2>

      {/* Banquet Halls */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Banquet Halls
        </label>
        <input
          type="number"
          className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
          placeholder="Enter number of banquet halls"
          value={eventsConferences.banquet_halls || ""}
          onChange={(e) =>
            setEventsConferences({
              ...eventsConferences,
              banquet_halls: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />
      </div>

      {/* Meeting Rooms */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Meeting Rooms
        </label>
        <input
          type="number"
          className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
          placeholder="Enter number of meeting rooms"
          value={eventsConferences.meeting_rooms || ""}
          onChange={(e) =>
            setEventsConferences({
              ...eventsConferences,
              meeting_rooms: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />
      </div>

      {/* Max Capacity */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Max Capacity
        </label>
        <input
          type="number"
          className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
          placeholder="Enter maximum capacity"
          value={eventsConferences.max_capacity || ""}
          onChange={(e) =>
            setEventsConferences({
              ...eventsConferences,
              max_capacity: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />
      </div>

      {/* Business Facilities */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Business Facilities (comma separated)
        </label>
        <input
          type="text"
          className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
          placeholder="Projector, Whiteboard, WiFi"
          value={eventsConferences.business_facilities?.join(", ") || ""}
          onChange={(e) =>
            setEventsConferences({
              ...eventsConferences,
              business_facilities: e.target.value.split(",").map((s) => s.trim()),
            })
          }
        />
      </div>
{/* Pricing Models */}
<div className="p-4 border rounded-lg bg-gray-50 mt-4">
  <h3 className="text-lg font-semibold mb-3">Pricing Models</h3>

  {eventsConferences.pricing_models.map((model, idx) => (
    <div
      key={idx}
      className="relative border rounded-lg p-4 mb-4 shadow-sm bg-white"
    >
      {/* Delete Button (X) */}
      <button
        type="button"
        onClick={() => {
          const updated = [...eventsConferences.pricing_models];
          updated.splice(idx, 1);
          setEventsConferences({ ...eventsConferences, pricing_models: updated });
        }}
        className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
      >
        ✕
      </button>

      {/* Model Type */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Model Type
        </label>
        <input
          type="text"
          className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
          placeholder="Hourly / Daily / Package"
          value={model.model_type}
          onChange={(e) => {
            const updated = [...eventsConferences.pricing_models];
            updated[idx].model_type = e.target.value;
            setEventsConferences({ ...eventsConferences, pricing_models: updated });
          }}
        />
      </div>

      {/* Price */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Price
        </label>
        <input
          type="number"
          className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
          placeholder="Enter price"
          value={model.price || ""}
          onChange={(e) => {
            const updated = [...eventsConferences.pricing_models];
            updated[idx].price = e.target.value ? Number(e.target.value) : undefined;
            setEventsConferences({ ...eventsConferences, pricing_models: updated });
          }}
        />
      </div>

      {/* Duration Hours */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Duration (hours)
        </label>
        <input
          type="number"
          className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
          placeholder="Enter duration in hours"
          value={model.duration_hours || ""}
          onChange={(e) => {
            const updated = [...eventsConferences.pricing_models];
            updated[idx].duration_hours = e.target.value ? Number(e.target.value) : undefined;
            setEventsConferences({ ...eventsConferences, pricing_models: updated });
          }}
        />
      </div>

      {/* Includes */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Includes (comma separated)
        </label>
        <input
          type="text"
          className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
          placeholder="Snacks, Projector, WiFi"
          value={model.includes?.join(", ") || ""}
          onChange={(e) => {
            const updated = [...eventsConferences.pricing_models];
            updated[idx].includes = e.target.value.split(",").map((s) => s.trim());
            setEventsConferences({ ...eventsConferences, pricing_models: updated });
          }}
        />
      </div>

      {/* Notes */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
          placeholder="Additional notes"
          value={model.notes || ""}
          onChange={(e) => {
            const updated = [...eventsConferences.pricing_models];
            updated[idx].notes = e.target.value;
            setEventsConferences({ ...eventsConferences, pricing_models: updated });
          }}
        />
      </div>

      {/* Description */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
          placeholder="Description about this model"
          value={model.description || ""}
          onChange={(e) => {
            const updated = [...eventsConferences.pricing_models];
            updated[idx].description = e.target.value;
            setEventsConferences({ ...eventsConferences, pricing_models: updated });
          }}
        />
      </div>

      {/* Contact Email */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Contact Email
        </label>
        <input
          type="email"
          className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
          placeholder="Enter contact email"
          value={model.contact_email || ""}
          onChange={(e) => {
            const updated = [...eventsConferences.pricing_models];
            updated[idx].contact_email = e.target.value;
            setEventsConferences({ ...eventsConferences, pricing_models: updated });
          }}
        />
      </div>
    {/* Surge Charges */}
<div className="mt-4 p-3 sm:p-4 border rounded-lg bg-amber-50/60">
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-sm font-semibold text-gray-900">Surcharge Charges</h3>
    <button
      type="button"
      onClick={() => addSurcharge(idx)}
      disabled={isMutating || Loader}
      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-60"
    >
      <Plus className="size-3.5" />
      Add surge
    </button>
  </div>

  <div className="space-y-4">
    {(model.surcharges || []).map((s, sIdx) => (
      <div
        key={sIdx}
        className="rounded-xl border border-amber-200 bg-amber-50 p-3 sm:p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-amber-900">
            Surge #{sIdx + 1}
          </p>
          <button
            type="button"
            onClick={() => removeSurcharge(idx, sIdx)}
            disabled={isMutating || Loader}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-60"
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
                  name={`surcharge-window-${idx}-${sIdx}`}
                  className="size-3"
                  checked={s.windowType === "single"}
                  onChange={() =>
                    updateSurcharge(idx, sIdx, {
                      windowType: "single",
                      startDate: "",
                      endDate: "",
                    })
                  }
                  disabled={isMutating || Loader}
                />
                <span>Single date</span>
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="radio"
                  name={`surcharge-window-${idx}-${sIdx}`}
                  className="size-3"
                  checked={s.windowType === "range"}
                  onChange={() =>
                    updateSurcharge(idx, sIdx, {
                      windowType: "range",
                      singleDate: "",
                    })
                  }
                  disabled={isMutating || Loader}
                />
                <span>Date range</span>
              </label>
            </div>

            {s.windowType === "single" ? (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  className="input w-full"
                  value={s.singleDate}
                  onChange={(e) =>
                    updateSurcharge(idx, sIdx, { singleDate: e.target.value })
                  }
                  disabled={isMutating || Loader}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">
                    Start date
                  </label>
                  <input
                    type="date"
                    className="input w-full"
                    value={s.startDate}
                    onChange={(e) =>
                      updateSurcharge(idx, sIdx, { startDate: e.target.value })
                    }
                    disabled={isMutating || Loader}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">
                    End date
                  </label>
                  <input
                    type="date"
                    className="input w-full"
                    value={s.endDate}
                    onChange={(e) =>
                      updateSurcharge(idx, sIdx, { endDate: e.target.value })
                    }
                    disabled={isMutating || Loader}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Surge amount */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">
              Surge amount
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                inputMode="decimal"
                className="input flex-1"
                value={s.amount}
                onChange={(e) =>
                  updateSurcharge(idx, sIdx, { amount: e.target.value })
                }
                placeholder="enter amount"
                disabled={isMutating || Loader}
              />
              <select
                className="input w-24"
                value={s.currency}
                onChange={(e) =>
                  updateSurcharge(idx, sIdx, { currency: e.target.value })
                }
                disabled={isMutating || Loader}
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="AED">AED</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
</div>

    </div>
  ))}

  {/* Add Pricing Model Button */}
  <button
    type="button"
    onClick={() =>
      setEventsConferences({
        ...eventsConferences,
        pricing_models: [
          ...eventsConferences.pricing_models,
          {
            model_type: "",
            price: undefined,
            duration_hours: undefined,
            includes: [],
            notes: "",
            description: "",
            contact_email: "",
            surcharges: [],
          },
        ],
      })
    }
    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
  >
    + Add Pricing Model
  </button>
</div>

    </div>
  </div>
)}

{/* ---------------- Experiences section ---------------- */}
  {activeTab === "experiences" && (
  <div className="space-y-6">
    <div className="p-4 border rounded-lg shadow-sm bg-white">
      <h2 className="text-xl font-semibold mb-4">Experiences</h2>

      {experiences.map((exp, idx) => (
        <div
          key={idx}
          className="relative border border-gray-300 rounded-lg p-4 mb-4"
        >
          {/* Delete button (if more than one) */}
          {experiences.length > 1 && (
            <button
              type="button"
              onClick={() => {
                const updated = experiences.filter((_, i) => i !== idx);
                setExperiences(updated);
              }}
              className="absolute top-2 right-2 text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          )}

          <div className="flex flex-wrap -mx-2 gap-4">
            {/* Activity */}
            <div className="w-full md:w-1/2 px-2 mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Activity
              </label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
                placeholder="Enter activity name"
                value={exp.activity}
                onChange={(e) => {
                  const updated = [...experiences];
                  updated[idx].activity = e.target.value;
                  setExperiences(updated);
                }}
              />
            </div>

            {/* Price */}
            <div className="w-full md:w-1/2 px-2 mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price
              </label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
                placeholder="Enter price"
                value={exp.price || ""}
                onChange={(e) => {
                  const updated = [...experiences];
                  updated[idx].price = e.target.value ? Number(e.target.value) : undefined;
                  setExperiences(updated);
                }}
              />
            </div>

            {/* Duration */}
            <div className="w-full md:w-1/2 px-2 mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration
              </label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
                placeholder="e.g. 2 hours"
                value={exp.duration}
                onChange={(e) => {
                  const updated = [...experiences];
                  updated[idx].duration = e.target.value;
                  setExperiences(updated);
                }}
              />
            </div>
          </div>
        </div>
      ))}

      {/* Add Experience Button */}
      <button
        type="button"
        onClick={() =>
          setExperiences([
            ...experiences,
            { activity: "", price: undefined, duration: "" },
          ])
        }
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        + Add Experience
      </button>
    </div>
  </div>
)}
  
{/* ---------------- Policies and staff section ---------------- */}
  {activeTab === "policies" && (
  <div className="space-y-6">
    {/* Hotel Policies Section */}
    <div className="p-4 border rounded-lg shadow-sm bg-white">
      <h2 className="text-xl font-semibold mb-4">Hotel Policies</h2>

      <div className="flex flex-wrap -mx-2 gap-4">
        {/* Cancellation Policy */}
        <div className="w-full px-2 mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cancellation Policy
          </label>
          <textarea
            className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
            placeholder="Enter cancellation policy"
            value={policies.cancellation_policy || ""}
            onChange={(e) =>
              setPolicies({ ...policies, cancellation_policy: e.target.value })
            }
          />
        </div>

        {/* ID Requirement */}
        <div className="w-full md:w-1/2 px-2 mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ID Requirement
          </label>
          <input
            type="text"
            className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
            placeholder="Enter ID requirement"
            value={policies.id_requirement || ""}
            onChange={(e) =>
              setPolicies({ ...policies, id_requirement: e.target.value })
            }
          />
        </div>

        {/* Smoking Policy */}
        <div className="w-full md:w-1/2 px-2 mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Smoking Policy
          </label>
          <input
            type="text"
            className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
            placeholder="Enter smoking policy"
            value={policies.smoking_policy || ""}
            onChange={(e) =>
              setPolicies({ ...policies, smoking_policy: e.target.value })
            }
          />
        </div>
      </div>
    </div>

    {/* Pet Policy Section */}
    <div className="p-4 border rounded-lg shadow-sm bg-white">
      <h2 className="text-xl font-semibold mb-4">Pet Policy</h2>

      <div className="flex flex-wrap -mx-2 gap-4">
        {/* Allowed */}
        <div className="w-full px-2 mb-3 flex items-center space-x-2">
          <input
            type="checkbox"
            checked={petPolicy.allowed || false}
            onChange={(e) =>
              setPetPolicy({ ...petPolicy, allowed: e.target.checked })
            }
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label className="text-sm text-gray-700">Pets Allowed</label>
        </div>

        {/* Types Allowed */}
        <div className="w-full px-2 mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Types Allowed (comma separated)
          </label>
          <input
            type="text"
            className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
            placeholder="Dog, Cat, etc."
            value={petPolicy.types_allowed?.join(",") || ""}
            onChange={(e) =>
              setPetPolicy({
                ...petPolicy,
                types_allowed: e.target.value.split(",").map((t) => t.trim()),
              })
            }
          />
        </div>

        {/* Restrictions */}
        <div className="w-full px-2 mb-3 p-4 border rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold mb-3">Restrictions</h3>
          <div className="flex flex-wrap -mx-2 gap-4">
            <div className="w-full md:w-1/3 px-2 mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Weight (kg)
              </label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
                value={petPolicy.restrictions?.max_weight_kg || ""}
                onChange={(e) =>
                  setPetPolicy({
                    ...petPolicy,
                    restrictions: {
                      ...petPolicy.restrictions,
                      max_weight_kg: e.target.value ? Number(e.target.value) : undefined,
                    },
                  })
                }
              />
            </div>

            <div className="w-full md:w-1/3 px-2 mb-3 flex items-center space-x-2">
              <input
                type="checkbox"
                checked={petPolicy.restrictions?.vaccination_required || false}
                onChange={(e) =>
                  setPetPolicy({
                    ...petPolicy,
                    restrictions: {
                      ...petPolicy.restrictions,
                      vaccination_required: e.target.checked,
                    },
                  })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="text-sm text-gray-700">Vaccination Required</label>
            </div>

            <div className="w-full md:w-1/3 px-2 mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Restricted Breeds (comma separated)
              </label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
                value={petPolicy.restrictions?.restricted_breeds?.join(",") || ""}
                onChange={(e) =>
                  setPetPolicy({
                    ...petPolicy,
                    restrictions: {
                      ...petPolicy.restrictions,
                      restricted_breeds: e.target.value.split(",").map((b) => b.trim()),
                    },
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* Extra Charges */}
        <div className="w-full px-2 mb-3 p-4 border rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold mb-3">Extra Charges</h3>
          <div className="flex flex-wrap -mx-2 gap-4">
            <div className="w-full md:w-1/2 px-2 mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Per Pet Per Night
              </label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
                value={petPolicy.extra_charges?.per_pet_per_night || ""}
                onChange={(e) =>
                  setPetPolicy({
                    ...petPolicy,
                    extra_charges: {
                      ...petPolicy.extra_charges,
                      per_pet_per_night: e.target.value ? Number(e.target.value) : undefined,
                    },
                  })
                }
              />
            </div>

            <div className="w-full md:w-1/2 px-2 mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cleaning Fee
              </label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
                value={petPolicy.extra_charges?.cleaning_fee || ""}
                onChange={(e) =>
                  setPetPolicy({
                    ...petPolicy,
                    extra_charges: {
                      ...petPolicy.extra_charges,
                      cleaning_fee: e.target.value ? Number(e.target.value) : undefined,
                    },
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="w-full px-2 mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
            placeholder="Additional notes"
            value={petPolicy.notes || ""}
            onChange={(e) =>
              setPetPolicy({ ...petPolicy, notes: e.target.value })
            }
          />
        </div>
      </div>
    </div>

    {/* Staff & Sustainability Section */}
    <div className="p-4 border rounded-lg shadow-sm bg-white">
      <h2 className="text-xl font-semibold mb-4">Staff & Sustainability</h2>

      <div className="flex flex-wrap -mx-2 gap-4">
        {/* Staff Languages */}
        <div className="w-full px-2 mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Staff Languages (comma separated)
          </label>
          <input
            type="text"
            className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
            placeholder="e.g. English, Hindi, French"
            value={staffLanguages.join(", ")}
            onChange={(e) =>
              setStaffLanguages(e.target.value.split(",").map((lang) => lang.trim()))
            }
          />
        </div>

        {/* Sustainability */}
        <div className="w-full px-2 mb-3 p-4 border rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold mb-3">Sustainability</h3>
          <div className="flex flex-wrap -mx-2 gap-4">
            <div className="w-full md:w-1/2 px-2 mb-3 flex items-center space-x-2">
              <input
                type="checkbox"
                checked={sustainability.eco_certified || false}
                onChange={(e) =>
                  setSustainability({
                    ...sustainability,
                    eco_certified: e.target.checked,
                  })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="text-sm text-gray-700">Eco Certified</label>
            </div>

            <div className="w-full md:w-1/2 px-2 mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Green Practices (comma separated)
              </label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
                placeholder="e.g. Solar Energy, Recycling, Water Conservation"
                value={sustainability.green_practices?.join(", ") || ""}
                onChange={(e) =>
                  setSustainability({
                    ...sustainability,
                    green_practices: e.target.value.split(",").map((p) => p.trim()),
                  })
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)}
   
          {/* ---------------- Submit ---------------- */}
<button
  type="submit"
  disabled={!isFormValid() || isMutating || Loader}
  className="w-full rounded-lg bg-blue-600 py-2.5 sm:py-3 font-semibold text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation text-sm sm:text-base transition-colors"
>
  {isMutating || Loader ? "Adding Hotel, please wait..." : "Add Hotel"}
</button>
        </form>
      </div>
    </div>
  );
};

export default AddHotelPage;
