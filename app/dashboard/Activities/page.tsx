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
  LocalOffer,
  AccessTime,
  Route as RouteIcon,
  OndemandVideo,
  Image as ImageIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Today as TodayIcon,
  Place as PlaceIcon,
} from "@mui/icons-material";
import { useActivityStore } from "@/store/useactivityStore";

/* ================== Types (match your API) ================== */
type Surcharge = {
  mode: "single" | "range";
  startDate: string;
  endDate: string;
  surchargeAmount: number;
  surchargeType: "fixed" | "percentage";
};

type Activity = {
  _id: string;
  name: string;
  description: string; // HTML string
  destination: string;
  images: string[];
  videos: string[];
  vendorPrice: number;
  sellingPrice: number;
  taxRate: number;
  taxIncluded: boolean;
  dateSurcharges: Surcharge[];
  operatingDays: string[];
  openTime: string;
  closeTime: string;
  duration: number;
  durationType: "min" | "hrs";
  pickupLocation: string;
  dropLocation: string;
  isComplete: boolean;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse = {
  success: boolean;
  message?: string;
  data: Activity[];
  pagination?: { total: number; page: number; pages: number; limit: number };
};

/* ================== Helpers ================== */
const joinUrl = (base: string, path: string) =>
  `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;
if (!API_BASE) throw new Error("Missing NEXT_PUBLIC_API_BASE");

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1200&auto=format&fit=crop";

const toText = (html: string, max = 140) => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || "", "text/html");
    const s = doc.body.textContent || "";
    return s.length > max ? s.slice(0, max).trim() + "…" : s.trim();
  } catch {
    const s = html?.replace(/<[^>]+>/g, "") || "";
    return s.length > 140 ? s.slice(0, 140).trim() + "…" : s.trim();
  }
};

const price = (n?: number) =>
  typeof n === "number" && !Number.isNaN(n) ? `₹${n}` : "-";

/* ================== Component ================== */
const ActivitiesDashboard: React.FC = () => {
  const [search, setSearch] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);

  const [selected, setSelected] = useState<Activity | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { setActivity } = useActivityStore();

  const fetchActivities = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await axios.get<ApiResponse>(
        `${joinUrl(API_BASE, "/activity/getall")}?page=${pageNum}`
      );
      const body = res.data;
      setActivities(Array.isArray(body.data) ? body.data : []);
      setPages(Number(body.pagination?.pages ?? 1) || 1);
    } catch (e) {
      console.error("Error fetching activities:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return activities;
    return activities.filter((a) => {
      const hay = [
        a.name,
        a.destination,
        a.pickupLocation,
        a.dropLocation,
        a.operatingDays?.join(" "),
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
      // ⚠️ Adjust if your delete route differs
      await axios.delete(joinUrl(API_BASE, `/activity/delete/${selected._id}`));
      setActivities((prev) => prev.filter((x) => x._id !== selected._id));
      setSelected(null);
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Failed to delete activity");
    }
  };
    const handleEdit = (v: Activity) => {
      // Persist entire vehicle into store for edit page
      setActivity(v);
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
          placeholder="Search activities…"
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
          {/* Adjust 'Add' paths as needed */}
          <Button
            href="/dashboard/services?type=activities"
            component={Link as any}
            fullWidth
            variant="outlined"
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            Add Services
          </Button>
          <Button
            href="/dashboard/Activities/addactivities"
            component={Link as any}
            fullWidth
            variant="contained"
            sx={{ width: { xs: "100%", sm: "auto" } }}
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
              const cover = a.images?.[0] || PLACEHOLDER_IMG;
              const desc = toText(a.description);
              return (
                <Card key={a._id} sx={{ width: 360 }}>
                  <Box sx={{ position: "relative" }}>
                    <CardMedia
                      component="img"
                      image={cover}
                      alt={a.name}
                      sx={{
                        objectFit: "cover",
                        width: "100%",
                        height: 170,
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
                      <Chip
                        size="small"
                        color="primary"
                        icon={<LocalOffer />}
                        label={`${price(a.sellingPrice)} • ${a.taxIncluded ? "Tax incl." : `+${a.taxRate}%`}`}
                        sx={{ bgcolor: "primary.main", color: "primary.contrastText" }}
                      />
                    </Box>

                    <Box
                      sx={{
                        position: "absolute",
                        right: 8,
                        bottom: 8,
                        display: "flex",
                        gap: 0.5,
                      }}
                    >
                      <Chip size="small" icon={<ImageIcon />} label={a.images?.length ?? 0} />
                      <Chip size="small" icon={<OndemandVideo />} label={a.videos?.length ?? 0} />
                    </Box>
                  </Box>

                  <CardContent sx={{ pb: 1 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="h6" noWrap title={a.name}>
                        {a.name}
                      </Typography>
                      <Chip
                        size="small"
                        icon={<PlaceIcon fontSize="small" />}
                        label={a.destination || "—"}
                      />
                    </Stack>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                      title={desc}
                    >
                      {desc || "—"}
                    </Typography>

                    <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                      <Chip
                        size="small"
                        icon={<AccessTime fontSize="small" />}
                        label={`${a.duration} ${a.durationType === "min" ? "min" : "hrs"}`}
                      />
                      <Chip
                        size="small"
                        icon={<TodayIcon fontSize="small" />}
                        label={a.operatingDays?.length ? a.operatingDays.join(" • ") : "Days: —"}
                      />
                      {(a.pickupLocation || a.dropLocation) && (
                        <Chip
                          size="small"
                          icon={<RouteIcon fontSize="small" />}
                          label={`${a.pickupLocation || "—"} → ${a.dropLocation || "—"}`}
                        />
                      )}
                    </Stack>
                  </CardContent>
                  <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2, pt: 0.5 }}>
                    <Stack direction="row" spacing={1}>
                      <Button
                        key="edit"
                        component={Link as any}
                        href={`/dashboard/Activities/editactivities`}
                        onClick={() => handleEdit(a)}
                        size="small"
                      >
                        Edit
                      </Button>
                      <Button color="error" size="small" onClick={() => { setSelected(a); setConfirmOpen(true); }}>
                        Delete
                      </Button>
                    </Stack>
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
        <DialogTitle>Delete Activity</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete <strong>{selected?.name || "this activity"}</strong>? This action cannot be
            undone.
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

export default ActivitiesDashboard;
