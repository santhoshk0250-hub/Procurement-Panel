"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Pagination,
  Stack,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Divider,
  Checkbox,
  Stepper,
  Step,
  StepLabel,
  ToggleButtonGroup,
  ToggleButton,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Search,
  DirectionsCarFilled as CarIcon,
  People as PeopleIcon,
  AccessTime as AccessTimeIcon,
  Category as CategoryIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CurrencyRupee as RupeeIcon,
  LocationOn as LocationIcon,
  Star as StarIcon,
  AddCircleOutline,
} from "@mui/icons-material";
import { useSightseeingPackageStore } from "@/store/usesightpackages";

/* ================== Types ================== */
export type IDType = string | { $oid: string } | undefined;

export interface TimeBlock {
  time: string;
  title: string;
  description: string;
}

export interface WhyChooseBlock {
  title: string;
  description: string;
  icon?: string;
}

export interface ExpectBlock {
  title: string;
  description: string;
}

export interface PriceBreakdown {
  basePrice?: number;
  serviceCharges?: number;
  taxes?: number;
  totalPrice?: number;
}

export interface PlaceToVisit {
  name: string;
  placeId?: IDType;
}

export interface SightseeingPackage {
  _id?: IDType;
  id?: string;

  tour_name?: string;
  title?: string;
  destination?: string;
  vehicle_type?: string;
  vehicleType?: string;

  min_pax?: number;
  max_pax?: number;
  duration_hours?: number;

  regular_timings?: string;
  alternative_timings?: string;
  regularTimings?: string;
  alternativeTimings?: string;

  category?: string[];
  description?: string;
  thumbnail?: string;
  images?: string[];

  places_to_visit_names?: string[];
  placesToVisit?: PlaceToVisit[];
  place_ids?: IDType[];

  whyChoose?: WhyChooseBlock[];
  itinerary?: TimeBlock[];
  operationProcess?: TimeBlock[];
  whatToExpect?: ExpectBlock[];

  inclusions?: string[];
  exclusions?: string[];

  pickupType?: string;
  pickupAreas?: string[];
  meetingTime?: string;

  operatingHours?: string;
  bestTimeToVisit?: string;
  seasonalAvailability?: string;
  groupSize?: string;
  minParticipants?: number;
  maxParticipants?: number;
  accessibility?: string;
  fitnessLevel?: string;

  priceBreakdown?: PriceBreakdown;
  vendor_charge?: number;
  seller_charge?: number;
  price_regular?: number;

  // ✅ markup fields (adjust names if backend differs)
  markupMinPrice?: number;
  markupMaxPrice?: number;

  voucherInfo?: string[];
  languages?: string[];

  rating?: number;
  reviewCount?: number;
  bookedCount?: number;
  instantConfirmation?: boolean;
  freeCancellation?: boolean;
  operatedBy?: string;

  special_mentions?: string | null;
  notes?: string | null;

  images_gallery?: string[];
  guestImages?: string[];
  galleryImages?: string[];

  is_active?: boolean;
  [key: string]: any;
}

/* ================== Helpers ================== */
const unwrapId = (id?: IDType) =>
  typeof id === "string" ? id : (id as any)?.$oid ?? "";

const money = (n?: number) =>
  typeof n === "number" && !isNaN(n)
    ? new Intl.NumberFormat("en-IN").format(n)
    : "—";

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop";

// Prefer thumbnail → images → galleryImages → guestImages → fallback
const heroImageFromPackage = (p: SightseeingPackage): string => {
  const sources = [
    p.thumbnail,
    ...(Array.isArray(p.images) ? p.images : []),
    ...(Array.isArray(p.galleryImages) ? p.galleryImages : []),
    ...(Array.isArray(p.guestImages) ? p.guestImages : []),
  ].filter(Boolean) as string[];

  return sources[0] || FALLBACK_IMG;
};

/* ================== Component ================== */
const SightseeingPackagesDashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [vehicleType, setVehicleType] = useState<string>("");
  const [onlyActive, setOnlyActive] = useState<boolean>(false);

  const { setPackage } = useSightseeingPackageStore();

  const [selected, setSelected] = useState<SightseeingPackage | null>(null);
  const [items, setItems] = useState<SightseeingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);

  // =========================
  // ✅ MARKUP MODAL STATE
  // =========================
  const [openMarkupModal, setOpenMarkupModal] = useState(false);
  const [markupStep, setMarkupStep] = useState<0 | 1>(0);
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [markupMinPrice, setMarkupMinPrice] = useState<number | "">("");
  const [markupMaxPrice, setMarkupMaxPrice] = useState<number | "">("");
  const [savingMarkup, setSavingMarkup] = useState(false);

  // ✅ modal filters
  const [modalSearch, setModalSearch] = useState("");
  const [modalVehicleType, setModalVehicleType] = useState<string>("");

  // ✅ modal list (ALL packages)
  const [modalItemsRaw, setModalItemsRaw] = useState<SightseeingPackage[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalFetchedOnce, setModalFetchedOnce] = useState(false);

  const fetchPackages = async (pageNum: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(pageNum));
      if (vehicleType) params.set("vehicle_type", vehicleType);
      if (onlyActive) params.set("active", "true");
      if (search.trim()) params.set("q", search.trim());

      const url = `${process.env.NEXT_PUBLIC_API_BASE}packages/fetch?${params.toString()}`;
      const res = await axios.get(url);

      const fetched: SightseeingPackage[] =
        res.data.items || res.data.data || res.data || [];
      const totalPages = res.data.totalPages ?? res.data.pagination?.pages ?? 1;

      setItems(Array.isArray(fetched) ? fetched : []);
      setPages(Number(totalPages) || 1);
    } catch (e) {
      console.error("Error fetching packages:", e);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Modal: fetch ALL sightseeing packages
  const fetchAllPackagesForModal = async () => {
    setModalLoading(true);
    try {
      // ✅ change to your real endpoint that returns ALL packages
      // example: packages/fetchall OR packages/all
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE}packages/fetchall`
      );

      const fetched: SightseeingPackage[] =
        res.data.items || res.data.data || res.data || [];
      setModalItemsRaw(Array.isArray(fetched) ? fetched : []);
      setModalFetchedOnce(true);
    } catch (e) {
      console.error("Error fetching all packages for modal:", e);
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    setPage(1);
    fetchPackages(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleType, onlyActive]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return items;

    return items.filter((p) => {
      const title = p.tour_name || p.title || "";
      const veh = p.vehicle_type || p.vehicleType || "";
      const regTime = p.regular_timings || p.regularTimings || "";
      const altTime = p.alternative_timings || p.alternativeTimings || "";
      const dest = p.destination || "";
      const cats = (p.category || []).join(" ");
      const why = (p.whyChoose || [])
        .map((w) => `${w.title} ${w.description}`)
        .join(" ");
      const expect = (p.whatToExpect || [])
        .map((w) => `${w.title} ${w.description}`)
        .join(" ");
      const mentions = p.special_mentions || "";
      const notes = p.notes || "";
      const placesNames =
        (p.placesToVisit || []).map((x) => x.name).join(" ") ||
        (p.places_to_visit_names || []).join(" ");

      const hay = [
        title,
        dest,
        veh,
        regTime,
        altTime,
        cats,
        p.description || "",
        why,
        expect,
        mentions,
        notes,
        placesNames,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [search, items]);

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_BASE}packages/packages/${unwrapId(
          selected._id
        )}`
      );
      setItems((prev) =>
        prev.filter((x) => unwrapId(x._id) !== unwrapId(selected._id))
      );
      setSelected(null);
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Failed to delete package");
    }
  };

  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleEdit = (p: SightseeingPackage) => {
    setPackage(p as any);
  };

  // collect unique vehicle types from both fields for dashboard filter options
  const vehicleOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((p) => {
      if (p.vehicleType) set.add(p.vehicleType);
      if (p.vehicle_type) set.add(p.vehicle_type);
    });
    return Array.from(set);
  }, [items]);

  // collect unique vehicle types for modal filter (from ALL modal items)
  const modalVehicleOptions = useMemo(() => {
    const set = new Set<string>();
    modalItemsRaw.forEach((p) => {
      const vt = p.vehicle_type || p.vehicleType;
      if (vt) set.add(vt);
    });
    return Array.from(set);
  }, [modalItemsRaw]);

  const togglePackageSelection = (id: string) => {
    setSelectedPackageIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const openMarkup = async () => {
    setMarkupStep(0);
    setSelectedPackageIds([]);
    setMarkupMinPrice("");
    setMarkupMaxPrice("");
    setModalVehicleType("");
    setModalSearch("");
    setOpenMarkupModal(true);

    if (!modalFetchedOnce) {
      await fetchAllPackagesForModal();
    }
  };

  const closeMarkup = () => setOpenMarkupModal(false);

  const modalPackages = useMemo(() => {
    const term = modalSearch.trim().toLowerCase();

    const bySearch = !term
      ? modalItemsRaw
      : modalItemsRaw.filter((p) => {
          const title = p.tour_name || p.title || "";
          const dest = p.destination || "";
          const veh = p.vehicle_type || p.vehicleType || "";
          const places =
            (p.placesToVisit || []).map((x) => x.name).join(" ") ||
            (p.places_to_visit_names || []).join(" ");
          const hay = [title, dest, veh, places].filter(Boolean).join(" ").toLowerCase();
          return hay.includes(term);
        });

    const byVehicle =
      modalVehicleType
        ? bySearch.filter(
            (p) => (p.vehicle_type || p.vehicleType || "") === modalVehicleType
          )
        : bySearch;

    return byVehicle;
  }, [modalItemsRaw, modalSearch, modalVehicleType]);

  const handleSubmitMarkup = async () => {
    if (!selectedPackageIds.length) return;

    const min = markupMinPrice === "" ? undefined : Number(markupMinPrice);
    const max = markupMaxPrice === "" ? undefined : Number(markupMaxPrice);

    if (min !== undefined && max !== undefined && max < min) {
      alert("Markup Max Price must be >= Markup Min Price");
      return;
    }

    setSavingMarkup(true);
    try {
      // ✅ update endpoint to your backend route
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_BASE}packages/bulk-markup`,
        {
          packageIds: selectedPackageIds,
          markupMinPrice: min,
          markupMaxPrice: max,
        }
      );

      // ✅ update dashboard list
      setItems((prev) =>
        prev.map((p) => {
          const pid = unwrapId(p._id) || p.id || "";
          if (!selectedPackageIds.includes(pid)) return p;
          return {
            ...p,
            ...(min !== undefined ? { markupMinPrice: min } : {}),
            ...(max !== undefined ? { markupMaxPrice: max } : {}),
          };
        })
      );

      // ✅ update modal list
      setModalItemsRaw((prev) =>
        prev.map((p) => {
          const pid = unwrapId(p._id) || p.id || "";
          if (!selectedPackageIds.includes(pid)) return p;
          return {
            ...p,
            ...(min !== undefined ? { markupMinPrice: min } : {}),
            ...(max !== undefined ? { markupMaxPrice: max } : {}),
          };
        })
      );

      setOpenMarkupModal(false);
    await router.push("/dashboard/Sightseeing?tab=packages");
    } catch (e) {
      console.error("❌ bulk markup update error:", e);
      alert("Failed to update markup");
    } finally {
      setSavingMarkup(false);
    }
  };

  return (
    <Box sx={{ p: 3, backgroundColor: "#f5f7fb", minHeight: "70vh" }}>
      {/* Top bar */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          gap: 2,
          mb: 3,
        }}
      >
        <TextField
          size="small"
          placeholder="Search by title, destination, highlights…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: "100%", sm: 360 } }}
        />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", sm: "center" }}
        >
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Vehicle Type</InputLabel>
            <Select
              label="Vehicle Type"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {vehicleOptions.map((v) => (
                <MenuItem key={v} value={v}>
                  {v}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* ✅ Markup button */}
          <Button
            onClick={openMarkup}
            variant="outlined"
            fullWidth
            sx={{ width: { xs: "100%", sm: "auto" } as any, height: 40, fontWeight: 800 }}
          >
            Markup
          </Button>

          <Button
            href="/dashboard/services?type=sightseeing"
            component={Link as any}
            fullWidth
            sx={{ width: { xs: "100%", sm: "auto" } as any }}
            variant="outlined"
            startIcon={<AddCircleOutline />}
          >
            Add Services
          </Button>

          <Button
            href="/dashboard/Sightseeing/packages/addpackage"
            component={Link as any}
            fullWidth
            sx={{ width: { xs: "100%", sm: "auto" } as any }}
            variant="contained"
            startIcon={<AddCircleOutline />}
          >
            Add Package
          </Button>
        </Stack>
      </Box>

      {/* Loader / Empty */}
      {loading ? (
        <Box
          sx={{
            minHeight: "50vh",
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            gap: 2,
          }}
        >
          <CircularProgress size={50} />
          <Typography variant="body1" color="text.secondary">
            Loading packages…
          </Typography>
        </Box>
      ) : filtered.length === 0 ? (
        <Box
          sx={{
            minHeight: "40vh",
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            gap: 1,
          }}
        >
          <Typography variant="h6">No packages found</Typography>
          <Typography variant="body2" color="text.secondary">
            Try a different search or add a new package.
          </Typography>
        </Box>
      ) : (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                lg: "repeat(3, minmax(0, 1fr))",
              },
              gap: 3,
            }}
          >
            {filtered.map((p) => {
              const id = unwrapId(p._id) || p.id;
              const title = p.tour_name || p.title || "Untitled package";
              const destination = p.destination || "Goa";
              const veh = p.vehicle_type || p.vehicleType;
              const pax =
                (p.min_pax ?? p.minParticipants ?? 1) +
                " - " +
                (p.max_pax ?? p.maxParticipants ?? 1);
              const duration = p.duration_hours;
              const places =
                (p.placesToVisit || []).map((x) => x.name) ||
                p.places_to_visit_names ||
                [];
              const categories = p.category || [];
              const price =
                p.priceBreakdown?.totalPrice ??
                p.priceBreakdown?.basePrice ??
                p.price_regular;
              const rating = p.rating ?? 0;
              const reviews = p.reviewCount ?? 0;
              const booked = p.bookedCount ?? 0;

              return (
                <Card
                  key={id || title}
                  sx={{
                    borderRadius: 3,
                    overflow: "hidden",
                    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
                    display: "flex",
                    flexDirection: "column",
                    bgColor: "background.paper",
                  }}
                >
                  <Box sx={{ position: "relative" }}>
                    <CardMedia
                      component="img"
                      image={heroImageFromPackage(p)}
                      alt={title}
                      sx={{
                        objectFit: "cover",
                        width: "100%",
                        height: 190,
                      }}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(to top, rgba(0,0,0,0.65), transparent 50%)",
                      }}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        left: 12,
                        bottom: 12,
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.5,
                      }}
                    >
                      <Chip
                        size="small"
                        icon={<LocationIcon sx={{ color: "inherit" }} fontSize="small" />}
                        label={destination}
                        sx={{
                          color: "white",
                          borderColor: "rgba(255,255,255,0.7)",
                          borderWidth: 1,
                          borderStyle: "solid",
                          bgcolor: "rgba(15,23,42,0.4)",
                        }}
                      />
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {categories.slice(0, 2).map((c) => (
                          <Chip
                            key={c}
                            size="small"
                            label={c}
                            sx={{ color: "white", bgcolor: "rgba(15,23,42,0.6)" }}
                          />
                        ))}
                        {categories.length > 2 && (
                          <Chip
                            size="small"
                            label={`+${categories.length - 2}`}
                            sx={{ color: "white", bgcolor: "rgba(15,23,42,0.6)" }}
                          />
                        )}
                      </Stack>
                    </Box>

                    {rating > 0 && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 10,
                          right: 10,
                          px: 1,
                          py: 0.5,
                          borderRadius: 999,
                          bgcolor: "rgba(15,23,42,0.8)",
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          color: "white",
                        }}
                      >
                        <StarIcon fontSize="small" />
                        <Typography variant="body2" fontWeight={600}>
                          {rating.toFixed(1)}
                        </Typography>
                        {reviews > 0 && (
                          <Typography variant="caption" sx={{ opacity: 0.8 }}>
                            ({reviews})
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>

                  <CardContent sx={{ pb: 1, flexGrow: 1 }}>
                    <Stack spacing={0.5}>
                      <Typography
                        variant="h6"
                        noWrap
                        title={title}
                        sx={{ fontWeight: 700 }}
                      >
                        {title}
                      </Typography>
                      {p.operatedBy && (
                        <Typography variant="caption" color="text.secondary" noWrap>
                          Operated by {p.operatedBy}
                        </Typography>
                      )}
                    </Stack>

                    <Stack
                      direction="row"
                      spacing={1}
                      mt={1}
                      flexWrap="wrap"
                      alignItems="center"
                    >
                      {veh && (
                        <Chip
                          size="small"
                          variant="outlined"
                          icon={<CarIcon fontSize="small" />}
                          label={veh}
                        />
                      )}
                      <Chip
                        size="small"
                        variant="outlined"
                        icon={<PeopleIcon fontSize="small" />}
                        label={`${pax} pax`}
                      />
                      {typeof duration === "number" && (
                        <Chip
                          size="small"
                          variant="outlined"
                          icon={<AccessTimeIcon fontSize="small" />}
                          label={`${duration} hrs`}
                        />
                      )}
                    </Stack>

                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      mt={1.5}
                    >
                      <Stack spacing={0.2}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ textTransform: "uppercase" }}
                        >
                          From
                        </Typography>
                        <Stack direction="row" alignItems="baseline" gap={0.5}>
                          <RupeeIcon fontSize="small" />
                          <Typography variant="h6" fontWeight={700}>
                            {money(price)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            per person
                          </Typography>
                        </Stack>
                      </Stack>
                    </Stack>

                    {Array.isArray(places) && places.length > 0 && (
                      <Stack spacing={0.5} mt={1.5}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ textTransform: "uppercase", fontWeight: 600 }}
                        >
                          Key Stops
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={0.5}
                          flexWrap="wrap"
                          sx={{ maxHeight: 72, overflow: "hidden" }}
                        >
                          {places.slice(0, 3).map((nm) => (
                            <Chip
                              key={nm}
                              size="small"
                              icon={<CategoryIcon fontSize="small" />}
                              label={nm}
                              sx={{ maxWidth: 200 }}
                            />
                          ))}
                          {places.length > 3 && (
                            <Chip size="small" label={`+${places.length - 3} more`} />
                          )}
                        </Stack>
                      </Stack>
                    )}
                  </CardContent>

                  <CardActions
                    sx={{
                      justifyContent: "space-between",
                      px: 2,
                      pb: 2,
                      pt: 0.5,
                    }}
                  >
                    <Stack direction="row" spacing={1}>
                      <Button
                        component={Link as any}
                        href={`/dashboard/Sightseeing/packages/editpackage`}
                        onClick={() => handleEdit(p)}
                        size="small"
                        startIcon={<EditIcon />}
                      >
                        Edit
                      </Button>
                      <Button
                        color="error"
                        size="small"
                        startIcon={<DeleteIcon />}
                        onClick={() => {
                          setSelected(p);
                          setConfirmOpen(true);
                        }}
                      >
                        Delete
                      </Button>
                    </Stack>

                    {p.meetingTime && (
                      <Typography variant="caption" color="text.secondary">
                        Meeting: {p.meetingTime}
                      </Typography>
                    )}
                  </CardActions>
                </Card>
              );
            })}
          </Box>

          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <Pagination
              count={pages}
              page={page}
              onChange={(e, value) => setPage(value)}
              color="primary"
            />
          </Box>
        </>
      )}

      {/* Delete Confirmation */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Delete Package</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete{" "}
            <strong>{selected?.tour_name || selected?.title || "this package"}</strong>?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={async () => {
              await handleDelete();
              setConfirmOpen(false);
            }}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✅ MARKUP MODAL (filter by vehicle type) */}
      <Dialog
        open={openMarkupModal}
        onClose={closeMarkup}
        fullScreen={isMobile}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Select Sightseeing Packages
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Filter by vehicle type and continue.
              </Typography>
            </Box>

            <Chip
              label={`Selected: ${selectedPackageIds.length}`}
              variant="outlined"
              sx={{ fontWeight: 800 }}
            />
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <Stepper activeStep={markupStep} sx={{ mb: 2 }}>
            <Step>
              <StepLabel>Select</StepLabel>
            </Step>
            <Step>
              <StepLabel>Markup</StepLabel>
            </Step>
          </Stepper>

          {markupStep === 0 ? (
            <>
              {/* ✅ vehicle type filter */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "260px 1fr" },
                  gap: 1.5,
                  mb: 1.5,
                  alignItems: "center",
                }}
              >
                <FormControl size="small" fullWidth>
                  <InputLabel>Vehicle Type</InputLabel>
                  <Select
                    label="Vehicle Type"
                    value={modalVehicleType}
                    onChange={(e) => setModalVehicleType(e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    {modalVehicleOptions.map((v) => (
                      <MenuItem key={v} value={v}>
                        {v}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  size="small"
                  placeholder="Search packages..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    width: "100%",
                    "& .MuiOutlinedInput-root": { borderRadius: 1.5, height: 40 },
                  }}
                />
              </Box>

              <Divider sx={{ mb: 2 }} />

              {modalLoading ? (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    py: 6,
                  }}
                >
                  <CircularProgress />
                </Box>
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                    gap: 1.25,
                    maxHeight: isMobile ? "63vh" : "52vh",
                    overflow: "auto",
                    pr: 0.5,
                  }}
                >
                  {modalPackages.map((p) => {
                    const pid = unwrapId(p._id) || p.id || "";
                    const checked = selectedPackageIds.includes(pid);

                    const title = p.tour_name || p.title || "Untitled package";
                    const dest = p.destination || "—";
                    const veh = p.vehicle_type || p.vehicleType || "—";
                    const base =
                      p.priceBreakdown?.totalPrice ??
                      p.priceBreakdown?.basePrice ??
                      p.price_regular;

                    return (
                      <Card
                        key={pid || title}
                        onClick={() => togglePackageSelection(pid)}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.25,
                          p: 1,
                          borderRadius: 2,
                          cursor: "pointer",
                          border: checked ? "2px solid" : "1px solid",
                          borderColor: checked ? "primary.main" : "divider",
                          boxShadow: "none",
                          transition: "0.15s",
                          "&:hover": { borderColor: "primary.main" },
                        }}
                      >
                        <Box
                          sx={{
                            width: 72,
                            height: 56,
                            borderRadius: 2,
                            overflow: "hidden",
                            flexShrink: 0,
                            bgcolor: "grey.100",
                          }}
                        >
                          <CardMedia
                            component="img"
                            image={heroImageFromPackage(p)}
                            alt={title}
                            loading="lazy"
                            sx={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            sx={{
                              fontWeight: 900,
                              fontSize: 14,
                              lineHeight: 1.2,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {title}
                          </Typography>

                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              fontSize: 12,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {dest} • {veh} • ₹{money(base)}
                          </Typography>
                        </Box>

                        <Checkbox
                          checked={checked}
                          onChange={() => togglePackageSelection(pid)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Card>
                    );
                  })}

                  {!modalPackages.length && !modalLoading && (
                    <Box sx={{ gridColumn: "1 / -1", py: 4, textAlign: "center" }}>
                      <Typography color="text.secondary">No packages found.</Typography>
                    </Box>
                  )}
                </Box>
              )}
            </>
          ) : (
            <>
              <Typography sx={{ fontWeight: 900, mb: 0.5 }}>
                Add markup for selected packages
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This will update markup prices for <b>{selectedPackageIds.length}</b>{" "}
                packages.
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                  gap: 2,
                }}
              >
                <TextField
                  label="Markup Min Price"
                  type="number"
                  value={markupMinPrice}
                  onChange={(e) =>
                    setMarkupMinPrice(e.target.value ? Number(e.target.value) : "")
                  }
                  inputProps={{ min: 0 }}
                  fullWidth
                />
                <TextField
                  label="Markup Max Price"
                  type="number"
                  value={markupMaxPrice}
                  onChange={(e) =>
                    setMarkupMaxPrice(e.target.value ? Number(e.target.value) : "")
                  }
                  inputProps={{ min: 0 }}
                  fullWidth
                />
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 2,
            py: 1.5,
            gap: 1,
            justifyContent: "space-between",
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <Button
            onClick={closeMarkup}
            color="inherit"
            variant="outlined"
            sx={{ borderRadius: 1.5, height: 36, fontWeight: 800 }}
          >
            Cancel
          </Button>

          {markupStep === 0 ? (
            <Button
              variant="contained"
              disabled={!selectedPackageIds.length || modalLoading}
              onClick={() => setMarkupStep(1)}
              sx={{ borderRadius: 1.5, height: 36, fontWeight: 900 }}
            >
              Continue
            </Button>
          ) : (
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="outlined"
                onClick={() => setMarkupStep(0)}
                sx={{ borderRadius: 1.5, height: 36, fontWeight: 900 }}
              >
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmitMarkup}
                disabled={savingMarkup}
                sx={{ borderRadius: 1.5, height: 36, fontWeight: 900 }}
              >
                {savingMarkup ? "Saving..." : "Submit"}
              </Button>
            </Box>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SightseeingPackagesDashboard;
