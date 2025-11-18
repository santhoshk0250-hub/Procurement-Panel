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
import { useNightlifeStore } from "@/store/usenightlifeStore";

// ===== Types =====
type OID = { $oid: string } | string | undefined;

// Shape your UI uses internally (unchanged)
type NightlifeDoc = {
  _id?: OID;
  name: string;
  type: string;
  hours?: string;
  estimated_duration?: string;
  desc?: string; // HTML or plain text
  price?: string;
  price_source?: string;
  thumbnail?: string;
  images?: string[];
  age_restriction?: string;
  music_type?: string[];
  amenities?: string[];
  createdAt?: { $date: string } | string;
  updatedAt?: { $date: string } | string;
};

// Actual shape coming from the API you pasted (NIGHT001–NIGHT004)
type ApiNightlifeDoc = {
  _id?: OID;
  id: string;
  title: string;
  destination: string;
  duration: number;
  price: number;
  serviceCharges?: number;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
  };
  description: string;
  extendedDescription?: string;
  category: string;
  timeSlots?: string[];
  thumbnail?: string;
  images?: string[];
  videos?: string[];
  inclusions?: string[];
  exclusions?: string[];
  operatingHours?: string;
  priceBreakdown?: {
    basePrice: number;
    serviceCharges: number;
    taxes: number;
    totalPrice: number;
  };
  createdAt?: { $date: string } | string;
  updatedAt?: { $date: string } | string;
  [key: string]: any;
};

// ===== Helpers =====
const unwrapId = (id?: OID) =>
  typeof id === "string" ? id : (id as any)?.$oid ?? "";

const mainImage = (v: NightlifeDoc) =>
  v.thumbnail ||
  (v.images?.[0] ??
    "https://images.unsplash.com/photo-1550950614-95d64d0d193e?q=80&w=1600&auto=format&fit=crop");

const stripHtml = (html?: string) =>
  (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const when = (d?: { $date: string } | string) =>
  typeof d === "string" ? d : d?.$date;

// Adapt API shape → internal NightlifeDoc shape
const adaptFromApi = (raw: ApiNightlifeDoc): NightlifeDoc => {
  const totalPrice =
    raw.priceBreakdown?.totalPrice ?? raw.price ?? undefined;

  return {
    _id: raw._id,
    name: raw.title, // title → name
    type: raw.category, // category → type
    hours: raw.operatingHours, // operatingHours → hours
    estimated_duration: raw.duration
      ? `${raw.duration} hrs`
      : undefined, // duration → estimated_duration
    desc: raw.extendedDescription || raw.description,
    price:
      typeof totalPrice === "number"
        ? `₹${totalPrice.toLocaleString("en-IN")}`
        : undefined,
    price_source: "per person",
    thumbnail: raw.thumbnail,
    images: raw.images,
    // optional extras if you want them later:
    age_restriction: undefined,
    music_type: raw.category ? [raw.category] : [],
    amenities: raw.inclusions || [],
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
};

// ===== Component =====
const NightlifeDashboard: React.FC = () => {
  const [search, setSearch] = useState("");
  const [venues, setVenues] = useState<NightlifeDoc[]>([]);
  const [selected, setSelected] = useState<NightlifeDoc | null>(null);
  const [loading, setLoading] = useState(true);

  // simple pagination (works if backend supports ?page=)
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);

  const { setData } = useNightlifeStore(); // put full record into edit-draft

  const fetchVenues = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE}nightlife-places/getall?page=${pageNum}`
      );

      // The API returns the NIGHT001–NIGHT004 shape
      const list: ApiNightlifeDoc[] =
        res.data.items || res.data.data || res.data || [];

      const totalPages = res.data.totalPages ?? res.data.pagination?.pages ?? 1;

      const mapped: NightlifeDoc[] = Array.isArray(list)
        ? list.map(adaptFromApi)
        : [];

      setVenues(mapped);
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
        v.name,
        v.type,
        v.hours,
        v.estimated_duration,
        v.price,
        v.price_source,
        v.age_restriction,
        (v.music_type || []).join(" "),
        (v.amenities || []).join(" "),
        stripHtml(v.desc),
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
    setData(v as any);
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
              const descText = stripHtml(v.desc).slice(0, 140);
              return (
                <Card key={id || v.name} sx={{ width: 340 }}>
                  <Box sx={{ position: "relative" }}>
                    <CardMedia
                      component="img"
                      image={img}
                      alt={v.name}
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
                      {!!v.price && (
                        <Chip
                          size="small"
                          color="primary"
                          icon={<LocalOffer />}
                          label={
                            v.price_source
                              ? `${v.price} — ${v.price_source}`
                              : v.price
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
                        title={v.name}
                        sx={{ maxWidth: "70%" }}
                      >
                        {v.name}
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
                      {v.hours && (
                        <Chip
                          size="small"
                          icon={<AccessTime fontSize="small" />}
                          label={v.hours}
                        />
                      )}
                      {v.age_restriction && (
                        <Chip
                          size="small"
                          icon={<BadgeIcon fontSize="small" />}
                          label={`Age ${v.age_restriction}+`}
                          color="warning"
                          variant="outlined"
                        />
                      )}
                      {v.estimated_duration && (
                        <Chip
                          size="small"
                          icon={<PlaceIcon fontSize="small" />}
                          label={v.estimated_duration}
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
                        title={stripHtml(v.desc)}
                      >
                        {descText}…
                      </Typography>
                    )}

                    <Stack direction="row" spacing={0.5} mt={1} flexWrap="wrap">
                      {(v.music_type || []).slice(0, 3).map((m, i) => (
                        <Chip
                          key={`${id}-m-${i}`}
                          size="small"
                          icon={<MusicNote fontSize="small" />}
                          label={m}
                          variant="outlined"
                        />
                      ))}
                      {Array.isArray(v.music_type) && v.music_type.length > 3 && (
                        <Chip size="small" label={`+${v.music_type.length - 3}`} />
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
            Delete <strong>{selected?.name || "this venue"}</strong>? This
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
