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
  ToggleButtonGroup,
  ToggleButton,
  useMediaQuery,
  Card,
  CardMedia,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Search,
  LocalOffer,
  Speed,
  AddCircleOutline,
  Route as RouteIcon,
  WorkspacePremium,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";

import type { Vehicle, IDType, Currency } from "@/store/rentalStore";
import { useVehicleStore } from "@/store/rentalStore";

import CommonServiceCard, { type ServiceChip } from "@/components/dashboard/CommonServiceCard";

/* ================== Helpers ================== */
const INR: Currency = "INR";
const unwrapId = (id?: IDType) => (typeof id === "string" ? id : id?.$oid ?? "");

const mainImage = (v: Vehicle) =>
  v.thumbnailUrl ||
  v.images?.[0] ||
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

const clampText = (s: string, max = 140) => {
  const t = (s || "").replace(/\s+/g, " ").trim();
  if (!t) return "—";
  return t.length > max ? `${t.slice(0, max).trim()}…` : t;
};

// ✅ prevents TS widening (string -> literal union)
const chip = (c: ServiceChip) => c;

/* ================== Component ================== */
const VehiclesDashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const router = useRouter();

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

  // ✅ Modal: fetch ALL rentals
  const fetchAllRentalsForModal = async () => {
    setModalLoading(true);
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE}rentals/fetchallrental`);
      const fetched: Vehicle[] = res.data.items || res.data.data || [];
      setModalVehiclesRaw(Array.isArray(fetched) ? fetched : []);
      setModalFetchedOnce(true);
    } catch (e) {
      console.error("Error fetching all rentals for modal:", e);
    } finally {
      setModalLoading(false);
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
        (v as any).speedLimit,
        String((v as any).capacity ?? ""),
        (v as any).pickupLocations,
        (v as any).dropLocations,
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
      await axios.delete(`${process.env.NEXT_PUBLIC_API_BASE}rentals/delete/${unwrapId(selected._id)}`);
      setVehicles((prev) => prev.filter((x) => unwrapId(x._id) !== unwrapId(selected._id)));
      setSelected(null);
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Failed to delete vehicle");
    }
  };

  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleEdit = (v: Vehicle) => {
    setVehicle(v);
  };

  // =========================
  // ✅ MARKUP MODAL
  // =========================
  const [openMarkupModal, setOpenMarkupModal] = useState(false);
  const [markupStep, setMarkupStep] = useState<0 | 1>(0);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [markupMinPrice, setMarkupMinPrice] = useState<number | "">("");
  const [markupMaxPrice, setMarkupMaxPrice] = useState<number | "">("");
  const [savingMarkup, setSavingMarkup] = useState(false);

  // ✅ modal search separate from dashboard search
  const [modalSearch, setModalSearch] = useState("");

  // ✅ modal filter: 2-wheeler / 4-wheeler
  type WheelFilter = "all" | "2" | "4";
  const [wheelFilter, setWheelFilter] = useState<WheelFilter>("all");

  // modal list
  const [modalVehiclesRaw, setModalVehiclesRaw] = useState<Vehicle[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalFetchedOnce, setModalFetchedOnce] = useState(false);

  const wheelOf = (v: Vehicle): WheelFilter | "other" => {
    const t = (v.vehicleType || "").toString().trim().toLowerCase();

    const isTwo =
      (t.includes("2") && t.includes("wheel")) ||
      (t.includes("two") && t.includes("wheel")) ||
      t.includes("2w") ||
      t.includes("bike") ||
      t.includes("scooter") ||
      t.includes("motor");

    const isFour =
      (t.includes("4") && t.includes("wheel")) ||
      (t.includes("four") && t.includes("wheel")) ||
      t.includes("4w") ||
      t.includes("car") ||
      t.includes("sedan") ||
      t.includes("suv") ||
      t.includes("hatch") ||
      t.includes("jeep");

    if (isTwo && !isFour) return "2";
    if (isFour && !isTwo) return "4";

    const seats = Number((v as any).seaterCapacity ?? NaN);
    if (!Number.isNaN(seats)) {
      if (seats <= 2) return "2";
      if (seats >= 4) return "4";
    }
    return "other";
  };

  const toggleVehicleSelection = (id: string) => {
    setSelectedVehicleIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const openMarkup = async () => {
    setMarkupStep(0);
    setSelectedVehicleIds([]);
    setMarkupMinPrice("");
    setMarkupMaxPrice("");
    setWheelFilter("all");
    setModalSearch("");
    setOpenMarkupModal(true);

    if (!modalFetchedOnce) {
      await fetchAllRentalsForModal();
    }
  };

  const closeMarkup = () => setOpenMarkupModal(false);

  const modalVehicles = useMemo(() => {
    const term = modalSearch.trim().toLowerCase();

    const bySearch = !term
      ? modalVehiclesRaw
      : modalVehiclesRaw.filter((v) => {
          const hay = [
            v.vehicleId,
            v.vehicleType,
            v.variant,
            String(v.seaterCapacity ?? ""),
            String((v as any).speedLimit ?? ""),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return hay.includes(term);
        });

    const byWheel = wheelFilter === "all" ? bySearch : bySearch.filter((v) => wheelOf(v) === wheelFilter);

    const order: Record<string, number> = { "2": 0, "4": 1, other: 2 };
    return [...byWheel].sort((a, b) => order[wheelOf(a) as any] - order[wheelOf(b) as any]);
  }, [modalVehiclesRaw, modalSearch, wheelFilter]);

  const handleSubmitMarkup = async () => {
    if (!selectedVehicleIds.length) return;

    const min = markupMinPrice === "" ? undefined : Number(markupMinPrice);
    const max = markupMaxPrice === "" ? undefined : Number(markupMaxPrice);

    if (min !== undefined && max !== undefined && max < min) {
      alert("Markup Max Price must be >= Markup Min Price");
      return;
    }

    setSavingMarkup(true);
    try {
      await axios.put(`${process.env.NEXT_PUBLIC_API_BASE}rentals/bulk-markup`, {
        rentalIds: selectedVehicleIds,
        markup_min_price: min,
        markup_max_price: max,
      });

      setVehicles((prev) =>
        prev.map((v: any) =>
          selectedVehicleIds.includes(unwrapId(v._id))
            ? {
                ...v,
                ...(min !== undefined ? { minPrice: min } : {}),
                ...(max !== undefined ? { maxPrice: max } : {}),
              }
            : v
        )
      );

      setModalVehiclesRaw((prev) =>
        prev.map((v: any) =>
          selectedVehicleIds.includes(unwrapId(v._id))
            ? {
                ...v,
                ...(min !== undefined ? { minPrice: min } : {}),
                ...(max !== undefined ? { maxPrice: max } : {}),
              }
            : v
        )
      );

      setOpenMarkupModal(false);
      router.push("/dashboard/rentals");
      router.refresh();
    } catch (e) {
      console.error("❌ bulk markup update error:", e);
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

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, auto)" },
            gap: 1.5,
            width: "100%",
            alignItems: "center",
          }}
        >
          <Button onClick={openMarkup} variant="outlined" fullWidth sx={{ height: 40, fontWeight: 700 }}>
            Markup
          </Button>

          <Button
            href="/dashboard/services?type=rentals"
            component={Link as any}
            variant="outlined"
            startIcon={<AddCircleOutline />}
            fullWidth
            sx={{ height: 40, fontWeight: 700 }}
          >
            Add Services
          </Button>

          <Button
            href="/dashboard/rentals/addrentals"
            component={Link as any}
            variant="contained"
            startIcon={<AddCircleOutline />}
            fullWidth
            sx={{ height: 40, fontWeight: 700 }}
          >
            Add Rentals
          </Button>
        </Box>
      </Box>

      {/* Loader / Empty */}
      {loading ? (
        <Box sx={{ minHeight: "50vh", display: "grid", placeItems: "center", textAlign: "center", gap: 2 }}>
          <CircularProgress size={50} />
          <Typography variant="body1" color="text.secondary">
            Loading vehicles…
          </Typography>
        </Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ minHeight: "40vh", display: "grid", placeItems: "center", textAlign: "center", gap: 1 }}>
          <Typography variant="h6">No vehicles found</Typography>
          <Typography variant="body2" color="text.secondary">
            Try a different search or add a new vehicle.
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
            {filtered.map((v) => {
              const id = unwrapId(v._id) || v.vehicleId || "";
              const pricePerDay = dayPrice(v);
              const currency = pickCurrency(v);
              const minDays = minDaysIfAny(v);

              const title = v.variant || v.vehicleId || `${v.seaterCapacity} ${v.vehicleType}` || "Vehicle";
              const desc = clampText(
                [
                  v.vehicleType ? `Type: ${v.vehicleType}` : "",
                  v.seaterCapacity ? `Seats: ${v.seaterCapacity}` : "",
                  (v as any).mileage ? `Mileage: ${(v as any).mileage}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
                140
              );

              const subtitleChip: ServiceChip = chip({
                label: v.vehicleType || "Rental",
                variant: "outlined",
              });

              const topLeftChips: ServiceChip[] = [
                chip({
                  icon: <LocalOffer fontSize="small" />,
                  label: `${pricePerDay} / day`,
                  color: "primary",
                  sx: { bgcolor: "primary.main", color: "primary.contrastText" },
                }),
                ...(minDays
                  ? [
                      chip({
                        label: `Min ${minDays} days`,
                        variant: "outlined",
                      }),
                    ]
                  : []),
              ];

              const topRightChips: ServiceChip[] = [
                ...((v as any).rating
                  ? [
                      chip({
                        icon: <WorkspacePremium fontSize="small" />,
                        label: Number((v as any).rating).toFixed(1),
                        color: "success",
                        variant: "outlined",
                      }),
                    ]
                  : []),
              ];

              const metaChips: ServiceChip[] = [
                ...((v as any).speedLimit
                  ? [
                      chip({
                        icon: <Speed fontSize="small" />,
                        label: `Speed: ${(v as any).speedLimit}`,
                        variant: "outlined",
                      }),
                    ]
                  : []),
                ...((v as any).distanceLimitPerDay
                  ? [
                      chip({
                        icon: <RouteIcon fontSize="small" />,
                        label: `Limit: ${(v as any).distanceLimitPerDay}/day`,
                        variant: "outlined",
                      }),
                    ]
                  : []),
                chip({
                  label: currency,
                  variant: "outlined",
                }),
                chip({
                  label: wheelOf(v) === "2" ? "2 Wheeler" : wheelOf(v) === "4" ? "4 Wheeler" : "—",
                  variant: "outlined",
                }),
              ];

              return (
                <CommonServiceCard
                  key={id || title}
                  id={id || title}
                  title={title}
                  image={mainImage(v)}
                  subtitleChip={subtitleChip}
                  description={desc}
                  topLeftChips={topLeftChips}
                  topRightChips={topRightChips}
                  metaChips={metaChips}
                  editHref="/dashboard/rentals/editrentals"
                  onEdit={() => handleEdit(v)}
                  onDelete={() => {
                    setSelected(v);
                    setConfirmOpen(true);
                  }}
                />
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

      {/* ✅ MARKUP MODAL (2 wheeler / 4 wheeler filter) */}
      <Dialog open={openMarkupModal} onClose={closeMarkup} fullScreen={isMobile} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Select Rentals
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Filter by 2 wheeler / 4 wheeler and continue.
              </Typography>
            </Box>

            <Chip label={`Selected: ${selectedVehicleIds.length}`} variant="outlined" sx={{ fontWeight: 800 }} />
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
                  display: "flex",
                  gap: 1,
                  mb: 1.5,
                  overflowX: "auto",
                  pb: 0.5,
                  "&::-webkit-scrollbar": { height: 6 },
                }}
              >
                <ToggleButtonGroup
                  value={wheelFilter}
                  exclusive
                  onChange={(e, v) => v && setWheelFilter(v)}
                  sx={{
                    width: "100%",
                    display: "flex",
                    gap: 1,
                    "& .MuiToggleButton-root": {
                      flex: 1,
                      minWidth: 110,
                      height: 36,
                      borderRadius: 1.5,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      borderColor: "divider",
                    },
                  }}
                >
                  <ToggleButton value="all">All</ToggleButton>
                  <ToggleButton value="2">2 Wheeler</ToggleButton>
                  <ToggleButton value="4">4 Wheeler</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <TextField
                size="small"
                placeholder="Search rentals..."
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: "100%", mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 1.5, height: 40 } }}
              />

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
                  {modalVehicles.map((v) => {
                    const vid = unwrapId(v._id);
                    const key = vid || v.vehicleId || Math.random().toString();
                    const checked = selectedVehicleIds.includes(vid);

                    return (
                      <Card
                        key={key}
                        onClick={() => toggleVehicleSelection(vid)}
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
                            image={mainImage(v)}
                            alt={v.variant || v.vehicleType || "Rental"}
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
                            {v.variant || v.vehicleId || `${v.seaterCapacity} ${v.vehicleType}`}
                          </Typography>

                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {v.vehicleType || "—"} • {dayPrice(v)}/day
                          </Typography>

                          <Typography variant="caption" color="text.secondary">
                            {wheelOf(v) === "2" ? "2 Wheeler" : wheelOf(v) === "4" ? "4 Wheeler" : "—"}
                          </Typography>
                        </Box>

                        <Checkbox checked={checked} onChange={() => toggleVehicleSelection(vid)} onClick={(e) => e.stopPropagation()} />
                      </Card>
                    );
                  })}

                  {!modalVehicles.length && !modalLoading && (
                    <Box sx={{ gridColumn: "1 / -1", py: 4, textAlign: "center" }}>
                      <Typography color="text.secondary">No rentals found.</Typography>
                    </Box>
                  )}
                </Box>
              )}
            </>
          ) : (
            <>
              <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Add markup for selected rentals</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This will update markup prices for <b>{selectedVehicleIds.length}</b> rentals.
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
            <Button variant="contained" disabled={!selectedVehicleIds.length || modalLoading} onClick={() => setMarkupStep(1)} sx={{ borderRadius: 1.5, height: 36, fontWeight: 900 }}>
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

export default VehiclesDashboard;
