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
  ContentCopy,
  Route as RouteIcon,
  NightlightRound,
  Bolt,
  DirectionsCar,
  AddCircleOutline,
  InfoOutlined,
} from "@mui/icons-material";
import { usePickupDropStore } from "@/store/usepickupdrop";


/* ================== Minimal types (schema-aligned) ================== */
type MongoId = string | { $oid: string };
type Currency = "INR" | string;

type SpecialOverride = {
  label: string;
  price: number;
  currency?: Currency;
  date?: string;
  startDate?: string;
  endDate?: string;
};

type NightCharge = {
  enabled: boolean;
  amount?: number;
  appliesFromHour?: number;
  appliesToHour?: number;
};

type VehicleOption = {
   vehicleType:
    | "4 SEATER"
    | "7 SEATER"
    | "13 SEATER"
    | "17-20 SEATER"
    | "20-30 SEATER"
    | "30-40 SEATER";
  maxPax: number;
  basePrice: number;
  currency?: Currency;
  vendorBasePrice?: number;
  sellerBasePrice?: number;
  nightCharge?: NightCharge;
  specialOverrides?: SpecialOverride[];
  availabilityStatus?: "available" | "limited" | "unavailable" | "on-request";
  cancellationPolicy?: string;
  specialConditions?: string;
  serviceCharge?: { amount: number; currency?: Currency; notes?: string };
};

type TransferRouteDoc = {
  _id?: MongoId;
  pickupLocation: string;
  dropLocation: string;
  vehicleOptions: VehicleOption[];
  routeCancellationPolicy?: string;
  routeSpecialConditions?: string;
  images?: string[];
  thumbnailUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

const INR: Currency = "INR";

/* ================== Helpers ================== */
const unwrapId = (id?: MongoId) => (typeof id === "string" ? id : id?.$oid ?? "");

const mainImage = (r: TransferRouteDoc) =>
  r.thumbnailUrl ||
  r.images?.[0] ||
  "https://images.unsplash.com/photo-1493236296276-d17357e288ea?q=80&w=1200&auto=format&fit=crop";

const money = (n?: number, currency: Currency = INR) =>
  typeof n === "number" && !Number.isNaN(n)
    ? currency === "INR"
      ? `₹${n}`
      : `${n} ${currency}`
    : "-";

/** find the minimum basePrice across options; prefer INR if mixed currencies */
function minPrice(r: TransferRouteDoc): { price?: number; currency: Currency } {
  const opts = r.vehicleOptions || [];
  if (!opts.length) return { price: undefined, currency: INR };

  // group by currency
  const byCur = new Map<Currency, number>();
  for (const o of opts) {
    const c = (o.currency || INR).toUpperCase() as Currency;
    if (typeof o.basePrice === "number") {
      byCur.set(c, Math.min(byCur.get(c) ?? Number.POSITIVE_INFINITY, o.basePrice));
    }
  }
  if (!byCur.size) return { price: undefined, currency: INR };
  // prefer INR; otherwise take the absolute min across currencies
  if (byCur.has("INR")) return { price: byCur.get("INR"), currency: "INR" };
  let best: { price: number; currency: Currency } | null = null;
  for (const [c, p] of byCur.entries()) {
    if (!best || p < best.price) best = { currency: c, price: p };
  }
  return best ?? { price: undefined, currency: INR };
}

const hasNight = (r: TransferRouteDoc) =>
  (r.vehicleOptions || []).some((v) => v.nightCharge?.enabled);

const hasSurge = (r: TransferRouteDoc) =>
  (r.vehicleOptions || []).some((v) => (v.specialOverrides?.length || 0) > 0);

const summarizeAvailability = (r: TransferRouteDoc) => {
  const statuses = new Set((r.vehicleOptions || []).map((v) => v.availabilityStatus || "available"));
  if (statuses.has("unavailable")) return "unavailable";
  if (statuses.has("limited")) return "limited";
  if (statuses.has("on-request")) return "on-request";
  return "available";
};

/* ================== Component ================== */
const PickupDropDashboard: React.FC = () => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<TransferRouteDoc | null>(null);
  const [routes, setRoutes] = useState<TransferRouteDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);
  const { setRoute } = usePickupDropStore();

  const fetchRoutes = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE}pickupdrop/fetch?page=${pageNum}`
      );
      const fetched: TransferRouteDoc[] = res.data.data || res.data.items || [];
      const totalPages = res.data.pagination?.pages ?? res.data.totalPages ?? 1;
      setRoutes(Array.isArray(fetched) ? fetched : []);
      setPages(Number(totalPages) || 1);
    } catch (e) {
      console.error("Error fetching routes:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return routes;
    return routes.filter((r) => {
      const types = (r.vehicleOptions || []).map((v) => v.vehicleType).join(" ");
      const hay = [
        r.pickupLocation,
        r.dropLocation,
        types,
        r.routeCancellationPolicy,
        r.routeSpecialConditions,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [search, routes]);

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_BASE}pickupdrop/${unwrapId(selected._id)}`
      );
      setRoutes((prev) => prev.filter((x) => unwrapId(x._id) !== unwrapId(selected._id)));
      setSelected(null);
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  const copyId = async (id?: string) => {
    try {
      if (id) await navigator.clipboard.writeText(id);
    } catch {}
  };

   const handleEdit = (r: TransferRouteDoc) => {
      // Persist entire vehicle into store for edit page
      setRoute(r as any);
    };

  /* ------- Delete dialog ------- */
  const [confirmOpen, setConfirmOpen] = useState(false);

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
          placeholder="Search by pickup, drop, vehicle type…"
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

        <Button
          href="/dashboard/pickupdrop/addpickup"
          component={Link as any}
          fullWidth
          sx={{ width: { xs: "100%", sm: "auto" } }}
          variant="contained"
          startIcon={<AddCircleOutline />}
        >
          Add Pickup→Drop
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
            Loading routes…
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
          <Typography variant="h6">No routes found</Typography>
          <Typography variant="body2" color="text.secondary">
            Try a different search or add a new pickup→drop route.
          </Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {filtered.map((r) => {
              const id = unwrapId(r._id);
              const mp = minPrice(r);
              const availability = summarizeAvailability(r);
              const vehiclesCount = r.vehicleOptions?.length || 0;

              return (
                <Card key={id} sx={{ width: 360 }}>
                  <Box sx={{ position: "relative" }}>
                    <CardMedia
                      component="img"
                      image={mainImage(r)}
                      alt={`${r.pickupLocation} → ${r.dropLocation}`}
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
                        icon={<RouteIcon />}
                        label={`${(r.pickupLocation || "").toUpperCase()} → ${(r.dropLocation || "").toUpperCase()}`}
                        sx={{ bgcolor: "primary.main", color: "primary.contrastText", maxWidth: 300 }}
                      />
                    </Box>
                  </Box>

                  <CardContent sx={{ pb: 1 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="h6" noWrap title="Cheapest price">
                        From {money(mp.price, mp.currency)}
                      </Typography>
                      <Chip
                        size="small"
                        color={
                          availability === "available"
                            ? "success"
                            : availability === "limited"
                            ? "warning"
                            : availability === "on-request"
                            ? "default"
                            : "error"
                        }
                        label={availability}
                      />
                    </Stack>

                    <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                      <Chip
                        size="small"
                        icon={<DirectionsCar fontSize="small" />}
                        label={`${vehiclesCount} option${vehiclesCount === 1 ? "" : "s"}`}
                      />
                      {hasNight(r) && (
                        <Chip size="small" icon={<NightlightRound fontSize="small" />} label="Night charge" />
                      )}
                      {hasSurge(r) && (
                        <Chip size="small" icon={<Bolt fontSize="small" />} label="Special prices" />
                      )}
                      {(r.routeCancellationPolicy || r.routeSpecialConditions) && (
                        <Tooltip title="Route policies available">
                          <Chip size="small" icon={<InfoOutlined fontSize="small" />} label="Policies" />
                        </Tooltip>
                      )}
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center" mt={1.5}>
                      <Tooltip title="Copy route _id">
                        <IconButton size="small" onClick={() => copyId(id)} sx={{ mr: -0.5 }}>
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Typography variant="body2" fontWeight={600}>
                        {id || "—"}
                      </Typography>
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2, pt: 0.5 }}>
                    <Stack direction="row" spacing={1}>
                      <Button
                        key="edit"
                        component={Link as any}
                        href={`/dashboard/pickupdrop/editpickup`}
                        onClick={() => handleEdit(r)}
                        size="small"
                      >
                        Edit
                      </Button>
                      <Button color="error" size="small" onClick={() => { setSelected(r); setConfirmOpen(true); }}>
                        Delete
                      </Button>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {r.vehicleOptions?.[0]?.currency?.toUpperCase?.() || "INR"}
                    </Typography>
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
        <DialogTitle>Delete Route</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete route <strong>{selected ? `${selected.pickupLocation} → ${selected.dropLocation}` : ""}</strong>? This action cannot be undone.
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

export default PickupDropDashboard;
