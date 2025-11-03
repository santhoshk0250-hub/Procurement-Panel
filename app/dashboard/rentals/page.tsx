"use client";

import React, { useEffect, useMemo, useState, MouseEvent } from "react";
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
  LocalOffer,
  Speed,
  AddCircleOutline,
  Route as RouteIcon,
  WorkspacePremium,
} from "@mui/icons-material";

// ✅ Use the new V2 store
import type { Vehicle, IDType, Currency } from "@/store/rentalStore";
import { useVehicleStore } from "@/store/rentalStore";

/* ================== Helpers ================== */
const INR: Currency = "INR";

const unwrapId = (id?: IDType) => (typeof id === "string" ? id : id?.$oid ?? "");

const mainImage = (v: Vehicle) =>
  v.thumbnailUrl || v.images?.[0] ||
  "https://images.unsplash.com/photo-1518306727298-4c2d229afc03?q=80&w=1200&auto=format&fit=crop";

const pickCurrency = (v: Vehicle): Currency =>
  (v.sellerPricing?.currency as Currency) ||
  (v.vendorPricing?.currency as Currency) ||
  (v.deposits?.currency as Currency) ||
  INR;

const money = (n?: number, currency: Currency = INR) =>
  typeof n === "number" && !Number.isNaN(n)
    ? currency === "INR"
      ? `₹${n}`
      : `${n} ${currency}`
    : "-";

const dayPrice = (v: Vehicle) => {
  const p = v.sellerPricing?.oneDay ?? v.vendorPricing?.oneDay;
  return money(p as any, pickCurrency(v));
};

const minDaysIfAny = (v: Vehicle) =>
  v.sellerPricing?.minDaysIfApplicable ?? v.vendorPricing?.minDaysIfApplicable;

/* ================== Component ================== */
const VehiclesDashboard: React.FC = () => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);

  const { setVehicle } = useVehicleStore();

  const fetchVehicles = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE}rentals/fetchrentals?page=${pageNum}`
      );
      const fetched: Vehicle[] = res.data.items || res.data.data || [];
      const totalPages = res.data.totalPages ?? res.data.pagination?.pages ?? 1;
      setVehicles(Array.isArray(fetched) ? fetched : []);
      setPages(Number(totalPages) || 1);
    } catch (e) {
      console.error("Error fetching vehicles:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return vehicles;
    return vehicles.filter((v) => {
      const hay = [
        v.vehicleId,
        v.vehicleType,
        v.seaterCapacity,
        v.variant,
        v.mileage,
        v.speedLimit,
        String((v as any).capacity ?? ""), // legacy servers may still send capacity
        v.pickupLocations,
        v.dropLocations,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [search, vehicles]);

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_BASE}rentals/${unwrapId(selected._id)}`
      );
      setVehicles((prev) => prev.filter((x) => unwrapId(x._id) !== unwrapId(selected._id)));
      setSelected(null);
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Failed to delete vehicle");
    }
  };

  const copyVehicleId = async (id?: string) => {
    try {
      if (id) await navigator.clipboard.writeText(id);
    } catch {}
  };

  /* ------- Delete dialog ------- */
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleEdit = (v: Vehicle) => {
    // Persist entire vehicle into store for edit page
    setVehicle(v);
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
          placeholder="Search vehicles…"
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
          href="/dashboard/rentals/addrentals"
          component={Link as any}
          fullWidth
          sx={{ width: { xs: "100%", sm: "auto" } }}
          variant="contained"
          startIcon={<AddCircleOutline />}
        >
          Add Rentals
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
            Loading vehicles…
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
          {/* decorative icon omitted to keep bundle small */}
          <Typography variant="h6">No vehicles found</Typography>
          <Typography variant="body2" color="text.secondary">
            Try a different search or add a new vehicle.
          </Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {filtered.map((v) => {
              const id = unwrapId(v._id);
              const pricePerDay = dayPrice(v);
              const currency = pickCurrency(v);
              const minDays = minDaysIfAny(v);
              return (
                <Card key={id || v.vehicleId || Math.random()} sx={{ width: 340 }}>
                  <Box sx={{ position: "relative" }}>
                    <CardMedia
                      component="img"
                      image={mainImage(v)}
                      alt={v.variant || v.vehicleType}
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
                        icon={<LocalOffer />}
                        label={`${pricePerDay} / day`}
                        sx={{ bgcolor: "primary.main", color: "primary.contrastText" }}
                      />
                    </Box>
                  </Box>

                  <CardContent sx={{ pb: 1 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="h6" noWrap title={v.variant || v.vehicleId || "Vehicle"}>
                        {v.variant || v.vehicleId || `${v.seaterCapacity} ${v.vehicleType}`}
                      </Typography>
                      {!!v.rating && (
                        <Chip size="small" color="success" icon={<WorkspacePremium />} label={v.rating.toFixed(1)} />
                      )}
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                      <Tooltip title="Copy vehicleId">
                        <IconButton size="small" onClick={() => copyVehicleId(v.vehicleId)} sx={{ mr: -0.5 }}>
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Typography variant="body2" fontWeight={600}>
                        {v.vehicleId || "—"}
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                      {v.speedLimit && (
                        <Chip size="small" icon={<Speed fontSize="small" />} label={`Speed: ${v.speedLimit}`} />
                      )}
                      {v.distanceLimitPerDay && (
                        <Chip size="small" icon={<RouteIcon fontSize="small" />} label={`Limit: ${v.distanceLimitPerDay}/day`} />
                      )}
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2, pt: 0.5 }}>
                    <Stack direction="row" spacing={1}>
                      <Button
                        key="edit"
                        component={Link as any}
                        href={`/dashboard/rentals/editrentals`}
                        onClick={() => handleEdit(v)}
                        size="small"
                      >
                        Edit
                      </Button>
                      <Button color="error" size="small" onClick={() => { setSelected(v); setConfirmOpen(true); }}>
                        Delete
                      </Button>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {minDays ? `Min ${minDays} days` : currency}
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
        <DialogTitle>Delete Vehicle</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete <strong>{selected?.variant || selected?.vehicleId || "this vehicle"}</strong>? This action cannot be undone.
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

export default VehiclesDashboard;
