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
  Chip,
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
  LocalOffer,
  AccessTime,
  Route as RouteIcon,
  OndemandVideo,
  Image as ImageIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Today as TodayIcon,
  Place as PlaceIcon,
  Star as StarIcon,
  AddCircleOutline,
} from "@mui/icons-material";
import { useActivityStore, Activity } from "@/store/useactivityStore";

/* ================== Types (match your API) ================== */
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

// Normalize Mongo-style _id into a plain string for React key & API calls
const getIdString = (id: Activity["_id"]): string | undefined => {
  if (!id) return undefined;
  return typeof id === "string" ? id : id.$oid;
};

// ✅ category normalizer (string | string[] -> string[])
const normalizeCategories = (a: any): string[] => {
  const c = a?.category;
  if (!c) return [];
  if (Array.isArray(c)) return c.filter(Boolean).map(String);
  return [String(c)];
};

/* ================== Component ================== */
const ActivitiesDashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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
    return activities.filter((a: any) => {
      const hay = [
        a.title || a.name,
        a.destination,
        normalizeCategories(a).join(" "),
        a.location?.address,
        a.location?.city,
        a.location?.state,
        a.location?.country,
        a.pickupAreas?.join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [search, activities]);

  const handleDelete = async () => {
    if (!selected) return;

    const selectedId = getIdString(selected._id);
    if (!selectedId) {
      console.error("Cannot delete activity without a valid _id");
      return;
    }

    try {
      await axios.delete(joinUrl(API_BASE, `/activity/delete/${selectedId}`));
      setActivities((prev) =>
        prev.filter((x) => getIdString(x._id) !== selectedId)
      );
      setSelected(null);
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Failed to delete activity");
    }
  };

  const handleEdit = (v: Activity) => {
    setActivity(v);
  };

  // =========================
  // ✅ MARKUP MODAL (GET ALL NO PAGINATION)
  // ✅ Filter based on CATEGORY
  // =========================
  const [openMarkupModal, setOpenMarkupModal] = useState(false);
  const [markupStep, setMarkupStep] = useState<0 | 1>(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [markupMinPrice, setMarkupMinPrice] = useState<number | "">("");
  const [markupMaxPrice, setMarkupMaxPrice] = useState<number | "">("");
  const [savingMarkup, setSavingMarkup] = useState(false);
  const router = useRouter();

  // modal filters
  const [modalSearch, setModalSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  // modal list (ALL activities)
  const [modalActivitiesRaw, setModalActivitiesRaw] = useState<Activity[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalFetchedOnce, setModalFetchedOnce] = useState(false);

  const fetchAllActivitiesForModal = async () => {
    setModalLoading(true);
    try {
      const res = await axios.get<{ success: boolean; data: Activity[] }>(
        `${joinUrl(API_BASE, "/activity/getallwithoutpagination")}`
      );
      const list: Activity[] =
        (res.data as any).data ||
        (res.data as any).items ||
        (res.data as any) ||
        [];
      setModalActivitiesRaw(Array.isArray(list) ? list : []);
      setModalFetchedOnce(true);
    } catch (e) {
      console.error("Error fetching all activities for modal:", e);
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
    setCategoryFilter("");
    setOpenMarkupModal(true);

    if (!modalFetchedOnce) {
      await fetchAllActivitiesForModal();
    }
  };

  const closeMarkup = () => setOpenMarkupModal(false);

  // ✅ build category options from ALL activities
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    modalActivitiesRaw.forEach((a: any) => {
      normalizeCategories(a).forEach((c) => set.add(c));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [modalActivitiesRaw]);

  const modalActivities = useMemo(() => {
    const term = modalSearch.trim().toLowerCase();

    const bySearch = !term
      ? modalActivitiesRaw
      : (modalActivitiesRaw as any[]).filter((a: any) => {
          const hay = [
            a.title || a.name,
            a.destination,
            normalizeCategories(a).join(" "),
            a.location?.address,
            a.location?.city,
            a.location?.state,
            a.location?.country,
            a.pickupAreas?.join(" "),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return hay.includes(term);
        });

    const byCategory = categoryFilter
      ? (bySearch as any[]).filter((a: any) =>
          normalizeCategories(a).includes(categoryFilter)
        )
      : bySearch;

    return byCategory as any;
  }, [modalActivitiesRaw, modalSearch, categoryFilter]);

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
      await axios.put(`${joinUrl(API_BASE, "/activity/bulk-markup")}`, {
        activityIds: selectedIds,
        markupMinPrice: min,
        markupMaxPrice: max,
      });

      // optimistic update: current page list
      setActivities((prev: any) =>
        prev.map((a: any) => {
          const aid = getIdString(a._id) || a.name;
          if (!selectedIds.includes(aid)) return a;
          return {
            ...a,
            ...(min !== undefined ? { markupMinPrice: min } : {}),
            ...(max !== undefined ? { markupMaxPrice: max } : {}),
          };
        })
      );

      // optimistic update: modal list
      setModalActivitiesRaw((prev: any) =>
        prev.map((a: any) => {
          const aid = getIdString(a._id) || a.name;
          if (!selectedIds.includes(aid)) return a;
          return {
            ...a,
            ...(min !== undefined ? { markupMinPrice: min } : {}),
            ...(max !== undefined ? { markupMaxPrice: max } : {}),
          };
        })
      );

      setOpenMarkupModal(false);
      
     await router.push("/dashboard/Activities");
    } catch (e) {
      console.error("❌ activity bulk markup update error:", e);
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
            href="/dashboard/services?type=activities"
            component={Link as any}
            fullWidth
            variant="outlined"
            sx={{ height: 40, fontWeight: 700 }}
          >
            Add Services
          </Button>

          <Button
            href="/dashboard/Activities/addactivities"
            component={Link as any}
            fullWidth
            variant="contained"
            sx={{ height: 40, fontWeight: 700 }}
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
            {filtered.map((a: any) => {
              const idStr = getIdString(a._id) ?? a.name;
              const cover =
                a.thumbnail || a.images?.[0] || PLACEHOLDER_IMG;
              const desc = toText(a.description);
              const finalPrice =
                a.priceBreakdown?.totalPrice ??
                a.price ??
                a.priceBreakdown?.basePrice;

              const pickupLabel =
                a.pickupAreas && a.pickupAreas.length
                  ? `Pickup: ${a.pickupAreas.join(" • ")}`
                  : a.pickupType
                  ? `Pickup: ${a.pickupType}`
                  : "";

              return (
                <Card key={idStr} sx={{ width: 360 }}>
                  <Box sx={{ position: "relative" }}>
                    <CardMedia
                      component="img"
                      image={cover}
                      alt={a.title || a.name}
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
                        flexDirection: "column",
                        gap: 0.5,
                        flexWrap: "wrap",
                      }}
                    >
                      <Chip
                        size="small"
                        color="primary"
                        icon={<LocalOffer />}
                        label={price(finalPrice)}
                        sx={{
                          bgcolor: "primary.main",
                          color: "primary.contrastText",
                        }}
                      />
                      {typeof a.rating === "number" && (
                        <Chip
                          size="small"
                          icon={<StarIcon fontSize="small" />}
                          label={`${a.rating} (${a.reviewCount ?? 0})`}
                        />
                      )}
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
                      <Chip
                        size="small"
                        icon={<ImageIcon />}
                        label={a.images?.length ?? 0}
                      />
                      <Chip
                        size="small"
                        icon={<OndemandVideo />}
                        label={a.videos?.length ?? 0}
                      />
                    </Box>
                  </Box>

                  <CardContent sx={{ pb: 1 }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Typography variant="h6" noWrap title={a.title || a.name}>
                        {a.title || a.name}
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
                        label={`${a.duration} ${
                          a.durationType === "min" ? "min" : "hrs"
                        }`}
                      />

                      <Chip
                        size="small"
                        icon={<TodayIcon fontSize="small" />}
                        label={
                          a.operatingHours
                            ? a.operatingHours
                            : a.bestTimeToVisit || "Timing: —"
                        }
                      />

                      {pickupLabel && (
                        <Chip
                          size="small"
                          icon={<RouteIcon fontSize="small" />}
                          label={pickupLabel}
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
                    <Stack direction="row" spacing={1}>
                      <Button
                        component={Link as any}
                        href={`/dashboard/Activities/editactivities`}
                        onClick={() => handleEdit(a)}
                        size="small"
                        startIcon={<EditIcon fontSize="small" />}
                      >
                        Edit
                      </Button>
                      <Button
                        color="error"
                        size="small"
                        startIcon={<DeleteIcon fontSize="small" />}
                        onClick={() => {
                          setSelected(a);
                          setConfirmOpen(true);
                        }}
                      >
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
            Delete{" "}
            <strong>
              {selected?.title || selected?.name || "this activity"}
            </strong>
            ? This action cannot be undone.
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

      {/* ✅ MARKUP MODAL (CATEGORY FILTER) */}
      <Dialog
        open={openMarkupModal}
        onClose={closeMarkup}
        fullScreen={isMobile}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Select Activities
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Filter by category and continue.
              </Typography>
            </Box>

            <Chip
              label={`Selected: ${selectedIds.length}`}
              variant="outlined"
              sx={{ fontWeight: 800 }}
            />
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
                  <InputLabel>Category</InputLabel>
                  <Select
                    label="Category"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    {categoryOptions.map((c) => (
                      <MenuItem key={c} value={c}>
                        {c}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  size="small"
                  placeholder="Search activities..."
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
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 1.5,
                      height: 40,
                    },
                  }}
                />
              </Box>

              <Divider sx={{ mb: 2 }} />

              {modalLoading ? (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    py: 6,
                  }}
                >
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
                  {modalActivities.map((a: any) => {
                    const aid = getIdString(a._id) || a.name;
                    const checked = selectedIds.includes(aid);
                    const cover =
                      a.thumbnail || a.images?.[0] || PLACEHOLDER_IMG;
                    const pr =
                      a.priceBreakdown?.totalPrice ??
                      a.price ??
                      a.priceBreakdown?.basePrice;

                    return (
                      <Card
                        key={aid}
                        onClick={() => toggleSelection(aid)}
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
                            image={cover}
                            alt={a.title || a.name || "Activity"}
                            loading="lazy"
                            sx={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
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
                            {a.title || a.name}
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
                            {(normalizeCategories(a)[0] || "—") +
                              " • ₹" +
                              (typeof pr === "number"
                                ? pr.toLocaleString("en-IN")
                                : "—")}
                          </Typography>
                        </Box>

                        <Checkbox
                          checked={checked}
                          onChange={() => toggleSelection(aid)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Card>
                    );
                  })}

                  {!modalActivities.length && !modalLoading && (
                    <Box
                      sx={{
                        gridColumn: "1 / -1",
                        py: 4,
                        textAlign: "center",
                      }}
                    >
                      <Typography color="text.secondary">
                        No activities found.
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </>
          ) : (
            <>
              <Typography sx={{ fontWeight: 900, mb: 0.5 }}>
                Add markup for selected activities
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 2 }}
              >
                This will update markup prices for <b>{selectedIds.length}</b>{" "}
                activities.
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
                  onChange={(e) =>
                    setMarkupMinPrice(e.target.value ? Number(e.target.value) : "")
                  }
                  inputProps={{ min: 0 }}
                  fullWidth
                />
                <TextField
                  label="Markup Max Price"
                  type="number"
                  value={markupMaxPrice}
                  onChange={(e) =>
                    setMarkupMaxPrice(e.target.value ? Number(e.target.value) : "")
                  }
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
          <Button
            onClick={closeMarkup}
            color="inherit"
            variant="outlined"
            sx={{ borderRadius: 1.5, height: 36, fontWeight: 800 }}
          >
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
              <Button
                variant="outlined"
                onClick={() => setMarkupStep(0)}
                sx={{ borderRadius: 1.5, height: 36, fontWeight: 900 }}
              >
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

export default ActivitiesDashboard;
