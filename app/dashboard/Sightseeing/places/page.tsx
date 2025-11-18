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
  Rating,
} from "@mui/material";
import {
  Search,
  Place as PlaceIcon,
  Map as MapIcon,
  Image as ImageIcon,
  Category as CategoryIcon,
  AccessTime as AccessTimeIcon,
  AddCircleOutline,
  ContentCopy,
  Link as LinkIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import { useSightseeingPlaceStore } from "@/store/usesightseeingplace";

/* ================== Types ================== */
export type IDType = string | { $oid: string } | undefined;

export interface SightPlace {
  _id?: IDType;

  // Core
  name?: string;
  type?: string;          // beach, fort, etc.
  category?: string;      // heritage, nature, popular, etc.
  area?: string;

  // Location
  location?: {
    city?: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };

  // Hours (new + legacy support)
  hours?:
    | string
    | {
        open?: string;
        close?: string;
        note?: string;
        days?: string;
      };

  // Map URLs (new + old)
  mapUrl?: string;
  map_url?: string;

  // Duration (new + legacy)
  duration?:
    | string
    | {
        min?: number;
        max?: number;
        text?: string;
      };
  estimated_duration?: string;

  // Text fields (new + legacy)
  description?: string;
  desc?: string;
  history?: string;

  // Price (new + legacy)
  price?:
    | string
    | {
        type?: string;
        text?: string;
        source?: string;
      };
  price_source?: string;
  source_citation?: string;

  // Media / extras
  images?: string[];
  highlights?: string[];
  tips?: string[];
  bestTimeToVisit?: string;
  facilities?: string[];
  accessibility?: {
    wheelchairAccessible?: boolean;
    difficultyLevel?: string;
  };
  rating?: number;
  reviewCount?: number;
  itinerary?: Array<{
    time?: string;
    title?: string;
    description?: string;
  }>;
  nearbyPlaces?: Array<{
    name?: string;
    distance?: string;
  }>;

  [key: string]: any;
}

/* ================== Helpers ================== */
const unwrapId = (id?: IDType) =>
  typeof id === "string" ? id : (id as any)?.$oid ?? "";

const fallbackImg =
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1600&auto=format&fit=crop";

const heroImage = (p: SightPlace) =>
  p.images?.[0] ? p.images[0] : fallbackImg;

const getMapUrl = (p: SightPlace) => p.mapUrl || p.map_url || "";

const getDescription = (p: SightPlace) =>
  p.desc || p.description || p.history || "";

const getDurationText = (p: SightPlace) => {
  if (typeof p.duration === "string") return p.duration;
  if (p.duration?.text) return p.duration.text;
  return p.estimated_duration || "";
};

const getHoursText = (p: SightPlace) => {
  if (typeof p.hours === "string") return p.hours;
  if (p.hours) {
    const parts: string[] = [];
    if (p.hours.open && p.hours.close) {
      parts.push(`${p.hours.open} – ${p.hours.close}`);
    } else if (p.hours.open) {
      parts.push(p.hours.open);
    }
    if (p.hours.days) parts.push(p.hours.days);
    if (p.hours.note) parts.push(p.hours.note);
    return parts.join(" • ");
  }
  return "";
};

const getPriceText = (p: SightPlace) => {
  if (typeof p.price === "string") return p.price;
  if (p.price?.text) return p.price.text;
  return "";
};

const getLocationText = (p: SightPlace) => {
  const { city, state, country } = p.location || {};
  return [city, state, country].filter(Boolean).join(", ");
};

/* ================== Component ================== */
const SightseeingDashboard: React.FC = () => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SightPlace | null>(null);
  const [items, setItems] = useState<SightPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);
  const { setSightseeingPlace } = useSightseeingPlaceStore ();

  const fetchPlaces = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE}sightseeing-places/fetch?page=${pageNum}`
      );

      const data = res.data;
      const fetched: SightPlace[] = Array.isArray(data)
        ? data
        : data.items || data.data || [];

      const totalPages =
        data.totalPages ?? data.pagination?.pages ?? 1;

      setItems(Array.isArray(fetched) ? fetched : []);
      setPages(Number(totalPages) || 1);
    } catch (e) {
      console.error("Error fetching places:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaces(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return items;

    return items.filter((p) => {
      const hay = [
        p.name,
        p.type,
        p.category,
        p.area,
        getLocationText(p),
        getHoursText(p),
        getDurationText(p),
        getDescription(p),
        getPriceText(p),
        p.bestTimeToVisit,
        p.accessibility?.difficultyLevel,
        p.highlights?.join(" "),
        p.tips?.join(" "),
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
        `${process.env.NEXT_PUBLIC_API_BASE}sightseeing/${unwrapId(
          selected._id
        )}`
      );
      setItems((prev) =>
        prev.filter(
          (x) => unwrapId(x._id) !== unwrapId(selected._id)
        )
      );
      setSelected(null);
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Failed to delete place");
    }
  };

  const copyId = async (id?: string) => {
    try {
      if (id) await navigator.clipboard.writeText(id);
    } catch {
      // no-op if clipboard unavailable
    }
  };

  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleEdit = (p: SightPlace) => {
    setSightseeingPlace(p as any);
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
          placeholder="Search places…"
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

        {/* Mobile button */}
        <Button
          href="/dashboard/Sightseeing/places/addplaces"
          component={Link as any}
          variant="contained"
          startIcon={<AddCircleOutline />}
          fullWidth
          sx={{
            display: { xs: "inline-flex", sm: "none" },
            px: 2.25,
            py: 1.1,
            fontWeight: 600,
            textTransform: "none",
            borderRadius: 2.5,
            background:
              "linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)",
            boxShadow: "0 6px 18px rgba(25,118,210,0.25)",
            ":hover": {
              background:
                "linear-gradient(135deg, #1565C0 0%, #1E88E5 100%)",
              boxShadow: "0 8px 22px rgba(25,118,210,0.35)",
            },
          }}
        >
          Add Place
        </Button>

        {/* Desktop button */}
        <Button
          href="/dashboard/Sightseeing/places/addplaces"
          component={Link as any}
          variant="contained"
          startIcon={<AddCircleOutline />}
          sx={{
            display: { xs: "none", sm: "inline-flex" },
            px: 2.25,
            py: 1.1,
            fontWeight: 600,
            textTransform: "none",
            borderRadius: 2.5,
            background:
              "linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)",
            boxShadow: "0 6px 18px rgba(25,118,210,0.25)",
            ":hover": {
              background:
                "linear-gradient(135deg, #1565C0 0%, #1E88E5 100%)",
              boxShadow: "0 8px 22px rgba(25,118,210,0.35)",
            },
          }}
        >
          Add Place
        </Button>
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
            Loading places…
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
          <Typography variant="h6">No places found</Typography>
          <Typography variant="body2" color="text.secondary">
            Try a different search or add a new place.
          </Typography>
          <Button
            href="/dashboard/Sightseeing/places/addplaces"
            component={Link as any}
            variant="contained"
            startIcon={<AddCircleOutline />}
            sx={{
              mt: 2,
              px: 2.25,
              py: 1.1,
              fontWeight: 600,
              textTransform: "none",
              borderRadius: 2.5,
            }}
          >
            Add Your First Place
          </Button>
        </Box>
      ) : (
        <>
          {/* Cards grid */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                md: "repeat(3, minmax(0, 1fr))",
              },
              gap: 2.5,
            }}
          >
            {filtered.map((p) => {
              const id = unwrapId(p._id);
              const img = heroImage(p);
              const hoursText = getHoursText(p);
              const durationText = getDurationText(p);
              const priceText = getPriceText(p);
              const mapHref = getMapUrl(p);
              const description = getDescription(p);
              const locationText = getLocationText(p);

              return (
                <Card
                  key={id || p.name || Math.random()}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: 3,
                    overflow: "hidden",
                    boxShadow:
                      "0 8px 24px rgba(15,23,42,0.08)",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      transform: "translateY(-3px)",
                      boxShadow:
                        "0 14px 32px rgba(15,23,42,0.16)",
                    },
                  }}
                >
                  <Box sx={{ position: "relative" }}>
                    <CardMedia
                      component="img"
                      image={img}
                      alt={p.name || "Place"}
                      sx={{
                        objectFit: "cover",
                        width: "100%",
                        height: 180,
                      }}
                    />

                    {/* top-left chips */}
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
                      {p.type && (
                        <Chip
                          size="small"
                          color="primary"
                          icon={<CategoryIcon />}
                          label={p.type}
                          sx={{ bgcolor: "primary.main" }}
                        />
                      )}
                      {p.category && (
                        <Chip
                          size="small"
                          color="default"
                          label={p.category}
                          sx={{
                            bgcolor:
                              "rgba(15,23,42,0.7)",
                            color: "common.white",
                          }}
                        />
                      )}
                    </Box>

                    {/* rating badge */}
                    {typeof p.rating === "number" && (
                      <Box
                        sx={{
                          position: "absolute",
                          right: 8,
                          bottom: 8,
                          bgcolor: "rgba(0,0,0,0.7)",
                          borderRadius: 999,
                          px: 1.2,
                          py: 0.4,
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                        }}
                      >
                        <Rating
                          value={p.rating}
                          precision={0.1}
                          readOnly
                          size="small"
                        />
                        <Typography
                          variant="caption"
                          color="common.white"
                          sx={{ fontWeight: 600 }}
                        >
                          {p.rating.toFixed(1)}
                          {p.reviewCount
                            ? ` · ${p.reviewCount.toLocaleString()}`
                            : ""}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  <CardContent sx={{ pb: 1.5, flexGrow: 1 }}>
                    {/* Title + id copy */}
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="h6"
                          noWrap
                          title={p.name || "Place"}
                        >
                          {p.name || "—"}
                        </Typography>
                        {locationText && (
                          <Stack
                            direction="row"
                            spacing={0.5}
                            alignItems="center"
                            mt={0.3}
                          >
                            <PlaceIcon
                              sx={{
                                fontSize: 15,
                                color: "text.secondary",
                              }}
                            />
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              noWrap
                            >
                              {locationText}
                            </Typography>
                          </Stack>
                        )}
                      </Box>

                      <Tooltip title="Copy _id">
                        <IconButton
                          size="small"
                          onClick={() => copyId(id)}
                          sx={{ ml: 0.5 }}
                        >
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>

                    {/* Meta chips */}
                    <Stack
                      direction="row"
                      spacing={1}
                      mt={1}
                      flexWrap="wrap"
                      rowGap={0.75}
                    >
                      {hoursText && (
                        <Chip
                          size="small"
                          icon={
                            <AccessTimeIcon
                              sx={{ fontSize: 16 }}
                            />
                          }
                          label={hoursText}
                          variant="outlined"
                        />
                      )}
                      {durationText && (
                        <Chip
                          size="small"
                          icon={
                            <AccessTimeIcon
                              sx={{ fontSize: 16 }}
                            />
                          }
                          label={`Duration: ${durationText}`}
                          variant="outlined"
                        />
                      )}
                      {priceText && (
                        <Chip
                          size="small"
                          icon={
                            <ImageIcon
                              sx={{ fontSize: 16 }}
                            />
                          }
                          label={priceText}
                          variant="outlined"
                        />
                      )}
                      {p.bestTimeToVisit && (
                        <Chip
                          size="small"
                          label={p.bestTimeToVisit}
                          variant="outlined"
                        />
                      )}
                      {p.accessibility?.difficultyLevel && (
                        <Chip
                          size="small"
                          label={`Difficulty: ${p.accessibility.difficultyLevel}`}
                          variant="outlined"
                        />
                      )}
                    </Stack>

                    {/* Highlights (few only) */}
                    {p.highlights && p.highlights.length > 0 && (
                      <Stack
                        direction="row"
                        spacing={0.75}
                        mt={1}
                        flexWrap="wrap"
                        rowGap={0.75}
                      >
                        {p.highlights
                          .slice(0, 3)
                          .map((h, idx) => (
                            <Chip
                              key={idx}
                              size="small"
                              label={h}
                              variant="filled"
                              sx={{
                                bgcolor:
                                  "rgba(25,118,210,0.06)",
                              }}
                            />
                          ))}
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
                        key="edit"
                        component={Link as any}
                        href={`/dashboard/Sightseeing/places/editplaces`}
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

                    {mapHref ? (
                      <Tooltip title="Open in Google Maps">
                        <IconButton
                          href={mapHref}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MapIcon />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        &nbsp;
                      </Typography>
                    )}
                  </CardActions>
                </Card>
              );
            })}
          </Box>

          <Box
            sx={{ display: "flex", justifyContent: "center", mt: 4 }}
          >
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
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
      >
        <DialogTitle>Delete Place</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete{" "}
            <strong>{selected?.name || "this place"}</strong>? This
            action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmOpen(false)}
            color="inherit"
          >
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

export default SightseeingDashboard;
