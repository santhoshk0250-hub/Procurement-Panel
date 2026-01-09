// app/dashboard/reviews/ReviewReelsDashboard.tsx
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
  Chip,
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
  Search as SearchIcon,
  AddCircleOutline as AddCircleOutlineIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayCircleFilled as PlayIcon,
  CalendarToday as CalendarIcon,
  Translate as TranslateIcon,
} from "@mui/icons-material";
import { useReviewStore } from "@/store/usereviewStore";

/* ================== Types (flat schema) ================== */
type MongoId = string | { $oid: string };

export type ReviewDoc = {
  _id?: MongoId;
  name: string;
  thumbnail: string; // GCS URL (signed or public)
  videoURL: string; // GCS URL (signed or public)
  description: string;
  language: string;
  createdAt?: string;
  updatedAt?: string;
};

/* ================== Helpers ================== */
const unwrapId = (id?: MongoId) => (typeof id === "string" ? id : id?.$oid ?? "");
const mainImage = (r: ReviewDoc) =>
  r.thumbnail ||
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1200&auto=format&fit=crop";

const fmtDate = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

/** Stable chip color for any language using a simple hash → palette index */
const langColor = (lang: string) => {
  const palette = ["primary", "secondary", "success", "info", "warning"] as const;
  const s = (lang || "").trim();
  if (!s) return "default";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const idx = Math.abs(h) % palette.length;
  return palette[idx];
};

/** Persist deduped, sorted list of languages to localStorage for edit/add pages */
const persistLanguagesForEdit = (list: ReviewDoc[]) => {
  const langs = Array.from(
    new Set(
      list
        .map((x) => (x.language || "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));
  try {
    localStorage.setItem("reviewLanguages", JSON.stringify(langs));
  } catch {}
};

/* ================== Component ================== */
const ReviewReelsDashboard: React.FC = () => {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<ReviewDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);

  const [selected, setSelected] = useState<ReviewDoc | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { setReview } = useReviewStore();

  const fetchReviews = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE}reelreview/fetchreview?page=${pageNum}`
      );
      const list: ReviewDoc[] = res.data?.data || res.data?.items || [];
      const totalPages = res.data?.pagination?.pages ?? 1;
      const normalized = Array.isArray(list) ? list : [];
      setItems(normalized);
      setPages(Number(totalPages) || 1);

      // Seed languages for edit/add forms based on current data
      persistLanguagesForEdit(normalized);
    } catch (e) {
      console.error("Error fetching reviews:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return items;
    return items.filter((r) => {
      const hay = [r.name, r.description, r.language].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [search, items]);

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_BASE}reelreview/reviewreels/${unwrapId(selected._id)}`
      );
      setItems((prev) => prev.filter((x) => unwrapId(x._id) !== unwrapId(selected._id)));
      setSelected(null);
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Failed to delete review");
    }
  };

  const handleEdit = (r: ReviewDoc) => {
    // Make sure latest languages are available to the edit form
    persistLanguagesForEdit(items);
    // Persist selected review into store for the edit page
    setReview(r as any);
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
          placeholder="Search by name, language, or description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: "100%", sm: 420 } }}
        />

        <Button
          href="/dashboard/review/addreview"
          component={Link as any}
          fullWidth
          sx={{ width: { xs: "100%", sm: "auto" } }}
          variant="contained"
          startIcon={<AddCircleOutlineIcon />}
          onClick={() => persistLanguagesForEdit(items)} // Seed langs for add form too
        >
          Add Review Reel
        </Button>
      </Box>

      {/* Loader / Empty / List */}
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
            Loading reviews…
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
          <Typography variant="h6">No reviews found</Typography>
          <Typography variant="body2" color="text.secondary">
            Try a different search or add a new review reel.
          </Typography>
        </Box>
      ) : (
        <>
          {/* Responsive 1/2/3-per-row using Box + flex */}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            {filtered.map((r) => {
              const id = unwrapId(r._id);
              return (
                <Box
                  key={id}
                  sx={{
                    flexGrow: 1,
                    // 100% on xs, 50% on sm, 33.333% on md+
                    flexBasis: {
                      xs: "100%",
                      sm: "calc(50% - 16px)",
                      md: "calc(33.333% - 16px)",
                    },
                    maxWidth: {
                      xs: "100%",
                      sm: "calc(50% - 16px)",
                      md: "calc(33.333% - 16px)",
                    },
                  }}
                >
                  <Card sx={{ width: "100%" }}>
                    <Box sx={{ position: "relative" }}>
                      <CardMedia
                        component="img"
                        image={mainImage(r)}
                        alt={r.name}
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
                        <Chip
                          size="small"
                          color="primary"
                          icon={<PlayIcon />}
                          label={r.name || "Untitled"}
                          sx={{
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                            maxWidth: 300,
                          }}
                        />
                      </Box>
                    </Box>

                    <CardContent sx={{ pb: 1 }}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        spacing={1}
                      >
                        <Chip
                          size="small"
                          color={langColor(r.language) as any}
                          icon={<TranslateIcon fontSize="small" />}
                          label={r.language || "—"}
                        />
                        <Stack direction="row" spacing={1} alignItems="center">
                          <CalendarIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                          <Typography variant="caption" color="text.secondary">
                            {fmtDate(r.createdAt)}
                          </Typography>
                        </Stack>
                      </Stack>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        mt={1.25}
                        noWrap
                        title={r.description}
                      >
                        {r.description || "—"}
                      </Typography>
                    </CardContent>

                    <CardActions
                      sx={{ justifyContent: "space-between", px: 2, pb: 2, pt: 0.5 }}
                    >
                      <Stack direction="row" spacing={1}>
                        <Button
                          key="edit"
                          component={Link as any}
                          href={`/dashboard/review/editreview`}
                          onClick={() => handleEdit(r)}
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
                            setSelected(r);
                            setConfirmOpen(true);
                          }}
                        >
                          Delete
                        </Button>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {r.thumbnail?.includes("storage.googleapis.com") ? "GCS" : ""}
                      </Typography>
                    </CardActions>
                  </Card>
                </Box>
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
        <DialogTitle>Delete Review</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete review <strong>{selected?.name || ""}</strong>? This action cannot be undone.
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

export default ReviewReelsDashboard;
