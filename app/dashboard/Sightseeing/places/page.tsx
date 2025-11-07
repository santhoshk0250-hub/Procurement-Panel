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
import { usePlaceStore } from "@/store/usesightseeingplace";

/* ================== Types ================== */
export type IDType = string | { $oid: string } | undefined;

export interface SightPlace {
  _id?: IDType;
  name?: string;
  type?: string; // beach, fort, etc. (dynamic allowed)
  area?: string;
  hours?: string;
  map_url?: string;
  estimated_duration?: string;
  desc?: string;
  price?: string;
  price_source?: string;
  source_citation?: string;
  images?: string[]; // array of URLs
  [key: string]: any; // dynamic
}

/* ================== Helpers ================== */
const unwrapId = (id?: IDType) => (typeof id === "string" ? id : (id as any)?.$oid ?? "");

const fallbackImg =
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1600&auto=format&fit=crop";

const heroImage = (p: SightPlace) => (p.images?.[0] ? p.images[0] : fallbackImg);

/* ================== Component ================== */
const SightseeingDashboard: React.FC = () => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SightPlace | null>(null);
  const [items, setItems] = useState<SightPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);
  const { setPlace } = usePlaceStore();

  const fetchPlaces = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE}sightseeing/fetch?page=${pageNum}`);
      const fetched: SightPlace[] = res.data.items || res.data.data || [];
      const totalPages = res.data.totalPages ?? res.data.pagination?.pages ?? 1;
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
        p.area,
        p.hours,
        p.estimated_duration,
        p.desc,
        p.price,
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
      await axios.delete(`${process.env.NEXT_PUBLIC_API_BASE}sightseeing/${unwrapId(selected._id)}`);
      setItems((prev) => prev.filter((x) => unwrapId(x._id) !== unwrapId(selected._id)));
      setSelected(null);
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Failed to delete place");
    }
  };

  const copyId = async (id?: string) => {
    try {
      if (id) await navigator.clipboard.writeText(id);
    } catch {}

    /* no-op if clipboard unavailable */
  };

  /* ------- Delete dialog ------- */
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleEdit = (p: SightPlace) => {
    setPlace(p as any);
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

        {/* Mobile button (below search) */}
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
            background: "linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)",
            boxShadow: "0 6px 18px rgba(25,118,210,0.25)",
            ":hover": {
              background: "linear-gradient(135deg, #1565C0 0%, #1E88E5 100%)",
              boxShadow: "0 8px 22px rgba(25,118,210,0.35)",
            },
          }}
        >
          Add Place
        </Button>

        {/* Desktop button (right side) */}
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
            background: "linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)",
            boxShadow: "0 6px 18px rgba(25,118,210,0.25)",
            ":hover": {
              background: "linear-gradient(135deg, #1565C0 0%, #1E88E5 100%)",
              boxShadow: "0 8px 22px rgba(25,118,210,0.35)",
            },
          }}
        >
          Add Place
        </Button>
      </Box>

      {/* Loader / Empty */}
      {loading ? (
        <Box sx={{ minHeight: "50vh", display: "grid", placeItems: "center", textAlign: "center", gap: 2 }}>
          <CircularProgress size={50} />
          <Typography variant="body1" color="text.secondary">Loading places…</Typography>
        </Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ minHeight: "40vh", display: "grid", placeItems: "center", textAlign: "center", gap: 1 }}>
          <Typography variant="h6">No places found</Typography>
          <Typography variant="body2" color="text.secondary">Try a different search or add a new place.</Typography>
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
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {filtered.map((p) => {
              const id = unwrapId(p._id);
              const img = heroImage(p);
              return (
                <Card key={id || p.name || Math.random()} sx={{ width: 340 }}>
                  <Box sx={{ position: "relative" }}>
                    <CardMedia
                      component="img"
                      image={img}
                      alt={p.name || "Place"}
                      sx={{ objectFit: "cover", width: "100%", height: 160, borderRadius: 1 }}
                    />

                    <Box sx={{ position: "absolute", left: 8, top: 8, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                      {p.type && (
                        <Chip size="small" color="primary" icon={<CategoryIcon />} label={p.type} />
                      )}
                      {p.area && (
                        <Chip size="small" color="default" icon={<PlaceIcon />} label={p.area} />
                      )}
                    </Box>
                  </Box>

                  <CardContent sx={{ pb: 1 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="h6" noWrap title={p.name || "Place"}>
                        {p.name || "—"}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Tooltip title="Copy _id">
                          <IconButton size="small" onClick={() => copyId(id)} sx={{ mr: -0.5 }}>
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>

                    <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                      {p.hours && (
                        <Chip size="small" icon={<AccessTimeIcon fontSize="small" />} label={p.hours} />)
                      }
                      {p.estimated_duration && (
                        <Chip size="small" icon={<AccessTimeIcon fontSize="small" />} label={`~ ${p.estimated_duration}`} />
                      )}
                      {p.price && (
                        <Chip size="small" icon={<ImageIcon fontSize="small" />} label={p.price} />
                      )}
                    </Stack>

                    {p.desc && (
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
                      >
                        {p.desc}
                      </Typography>
                    )}
                  </CardContent>

                  <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2, pt: 0.5 }}>
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
                        onClick={() => { setSelected(p); setConfirmOpen(true); }}
                      >
                        Delete
                      </Button>
                    </Stack>

                    {p.map_url ? (
                      <Tooltip title="Open Google Maps">
                        <IconButton href={p.map_url} target="_blank" rel="noopener noreferrer">
                          <MapIcon />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="text.secondary">&nbsp;</Typography>
                    )}
                  </CardActions>
                </Card>
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
        <DialogTitle>Delete Place</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete <strong>{selected?.name || "this place"}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="inherit">Cancel</Button>
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
