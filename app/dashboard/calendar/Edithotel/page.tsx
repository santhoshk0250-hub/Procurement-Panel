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
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import axios from "axios";
import { postInstance } from "@/lib/swr";
import { showToast } from "@/providers/ToastProvider";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useHotelStore } from "@/store/hotelStore";


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

type ContactInfo = {
  phone?: string;
  email?: string;
};
type MediaGallery = {
  room: File[];
  lobby: File[];
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

type HotelAmenity = {
  name: string;
  details?: string;
};

type Award = {
  award_name: string;
  year: number;
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
  room_id: string;
  room_type?: string;
  room_size?: string;
  occupancy_min?: number;
  occupancy_max?: number;
  bed_type?: string;
  view_type?: string;
  smoking_policy?: "Smoking" | "Non-Smoking" | "Designated Areas";
  total_rooms?: string;
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
  room_layout_images?: File[];
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

type EventsPricingModel = {
  model_type: string;
  price?: number;
  duration_hours?: number;
  includes?: string[];
  notes?: string;
  description?: string;
  contact_email?: string;
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

type TabId =
  | "about"
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
const EditHotelPage: React.FC = () => {
  const router = useRouter();
  const { hotel, clearHotel } = useHotelStore();
  const [Loader,setLoader]=useState<boolean>(false);


  // const [hotel, setHotel] = useState<HotelPayload | null>(null);

const [selectedRoom, setSelectedRoom] = useState(0); // default Room 1

  // Hotel fields
  const [hotelId, setHotelId] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [chainBrand, setChainBrand] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [marketId, setMarketId] = useState("");

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
  const [description, setDescription] = useState("");
  const [totalRooms, setTotalRooms] = useState<number | "">("");

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
  const [amenities, setAmenities] = useState<HotelAmenity[]>([{ name: "", details: "" }]);
    const [mediaGallery, setMediaGallery] = useState<MediaGallery>({
    room:[],
    lobby: [],
    pool_area: [],
    restaurants: [],
    beach_view: [],
    property_video_tour: null,
    });

    const [previews, setPreviews] = useState({
    room:[],
    lobby: [],
    pool_area: [],
    restaurants: [],
    beach_view: [],
    property_video_tour: "",
    });
  const [awards, setAwards] = useState<Award[]>([{ award_name: "", year: new Date().getFullYear() }]);
const [rooms, setRooms] = useState<Room[]>([
  {
    room_id: "",
    room_type: "",
    room_size: "",
    occupancy_min: 1,
    occupancy_max: 2,
    bed_type: "",
    smoking_policy: "Non-Smoking",
    extra_bed_availability: false,
    extra_bed_price: 0,
    image_link: [],
    room_layout_images: [],
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
      rate_plans: [],
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

      // ✅ Initialize with one block each so UI is always open
      blocks: [
        { from: "", to: "", rooms_available: "" as any, not_available: false },
      ],
      blackout_blocks: [
        { from: "", to: "", surcharge_rate: "" as any, not_available: false },
      ],
      special_blackout_blocks: [
        { from: "", to: "", surcharge_rate: "" as any, not_available: false },
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
  car_rental_available: false,
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
  const [spaOpeningTime, setSpaOpeningTime] = useState<Dayjs | null>(
  wellness.spa.opening_hours ? dayjs(wellness.spa.opening_hours, "HH:mm") : null
);
const [gymOpeningTime, setGymOpeningTime] = useState<Dayjs | null>(
  wellness.gym.opening_hours ? dayjs(wellness.gym.opening_hours, "HH:mm") : null
);

const tabs: { id: TabId; label: string }[] = [
  { id: "about", label: "About" },
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

useEffect(() => {
  if (hotel) {
    // top-level fields
    setHotelId(hotel.hotel_id || "");
    setPropertyName(hotel.property_name || "");
    setChainBrand(hotel.chain_brand || "");
    setDestinationId(hotel.destination_id || "");
    setMarketId(hotel.market_id || "");

    // loyalty program
    setProgramName(hotel.loyalty_program?.program_name || "");
    setPointsAccrual(hotel.loyalty_program?.points_accrual || false);
    setPointsRedemption(hotel.loyalty_program?.points_redemption || false);
    setAddress(hotel.location?.address || "");
    setCity(hotel.location?.city || "");
    setState(hotel.location?.state || "");
    setCountry(hotel.location?.country || "");
    setPincode(hotel.location?.pincode || "");
    setLatitude(hotel.location?.latitude ?? "");
    setLongitude(hotel.location?.longitude ?? "");
    setAirportDistance(hotel.location?.distance_from_airport_km ?? "");
    setCityCenterDistance(hotel.location?.distance_from_city_center_km ?? "");
    setLandmarks(hotel.location?.popular_landmarks_nearby?.join(", ") || "");
    setRailwayStations(
      hotel.location?.distance_from_railway_station?.length
        ? hotel.location.distance_from_railway_station
        : [{ name: "", distance_km: 0 }]
    );
    // Hotel details
    setStarCategory(hotel.star_category ?? "");
    setCheckInTime(hotel.check_in_time ? dayjs(hotel.check_in_time, "hh:mm A") : null);
    setCheckOutTime(hotel.check_out_time ? dayjs(hotel.check_out_time, "hh:mm A") : null);
    setTotalRooms(hotel.total_rooms ?? "");
   setDescription(hotel.description || "");
    setAccessibilityFeatures(hotel.accessibility_features?.join(", ") || "");
    setParkingFacility(hotel.parking_facility || "");
    setSafetyFeatures(hotel.safety_features?.join(", ") || "");

    // Contact info
    setPhone(hotel.contact_info?.phone || "");
    setEmail(hotel.contact_info?.email || "");

     setAmenities(
      hotel.hotel_amenities?.length
        ? hotel.hotel_amenities
        : [{ name: "", details: "" }]
    );
  setPreviews({
      room: hotel.media_gallery?.room || [],
      lobby: hotel.media_gallery?.lobby || [],
      pool_area: hotel.media_gallery?.pool_area || [],
      restaurants: hotel.media_gallery?.restaurants || [],
      beach_view: hotel.media_gallery?.beach_view || [],
      property_video_tour: hotel.media_gallery?.property_video_tour || "",
    });

    setMediaGallery({
      room: hotel.media_gallery?.room || [],
      lobby: hotel.media_gallery?.lobby || [],
      pool_area: hotel.media_gallery?.pool_area || [],
      restaurants: hotel.media_gallery?.restaurants || [],
      beach_view: hotel.media_gallery?.beach_view || [],
      property_video_tour: hotel.media_gallery?.property_video_tour || null,
    });

    setAwards(
      hotel.awards_and_recognition?.length
        ? hotel.awards_and_recognition
        : [{ award_name: "", year: new Date().getFullYear() }]
    );
     setRooms(
      hotel.rooms?.length
        ? hotel.rooms
        : [
            {
              room_id: "",
              room_type: "",
              room_size: "",
              occupancy_min: 1,
              occupancy_max: 2,
              smoking_policy: "Non-Smoking",
              image_link: [],
              room_layout_images: [],
            },
          ]
    );
    setDinings(
      hotel.dining?.length
        ? hotel.dining
        : [
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
          ]
    );

        setWellness(
      hotel.wellness || {
        spa: { name: "", opening_hours: "", treatments: [], treatment_menu_link: "" },
        gym: { name: "", opening_hours: "", equipment: [], trainer_provided: false },
      }
    );
        setSpaOpeningTime(hotel.wellness?.spa?.opening_hours ? dayjs(hotel.wellness.spa.opening_hours, "HH:mm") : null);
    setGymOpeningTime(hotel.wellness?.gym?.opening_hours ? dayjs(hotel.wellness.gym.opening_hours, "HH:mm") : null);

    // Family Services
    setFamilyServices(
      hotel.family_services || {
        kids_policy: "",
        kids_menu_available: false,
        babysitting_service: { available: false, charge: undefined, charge_unit: "per hour", advance_booking_required: "" },
      }
    );

    // Transport
    setTransport(
      hotel.transport || { airport_pickup: false, airport_pickup_price: undefined, shuttle_service: "", car_rental_available: false }
    );

        setEventsConferences(hotel.events_conferences || {
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
        },
      ],
    });

    setExperiences(hotel.experiences || [{ activity: "", price: undefined, duration: "" }]);

    setPolicies(hotel.policies || { cancellation_policy: "", id_requirement: "", smoking_policy: "" });

    setStaffLanguages(hotel.staff_languages || []);

    setSustainability(
      hotel.sustainability || {
        eco_certified: false,
        green_practices: [],
      }
    );

    // setReviews(
    //   hotel.reviews || {
    //     review_score: undefined,
    //     review_count: undefined,
    //     top_positive_review: "",
    //     top_negative_review: "",
    //     guest_reviews_link: "",
    //   }
    // );

    setPetPolicy(
      hotel.pet_policy || {
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
      }
    );
  }
}, [hotel]);

const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
const [specialAnchorEl, setSpecialAnchorEl] = useState<HTMLElement | null>(null);
const [activeTab, setActiveTab] = useState<"about" | "location" | "features" | "media" | "rooms"|"availability"|"pricing"|"dining"|"services"|"events"|"experiences"|"policies" >("about");
// figure out the last tab and whether we're on it
const lastTabId = tabs[tabs.length - 1]?.id;
const isOnLastTab = activeTab === lastTabId;



  const handleOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const open = Boolean(anchorEl);

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

    const handleAddAward = () => setAwards([...awards, { award_name: "", year: new Date().getFullYear() }]);
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
      room_id: "",
      room_type: "",
      room_size: "",
      occupancy_min: 1,
      occupancy_max: 2,
      bed_type: "",
      smoking_policy: "Non-Smoking",
      extra_bed_availability: false,
      extra_bed_price: 0,
      image_link: [],
      room_layout_images: [],
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
        rate_plans: [],
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
          { from: "", to: "", rooms_available: "" as any, not_available: false },
        ],
        blackout_blocks: [
          { from: "", to: "", surcharge_rate: "" as any, not_available: false },
        ],
        special_blackout_blocks: [
          { from: "", to: "", surcharge_rate: "" as any, not_available: false },
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
  const updatedRooms = [...rooms];
  if (!updatedRooms[roomIdx].pricing) updatedRooms[roomIdx].pricing = {};
  updatedRooms[roomIdx].pricing!.rate_plans = [
    ...(updatedRooms[roomIdx].pricing!.rate_plans || []),
    { plan_name: "", price: 0, cancellation_policy: "" },
  ];
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
            room_layout_images: [
              ...(room.room_layout_images || []), // keep old files
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
            room_layout_images: room.room_layout_images?.filter(
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
  

  //   useEffect(() => {
  //   const fetchHotel = async () => {
  //     if (!hotelid) return;

  //     try {
  //       const response = await axios.get(
  //         `${process.env.NEXT_PUBLIC_API_BASE}hotels/${hotelid}`
  //       );
  //       setHotel(response.data.data);
  //     } catch (error) {
  //       console.error("Error fetching hotel data:", error);
  //     }
  //   };

  //   fetchHotel();
  // }, [hotelid]);

  // if (!hotel) return <div>Loading...</div>;
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


 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoader(true);

  try {
    const formData = new FormData();

    // -------------------- Basic Hotel Info --------------------
    formData.append("hotel_id", hotelId);
    formData.append("property_name", propertyName);
    if (chainBrand) formData.append("chain_brand", chainBrand);
    if (destinationId) formData.append("destination_id", destinationId);
    if (marketId) formData.append("market_id", marketId);

    // -------------------- Loyalty Program --------------------
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

    // -------------------- Location --------------------
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
        distance_from_airport_km: airportDistance ? Number(airportDistance) : undefined,
        distance_from_city_center_km: cityCenterDistance ? Number(cityCenterDistance) : undefined,
        popular_landmarks_nearby: landmarks
          ? landmarks.split(",").map((l) => l.trim())
          : [],
        distance_from_railway_station: railwayStations.filter(rs => rs.name && rs.distance_km > 0),
      })
    );

    // -------------------- Hotel Details --------------------
    if (starCategory) formData.append("star_category", String(starCategory));
    if (checkInTime) formData.append("check_in_time", checkInTime.format("hh:mm A"));
    if (checkOutTime) formData.append("check_out_time", checkOutTime.format("hh:mm A"));
    if (totalRooms) formData.append("total_rooms", String(totalRooms));
    if (description) formData.append("description", description);
    
    if (accessibilityFeatures)
      formData.append(
        "accessibility_features",
        JSON.stringify(accessibilityFeatures.split(",").map(f => f.trim()))
      );
    if (parkingFacility) formData.append("parking_facility", parkingFacility);
    if (safetyFeatures)
      formData.append(
        "safety_features",
        JSON.stringify(safetyFeatures.split(",").map(f => f.trim()))
      );

    // -------------------- Contact Info --------------------
    if (phone || email) {
      formData.append("contact_info", JSON.stringify({ phone, email }));
    }

    // -------------------- Hotel Amenities --------------------
    if (amenities.length) {
      formData.append("hotel_amenities", JSON.stringify(amenities));
    }

    // -------------------- Awards --------------------
    if (awards.length) {
      formData.append(
        "awards_and_recognition",
        JSON.stringify(awards.filter(a => a.award_name && a.year))
      );
    }

    // -------------------- Media Gallery --------------------
    const appendMedia = (field: string, items: (string | File)[]) => {
      items.forEach(item => {
        if (typeof item === "string") {
          // Existing image URL
          formData.append(`${field}[]`, item);
        } else {
          // New uploaded file
          formData.append(`${field}[]`, item);
        }
      });
    };

    appendMedia("media_gallery[room]", mediaGallery?.room || []);
    appendMedia("media_gallery[lobby]", mediaGallery?.lobby || []);
    appendMedia("media_gallery[pool_area]", mediaGallery?.pool_area || []);
    appendMedia("media_gallery[restaurants]", mediaGallery?.restaurants || []);
    appendMedia("media_gallery[beach_view]", mediaGallery?.beach_view || []);
    if (mediaGallery?.property_video_tour) {
      if (typeof mediaGallery?.property_video_tour === "string") {
        formData.append("media_gallery[property_video_tour]", mediaGallery?.property_video_tour);
      } else {
        formData.append("media_gallery[property_video_tour]", mediaGallery?.property_video_tour as File);
      }
    }

    // -------------------- Rooms --------------------
    rooms.forEach((room, idx) => {
      formData.append(`rooms[${idx}]`, JSON.stringify({
        room_id: room.room_id,
        room_type: room.room_type,
        room_size: room.room_size,
        occupancy_min: room.occupancy_min,
        occupancy_max: room.occupancy_max,
        bed_type: room.bed_type,
        view_type: room.view_type,
        smoking_policy: room.smoking_policy,
        extra_bed_availability: room.extra_bed_availability,
        extra_bed_price: room.extra_bed_price,
        in_room_facilities: room.in_room_facilities || [],
        amenities: room.amenities || [],
        nearby_prime_location: room.nearby_prime_location,
        bathroom_details: room.bathroom_details,
        bedding_configuration: room.bedding_configuration,
        floor_level: room.floor_level,
        pricing: room.pricing,
        availability: room.availability,
      }));

      // Room Images
      const appendRoomImages = (field: string, imgs: (string | File)[]) => {
        imgs.forEach(img => {
          if (typeof img === "string") formData.append(`${field}[]`, img);
          else formData.append(`${field}[]`, img);
        });
      };

      appendRoomImages(`rooms[${idx}][room_layout_images]`, room.room_layout_images || []);
      appendRoomImages(`rooms[${idx}][images]`, room.image_link || []);
    });

    // -------------------- Dining --------------------
    if (dinings.length) {
      formData.append(
        "dining",
        JSON.stringify(dinings.map(d => ({
          name: d.name,
          cuisine: d.cuisine || [],
          meal_times: d.meal_times || [],
          operating_hours: d.operating_hours || "",
          dress_code: d.dress_code || "",
          reservation_policy: d.reservation_policy || "",
          menu_link: d.menu_link || "",
          specialty: d.specialty || "",
          special_dishes: d.special_dishes || [],
          average_price_per_person: d.average_price_per_person || 0,
        })))
      );
    }

    // -------------------- Wellness --------------------
    if (wellness) {
      formData.append("wellness", JSON.stringify(wellness));
    }

    // -------------------- Family Services --------------------
    if (familyServices) {
      formData.append("family_services", JSON.stringify(familyServices));
    }

    // -------------------- Transport --------------------
    if (transport) {
      formData.append("transport", JSON.stringify(transport));
    }

    // -------------------- Events & Experiences --------------------
    if (eventsConferences) formData.append("events_conferences", JSON.stringify(eventsConferences));
    if (experiences.length) formData.append("experiences", JSON.stringify(experiences));

    // -------------------- Policies --------------------
    if (policies) formData.append("policies", JSON.stringify(policies));

    // -------------------- Staff, Sustainability, Reviews, Pet Policy --------------------
    if (staffLanguages.length) formData.append("staff_languages", JSON.stringify(staffLanguages));
    if (sustainability) formData.append("sustainability", JSON.stringify(sustainability));
    // if (reviews) formData.append("reviews", JSON.stringify(reviews));
    if (petPolicy) formData.append("pet_policy", JSON.stringify(petPolicy));

    // -------------------- Submit --------------------
   await axios.put(
  `${process.env.NEXT_PUBLIC_API_BASE}hotels/updatehotel/${hotel?._id}`, // pass ID in URL
  formData,
  {
    withCredentials: true,
    headers: { "Content-Type": "multipart/form-data" },
  }
   );

    showToast.success("Hotel updated successfully!");
    router.push("/dashboard/calendar");
  } catch (err: any) {

    if (err.response?.data?.error?.includes("Cast to ObjectId failed for value")) {
      showToast.error("Invalid Hotel ID");
    } else {
      showToast.error(err.response?.data?.message || err.message || "Something went wrong");
    }
  }
  finally{
    setLoader(false);
  }
};


const handleSpaChange = (field: keyof Wellness['spa'], value: any) => {
    setWellness({ ...wellness, spa: { ...wellness.spa, [field]: value } });
  };

  const handleGymChange = (field: keyof Wellness['gym'], value: any) => {
    setWellness({ ...wellness, gym: { ...wellness.gym, [field]: value } });
  }

   const yearOptions = Array.from({ length: new Date().getFullYear() - 2000 + 1 }, (_, i) => 2000 + i);

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
    rooms_available: "" as any, // must be a number
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
    surcharge_rate: "" as any, // must be a number
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
    surcharge_rate: "" as any, // must be a number
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

const formatDate = (date: string | Date | undefined) => {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().split("T")[0]; // gives "YYYY-MM-DD"
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

  // prevents submit until user reaches the last tab; jumps them there if they try
const guardedSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
  e.preventDefault();
  if (!isOnLastTab) {
    setActiveTab(lastTabId);
    requestAnimationFrame(() => scrollActiveTabIntoView(lastTabId!));
    return;
  }
  handleSubmit(e);
};


const currentIndex = tabs.findIndex(t => t.id === activeTab);
const goPrev = () => {
  if (currentIndex > 0) {
    const id = tabs[currentIndex - 1].id;
    setActiveTab(id);
    requestAnimationFrame(() => scrollActiveTabIntoView(id));
  }
};
const goNext = () => {
  if (currentIndex < tabs.length - 1) {
    const id = tabs[currentIndex + 1].id;
    setActiveTab(id);
    requestAnimationFrame(() => scrollActiveTabIntoView(id));
  }
};

// map each tab id -> its button element
const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

// center the active tab in the scrollable strip (mobile)
const scrollActiveTabIntoView = (id: string) => {
  const container = scrollRef.current;
  const el = tabRefs.current[id];
  if (!container || !el) return;

  // Prefer smooth anchor to middle of strip
  el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });

  // Fallback: manually center if needed (some browsers)
  const cRect = container.getBoundingClientRect();
  const eRect = el.getBoundingClientRect();
  const offset = (eRect.left + eRect.right) / 2 - (cRect.left + cRect.right) / 2;
  container.scrollBy({ left: offset, behavior: "smooth" });
};
useEffect(() => {
  if (activeTab) requestAnimationFrame(() => scrollActiveTabIntoView(activeTab));
}, [activeTab]);


  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-6xl ml-auto rounded-2xl bg-white p-8 shadow-lg">

        
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Edit Hotel</h1>
     <div className="flex justify-between gap-2 mt-6">
    <button
      type="button"
      onClick={goPrev}
      disabled={currentIndex === 0}
      className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 disabled:opacity-50"
    >
      Previous
    </button>
    <button
      type="button"
      onClick={goNext}
      disabled={currentIndex === tabs.length - 1}
      className="px-4 py-2 rounded-lg bg-gray-800 text-white disabled:opacity-50"
    >
      Next
    </button>
  </div>
      <form onSubmit={guardedSubmit} className="p-6 bg-white rounded-2xl shadow-md space-y-6">
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
    ref={(el) => { tabRefs.current[tab.id] = el; }}
    onClick={() => {
      setActiveTab(tab.id);
      // scroll strip so this tab is visible/centered on mobile
      requestAnimationFrame(() => scrollActiveTabIntoView(tab.id));
    }}
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
      <div className="mt-4">
        {activeTab === "about"}
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
{/* {activeTab === "reviews"} */}


  {/* ---------------- About Tab ---------------- */}
  {activeTab === "about" && (
  <div className="space-y-6">
    {/* Hotel ID + Property Name */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* <div>
        <label className="block text-sm font-medium text-gray-700">Hotel ID *</label>
        <input
          type="text"
          value={hotelId}
          onChange={(e) => setHotelId(e.target.value)}
          className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
          required
        />
      </div> */}

      <div>
        <label className="block text-sm font-medium text-gray-700">Property Name *</label>
        <input
          type="text"
          value={propertyName}
          onChange={(e) => setPropertyName(e.target.value)}
          className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

       <div>
      <label className="block text-sm font-medium text-gray-700">Chain Brand</label>
      <input
        type="text"
        value={chainBrand}
        onChange={(e) => setChainBrand(e.target.value)}
        className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
      />
    </div>
    </div>

    {/* Chain Brand */}
    {/* <div>
      <label className="block text-sm font-medium text-gray-700">Chain Brand</label>
      <input
        type="text"
        value={chainBrand}
        onChange={(e) => setChainBrand(e.target.value)}
        className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
      />
    </div> */}

    {/* Destination ID + Market ID */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Destination ID</label>
        <input
          type="text"
          value={destinationId}
          onChange={(e) => setDestinationId(e.target.value)}
          className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Market ID</label>
        <input
          type="text"
          value={marketId}
          onChange={(e) => setMarketId(e.target.value)}
          className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
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
        className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
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
          className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
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
    <div className="border-t pt-4">
  <h2 className="text-lg font-semibold text-gray-700 mb-2">About this space</h2>
  <textarea
    rows={4}
    placeholder="Write a short description about the property..."
    value={description}
    onChange={(e) => setDescription(e.target.value)}
    className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
  />
</div>

    {/* Loyalty Program */}
    <div className="border-t pt-4">
      <h2 className="text-lg font-semibold text-gray-700 mb-2">Loyalty Program</h2>
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
  {/* ---------------- Location Tab ---------------- */}
 {activeTab === "location" && (
  <div className="space-y-6">
    <h2 className="text-lg font-semibold text-gray-700">Location</h2>

    {/* Address */}
    <div>
      <label className="block text-sm font-medium text-gray-700">Address</label>
      <input
        type="text"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
      />
    </div>

    {/* City + State */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">City</label>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">State</label>
        <input
          type="text"
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>

    {/* Country + Pincode */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Country</label>
        <input
          type="text"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Pincode</label>
        <input
          type="text"
          value={pincode}
          onChange={(e) => setPincode(e.target.value)}
          className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
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
          className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Longitude</label>
        <input
          type="number"
          value={longitude}
          onChange={(e) => setLongitude(e.target.value ? Number(e.target.value) : "")}
          className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
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
          className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
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
          className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
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
        className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
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
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Features</h2>
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
            className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
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
            className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
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
            className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
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
            className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
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
                className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
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
                className="mt-1 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
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

      <div className="flex flex-wrap gap-2 mb-4 bg-gray-200 rounded-lg p-4 mb-4">
        {amenities.map((amenity, idx) => (
          <div
            key={idx}
              className="flex items-center bg-gray-300 hover:bg-gray-400 transition-colors duration-200 px-4 py-2 rounded-lg cursor-pointer"
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
    <label className="block text-sm font-medium text-gray-700">Rooms Images</label>
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
            <select
              value={award.year}
              onChange={(e) => handleAwardChange(idx, "year", Number(e.target.value))}
              className="border rounded px-3 py-2"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
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
            Room {idx + 1}
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
              placeholder="Room ID"
              value={room.room_id}
              onChange={(e) =>
                handleRoomChange(idx, "room_id", e.target.value)
              }
              className="input-field"
            />
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
      value={room.total_rooms || ""}
      onChange={(e) => handleRoomChange(idx, "total_rooms", e.target.value)}
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
            Room Layout Images
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
            {room.room_layout_images && room.room_layout_images.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {room.room_layout_images.map((img, i) => (
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
          <h4 className="text-md font-medium text-gray-800 mb-2">Room Images</h4>
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
          Room {idx + 1}
        </button>
      ))}
    </div>

    {/* Show only selected room */}
    {rooms.map((room, idx) =>
      selectedRoom === idx ? (
        <div key={idx} className="space-y-6">
          {/* Room Header */}
          <h3 className="text-lg font-semibold text-gray-700">
            Room {idx + 1} Availability *
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
                        value={formatDate(block.from)}
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
                        value={formatDate(block.to)}
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
                          value={formatDate(block.from)}
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
                          value={formatDate(block.to)}
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
                            value={formatDate(block.from)}
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
                            value={formatDate(block.to)}
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
          Room {idx + 1}
        </button>
      ))}
    </div>

    {/* Show only selected room */}
    {rooms.map((room, idx) =>
      selectedRoom === idx ? (
        <div key={idx} className="space-y-6">
          {/* Room Header */}
          <h3 className="text-lg font-semibold text-gray-700">
            Room {idx + 1} Pricing *
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
              {room.pricing?.rate_plans?.map((plan, pIdx) => (
                <div key={pIdx} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
                  <input
                    type="text"
                    placeholder="Plan Name"
                    value={plan.plan_name}
                    onChange={(e) =>
                      handleRatePlanChange(idx, pIdx, "plan_name", e.target.value)
                    }
                    className="rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
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
              ))}
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
   
 {/* {activeTab === "reviews" && (
  <div className="space-y-6">
    <div className="p-4 border rounded-lg shadow-sm bg-white">
      <h2 className="text-xl font-semibold mb-4">Reviews</h2>

      <div className="flex flex-wrap -mx-2 gap-4">
        <div className="w-full md:w-1/2 px-2 mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Review Score
          </label>
          <input
            type="number"
            className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
            placeholder="Enter review score"
            value={reviews.review_score || ""}
            onChange={(e) =>
              setReviews({
                ...reviews,
                review_score: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
        <div className="w-full md:w-1/2 px-2 mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Review Count
          </label>
          <input
            type="number"
            className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
            placeholder="Enter review count"
            value={reviews.review_count || ""}
            onChange={(e) =>
              setReviews({
                ...reviews,
                review_count: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
        <div className="w-full px-2 mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Top Positive Review
          </label>
          <textarea
            className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
            placeholder="Enter top positive review"
            value={reviews.top_positive_review || ""}
            onChange={(e) =>
              setReviews({ ...reviews, top_positive_review: e.target.value })
            }
          />
        </div>
        <div className="w-full px-2 mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Top Negative Review
          </label>
          <textarea
            className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
            placeholder="Enter top negative review"
            value={reviews.top_negative_review || ""}
            onChange={(e) =>
              setReviews({ ...reviews, top_negative_review: e.target.value })
            }
          />
        </div>
        <div className="w-full px-2 mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Guest Reviews Link
          </label>
          <input
            type="text"
            className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
            placeholder="Enter guest reviews link"
            value={reviews.guest_reviews_link || ""}
            onChange={(e) =>
              setReviews({ ...reviews, guest_reviews_link: e.target.value })
            }
          />
        </div>
      </div>
    </div>
  </div>
)} */}
          {/* ---------------- Submit ---------------- */}
     
            <button
    type="submit"
    disabled={!isOnLastTab || isMutating || Loader}
    aria-disabled={!isOnLastTab || isMutating || Loader}
    title={!isOnLastTab ? "Finish all tabs to enable saving" : undefined}
    className={`w-full rounded-lg py-2 font-semibold text-white mt-4
                ${!isOnLastTab || isMutating || Loader
                  ? "bg-blue-600/60 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"}`}
  >
    {isMutating || Loader
      ? "Updating please wait..."
      : !isOnLastTab
        ? "Complete all tabs to save"
        : "Save Changes"}
  </button>
        </form>
      </div>
    </div>
  );
};

export default EditHotelPage;
