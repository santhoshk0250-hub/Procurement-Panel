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
  CalendarMonth,
  PeopleAlt,
  Category as CategoryIcon,
  DirectionsCar,
  PriceChange,
  AddCircleOutline,
  Tune,
} from "@mui/icons-material";
import { useTourPackageStore, type PackageModel } from "@/store/tourpackagesStore";

// ✅ shared card
import CommonServiceCard, { type ServiceChip } from "@/components/dashboard/CommonServiceCard";

/* ================== Types ================== */
type IDType = string | { $oid: string };

interface PerServiceBreakdown {
  serviceItemId?: IDType;
  itemModel?: string;
  price_per_person?: number;
  price_currency?: string;
}

interface PriceBreakdown {
  per_service?: PerServiceBreakdown[];
  service_charges_per_person?: number;
  tax_rate_percent?: number;
  taxes_per_person?: number;
  basePrice_per_person?: number;
  totalPrice_per_person?: number;
  priceNote?: string;
}

interface ComputedPrice {
  calculation_basis?: string;
  basePrice_per_person?: number;
  serviceCharges_per_person?: number;
  tax_rate_percent?: number;
  taxes_per_person?: number;
  totalPrice_per_person?: number;
  totalPrice_for_min_pax?: number;
  totalPrice_for_max_pax_if_all_booked_at_min_price?: number;
  currency?: string;
  notes?: string[];
}

interface Transport {
  included?: boolean;
  type?: string;
  details?: string;
}

export interface TourPackage {
  _id?: IDType;
  name?: string;
  thumbnail_image?: string;
  category?: string;
  min_pax?: number;
  max_pax?: number;
  total_days?: number;
  total_nights?: number;

  description?: string;

  // some APIs use iscustomizable, you requested isCustomizable
  iscustomizable?: boolean;
  isCustomizable?: boolean;

  // you requested this field
  markup_price_mode?: "min" | "max" | "both" | string;

  price_breakdown?: PriceBreakdown;
  computedPrice?: ComputedPrice;
  segregated_images?: { category?: string; urls?: string[] }[];
  transport?: Transport;
  inclusions?: string[];
  exclusions?: string[];
  createdAt?: string;
  updatedAt?: string;

  // optional markup fields (optimistic UI)
  markupMinPrice?: number;
  markupMaxPrice?: number;

  [key: string]: any;
}

/* ================== Helpers ================== */
const unwrapId = (id?: IDType): string =>
  typeof id === "string" ? id : (id as any)?.$oid ?? "";

const toText = (html: string, max = 140) => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || "", "text/html");
    const s = doc.body.textContent || "";
    return s.length > max ? s.slice(0, max).trim() + "…" : s.trim();
  } catch {
    const s = html?.replace(/<[^>]+>/g, "") || "";
    return s.length > max ? s.slice(0, max).trim() + "…" : s.trim();
  }
};
const mainImage = (p: TourPackage) =>
  p.thumbnail_image ||
  p.segregated_images?.find((g) => g.category === "Hotel")?.urls?.[0] ||
  "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop";

const formatINR = (n?: number) =>
  typeof n === "number" && !Number.isNaN(n)
    ? `₹${new Intl.NumberFormat("en-IN").format(n)}`
    : "-";

const perPersonPrice = (p: TourPackage) => {
  const fromBreakdown =
    p.price_breakdown?.totalPrice_per_person ??
    p.price_breakdown?.basePrice_per_person;
  const fromComputed =
    p.computedPrice?.totalPrice_per_person ??
    p.computedPrice?.basePrice_per_person;

  const value = fromBreakdown ?? fromComputed;
  return formatINR(value);
};

const minTotalPrice = (p: TourPackage) =>
  formatINR(p.computedPrice?.totalPrice_for_min_pax);

const maxTotalPrice = (p: TourPackage) =>
  formatINR(p.computedPrice?.totalPrice_for_max_pax_if_all_booked_at_min_price);

const durationText = (p: TourPackage) => {
  const d = p.total_days ?? 0;
  const n = p.total_nights ?? 0;
  if (!d && !n) return "";
  if (d && n) return `${d}D / ${n}N`;
  if (d) return `${d} Days`;
  if (n) return `${n} Nights`;
  return "";
};

const paxText = (p: TourPackage) => {
  const min = p.min_pax;
  const max = p.max_pax;
  if (min && max) return `${min}-${max} Pax`;
  if (min) return `Min ${min} Pax`;
  if (max) return `Up to ${max} Pax`;
  return "";
};

const shortPerServiceText = (p: TourPackage) => {
  const arr = p.price_breakdown?.per_service;
  if (!arr || arr.length === 0) return "";
  const mapped = arr.map((s) => {
    const label = s.itemModel || "Service";
    const price = formatINR(s.price_per_person);
    return `${label}: ${price}`;
  });
  const text = mapped.join(" · ");
  return text.length > 90 ? `${text.slice(0, 87)}…` : text;
};

const clampText = (s: string, max = 140) => {
  const t = (s || "").replace(/\s+/g, " ").trim();
  if (!t) return "—";
  return t.length > max ? `${t.slice(0, max).trim()}…` : t;
};

// ✅ keep TS happy (color literal types)
const chip = (c: ServiceChip) => c;

/* ================== Component ================== */
const TourPackagesDashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<TourPackage | null>(null);
  const [packages, setPackages] = useState<TourPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { setTourPackage } = useTourPackageStore();

  const fetchPackages = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE}tour-packages/fetch?page=${pageNum}`
      );
      const fetched: TourPackage[] = res.data.items || res.data.data || [];
      const totalPages = res.data.totalPages ?? res.data.pagination?.pages ?? 1;
      setPackages(Array.isArray(fetched) ? fetched : []);
      setPages(Number(totalPages) || 1);
    } catch (e) {
      console.error("Error fetching tour-packages:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return packages;
    return packages.filter((p) => {
      const hay = [
        p.name,
        p.category,
        durationText(p),
        paxText(p),
        p.transport?.type,
        p.transport?.details,
        p.description,
        (p.inclusions || []).join(" "),
        (p.exclusions || []).join(" "),
        shortPerServiceText(p),
        p.computedPrice?.calculation_basis,
        p.markup_price_mode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [search, packages]);

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_BASE}tour-packages/delete/${unwrapId(
          selected._id
        )}`
      );
      setPackages((prev) =>
        prev.filter((x) => unwrapId(x._id) !== unwrapId(selected._id))
      );
      setSelected(null);
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Failed to delete tour package");
    }
  };

  const handleEdit = (apiItem: PackageModel) => {
    setTourPackage(apiItem);
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

  const [modalSearch, setModalSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const [modalPackagesRaw, setModalPackagesRaw] = useState<TourPackage[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalFetchedOnce, setModalFetchedOnce] = useState(false);

  const fetchAllPackagesForModal = async () => {
    setModalLoading(true);
    try {
      const res = await axios.get<any>(
        `${process.env.NEXT_PUBLIC_API_BASE}tour-packages/fetchwithoutpagination`
      );

      const list: TourPackage[] =
        res.data?.items || res.data?.data || res.data || [];

      setModalPackagesRaw(Array.isArray(list) ? list : []);
      setModalFetchedOnce(true);
    } catch (e) {
      console.error("Error fetching all tour packages for modal:", e);
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
      await fetchAllPackagesForModal();
    }
  };

  const closeMarkup = () => setOpenMarkupModal(false);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    modalPackagesRaw.forEach((p) => {
      if (p.category) set.add(String(p.category));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [modalPackagesRaw]);

  const modalPackages = useMemo(() => {
    const term = modalSearch.trim().toLowerCase();

    const bySearch = !term
      ? modalPackagesRaw
      : modalPackagesRaw.filter((p) => {
          const hay = [
            p.name,
            p.category,
            durationText(p),
            paxText(p),
            p.transport?.type,
            p.transport?.details,
            p.description,
            (p.inclusions || []).join(" "),
            (p.exclusions || []).join(" "),
            shortPerServiceText(p),
            p.computedPrice?.calculation_basis,
            p.markup_price_mode,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return hay.includes(term);
        });

    const byCategory = categoryFilter
      ? bySearch.filter((p) => (p.category || "") === categoryFilter)
      : bySearch;

    return byCategory;
  }, [modalPackagesRaw, modalSearch, categoryFilter]);

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
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_BASE}tour-packages/bulk-markup`,
        {
          packageIds: selectedIds,
          markupMinPrice: min,
          markupMaxPrice: max,
        }
      );

      setPackages((prev: any) =>
        prev.map((p: any) => {
          const pid = unwrapId(p._id);
          if (!selectedIds.includes(pid)) return p;
          return {
            ...p,
            ...(min !== undefined ? { markupMinPrice: min } : {}),
            ...(max !== undefined ? { markupMaxPrice: max } : {}),
          };
        })
      );

      setModalPackagesRaw((prev: any) =>
        prev.map((p: any) => {
          const pid = unwrapId(p._id);
          if (!selectedIds.includes(pid)) return p;
          return {
            ...p,
            ...(min !== undefined ? { markupMinPrice: min } : {}),
            ...(max !== undefined ? { markupMaxPrice: max } : {}),
          };
        })
      );

      setOpenMarkupModal(false);
    } catch (e) {
      console.error("❌ tour-packages bulk markup update error:", e);
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
          placeholder="Search tour packages…"
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

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.25}
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          <Button
            onClick={openMarkup}
            variant="outlined"
            fullWidth
            sx={{
              minHeight: 44,
              px: 2,
              textTransform: "none",
              whiteSpace: "nowrap",
              fontWeight: 700,
              borderRadius: 2,
            }}
          >
            Markup
          </Button>

          <Button
            component={Link as any}
            href="/dashboard/services?type=custom-packages"
            variant="contained"
            startIcon={<AddCircleOutline />}
            fullWidth
            sx={{
              minHeight: 44,
              px: 2,
              textTransform: "none",
              whiteSpace: "nowrap",
              fontWeight: 600,
              borderRadius: 2,
              boxShadow: { xs: 2, sm: 1 },
            }}
          >
            Add Services
          </Button>

          <Button
            component={Link as any}
            href="/dashboard/tour-packages/add-tourpackages?type=fixed"
            variant="contained"
            startIcon={<AddCircleOutline />}
            fullWidth
            sx={{
              minHeight: 44,
              px: 2,
              textTransform: "none",
              whiteSpace: "nowrap",
              fontWeight: 600,
              borderRadius: 2,
              boxShadow: { xs: 2, sm: 1 },
            }}
          >
            Add Fixed Package
          </Button>
        </Stack>
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
            Loading tour packages…
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
          <Typography variant="h6">No tour packages found</Typography>
          <Typography variant="body2" color="text.secondary">
            Try a different search or add a new tour package.
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
            {filtered.map((p) => {
              const id = unwrapId(p._id);
              const title = p.name || "Tour Package";

              const pricePP = perPersonPrice(p);
              const dur = durationText(p);
              const pax = paxText(p);
              const perService = shortPerServiceText(p);

              const subtitleChip: ServiceChip = chip({
                label: p.category || "Package",
                icon: <CategoryIcon fontSize="small" />,
                variant: "outlined",
              });

              const topLeftChips: ServiceChip[] = [
                ...(pricePP !== "-"
                  ? [
                      chip({
                        icon: <PriceChange fontSize="small" />,
                        label: `${pricePP} / person`,
                        color: "primary",
                        sx: {
                          bgcolor: "primary.main",
                          color: "primary.contrastText",
                        },
                      }),
                    ]
                  : []),
                ...(dur
                  ? [
                      chip({
                        icon: <CalendarMonth fontSize="small" />,
                        label: dur,
                        color: "secondary",
                      }),
                    ]
                  : []),
                ...((p.isCustomizable ?? p.iscustomizable)
                  ? [
                      chip({
                        icon: <Tune fontSize="small" />,
                        label: "Customizable",
                        color: "success",
                        variant: "outlined",
                      }),
                    ]
                  : []),
              ];

              const metaChips: ServiceChip[] = [
                ...(pax
                  ? [
                      chip({
                        icon: <PeopleAlt fontSize="small" />,
                        label: pax,
                        variant: "outlined",
                      }),
                    ]
                  : []),
                ...(p.transport?.type
                  ? [
                      chip({
                        icon: <DirectionsCar fontSize="small" />,
                        label: p.transport.type,
                        variant: "outlined",
                      }),
                    ]
                  : []),
              ];

              const minMaxLine =
                p.computedPrice?.totalPrice_for_min_pax ||
                p.computedPrice?.totalPrice_for_max_pax_if_all_booked_at_min_price
                  ? [
                      p.computedPrice?.totalPrice_for_min_pax
                        ? `Min (${p.min_pax} pax): ${minTotalPrice(p)}`
                        : "",
                      p.computedPrice
                        ?.totalPrice_for_max_pax_if_all_booked_at_min_price
                        ? `Max: ${maxTotalPrice(p)}`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" | ")
                  : "";

              const extra = [
                p.description ? toText(p.description, 110) : "",
                perService,
                minMaxLine,
                p.price_breakdown?.priceNote,
              ]
                .filter(Boolean)
                .join(" • ");

              return (
                <CommonServiceCard
                  key={id || title}
                  id={id}
                  title={title}
                  image={mainImage(p)}
                  subtitleChip={subtitleChip}
                  description={clampText(extra, 160)}
                  topLeftChips={topLeftChips}
                  metaChips={metaChips}
                  editHref="/dashboard/tour-packages/edit-tourpackages"
                  onEdit={() => handleEdit(p as any)}
                  onDelete={() => {
                    setSelected(p);
                    setConfirmOpen(true);
                  }}
                  min_pax={p.min_pax}
                  max_pax={p.max_pax}
                  total_days={p.total_days}
                  total_nights={p.total_nights}
                  isCustomizable={p.isCustomizable ?? p.iscustomizable ?? false}
                  markup_price_mode={p.markup_price_mode ?? "min"}
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
        <DialogTitle>Delete Tour Package</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete <strong>{selected?.name || "this tour package"}</strong>?
            This action cannot be undone.
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
                Select Tour Packages
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
                  placeholder="Search packages..."
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
                  {modalPackages.map((p) => {
                    const pid = unwrapId(p._id);
                    const checked = selectedIds.includes(pid);
                    const cover = mainImage(p);
                    const pp = perPersonPrice(p);
                    const cat = p.category || "—";

                    return (
                      <Card
                        key={pid || p.name}
                        onClick={() => toggleSelection(pid)}
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
                            alt={p.name || "Tour package"}
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
                            {p.name || "—"}
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
                            {cat} • {pp !== "-" ? `${pp}/person` : "—"}
                          </Typography>
                        </Box>

                        <Checkbox
                          checked={checked}
                          onChange={() => toggleSelection(pid)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Card>
                    );
                  })}

                  {!modalPackages.length && !modalLoading && (
                    <Box sx={{ gridColumn: "1 / -1", py: 4, textAlign: "center" }}>
                      <Typography color="text.secondary">
                        No packages found.
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </>
          ) : (
            <>
              <Typography sx={{ fontWeight: 900, mb: 0.5 }}>
                Add markup for selected packages
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This will update markup prices for <b>{selectedIds.length}</b>{" "}
                packages.
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

export default TourPackagesDashboard;
