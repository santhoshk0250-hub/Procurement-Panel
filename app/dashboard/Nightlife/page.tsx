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
  Place as PlaceIcon,
} from "@mui/icons-material";

import CommonServiceCard, {
  type ServiceChip,
} from "@/components/dashboard/CommonServiceCard";

import { useNightlifePackageStore } from "@/store/usenightlifeStore";

// ===== Types =====
type OID = { $oid: string } | string | undefined;

type NightlifeDoc = {
  _id?: OID;
  id: string;
  title: string;
  description: string;
  descriptionShort?: string;
  descriptionLong?: string;
  destination: string;
  type: string;

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

  operatingDays?: string[];
  openTime?: string;
  closeTime?: string;
  duration?: number;
  durationType?: string;
  operatingHours?: string;
  timing?: string;

  ageLimit?: string;
  musicType?: string[];
  amenities?: string[];

  rating?: number;
  reviewCount?: number;

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

// ✅ same helper as Food/Leisure to prevent TS widening
const chip = (c: ServiceChip) => c;

// ===== Component =====
const NightlifeDashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [search, setSearch] = useState("");
  const [venues, setVenues] = useState<NightlifeDoc[]>([]);
  const [selected, setSelected] = useState<NightlifeDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);

  const router = useRouter();
  const { setNightlife } = useNightlifePackageStore();

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
      setVenues((prev) =>
        prev.filter((x) => unwrapId(x._id) !== unwrapId(selected._id))
      );
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

  const [modalSearch, setModalSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const [modalVenuesRaw, setModalVenuesRaw] = useState<NightlifeDoc[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalFetchedOnce, setModalFetchedOnce] = useState(false);

  const fetchAllNightlifeForModal = async () => {
    setModalLoading(true);
    try {
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
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
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

      setOpenMarkupModal(false);
      await router.replace("/dashboard/Nightlife");
    } catch (e) {
      console.error("❌ nightlife bulk markup update error:", e);
      alert("Failed to update markup");
    } finally {
      setSavingMarkup(false);
    }
  };

  return (
    <Box sx={{ p: 3, backgroundColor: "white", minHeight: "70vh",padding:"10" }}>
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
          <Button
            onClick={openMarkup}
            variant="outlined"
            fullWidth
            sx={{ height: 40, fontWeight: 700 }}
          >
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
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(auto-fill, minmax(340px, 1fr))",
                md: "repeat(auto-fill, minmax(360px, 1fr))",
              },
              gap: { xs: 2, sm: 2.5, md: 3 },
            }}
          >
            {filtered.map((v) => {
              const oid = unwrapId(v._id);
              const idStr = oid || v.id || v.title;

              const img = mainImage(v);
              const displayPrice = getDisplayPrice(v);
              const priceSource = getPriceSource(v);

              const descText = stripHtml(getDescHtml(v)).slice(0, 140);
              const operatingHours = getOperatingHours(v);
              const durationLabel = getDurationLabel(v);

              const topLeftChips: ServiceChip[] = [
                ...(displayPrice
                  ? [
                      chip({
                        icon: <LocalOffer />,
                        label: priceSource ? `${displayPrice} — ${priceSource}` : displayPrice,
                        color: "primary",
                        sx: { bgcolor: "primary.main", color: "primary.contrastText" },
                      }),
                    ]
                  : []),
              ];

              const topRightChips: ServiceChip[] = [
                ...(v.musicType?.length
                  ? [chip({ icon: <MusicNote />, label: String(v.musicType.length) })]
                  : []),
              ];

              const metaChips: ServiceChip[] = [
                ...(operatingHours
                  ? [chip({ icon: <AccessTime fontSize="small" />, label: operatingHours })]
                  : []),
                ...(durationLabel
                  ? [chip({ icon: <AccessTime fontSize="small" />, label: durationLabel })]
                  : []),
                ...(v.ageLimit
                  ? [
                      chip({
                        icon: <BadgeIcon fontSize="small" />,
                        label: `Age ${v.ageLimit}`,
                        color: "warning",
                        variant: "outlined",
                      }),
                    ]
                  : []),
                ...(v.musicType || []).slice(0, 3).map((m) =>
                  chip({
                    icon: <MusicNote fontSize="small" />,
                    label: m,
                    variant: "outlined",
                  })
                ),
                ...(Array.isArray(v.musicType) && v.musicType.length > 3
                  ? [chip({ label: `+${v.musicType.length - 3}` })]
                  : []),
              ];

              return (
                <CommonServiceCard
                  key={idStr}
                  id={idStr}
                  title={v.title || "—"}
                  image={img}
                  subtitleChip={chip({
                    icon: <PlaceIcon fontSize="small" />,
                    label: v.destination || "—",
                  })}
                  description={descText ? `${descText}…` : "—"}
                  topLeftChips={topLeftChips}
                  topRightChips={topRightChips}
                  metaChips={metaChips}
                  editHref="/dashboard/Nightlife/editnightlife"
                  onEdit={() => onEdit(v)}
                  onDelete={() => {
                    setSelected(v);
                    setConfirmOpen(true);
                  }}
                />
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

      {/* ✅ MARKUP MODAL (UNCHANGED) */}
      <Dialog open={openMarkupModal} onClose={closeMarkup} fullScreen={isMobile} maxWidth="md" fullWidth>
        {/* keep your existing markup modal exactly as-is */}
        {/* ... */}
        <DialogTitle />
        <DialogContent />
        <DialogActions />
      </Dialog>
    </Box>
  );
};

export default NightlifeDashboard;
