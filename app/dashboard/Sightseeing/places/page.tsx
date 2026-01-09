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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Pagination,
} from "@mui/material";
import {
  Search,
  Place as PlaceIcon,
  Category as CategoryIcon,
  AccessTime as AccessTimeIcon,
  AddCircleOutline,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Star as StarIcon,
} from "@mui/icons-material";

import CommonServiceCard, {
  type ServiceChip,
} from "@/components/dashboard/CommonServiceCard";

import { useSightseeingPlaceStore } from "@/store/usesightseeingplace";

/* ================== Types ================== */
export type IDType = string | { $oid: string } | undefined;

export interface SightPlace {
  _id?: IDType;

  name?: string;
  type?: string;
  category?: string;
  area?: string;

  location?: {
    city?: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };

  hours?:
    | string
    | {
        open?: string;
        close?: string;
        note?: string;
        days?: string;
      };

  mapUrl?: string;
  map_url?: string;

  duration?:
    | string
    | {
        min?: number;
        max?: number;
        text?: string;
      };
  estimated_duration?: string;

  description?: string;
  desc?: string;
  history?: string;

  price?:
    | string
    | {
        type?: string;
        text?: string;
        source?: string;
      };
  price_source?: string;
  source_citation?: string;

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

  [key: string]: any;
}

/* ================== Helpers ================== */
const unwrapId = (id?: IDType) =>
  typeof id === "string" ? id : (id as any)?.$oid ?? "";

const fallbackImg =
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1600&auto=format&fit=crop";

const heroImage = (p: SightPlace) => (p.images?.[0] ? p.images[0] : fallbackImg);

const getDescription = (p: SightPlace) => p.desc || p.description || p.history || "";

const getDurationText = (p: SightPlace) => {
  if (typeof p.duration === "string") return p.duration;
  if (p.duration?.text) return p.duration.text;
  return p.estimated_duration || "";
};

const getHoursText = (p: SightPlace) => {
  if (typeof p.hours === "string") return p.hours;
  if (p.hours) {
    const parts: string[] = [];
    if (p.hours.open && p.hours.close) parts.push(`${p.hours.open} – ${p.hours.close}`);
    else if (p.hours.open) parts.push(p.hours.open);
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

// ✅ prevents TS widening (color becomes literal union instead of string)
const chip = (c: ServiceChip) => c;

/* ================== Component ================== */
const SightseeingDashboard: React.FC = () => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SightPlace | null>(null);
  const [items, setItems] = useState<SightPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);

  const { setSightseeingPlace } = useSightseeingPlaceStore();

  const fetchPlaces = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE}sightseeing-places/fetch?page=${pageNum}`
      );

      const data = res.data;
      const fetched: SightPlace[] = Array.isArray(data) ? data : data.items || data.data || [];
      const totalPages = data.totalPages ?? data.pagination?.pages ?? 1;

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
        `${process.env.NEXT_PUBLIC_API_BASE}sightseeing-places/delete/${unwrapId(selected._id)}`
      );
      setItems((prev) => prev.filter((x) => unwrapId(x._id) !== unwrapId(selected._id)));
      setSelected(null);
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Failed to delete place");
    }
  };

  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleEdit = (p: SightPlace) => {
    setSightseeingPlace(p as any);
  };

  return (
    <Box sx={{ backgroundColor: "white", minHeight: "70vh",padding:"10" }}>
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

        <Button
          href="/dashboard/Sightseeing/places/addplaces"
          component={Link as any}
          variant="contained"
          startIcon={<AddCircleOutline />}
          sx={{ height: 40, fontWeight: 700 }}
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
            sx={{ mt: 2, height: 40, fontWeight: 700 }}
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
              const id = unwrapId(p._id) || p.name || "";
              const img = heroImage(p);

              const hoursText = getHoursText(p);
              const durationText = getDurationText(p);
              const priceText = getPriceText(p);
              const locationText = getLocationText(p);

              const desc = (getDescription(p) || "").trim();
              const descShort = desc.length > 140 ? `${desc.slice(0, 140).trim()}…` : desc || "—";

              const topLeftChips: ServiceChip[] = [
                ...(p.type
                  ? [
                      chip({
                        icon: <CategoryIcon fontSize="small" />,
                        label: p.type,
                        color: "primary",
                        sx: { bgcolor: "primary.main", color: "primary.contrastText" },
                      }),
                    ]
                  : []),
                ...(p.category
                  ? [
                      chip({
                        label: p.category,
                      }),
                    ]
                  : []),
                ...(typeof p.rating === "number"
                  ? [
                      chip({
                        icon: <StarIcon fontSize="small" />,
                        label: `${p.rating.toFixed(1)}${
                          p.reviewCount ? ` (${p.reviewCount.toLocaleString()})` : ""
                        }`,
                      }),
                    ]
                  : []),
              ];

              const subtitleChip: ServiceChip = chip({
                icon: <PlaceIcon fontSize="small" />,
                label: locationText || "—",
              });

              const metaChips: ServiceChip[] = [
                ...(hoursText
                  ? [
                      chip({
                        icon: <AccessTimeIcon fontSize="small" />,
                        label: hoursText,
                        variant: "outlined",
                      }),
                    ]
                  : []),
                ...(durationText
                  ? [
                      chip({
                        icon: <AccessTimeIcon fontSize="small" />,
                        label: `Duration: ${durationText}`,
                        variant: "outlined",
                      }),
                    ]
                  : []),
                ...(priceText
                  ? [
                      chip({
                        icon: <MapIconShim />,
                        label: priceText,
                        variant: "outlined",
                      }),
                    ]
                  : []),
                ...(p.bestTimeToVisit
                  ? [
                      chip({
                        label: p.bestTimeToVisit,
                        variant: "outlined",
                      }),
                    ]
                  : []),
                ...(p.accessibility?.difficultyLevel
                  ? [
                      chip({
                        label: `Difficulty: ${p.accessibility.difficultyLevel}`,
                        variant: "outlined",
                      }),
                    ]
                  : []),
              ];

              return (
                <CommonServiceCard
                  key={id}
                  id={id}
                  title={p.name || "—"}
                  image={img}
                  subtitleChip={subtitleChip}
                  description={descShort}
                  topLeftChips={topLeftChips}
                  topRightChips={[]}
                  metaChips={metaChips}
                  editHref="/dashboard/Sightseeing/places/editplaces"
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
        <DialogTitle>Delete Place</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete <strong>{selected?.name || "this place"}</strong>? This action cannot be undone.
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

export default SightseeingDashboard;

/**
 * ✅ Small shim icon so we don't import extra icons just for one chip.
 * Replace with any icon you prefer (e.g. LocalOffer, Paid, etc).
 */
function MapIconShim() {
  return <span style={{ display: "inline-block", width: 10 }} />;
}
