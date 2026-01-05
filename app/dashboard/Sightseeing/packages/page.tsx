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
  useMediaQuery,
  Card,
  CardMedia,
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

import CommonServiceCard, { type ServiceChip } from "@/components/dashboard/CommonServiceCard";
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
const unwrapId = (id?: IDType) => (typeof id === "string" ? id : (id as any)?.$oid ?? "");

const money = (n?: number) =>
  typeof n === "number" && !isNaN(n) ? new Intl.NumberFormat("en-IN").format(n) : "—";

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop";

const heroImageFromPackage = (p: SightseeingPackage): string => {
  const sources = [
    p.thumbnail,
    ...(Array.isArray(p.images) ? p.images : []),
    ...(Array.isArray(p.galleryImages) ? p.galleryImages : []),
    ...(Array.isArray(p.guestImages) ? p.guestImages : []),
  ].filter(Boolean) as string[];
  return sources[0] || FALLBACK_IMG;
};

const clampText = (s: string, max = 140) => {
  const t = (s || "").replace(/\s+/g, " ").trim();
  if (!t) return "—";
  return t.length > max ? `${t.slice(0, max).trim()}…` : t;
};

// ✅ important: prevents TS widening (color becomes literal union not string)
const chip = (c: ServiceChip) => c;

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

  const [modalSearch, setModalSearch] = useState("");
  const [modalVehicleType, setModalVehicleType] = useState<string>("");

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

      const fetched: SightseeingPackage[] = res.data.items || res.data.data || res.data || [];
      const totalPages = res.data.totalPages ?? res.data.pagination?.pages ?? 1;

      setItems(Array.isArray(fetched) ? fetched : []);
      setPages(Number(totalPages) || 1);
    } catch (e) {
      console.error("Error fetching packages:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPackagesForModal = async () => {
    setModalLoading(true);
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE}packages/fetchall`);
      const fetched: SightseeingPackage[] = res.data.items || res.data.data || res.data || [];
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
      const placesNames =
        (p.placesToVisit || []).map((x) => x.name).join(" ") ||
        (p.places_to_visit_names || []).join(" ");

      const hay = [title, dest, veh, regTime, altTime, cats, p.description || "", placesNames]
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
        `${process.env.NEXT_PUBLIC_API_BASE}packages/packages/${unwrapId(selected._id)}`
      );
      setItems((prev) => prev.filter((x) => unwrapId(x._id) !== unwrapId(selected._id)));
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

  const vehicleOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((p) => {
      if (p.vehicleType) set.add(p.vehicleType);
      if (p.vehicle_type) set.add(p.vehicle_type);
    });
    return Array.from(set);
  }, [items]);

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

    const byVehicle = modalVehicleType
      ? bySearch.filter((p) => (p.vehicle_type || p.vehicleType || "") === modalVehicleType)
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
      await axios.put(`${process.env.NEXT_PUBLIC_API_BASE}packages/bulk-markup`, {
        packageIds: selectedPackageIds,
        markupMinPrice: min,
        markupMaxPrice: max,
      });

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

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Vehicle Type</InputLabel>
            <Select label="Vehicle Type" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {vehicleOptions.map((v) => (
                <MenuItem key={v} value={v}>
                  {v}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button onClick={openMarkup} variant="outlined" fullWidth sx={{ width: { xs: "100%", sm: "auto" } as any, height: 40, fontWeight: 800 }}>
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
        <Box sx={{ minHeight: "50vh", display: "grid", placeItems: "center", textAlign: "center", gap: 2 }}>
          <CircularProgress size={50} />
          <Typography variant="body1" color="text.secondary">
            Loading packages…
          </Typography>
        </Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ minHeight: "40vh", display: "grid", placeItems: "center", textAlign: "center", gap: 1 }}>
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
              const id = unwrapId(p._id) || p.id || "";
              const title = p.tour_name || p.title || "Untitled package";
              const destination = p.destination || "—";

              const veh = p.vehicle_type || p.vehicleType;
              const paxMin = p.min_pax ?? p.minParticipants ?? 1;
              const paxMax = p.max_pax ?? p.maxParticipants ?? paxMin;
              const duration = p.duration_hours;

              const categories = p.category || [];
              const places = (p.placesToVisit || []).map((x) => x.name) || p.places_to_visit_names || [];

              const price =
                p.priceBreakdown?.totalPrice ??
                p.priceBreakdown?.basePrice ??
                p.price_regular;

              const rating = typeof p.rating === "number" ? p.rating : undefined;
              const reviews = p.reviewCount ?? 0;

              const description = clampText(p.description || "", 140);

              const subtitleChip: ServiceChip = chip({
                icon: <LocationIcon fontSize="small" />,
                label: destination,
              });

              const topLeftChips: ServiceChip[] = [
                ...(veh
                  ? [
                      chip({
                        icon: <CarIcon fontSize="small" />,
                        label: veh,
                        variant: "outlined",
                      }),
                    ]
                  : []),

                chip({
                  icon: <PeopleIcon fontSize="small" />,
                  label: `${paxMin}-${paxMax} pax`,
                  variant: "outlined",
                }),

                ...(typeof duration === "number"
                  ? [
                      chip({
                        icon: <AccessTimeIcon fontSize="small" />,
                        label: `${duration} hrs`,
                        variant: "outlined",
                      }),
                    ]
                  : []),

                ...(rating != null && rating > 0
                  ? [
                      chip({
                        icon: <StarIcon fontSize="small" />,
                        label: `${rating.toFixed(1)}${reviews ? ` (${reviews})` : ""}`,
                        color: "warning",
                        variant: "outlined",
                      }),
                    ]
                  : []),
              ];

              const topRightChips: ServiceChip[] = [
                ...(typeof price === "number"
                  ? [
                      chip({
                        icon: <RupeeIcon fontSize="small" />,
                        label: `₹${money(price)} / person`,
                        color: "primary",
                        sx: { bgcolor: "primary.main", color: "primary.contrastText" },
                      }),
                    ]
                  : []),
              ];

              const metaChips: ServiceChip[] = [
                ...categories.slice(0, 3).map((c) =>
                  chip({
                    icon: <CategoryIcon fontSize="small" />,
                    label: c,
                  })
                ),
                ...(Array.isArray(places) && places.length
                  ? [
                      chip({
                        label: `Stops: ${places.length}`,
                        variant: "outlined",
                      }),
                    ]
                  : []),
                ...(p.meetingTime
                  ? [
                      chip({
                        label: `Meeting: ${p.meetingTime}`,
                        variant: "outlined",
                      }),
                    ]
                  : []),
              ];

              return (
                <CommonServiceCard
                  key={id || title}
                  id={id || title}
                  title={title}
                  image={heroImageFromPackage(p)}
                  subtitleChip={subtitleChip}
                  description={description}
                  topLeftChips={topLeftChips}
                  topRightChips={topRightChips}
                  metaChips={metaChips}
                  editHref="/dashboard/Sightseeing/packages/editpackage"
                  onEdit={() => handleEdit(p)}
                  onDelete={() => {
                    setSelected(p);
                    setConfirmOpen(true);
                  }}
                />
              );
            })}
          </Box>

          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <Pagination count={pages} page={page} onChange={(e, value) => setPage(value)} color="primary" />
          </Box>
        </>
      )}

      {/* Delete Confirmation */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Delete Package</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete <strong>{selected?.tour_name || selected?.title || "this package"}</strong>? This action cannot be undone.
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

      {/* ✅ MARKUP MODAL (unchanged) */}
      <Dialog open={openMarkupModal} onClose={closeMarkup} fullScreen={isMobile} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Select Sightseeing Packages
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Filter by vehicle type and continue.
              </Typography>
            </Box>

            <Chip label={`Selected: ${selectedPackageIds.length}`} variant="outlined" sx={{ fontWeight: 800 }} />
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
                  <Select label="Vehicle Type" value={modalVehicleType} onChange={(e) => setModalVehicleType(e.target.value)}>
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
                  sx={{ width: "100%", "& .MuiOutlinedInput-root": { borderRadius: 1.5, height: 40 } }}
                />
              </Box>

              <Divider sx={{ mb: 2 }} />

              {modalLoading ? (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 6 }}>
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
                            sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
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
                            sx={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                          >
                            {dest} • {veh} • ₹{money(base)}
                          </Typography>
                        </Box>

                        <Checkbox checked={checked} onChange={() => togglePackageSelection(pid)} onClick={(e) => e.stopPropagation()} />
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
              <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Add markup for selected packages</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This will update markup prices for <b>{selectedPackageIds.length}</b> packages.
              </Typography>

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2 }}>
                <TextField
                  label="Markup Min Price"
                  type="number"
                  value={markupMinPrice}
                  onChange={(e) => setMarkupMinPrice(e.target.value ? Number(e.target.value) : "")}
                  inputProps={{ min: 0 }}
                  fullWidth
                />
                <TextField
                  label="Markup Max Price"
                  type="number"
                  value={markupMaxPrice}
                  onChange={(e) => setMarkupMaxPrice(e.target.value ? Number(e.target.value) : "")}
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
          <Button onClick={closeMarkup} color="inherit" variant="outlined" sx={{ borderRadius: 1.5, height: 36, fontWeight: 800 }}>
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
              <Button variant="outlined" onClick={() => setMarkupStep(0)} sx={{ borderRadius: 1.5, height: 36, fontWeight: 900 }}>
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
