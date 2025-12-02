"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
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
} from "@mui/material";
import {
  Search,
  ContentCopy,
  LocalOffer,
  AccessTime,
  AddCircleOutline,
  MusicNote,
  Category,
  Badge as BadgeIcon,
  Place as PlaceIcon,
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
  if (v.duration && v.durationType)
    return `${v.duration} ${v.durationType}`;
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

const getDisplayPrice = (v: NightlifeDoc): string | undefined => {
  let total: number | undefined =
    v.priceBreakdown?.totalPrice ?? undefined;

  if (total == null) {
    if (
      v.basePrice != null ||
      v.serviceCharges != null ||
      v.tax != null
    ) {
      total =
        (v.basePrice ?? 0) +
        (v.serviceCharges ?? 0) +
        (v.tax ?? 0);
    } else if (typeof v.price === "number") {
      total = v.price;
    }
  }

  if (total == null) return undefined;
  return `₹${total.toLocaleString("en-IN")}`;
};

const getPriceSource = (_v: NightlifeDoc): string | undefined =>
  "per person";

// ===== Component =====
const NightlifeDashboard: React.FC = () => {
  const [search, setSearch] = useState("");
  const [venues, setVenues] = useState<NightlifeDoc[]>([]);
  const [selected, setSelected] = useState<NightlifeDoc | null>(null);
  const [loading, setLoading] = useState(true);

  // simple pagination (works if backend supports ?page=)
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);

  const { setNightlife } = useNightlifePackageStore(); // store full record for edit

  const fetchVenues = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE}nightlife-places/getall?page=${pageNum}`
      );

      const list: NightlifeDoc[] =
        res.data.items || res.data.data || res.data || [];

      const totalPages =
        res.data.totalPages ?? res.data.pagination?.pages ?? 1;

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
    } catch {
      // ignore
    }
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
      setVenues((prev) =>
        prev.filter((x) => unwrapId(x._id) !== unwrapId(selected._id))
      );
      setSelected(null);
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Failed to delete venue");
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

        <Box sx={{ display: "flex", gap: 1, width: { xs: "100%", sm: "auto" } }}>
          <Button
            href="/dashboard/services?type=nightlife"
            component={Link as any}
            fullWidth
            variant="outlined"
            startIcon={<AddCircleOutline />}
          >
            Add Services
          </Button>
          <Button
            href="/dashboard/Nightlife/addnightlife"
            component={Link as any}
            fullWidth
            variant="contained"
            startIcon={<AddCircleOutline />}
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
              const durationLabel = getDurationLabel(v);

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
                          label={
                            priceSource
                              ? `${displayPrice} — ${priceSource}`
                              : displayPrice
                          }
                          sx={{
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                          }}
                        />
                      )}
                    </Box>
                  </Box>

                  <CardContent sx={{ pb: 1 }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      gap={1}
                    >
                      <Typography
                        variant="h6"
                        noWrap
                        title={v.title}
                        sx={{ maxWidth: "70%" }}
                      >
                        {v.title}
                      </Typography>
                      {v.type && (
                        <Chip
                          size="small"
                          icon={<Category fontSize="small" />}
                          label={v.type}
                          variant="outlined"
                        />
                      )}
                    </Stack>

                    <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                      {operatingHours && (
                        <Chip
                          size="small"
                          icon={<AccessTime fontSize="small" />}
                          label={operatingHours}
                        />
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
                        <Chip
                          size="small"
                          label={`+${v.musicType.length - 3}`}
                        />
                      )}
                    </Stack>
                  </CardContent>

                  <CardActions
                    sx={{
                      justifyContent: "space-between",
                      px: 2,
                      pb: 2,
                      pt: 0.5,
                    }}
                  >
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
                      {when(v.updatedAt)
                        ? `Updated: ${new Date(
                            when(v.updatedAt)!
                          ).toLocaleDateString()}`
                        : ""}
                    </Typography>
                  </CardActions>
                </Card>
              );
            })}
          </Box>

          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <Pagination
              count={pages}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
            />
          </Box>
        </>
      )}

      {/* Delete Confirmation */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Delete Nightlife Venue</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete <strong>{selected?.title || "this venue"}</strong>? This
            action cannot be undone.
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
    </Box>
  );
};

export default NightlifeDashboard;
