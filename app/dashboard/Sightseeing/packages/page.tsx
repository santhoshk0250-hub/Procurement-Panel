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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  Search,
  DirectionsCarFilled as CarIcon,
  People as PeopleIcon,
  AccessTime as AccessTimeIcon,
  Category as CategoryIcon,
  ContentCopy as ContentCopyIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CurrencyRupee as RupeeIcon,
  LocalOffer as OfferIcon,
  CheckCircleOutline as ActiveIcon,
  CancelOutlined as InactiveIcon,
} from "@mui/icons-material";
import { useSightseeingPackageStore } from "@/store/usesightpackages";

/* ================== Types ================== */
export type IDType = string | { $oid: string } | undefined;
export type FAQ = { q: string; a: string };

export interface SightseeingPackage {
  _id?: IDType;
  tour_name: string;
  vehicle_type?: string;
  min_pax?: number;
  max_pax?: number;
  duration_hours?: number;
  regular_timings?: string;
  alternative_timings?: string;
  places_to_visit_names?: string[];
  place_ids?: (string | { $oid: string })[];
  inclusions?: string[];
  exclusions?: string[];
  llm_chips?: FAQ[];
  price_regular?: number;
  price_block_out?: number;
  price_block_out_special?: number;
  service_charge?: number;
  special_mentions?: string | null;
  notes?: string | null;
  is_active?: boolean;
  [key: string]: any; // dynamic
}

/* ================== Helpers ================== */
const unwrapId = (id?: IDType) => (typeof id === "string" ? id : (id as any)?.$oid ?? "");

const money = (n?: number) =>
  typeof n === "number" && !isNaN(n) ? new Intl.NumberFormat("en-IN").format(n) : "—";

/* ================== Helpers ================== */
const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop";

// Derive the hero image for a package: prefer first image from place_ids[].images
// Fallbacks: p.images[0] or a generic photo
const heroImageFromPackage = (p: SightseeingPackage): string => {
  try {
    const arr: any[] = Array.isArray(p.place_ids) ? (p.place_ids as any[]) : [];
    for (const it of arr) {
      const imgs: string[] = Array.isArray(it?.images) ? it.images : [];
      if (imgs.length) return imgs[0];
    }
    const ownImgs: string[] = Array.isArray((p as any).images) ? (p as any).images : [];
    if (ownImgs.length) return ownImgs[0];
  } catch {}
  return FALLBACK_IMG;
};

/* ================== Component ================== */
const SightseeingPackagesDashboard: React.FC = () => {
  const [search, setSearch] = useState("");
  const [vehicleType, setVehicleType] = useState<string>("");
  const [onlyActive, setOnlyActive] = useState<boolean>(false);
  const { setPackage } = useSightseeingPackageStore();
  const [selected, setSelected] = useState<SightseeingPackage | null>(null);
  const [items, setItems] = useState<SightseeingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);

  const fetchPackages = async (pageNum: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(pageNum));
      if (vehicleType) params.set("vehicle_type", vehicleType);
      if (onlyActive) params.set("active", "true");
      if (search.trim()) params.set("q", search.trim());

      const url = `${process.env.NEXT_PUBLIC_API_BASE}packages/fetch?${params.toString()}`;
      const res = await axios.get(url);

      const fetched: SightseeingPackage[] = res.data.items || res.data.data || [];
      const totalPages = res.data.totalPages ?? res.data.pagination?.pages ?? 1;
      setItems(Array.isArray(fetched) ? fetched : []);
      setPages(Number(totalPages) || 1);
    } catch (e) {
      console.error("Error fetching packages:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // requery when filters change
  useEffect(() => {
    setPage(1);
    fetchPackages(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleType, onlyActive]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return items;
    return items.filter((p) => {
      const hay = [
        p.tour_name,
        p.vehicle_type,
        p.regular_timings,
        p.alternative_timings,
        p.special_mentions,
        p.notes,
        ...(p.places_to_visit_names || []),
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
      await axios.delete(`${process.env.NEXT_PUBLIC_API_BASE}packages/packages/${unwrapId(selected._id)}`);
      setItems((prev) => prev.filter((x) => unwrapId(x._id) !== unwrapId(selected._id)));
      setSelected(null);
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Failed to delete package");
    }
  };

  const copyId = async (id?: string) => {
    try {
      if (id) await navigator.clipboard.writeText(id);
    } catch {}
  };

  /* ------- Delete dialog ------- */
  const [confirmOpen, setConfirmOpen] = useState(false);
    const handleEdit = (p: SightseeingPackage) => {
      setPackage(p as any);
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
          placeholder="Search packages…"
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

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Vehicle Type</InputLabel>
            <Select
              label="Vehicle Type"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="4 Seater">4 Seater</MenuItem>
              <MenuItem value="7 Seater">7 Seater</MenuItem>
              <MenuItem value="13 SEATER">13 SEATER</MenuItem>
              <MenuItem value="17-20 SEATER">17-20 SEATER</MenuItem>
              <MenuItem value="20-30 SEATER">20-30 SEATER</MenuItem>
              <MenuItem value="30-40 SEATER">30-40 SEATER</MenuItem>
            </Select>
          </FormControl>
           <Button
            href="/dashboard/services?type=sightseeing"
            component={Link as any}
            fullWidth
            sx={{ width: { xs: "100%", sm: "auto" } as any }}
            variant="contained"
          >
            Add Services
          </Button>
          <Button
            href="/dashboard/Sightseeing/packages/addpackage"
            component={Link as any}
            fullWidth
            sx={{ width: { xs: "100%", sm: "auto" } as any }}
            variant="contained"
          >
            Add Package
          </Button>
        </Stack>
      </Box>

      {/* Loader / Empty */}
      {loading ? (
        <Box sx={{ minHeight: "50vh", display: "grid", placeItems: "center", textAlign: "center", gap: 2 }}>
          <CircularProgress size={50} />
          <Typography variant="body1" color="text.secondary">Loading packages…</Typography>
        </Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ minHeight: "40vh", display: "grid", placeItems: "center", textAlign: "center", gap: 1 }}>
          <Typography variant="h6">No packages found</Typography>
          <Typography variant="body2" color="text.secondary">Try a different search or add a new package.</Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {filtered.map((p) => {
              const id = unwrapId(p._id);
              const pax = `${p.min_pax ?? 1}-${p.max_pax ?? 1}`;
              const places = p.places_to_visit_names || [];
              const active = !!p.is_active;

              return (
                <Card key={id || p.tour_name || Math.random()} sx={{ width: 360 }}>
                  <Box sx={{ position: "relative" }}>
                    <CardMedia
                      component="img"
                      image={heroImageFromPackage(p)}
                      alt={p.tour_name || "Package"}
                      sx={{ objectFit: "cover", width: "100%", height: 160, borderRadius: 1 }}
                    />
                  </Box>

                  <CardContent sx={{ pb: 1 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="h6" noWrap title={p.tour_name}>
                        {p.tour_name}
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                      {p.vehicle_type && (
                        <Chip size="small" color="primary" icon={<CarIcon fontSize="small" />} label={p.vehicle_type} />
                      )}
                      <Chip size="small" icon={<PeopleIcon fontSize="small" />} label={`${pax} pax`} />
                      {typeof p.duration_hours === "number" && (
                        <Chip size="small" icon={<AccessTimeIcon fontSize="small" />} label={`${p.duration_hours} hrs`} />
                      )}
                    </Stack>

                    <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                      {typeof p.price_block_out === "number" && p.price_block_out > 0 && (
                        <Chip size="small" icon={<OfferIcon fontSize="small" />} label={`Block-out: ₹${money(p.price_block_out)}`} />
                      )}
                      {typeof p.price_block_out_special === "number" && p.price_block_out_special > 0 && (
                        <Chip size="small" icon={<OfferIcon fontSize="small" />} label={`Special: ₹${money(p.price_block_out_special)}`} />
                      )}
                      {typeof p.service_charge === "number" && p.service_charge > 0 && (
                        <Chip size="small" icon={<RupeeIcon fontSize="small" />} label={`Service: ₹${money(p.service_charge)}`} />
                      )}
                    </Stack>

                    {/* Places preview */}
                    {places.length > 0 && (
                      <Stack direction="row" spacing={0.5} mt={1} sx={{ maxWidth: "100%", overflow: "hidden" }}>
                        {places.slice(0, 3).map((nm) => (
                          <Chip key={nm} size="small" icon={<CategoryIcon fontSize="small" />} label={nm} sx={{ maxWidth: 200 }} />
                        ))}
                        {places.length > 3 && (
                          <Chip size="small" label={`+${places.length - 3} more`} />
                        )}
                      </Stack>
                    )}

                    {/* Timings */}
                    <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                      {p.regular_timings && (
                        <Chip size="small" icon={<AccessTimeIcon fontSize="small" />} label={p.regular_timings} />
                      )}
                      {p.alternative_timings && (
                        <Chip size="small" icon={<AccessTimeIcon fontSize="small" />} label={p.alternative_timings} />
                      )}
                    </Stack>

                    {/* Mentions / Notes */}
                    {(p.special_mentions || p.notes) && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        mt={1}
                        sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                      >
                        {p.special_mentions || p.notes}
                      </Typography>
                    )}
                  </CardContent>

                  <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2, pt: 0.5 }}>
                    <Stack direction="row" spacing={1}>
                      <Button
                         key="edit"
                        component={Link as any}
                        href={`/dashboard/Sightseeing/packages/editpackage`}
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
        <DialogTitle>Delete Package</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete <strong>{selected?.tour_name || "this package"}</strong>? This action cannot be undone.
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

export default SightseeingPackagesDashboard;
