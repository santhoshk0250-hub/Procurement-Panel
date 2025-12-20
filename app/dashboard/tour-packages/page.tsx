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
  ButtonGroup
} from "@mui/material";
import {
  Search,
  ContentCopy,
  CalendarMonth,
  PeopleAlt,
  Category as CategoryIcon,
  DirectionsCar,
  PriceChange,
  AddCircleOutline,
  Tune,
} from "@mui/icons-material";
import { useTourPackageStore,type PackageModel } from "@/store/tourpackagesStore";

/* ================== Types ================== */

type IDType = string | { $oid: string };

interface ServicePrice {
  serviceId?: IDType;
  serviceItemId?: IDType;
  itemModel?: string;
  price_per_person?: number;
  price_currency?: string;
  notes?: string;
}

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
  services?: ServicePrice[];
  price_breakdown?: PriceBreakdown;
  computedPrice?: ComputedPrice;
  segregated_images?: { category?: string; urls?: string[] }[];
  transport?: Transport;
  inclusions?: string[];
  exclusions?: string[];
  iscustomizable?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/* ================== Helpers ================== */

const unwrapId = (id?: IDType): string =>
  typeof id === "string" ? id : id?.$oid ?? "";

const mainImage = (p: TourPackage) =>
  p.thumbnail_image ||
  p.segregated_images?.find((g) => g.category === "Hotel")?.urls?.[0] ||
  "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop"; // Goa-ish fallback

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
  formatINR(
    p.computedPrice?.totalPrice_for_max_pax_if_all_booked_at_min_price
  );

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

/* ================== Component ================== */

const TourPackagesDashboard: React.FC = () => {
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
        (p.inclusions || []).join(" "),
        (p.exclusions || []).join(" "),
        shortPerServiceText(p),
        p.computedPrice?.calculation_basis,
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
        // Store full object so edit page has addonsFull
        setTourPackage(apiItem);
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
  sx={{ width: { xs: "100%", sm: "auto" }, alignItems: "stretch" }}
>
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
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {filtered.map((p) => {
              const id = unwrapId(p._id);
              const pricePP = perPersonPrice(p);
              const dur = durationText(p);
              const pax = paxText(p);
              const perService = shortPerServiceText(p);

              return (
                <Card key={id || p.name || Math.random()} sx={{ width: 360 }}>
                  <Box sx={{ position: "relative" }}>
                    <CardMedia
                      component="img"
                      image={mainImage(p)}
                      alt={p.name || "Tour package"}
                      sx={{
                        objectFit: "cover",
                        width: "100%",
                        height: 180,
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
                      {pricePP !== "-" && (
                        <Chip
                          size="small"
                          color="primary"
                          icon={<PriceChange />}
                          label={`${pricePP} / person`}
                          sx={{
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                          }}
                        />
                      )}

                      {dur && (
                        <Chip
                          size="small"
                          color="secondary"
                          icon={<CalendarMonth />}
                          label={dur}
                        />
                      )}

                      {p.iscustomizable && (
                        <Chip
                          size="small"
                          color="success"
                          icon={<Tune fontSize="small" />}
                          label="Customizable"
                        />
                      )}
                    </Box>
                  </Box>

                  <CardContent sx={{ pb: 1 }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Typography
                        variant="h6"
                        noWrap
                        title={p.name || "Tour Package"}
                      >
                        {p.name || "Tour Package"}
                      </Typography>
                      {p.category && (
                        <Chip
                          size="small"
                          icon={<CategoryIcon fontSize="small" />}
                          label={p.category}
                        />
                      )}
                    </Stack>

                    {/* Pax + Transport */}
                    <Stack
                      direction="row"
                      spacing={1}
                      mt={1}
                      flexWrap="wrap"
                      alignItems="center"
                    >
                      {pax && (
                        <Chip
                          size="small"
                          icon={<PeopleAlt fontSize="small" />}
                          label={pax}
                        />
                      )}
                      {p.transport?.type && (
                        <Chip
                          size="small"
                          icon={<DirectionsCar fontSize="small" />}
                          label={p.transport.type}
                        />
                      )}
                    </Stack>

                    {/* Per-service summary */}
                    {perService && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        mt={1}
                        display="block"
                      >
                        {perService}
                      </Typography>
                    )}

                    {/* Min / Max total prices */}
                    {(p.computedPrice?.totalPrice_for_min_pax ||
                      p.computedPrice
                        ?.totalPrice_for_max_pax_if_all_booked_at_min_price) && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        mt={0.5}
                        display="block"
                      >
                        {p.computedPrice?.totalPrice_for_min_pax && (
                          <>Min ({p.min_pax} pax): {minTotalPrice(p)} </>
                        )}
                        {p.computedPrice
                          ?.totalPrice_for_min_pax &&
                          p.computedPrice
                            ?.totalPrice_for_max_pax_if_all_booked_at_min_price &&
                          " | "}
                        {p.computedPrice
                          ?.totalPrice_for_max_pax_if_all_booked_at_min_price && (
                          <>Max: {maxTotalPrice(p)}</>
                        )}
                      </Typography>
                    )}

                    {p.price_breakdown?.priceNote && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        mt={0.5}
                        display="block"
                      >
                        {p.price_breakdown.priceNote}
                      </Typography>
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
                        href={`/dashboard/tour-packages/edit-tourpackages`} // adjust path if needed
                        onClick={() => handleEdit(p as any)}
                        size="small"
                      >
                        Edit
                      </Button>
                      <Button
                        color="error"
                        size="small"
                        onClick={() => {
                          setSelected(p);
                          setConfirmOpen(true);
                        }}
                      >
                        Delete
                      </Button>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {dur || "Package"}
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
            Delete{" "}
            <strong>{selected?.name || "this tour package"}</strong>? This
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

export default TourPackagesDashboard;
