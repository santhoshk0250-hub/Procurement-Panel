"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  Timelapse,
  Place,
  AddCircleOutline,
  Collections,
  Movie,
  CheckCircle,
} from "@mui/icons-material";

import { useLeisureActivityStore } from "@/store/leisureActivityStore";
import type { LeisureActivity, IDType } from "@/store/leisureActivityStore";

/* ================== Config ================== */
// Prefer NEXT_PUBLIC_API_BASE if you have one; fallback to the full URL you shared.
const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE
    ? `${process.env.NEXT_PUBLIC_API_BASE}leisure-activities`
    : "https://tick-your-tour-base-server-103963826136.us-central1.run.app/leisure-activities");

/* ================== Helpers ================== */
const unwrapId = (id?: IDType) =>
  typeof id === "string" ? id : id && typeof id === "object" ? (id as any).$oid ?? "" : "";

const firstImage = (a: any) =>
  a?.thumbnailUrl ||
  (Array.isArray(a?.images) && a.images[0]) ||
  "https://via.placeholder.com/600x360?text=No+Image";

const rupee = (n?: number | null) =>
  typeof n === "number" && !Number.isNaN(n) ? `₹${n}` : "—";

const timeRange = (a: LeisureActivity) =>
  a.openTime && a.closeTime ? `${a.openTime} – ${a.closeTime}` : a.openTime || a.closeTime || "—";

const durationText = (a: LeisureActivity) => {
  const d = a.duration ?? "";
  if (d === "" || d == null) return "—";
  return `${d} ${a.durationType === "min" ? "min" : "hrs"}`;
};

const daysText = (a: LeisureActivity) =>
  Array.isArray(a.operatingDays) && a.operatingDays.length
    ? a.operatingDays.join(", ")
    : "—";

/** Normalize API item into our LeisureActivity shape safely */
const fromApi = (api: any): LeisureActivity => ({
  _id: api._id ?? api.id ?? api._id?.$oid,
  name: api.name ?? "",
  description: api.description ?? "",
  destination: api.destination ?? "",

  thumbnailUrl: api.coverImage ?? api.thumbnailUrl ?? null,
  images: Array.isArray(api.images) ? api.images : [],
  videos: Array.isArray(api.videos) ? api.videos : [],

  vendorPrice: api.vendorPrice != null ? Number(api.vendorPrice) : null,
  sellingPrice: api.sellingPrice != null ? Number(api.sellingPrice) : null,
  taxRate: api.taxRate != null ? Number(api.taxRate) : null,
  taxIncluded: Boolean(api.taxIncluded),

  operatingDays: Array.isArray(api.operatingDays) ? api.operatingDays : [],
  openTime: api.openTime ?? "",
  closeTime: api.closeTime ?? "",
  duration: api.duration != null ? Number(api.duration) : "",
  durationType: api.durationType === "min" ? "min" : "hrs",

  pickupLocation: api.pickupLocation ?? "",
  dropLocation: api.dropLocation ?? "",

  rating: api.rating != null ? Number(api.rating) : undefined,
  isComplete: api.isComplete != null ? Boolean(api.isComplete) : true,

  dateSurcharges: Array.isArray(api.dateSurcharges) ? api.dateSurcharges : [],
});

/* ================== Component ================== */
const LeisureActivityDashboard: React.FC = () => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<LeisureActivity | null>(null);
  const [activities, setActivities] = useState<LeisureActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { setActivity } = useLeisureActivityStore();

  const fetchActivities = async (pageNum: number) => {
    setLoading(true);
    try {
      const url = `${API_BASE}?page=${pageNum}`;
      const res = await fetch(url, {
        // If your API is protected, add:
        // headers: { Authorization: `Bearer ${token}` }
        cache: "no-store",
      });

      // If the API returns non-OK, surface the reason
      if (!res.ok) {
        const errTxt = await res.text();
        throw new Error(errTxt || `HTTP ${res.status}`);
      }

      // Try to decode to JSON
      const bodyText = await res.text();
      let data: any = [];
      try {
        data = JSON.parse(bodyText);
      } catch {
        // If backend ever returns plain string/HTML by mistake
        data = [];
      }

      // Support multiple shapes:
      // - { items: [...], totalPages: N }
      // - { data: [...], totalPages: N }
      // - [ ... ] (bare array)
      const list =
        Array.isArray(data) ? data :
        Array.isArray(data.items) ? data.items :
        Array.isArray(data.data) ? data.data :
        [];

      const totalPages =
        Number(data?.totalPages ?? data?.pagination?.pages ?? 1) || 1;

      setActivities(list.map(fromApi));
      setPages(totalPages);
    } catch (e) {
      console.error("Error fetching activities:", e);
      setActivities([]);
      setPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchActivities(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return activities;
    return activities.filter((a) => {
      const hay = [
        a.name,
        a.destination,
        a.description,
        a.pickupLocation,
        a.dropLocation,
        (a.operatingDays || []).join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [search, activities]);

  const handleDelete = async () => {
    if (!selected) return;
    try {
      const id = unwrapId(selected._id);
      await fetch(`${API_BASE}/${encodeURIComponent(id)}`, { method: "DELETE" });
      setActivities((prev) => prev.filter((x) => unwrapId(x._id) !== id));
      setSelected(null);
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Failed to delete activity");
    }
  };

  const copyId = async (id?: string) => {
    try { if (id) await navigator.clipboard.writeText(id); } catch {}
  };

  const handleEdit = (a: LeisureActivity) => {
    setActivity(a); // so the edit page can prefill instantly
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
          placeholder="Search leisure activities…"
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
      href="/dashboard/services?type=leisure-activities"   // <-- adjust path if needed
      component={Link as any}
      fullWidth
      variant="outlined"
      startIcon={<AddCircleOutline />}
      sx={{ width: { xs: "100%", sm: "auto" } }}
    >
      Add Services
    </Button>

     <Button
          href="/dashboard/leisure-activity/add-leisure-activity"
          component={Link as any}
          fullWidth
          sx={{ width: { xs: "100%", sm: "auto" } }}
          variant="contained"
          startIcon={<AddCircleOutline />}
        >
          Add Activity
        </Button>
  </Box>
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
            Loading activities…
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
          <Typography variant="h6">No activities found</Typography>
          <Typography variant="body2" color="text.secondary">
            Try a different search or add a new activity.
          </Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {filtered.map((a) => {
              const id = unwrapId(a._id);
              const image = firstImage(a);
              const price = a.sellingPrice ?? a.vendorPrice ?? null;
              const imagesCount = Array.isArray(a.images) ? a.images.length : 0;
              const videosCount = Array.isArray(a.videos) ? a.videos.length : 0;

              return (
                <Card key={id || a.name || Math.random()} sx={{ width: 340 }}>
                  <Box sx={{ position: "relative" }}>
                    <CardMedia
                      component="img"
                      image={image}
                      alt={a.name || "Activity"}
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
                      {!!price && (
                        <Chip
                          size="small"
                          color="primary"
                          icon={<LocalOffer />}
                          label={`${rupee(price)}`}
                          sx={{ bgcolor: "primary.main", color: "primary.contrastText" }}
                        />
                      )}
                      {a.taxIncluded && (
                        <Chip
                          size="small"
                          icon={<CheckCircle />}
                          label="Tax incl."
                          sx={{ bgcolor: "success.main", color: "success.contrastText" }}
                        />
                      )}
                    </Box>
                  </Box>

                  <CardContent sx={{ pb: 1 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="h6" noWrap title={a.name || "Activity"}>
                        {a.name || "Untitled Activity"}
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                      <Tooltip title="Copy ID">
                        <IconButton size="small" onClick={() => copyId(id)} sx={{ mr: -0.5 }}>
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Typography variant="body2" fontWeight={600}>
                        {id ? String(id).slice(0, 8) + "…" : "—"}
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                      <Chip
                        size="small"
                        icon={<Place fontSize="small" />}
                        label={a.destination || "—"}
                      />
                      <Chip
                        size="small"
                        icon={<AccessTime fontSize="small" />}
                        label={timeRange(a)}
                      />
                      <Chip
                        size="small"
                        icon={<Timelapse fontSize="small" />}
                        label={`Duration: ${durationText(a)}`}
                      />
                    </Stack>

                    <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                      {!!a.pickupLocation && (
                        <Chip size="small" icon={<Place fontSize="small" />} label={`Pickup: ${a.pickupLocation}`} />
                      )}
                      {!!a.dropLocation && (
                        <Chip size="small" icon={<Place fontSize="small" />} label={`Drop: ${a.dropLocation}`} />
                      )}
                    </Stack>

                    <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                      <Chip size="small" label={`Days: ${daysText(a)}`} />
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2, pt: 0.5 }}>
                    <Stack direction="row" spacing={1}>
                      <Button
                        key="view"
                        component={Link as any}
                        href={`/dashboard/leisure-activity/edit-leisure-activity/${id}`}
                        onClick={() => handleEdit(a)}
                        size="small"
                      >
                        View
                      </Button>
                      <Button
                        key="edit"
                        component={Link as any}
                        href={`/dashboard/leisure-activity/edit-leisure-activity/${id}`}
                        onClick={() => handleEdit(a)}
                        size="small"
                      >
                        Edit
                      </Button>
                      <Button
                        color="error"
                        size="small"
                        onClick={() => { setSelected(a); setConfirmOpen(true); }}
                      >
                        Delete
                      </Button>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip size="small" icon={<Collections />} label={`${imagesCount} images`} />
                      <Chip size="small" icon={<Movie />} label={`${videosCount} videos`} />
                    </Stack>
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
        <DialogTitle>Delete Activity</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete{" "}
            <strong>{selected?.name || "this activity"}</strong>? This action cannot be undone.
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

export default LeisureActivityDashboard;