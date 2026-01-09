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
  IconButton,
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
  Card,
  CardMedia,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

import {
  Search,
  ContentCopy,
  People,
  AccessTime,
  CurrencyRupee,
  AddCircleOutline,
  WorkspacePremium,
  Edit as EditIcon,
} from "@mui/icons-material";

import { useTourManagerStore, type TourManager } from "@/store/tourmanagerStore";
import CommonServiceCard, { type ServiceChip } from "@/components/dashboard/CommonServiceCard";

/* ================== Types ================== */
type MongoId = string | { $oid: string };

/* ================== Helpers ================== */
const unwrapId = (id?: MongoId): string =>
  typeof id === "string" ? id : (id as any)?.$oid ?? "";

const mainImage = (tm: TourManager) =>
  tm.gallery?.[0]?.imageUrl ||
  "https://images.unsplash.com/photo-1455587734955-081b22074882?q=80&w=1200&auto=format&fit=crop";

const money = (n?: number) =>
  typeof n === "number" && !Number.isNaN(n) ? `₹${n}` : "-";

const stripHtml = (html?: string) =>
  (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const clampText = (s: string, max = 140) => {
  const t = (s || "").replace(/\s+/g, " ").trim();
  if (!t) return "—";
  return t.length > max ? `${t.slice(0, max).trim()}…` : t;
};

const roleLabel = (tm: TourManager) => {
  const slug = (tm.slug || "").toLowerCase();
  if (slug.includes("guide")) return "Tour Guide";
  if (slug.includes("manager")) return "Tour Manager";
  return "Tour Service";
};

const languagesToText = (lang?: string[][]) => {
  if (!Array.isArray(lang) || !lang.length) return "";
  return lang
    .map((pair) => (pair || []).filter(Boolean).join(" - "))
    .filter(Boolean)
    .join(", ");
};

// ✅ slug normalizer
const normalizeSlug = (tm: TourManager): string => (tm.slug || "").trim();

// ✅ prevents TS widening (string -> literal union)
const chip = (c: ServiceChip) => c;

/* ================== Component ================== */
const TourManagersDashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<TourManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);
  const { setFromAPI } = useTourManagerStore();

  const fetchTourManagers = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE}tour-manager/fetch?page=${pageNum}`
      );
      const data: TourManager[] = res.data.data || res.data.items || [];
      const totalPages = res.data.pagination?.pages ?? res.data.totalPages ?? 1;

      setItems(Array.isArray(data) ? data : []);
      setPages(Number(totalPages) || 1);
    } catch (e) {
      console.error("Error fetching tour managers:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTourManagers(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return items;

    return items.filter((tm) => {
      const id = unwrapId(tm._id);
      const langs = languagesToText(tm.language);
      const hay = [
        id,
        (tm as any).managerId,
        tm.title,
        tm.slug,
        stripHtml(tm.description),
        stripHtml((tm as any).general_info),
        langs,
        ((tm as any).inclusions || []).join(" "),
        ((tm as any).exclusions || []).join(" "),
        ((tm as any).gallery || []).map((g: any) => g.tag).join(" "),
        ((tm as any).tourManagerProfiles || []).map((p: any) => p.name).join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [search, items]);

  const copyToClipboard = async (val?: string) => {
    try {
      if (val) await navigator.clipboard.writeText(val);
    } catch {}
  };

  const handleEdit = (apiItem: TourManager) => {
    setFromAPI(apiItem);
  };

  // =========================
  // ✅ MARKUP MODAL (GET ALL NO PAGINATION)
  // ✅ Filter based on SLUG (role)
  // =========================
  const [openMarkupModal, setOpenMarkupModal] = useState(false);
  const [markupStep, setMarkupStep] = useState<0 | 1>(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [markupMinPrice, setMarkupMinPrice] = useState<number | "">("");
  const [markupMaxPrice, setMarkupMaxPrice] = useState<number | "">("");
  const [savingMarkup, setSavingMarkup] = useState(false);

  // modal filters
  const [modalSearch, setModalSearch] = useState("");
  const [slugFilter, setSlugFilter] = useState<string>("");

  // modal list (ALL tour managers)
  const [modalItemsRaw, setModalItemsRaw] = useState<TourManager[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalFetchedOnce, setModalFetchedOnce] = useState(false);

  const fetchAllForModal = async () => {
    setModalLoading(true);
    try {
      // ✅ if you have a dedicated "fetch all" endpoint, use it here
      const res = await axios.get<any>(
        `${process.env.NEXT_PUBLIC_API_BASE}tour-manager/fetch`
      );

      const list: TourManager[] = res.data?.data || res.data?.items || res.data || [];
      setModalItemsRaw(Array.isArray(list) ? list : []);
      setModalFetchedOnce(true);
    } catch (e) {
      console.error("Error fetching ALL tour managers for modal:", e);
    } finally {
      setModalLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const openMarkup = async () => {
    setMarkupStep(0);
    setSelectedIds([]);
    setMarkupMinPrice("");
    setMarkupMaxPrice("");
    setModalSearch("");
    setSlugFilter("");
    setOpenMarkupModal(true);

    if (!modalFetchedOnce) {
      await fetchAllForModal();
    }
  };

  const closeMarkup = () => setOpenMarkupModal(false);

  const slugOptions = useMemo(() => {
    const set = new Set<string>();
    modalItemsRaw.forEach((tm) => {
      const s = normalizeSlug(tm);
      if (s) set.add(s);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [modalItemsRaw]);

  const modalItems = useMemo(() => {
    const term = modalSearch.trim().toLowerCase();

    const bySearch = !term
      ? modalItemsRaw
      : modalItemsRaw.filter((tm) => {
          const id = unwrapId(tm._id);
          const langs = languagesToText(tm.language);
          const hay = [
            id,
            (tm as any).managerId,
            tm.title,
            tm.slug,
            stripHtml(tm.description),
            stripHtml((tm as any).general_info),
            langs,
            ((tm as any).inclusions || []).join(" "),
            ((tm as any).exclusions || []).join(" "),
            ((tm as any).tourManagerProfiles || []).map((p: any) => p.name).join(" "),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return hay.includes(term);
        });

    const bySlug = slugFilter ? bySearch.filter((tm) => normalizeSlug(tm) === slugFilter) : bySearch;
    return bySlug;
  }, [modalItemsRaw, modalSearch, slugFilter]);

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
      await axios.put(`${process.env.NEXT_PUBLIC_API_BASE}tour-manager/bulk-markup`, {
        tourManagerIds: selectedIds,
        markupMinPrice: min,
        markupMaxPrice: max,
      });

      // optimistic update: current page list
      setItems((prev: any) =>
        prev.map((tm: any) => {
          const tid = unwrapId(tm._id);
          if (!selectedIds.includes(tid)) return tm;
          return {
            ...tm,
            ...(min !== undefined ? { markupMinPrice: min } : {}),
            ...(max !== undefined ? { markupMaxPrice: max } : {}),
          };
        })
      );

      // optimistic update: modal list
      setModalItemsRaw((prev: any) =>
        prev.map((tm: any) => {
          const tid = unwrapId(tm._id);
          if (!selectedIds.includes(tid)) return tm;
          return {
            ...tm,
            ...(min !== undefined ? { markupMinPrice: min } : {}),
            ...(max !== undefined ? { markupMaxPrice: max } : {}),
          };
        })
      );

      setOpenMarkupModal(false);
    } catch (e) {
      console.error("❌ tour-manager bulk markup update error:", e);
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
          placeholder="Search tour managers, guides, languages…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: "100%", sm: 420 } }}
        />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, auto)" },
            gap: 1.5,
            width: "100%",
            alignItems: "center",
          }}
        >
          <Button onClick={openMarkup} variant="outlined" fullWidth sx={{ height: 40, fontWeight: 700 }}>
            Markup
          </Button>

          <Button
            href="/dashboard/services?type=tour-manager"
            component={Link as any}
            fullWidth
            variant="outlined"
            startIcon={<AddCircleOutline />}
            sx={{ height: 40, fontWeight: 700 }}
          >
            Add Service
          </Button>
        </Box>
      </Box>

      {/* Loader / Empty states */}
      {loading ? (
        <Box sx={{ minHeight: "50vh", display: "grid", placeItems: "center", textAlign: "center", gap: 2 }}>
          <CircularProgress size={50} />
          <Typography variant="body1" color="text.secondary">
            Loading tour managers / guides…
          </Typography>
        </Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ minHeight: "40vh", display: "grid", placeItems: "center", textAlign: "center", gap: 1 }}>
          <Typography variant="h6">No tour managers found</Typography>
          <Typography variant="body2" color="text.secondary">
            Try a different search or add a new tour manager / guide.
          </Typography>
        </Box>
      ) : (
        <>
          {/* ✅ CommonServiceCard grid */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                lg: "repeat(3, minmax(0, 1fr))",
              },
              gap: 2.5,
            }}
          >
            {filtered.map((tm) => {
              const id = unwrapId(tm._id) || (tm as any).managerId || tm.title || "";
              const role = roleLabel(tm);

              const langs = languagesToText(tm.language);
              const timeRange =
                (tm as any).timings?.from && (tm as any).timings?.to
                  ? `${(tm as any).timings.from} – ${(tm as any).timings.to}`
                  : "";

              const priceTag = money((tm as any).price_breakdown?.totalPrice);
              const rating = (tm as any).rating ? Number((tm as any).rating).toFixed(1) : "";

              const title = tm.title || "—";
              const desc = clampText(stripHtml(tm.description || ""), 140);

              const subtitleChip: ServiceChip = chip({
                label: role,
                variant: "outlined",
              });

              const topLeftChips: ServiceChip[] = [
                ...((tm as any).managerId
                  ? [
                      chip({
                        icon: <People fontSize="small" />,
                        label: String((tm as any).managerId),
                        color: "primary",
                        sx: { bgcolor: "primary.main", color: "primary.contrastText" },
                      }),
                    ]
                  : []),
                ...(priceTag !== "-"
                  ? [
                      chip({
                        icon: <CurrencyRupee fontSize="small" />,
                        label: priceTag,
                        color: "success",
                        variant: "outlined",
                      }),
                    ]
                  : []),
              ];

              const topRightChips: ServiceChip[] = [
                ...(rating
                  ? [
                      chip({
                        icon: <WorkspacePremium fontSize="small" />,
                        label: rating,
                        color: "success",
                        variant: "outlined",
                      }),
                    ]
                  : []),
              ];

              const metaChips: ServiceChip[] = [
                ...(langs
                  ? [
                      chip({
                        icon: <People fontSize="small" />,
                        label: langs,
                        variant: "outlined",
                      }),
                    ]
                  : []),
                ...(timeRange
                  ? [
                      chip({
                        icon: <AccessTime fontSize="small" />,
                        label: timeRange,
                        variant: "outlined",
                      }),
                    ]
                  : []),
                ...(((tm as any).inclusions?.length
                  ? [
                      chip({
                        label: "Includes",
                        color: "success",
                        variant: "outlined",
                      }),
                    ]
                  : []) as ServiceChip[]),
                ...(((tm as any).exclusions?.length
                  ? [
                      chip({
                        label: "Excludes",
                        color: "warning",
                        variant: "outlined",
                      }),
                    ]
                  : []) as ServiceChip[]),
                ...(((tm as any).tourManagerProfiles?.length
                  ? [
                      chip({
                        icon: <People fontSize="small" />,
                        label: `${(tm as any).tourManagerProfiles.length} profile${
                          (tm as any).tourManagerProfiles.length > 1 ? "s" : ""
                        }`,
                        variant: "outlined",
                      }),
                    ]
                  : []) as ServiceChip[]),
              ];

              return (
                <CommonServiceCard
                  key={id || title}
                  id={id}
                  title={title}
                  image={mainImage(tm)}
                  subtitleChip={subtitleChip}
                  description={desc}
                  topLeftChips={topLeftChips}
                  topRightChips={topRightChips}
                  metaChips={metaChips}
                  editHref="/dashboard/tour-managers/edit"
                  onEdit={() => handleEdit(tm)}
                  onDelete={() => {
                    /* your UI currently doesn't delete from card; keep noop */
                  }}
                />
              );
            })}
          </Box>

          {/* Pagination */}
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <Pagination count={pages} page={page} onChange={(e, value) => setPage(value)} color="primary" />
          </Box>
        </>
      )}

      {/* ✅ MARKUP MODAL (SLUG FILTER) */}
      <Dialog open={openMarkupModal} onClose={closeMarkup} fullScreen={isMobile} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Select Tour Managers / Guides
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Filter by slug and continue.
              </Typography>
            </Box>

            <Chip label={`Selected: ${selectedIds.length}`} variant="outlined" sx={{ fontWeight: 800 }} />
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
                  <InputLabel>Slug</InputLabel>
                  <Select label="Slug" value={slugFilter} onChange={(e) => setSlugFilter(e.target.value)}>
                    <MenuItem value="">All</MenuItem>
                    {slugOptions.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  size="small"
                  placeholder="Search tour managers..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ width: "100%", "& .MuiOutlinedInput-root": { borderRadius: 1.5, height: 40 } }}
                />
              </Box>

              <Divider sx={{ mb: 2 }} />

              {modalLoading ? (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 6 }}>
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
                  {modalItems.map((tm) => {
                    const tid = unwrapId(tm._id);
                    const checked = selectedIds.includes(tid);
                    const cover = mainImage(tm);
                    const langs = languagesToText(tm.language);
                    const role = roleLabel(tm);

                    return (
                      <Card
                        key={tid}
                        onClick={() => toggleSelection(tid)}
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
                        <Box sx={{ width: 72, height: 56, borderRadius: 2, overflow: "hidden", flexShrink: 0, bgcolor: "grey.100" }}>
                          <CardMedia
                            component="img"
                            image={cover}
                            alt={tm.title || "Tour manager"}
                            loading="lazy"
                            sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
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
                            {tm.title || "—"}
                          </Typography>

                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {role} • {langs || "—"}
                          </Typography>
                        </Box>

                        <Checkbox checked={checked} onChange={() => toggleSelection(tid)} onClick={(e) => e.stopPropagation()} />
                      </Card>
                    );
                  })}

                  {!modalItems.length && !modalLoading && (
                    <Box sx={{ gridColumn: "1 / -1", py: 4, textAlign: "center" }}>
                      <Typography color="text.secondary">No tour managers found.</Typography>
                    </Box>
                  )}
                </Box>
              )}
            </>
          ) : (
            <>
              <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Add markup for selected tour managers</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This will update markup prices for <b>{selectedIds.length}</b> records.
              </Typography>

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2 }}>
                <TextField
                  label="Markup Min Price"
                  type="number"
                  value={markupMinPrice}
                  onChange={(e) => setMarkupMinPrice(e.target.value ? Number(e.target.value) : "")}
                  inputProps={{ min: 0 }}
                  fullWidth
                />
                <TextField
                  label="Markup Max Price"
                  type="number"
                  value={markupMaxPrice}
                  onChange={(e) => setMarkupMaxPrice(e.target.value ? Number(e.target.value) : "")}
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
          <Button onClick={closeMarkup} color="inherit" variant="outlined" sx={{ borderRadius: 1.5, height: 36, fontWeight: 800 }}>
            Cancel
          </Button>

          {markupStep === 0 ? (
            <Button variant="contained" disabled={!selectedIds.length || modalLoading} onClick={() => setMarkupStep(1)} sx={{ borderRadius: 1.5, height: 36, fontWeight: 900 }}>
              Continue
            </Button>
          ) : (
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button variant="outlined" onClick={() => setMarkupStep(0)} sx={{ borderRadius: 1.5, height: 36, fontWeight: 900 }}>
                Back
              </Button>
              <Button variant="contained" onClick={handleSubmitMarkup} disabled={savingMarkup} sx={{ borderRadius: 1.5, height: 36, fontWeight: 900 }}>
                {savingMarkup ? "Saving..." : "Submit"}
              </Button>
            </Box>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TourManagersDashboard;
