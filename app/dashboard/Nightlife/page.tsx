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
  IconButton,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Pagination,
  Stack,
  Checkbox,
  Divider,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Search,
  ContentCopy,
  LocalOffer,
  AccessTime,
  AddCircleOutline,
  MusicNote,
  Category,
  Badge as BadgeIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import { useNightlifePackageStore } from "@/store/usenightlifeStore";

// ===== Types =====
type OID = { $oid: string } | string | undefined;

// This matches your new API structure (NIGHT005-style)
type NightlifeDoc = {
  _id?: OID;
  id: string;
  title: string;
  description: string; // HTML
  descriptionShort?: string;
  descriptionLong?: string;
  destination: string;
  type: string; // "pubcrawl" etc.

  guest_images?: string[];
  thumbnail?: string;
  images?: string[];
  videos?: string[];

  price: number;
  vendorPrice?: number;
  basePrice?: number;
  serviceCharges?: number;
  serviceCharge?: number;
  priceBreakdown?: {
    basePrice: number;
    serviceCharges: number;
    taxes: number;
    totalPrice: number;
  };
  taxRate?: number;
  tax?: number;
  taxIncluded?: boolean;
  extraCharges?: Record<string, number>;
  surcharges?: {
    windowType: string;
    singleDate?: string;
    amount: number;
    currency: string;
  }[];

  operatingDays?: string[];
  openTime?: string;
  closeTime?: string;
  duration?: number;
  durationType?: string; // "hrs" etc.
  timeSlots?: string[];
  operatingHours?: string;
  timing?: string;

  dateAvailable?: string;
  bestTimeToVisit?: string;
  seasonalAvailability?: string;

  pickupType?: string;
  pickupAreas?: string[];
  meetupLocation?: string;
  meetupAddress?: string;
  meetingTime?: string;
  address?: string;

  groupSize?: string;
  minParticipants?: number;
  maxParticipants?: number;
  ageLimit?: string;
  capacity?: number;
  genderRatioRule?: string;
  accessibility?: string;
  fitnessLevel?: string;
  healthRestrictions?: string;

  extendedDescription?: string;
  highlights?: string[];
  whyChoose?: { title: string; description: string }[];
  itinerary?: { time: string; title: string; description: string }[];
  operationProcess?: { time: string; title: string; description: string }[];
  whatToExpect?: { title: string; description: string }[];

  inclusions?: string[];
  includes?: string[];
  exclusions?: string[];
  excludes?: string[];
  safetyRequirements?: string[];
  goodToKnow?: string[];
  whatToBring?: string[];
  voucherInfo?: string[];

  languages?: string[];
  eventCategory?: string[];
  musicType?: string[];
  bestFor?: string[];
  generalInstructions?: string[];
  dressCode?: string;
  amenities?: string[];

  cancellationPolicyShort?: string;
  cancellationDetails?: string[];

  rating?: number;
  reviewCount?: number;
  ratingCount?: number;
  bookedCount?: number;
  instantConfirmation?: boolean;
  freeCancellation?: boolean;
  operatedBy?: string;
  review_count?: number;

  llm_chips?: { q: string; a: string }[];
  faqs?: any[];
  priceNote?: string;
  isComplete?: boolean;

  // ✅ markup fields (adjust if your backend uses different keys)
  markupMinPrice?: number;
  markupMaxPrice?: number;

  createdAt?: { $date: string } | string;
  updatedAt?: { $date: string } | string;
  [key: string]: any;
};

// ===== Helpers =====
const unwrapId = (id?: OID) =>
  typeof id === "string" ? id : (id as any)?.$oid ?? "";

const mainImage = (v: NightlifeDoc) =>
  v.thumbnail ||
  v.images?.[0] ||
  v.guest_images?.[0] ||
  "https://images.unsplash.com/photo-1550950614-95d64d0d193e?q=80&w=1600&auto=format&fit=crop";

const stripHtml = (html?: string) =>
  (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const when = (d?: { $date: string } | string) =>
  typeof d === "string" ? d : d?.$date;

const getOperatingHours = (v: NightlifeDoc): string | undefined => {
  if (v.operatingHours) return v.operatingHours;
  if (v.openTime && v.closeTime) return `${v.openTime} – ${v.closeTime}`;
  return undefined;
};

const getDurationLabel = (v: NightlifeDoc): string | undefined => {
  if (v.duration && v.durationType) return `${v.duration} ${v.durationType}`;
  if (v.duration) return `${v.duration} hrs`;
  if (v.timing) return v.timing;
  return undefined;
};

const getDescHtml = (v: NightlifeDoc): string =>
  v.descriptionLong ||
  v.extendedDescription ||
  v.description ||
  v.descriptionShort ||
  "";

const getDisplayPriceNumber = (v: NightlifeDoc): number | undefined => {
  let total: number | undefined = v.priceBreakdown?.totalPrice ?? undefined;

  if (total == null) {
    if (v.basePrice != null || v.serviceCharges != null || v.tax != null) {
      total = (v.basePrice ?? 0) + (v.serviceCharges ?? 0) + (v.tax ?? 0);
    } else if (typeof v.price === "number") {
      total = v.price;
    }
  }
  return total ?? undefined;
};

const getDisplayPrice = (v: NightlifeDoc): string | undefined => {
  const total = getDisplayPriceNumber(v);
  if (total == null) return undefined;
  return `₹${total.toLocaleString("en-IN")}`;
};

const getPriceSource = (_v: NightlifeDoc): string | undefined => "per person";

// ===== Component =====
const NightlifeDashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [search, setSearch] = useState("");
  const [venues, setVenues] = useState<NightlifeDoc[]>([]);
  const [selected, setSelected] = useState<NightlifeDoc | null>(null);
  const [loading, setLoading] = useState(true);

  // simple pagination (works if backend supports ?page=)
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);
  const router = useRouter();

  const { setNightlife } = useNightlifePackageStore(); // store full record for edit

  const fetchVenues = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE}nightlife-places/getall?page=${pageNum}`
      );

      const list: NightlifeDoc[] = res.data.items || res.data.data || res.data || [];
      const totalPages = res.data.totalPages ?? res.data.pagination?.pages ?? 1;

      setVenues(Array.isArray(list) ? list : []);
      setPages(Number(totalPages) || 1);
    } catch (e) {
      console.error("Error fetching nightlife:", e);
      setVenues([]);
      setPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return venues;

    return venues.filter((v) => {
      const hay = [
        v.title,
        v.type,
        v.destination,
        getOperatingHours(v),
        getDurationLabel(v),
        getDisplayPrice(v),
        getPriceSource(v),
        v.ageLimit,
        (v.musicType || []).join(" "),
        (v.amenities || []).join(" "),
        stripHtml(getDescHtml(v)),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [search, venues]);

  const copyId = async (id?: string) => {
    try {
      if (id) await navigator.clipboard.writeText(id);
    } catch {}
  };

  const onEdit = (v: NightlifeDoc) => {
    setNightlife(v as any);
  };

  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_BASE}nightlife-places/delete/${unwrapId(
          selected._id
        )}`
      );
      setVenues((prev) => prev.filter((x) => unwrapId(x._id) !== unwrapId(selected._id)));
      setSelected(null);
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Failed to delete venue");
    }
  };

  // =========================
  // ✅ MARKUP MODAL (GET ALL NO PAGINATION)
  // =========================
  const [openMarkupModal, setOpenMarkupModal] = useState(false);
  const [markupStep, setMarkupStep] = useState<0 | 1>(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [markupMinPrice, setMarkupMinPrice] = useState<number | "">("");
  const [markupMaxPrice, setMarkupMaxPrice] = useState<number | "">("");
  const [savingMarkup, setSavingMarkup] = useState(false);

  // modal filters
  const [modalSearch, setModalSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  // modal list (ALL nightlife)
  const [modalVenuesRaw, setModalVenuesRaw] = useState<NightlifeDoc[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalFetchedOnce, setModalFetchedOnce] = useState(false);

  // ✅ get all no pagination API
  const fetchAllNightlifeForModal = async () => {
    setModalLoading(true);
    try {
      // ✅ change this to YOUR "get all (no pagination)" endpoint
      // example: nightlife-places/getallnopagination OR nightlife-places/getall-no-pagination
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE}nightlife-places/getallnopagination`
      );

      const list: NightlifeDoc[] = res.data.items || res.data.data || res.data || [];
      setModalVenuesRaw(Array.isArray(list) ? list : []);
      setModalFetchedOnce(true);
    } catch (e) {
      console.error("Error fetching all nightlife for modal:", e);
    } finally {
      setModalLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const openMarkup = async () => {
    setMarkupStep(0);
    setSelectedIds([]);
    setMarkupMinPrice("");
    setMarkupMaxPrice("");
    setModalSearch("");
    setTypeFilter("");
    setOpenMarkupModal(true);

    if (!modalFetchedOnce) {
      await fetchAllNightlifeForModal();
    }
  };

  const closeMarkup = () => setOpenMarkupModal(false);

  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    modalVenuesRaw.forEach((v) => v.type && set.add(v.type));
    return Array.from(set);
  }, [modalVenuesRaw]);

  const modalVenues = useMemo(() => {
    const term = modalSearch.trim().toLowerCase();

    const bySearch = !term
      ? modalVenuesRaw
      : modalVenuesRaw.filter((v) => {
          const hay = [
            v.title,
            v.type,
            v.destination,
            getOperatingHours(v),
            getDurationLabel(v),
            stripHtml(getDescHtml(v)),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return hay.includes(term);
        });

    const byType = typeFilter ? bySearch.filter((v) => v.type === typeFilter) : bySearch;

    return byType;
  }, [modalVenuesRaw, modalSearch, typeFilter]);

 const handleSubmitMarkup = async () => {
  if (!selectedIds.length) return;

  const min = markupMinPrice === "" ? undefined : Number(markupMinPrice);
  const max = markupMaxPrice === "" ? undefined : Number(markupMaxPrice);

  if (min !== undefined && max !== undefined && max < min) {
    alert("Markup Max Price must be >= Markup Min Price");
    return;
  }

  setSavingMarkup(true);

  try {
    const base = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");
    await axios.put(`${base}/nightlife-places/bulk-markup`, {
      nightlifeIds: selectedIds,
      markupMinPrice: min,
      markupMaxPrice: max,
    });

    // optimistic update (current list)
    setVenues((prev) =>
      prev.map((v) => {
        const vid = unwrapId(v._id) || v.id;
        if (!selectedIds.includes(vid)) return v;
        return {
          ...v,
          ...(min !== undefined ? { markupMinPrice: min } : {}),
          ...(max !== undefined ? { markupMaxPrice: max } : {}),
        };
      })
    );

    // optimistic update (modal list)
    setModalVenuesRaw((prev) =>
      prev.map((v) => {
        const vid = unwrapId(v._id) || v.id;
        if (!selectedIds.includes(vid)) return v;
        return {
          ...v,
          ...(min !== undefined ? { markupMinPrice: min } : {}),
          ...(max !== undefined ? { markupMaxPrice: max } : {}),
        };
      })
    );

    // ✅ close first, then navigate
    setOpenMarkupModal(false);

    // ✅ wait for navigation (replace avoids going "back" to modal state)
    await router.replace("/dashboard/Nightlife");
  } catch (e) {
    console.error("❌ nightlife bulk markup update error:", e);
    alert("Failed to update markup");
  } finally {
    setSavingMarkup(false);
  }
};

  return (
    <Box sx={{ p: 3, backgroundColor: "white", minHeight: "70vh" }}>
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
          placeholder="Search nightlife…"
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

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, auto)" },
            gap: 1.5,
            width: "100%",
            alignItems: "center",
          }}
        >
          {/* ✅ Markup button */}
          <Button onClick={openMarkup} variant="outlined" fullWidth sx={{ height: 40, fontWeight: 700 }}>
            Markup
          </Button>

          <Button
            href="/dashboard/services?type=nightlife"
            component={Link as any}
            fullWidth
            variant="outlined"
            startIcon={<AddCircleOutline />}
            sx={{ height: 40, fontWeight: 700 }}
          >
            Add Services
          </Button>

          <Button
            href="/dashboard/Nightlife/addnightlife"
            component={Link as any}
            fullWidth
            variant="contained"
            startIcon={<AddCircleOutline />}
            sx={{ height: 40, fontWeight: 700 }}
          >
            Add Nightlife
          </Button>
        </Box>
      </Box>

      {/* Loader / Empty / Grid */}
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
            Loading nightlife…
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
          <Typography variant="h6">No nightlife venues found</Typography>
          <Typography variant="body2" color="text.secondary">
            Try a different search or add a new venue.
          </Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {filtered.map((v) => {
              const id = unwrapId(v._id);
              const img = mainImage(v);
              const displayPrice = getDisplayPrice(v);
              const priceSource = getPriceSource(v);
              const descHtml = getDescHtml(v);
              const descText = stripHtml(descHtml).slice(0, 140);
              const operatingHours = getOperatingHours(v);

              return (
                <Card key={id || v.id || v.title} sx={{ width: 340 }}>
                  <Box sx={{ position: "relative" }}>
                    <CardMedia
                      component="img"
                      image={img}
                      alt={v.title}
                      sx={{
                        objectFit: "cover",
                        width: "100%",
                        height: 160,
                        borderRadius: 1,
                      }}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        left: 8,
                        top: 8,
                        display: "flex",
                        gap: 0.5,
                        flexWrap: "wrap",
                      }}
                    >
                      {!!displayPrice && (
                        <Chip
                          size="small"
                          color="primary"
                          icon={<LocalOffer />}
                          label={priceSource ? `${displayPrice} — ${priceSource}` : displayPrice}
                          sx={{
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                          }}
                        />
                      )}
                    </Box>
                  </Box>

                  <CardContent sx={{ pb: 1 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                      <Typography variant="h6" noWrap title={v.title} sx={{ maxWidth: "70%" }}>
                        {v.title}
                      </Typography>
                      {v.type && (
                        <Chip size="small" icon={<Category fontSize="small" />} label={v.type} variant="outlined" />
                      )}
                    </Stack>

                    <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                      {operatingHours && (
                        <Chip size="small" icon={<AccessTime fontSize="small" />} label={operatingHours} />
                      )}
                      {v.ageLimit && (
                        <Chip
                          size="small"
                          icon={<BadgeIcon fontSize="small" />}
                          label={`Age ${v.ageLimit}`}
                          color="warning"
                          variant="outlined"
                        />
                      )}
                    </Stack>

                    {!!descText && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        mt={1}
                        sx={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                        title={stripHtml(descHtml)}
                      >
                        {descText}…
                      </Typography>
                    )}

                    <Stack direction="row" spacing={0.5} mt={1} flexWrap="wrap">
                      {(v.musicType || []).slice(0, 3).map((m, i) => (
                        <Chip
                          key={`${id}-m-${i}`}
                          size="small"
                          icon={<MusicNote fontSize="small" />}
                          label={m}
                          variant="outlined"
                        />
                      ))}
                      {Array.isArray(v.musicType) && v.musicType.length > 3 && (
                        <Chip size="small" label={`+${v.musicType.length - 3}`} />
                      )}
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2, pt: 0.5 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Tooltip title="Copy ID">
                        <IconButton size="small" onClick={() => copyId(id)}>
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        component={Link as any}
                        href="/dashboard/Nightlife/editnightlife"
                        onClick={() => onEdit(v)}
                      >
                        Edit
                      </Button>

                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => {
                          setSelected(v);
                          setConfirmOpen(true);
                        }}
                      >
                        Delete
                      </Button>
                    </Stack>

                    <Typography variant="caption" color="text.secondary">
                      {when(v.updatedAt) ? `Updated: ${new Date(when(v.updatedAt)!).toLocaleDateString()}` : ""}
                    </Typography>
                  </CardActions>
                </Card>
              );
            })}
          </Box>

          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <Pagination count={pages} page={page} onChange={(_, value) => setPage(value)} color="primary" />
          </Box>
        </>
      )}

      {/* Delete Confirmation */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Delete Nightlife Venue</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete <strong>{selected?.title || "this venue"}</strong>? This action cannot be undone.
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

      {/* ✅ MARKUP MODAL */}
      <Dialog open={openMarkupModal} onClose={closeMarkup} fullScreen={isMobile} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Select Nightlife Venues
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Filter by type and continue.
              </Typography>
            </Box>

            <Chip label={`Selected: ${selectedIds.length}`} variant="outlined" sx={{ fontWeight: 800 }} />
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
                  <InputLabel>Type</InputLabel>
                  <Select label="Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                    <MenuItem value="">All</MenuItem>
                    {typeOptions.map((t) => (
                      <MenuItem key={t} value={t}>
                        {t}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  size="small"
                  placeholder="Search nightlife..."
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
                  {modalVenues.map((v) => {
                    const vid = unwrapId(v._id) || v.id;
                    const checked = selectedIds.includes(vid);

                    const price = getDisplayPrice(v);
                    const dest = v.destination || "—";

                    return (
                      <Card
                        key={vid || v.title}
                        onClick={() => toggleSelection(vid)}
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
                            image={mainImage(v)}
                            alt={v.title || "Nightlife"}
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
                            {v.title}
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
                            {dest} • {v.type || "—"} • {price || "—"}
                          </Typography>
                        </Box>

                        <Checkbox
                          checked={checked}
                          onChange={() => toggleSelection(vid)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Card>
                    );
                  })}

                  {!modalVenues.length && !modalLoading && (
                    <Box sx={{ gridColumn: "1 / -1", py: 4, textAlign: "center" }}>
                      <Typography color="text.secondary">No nightlife found.</Typography>
                    </Box>
                  )}
                </Box>
              )}
            </>
          ) : (
            <>
              <Typography sx={{ fontWeight: 900, mb: 0.5 }}>
                Add markup for selected nightlife
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This will update markup prices for <b>{selectedIds.length}</b> venues.
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
              disabled={!selectedIds.length || modalLoading}
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

export default NightlifeDashboard;
