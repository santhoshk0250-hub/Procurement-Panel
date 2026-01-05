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
  useMediaQuery,
  Card,
  CardMedia,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Search,
  WorkspacePremium,
  LocalDining,
  Restaurant,
  LocalFireDepartment,
  Fastfood,
  AddCircleOutline,
  CheckCircle,
  Cancel,
} from "@mui/icons-material";

import CommonServiceCard, { type ServiceChip } from "@/components/dashboard/CommonServiceCard";

import {
  useFoodServiceStore,
  type FoodAPIItem,
  type Category,
  type SpiceLevel,
} from "@/store/usefoodservice";

/* ================== Helpers ================== */

const asCategory = (c?: string): Category =>
  (["breakfast", "lunch", "dinner", "snacks", "beverages"] as const).includes(
    c as Category
  )
    ? (c as Category)
    : "breakfast";

const asSpice = (s?: string): SpiceLevel =>
  (["mild", "medium", "hot", "extra-hot"] as const).includes(s as SpiceLevel)
    ? (s as SpiceLevel)
    : "mild";

const unwrapId = (id?: string | { $oid: string }) =>
  typeof id === "string" ? id : id?.$oid ?? "";

const mainImage = (f: { banner?: string | null; images?: string[] }) =>
  f.banner ||
  f.images?.[0] ||
  "https://images.unsplash.com/photo-1543357480-c60d40007a8d?q=80&w=1200&auto=format&fit=crop";

const money = (n?: number) =>
  typeof n === "number" && !Number.isNaN(n) ? `₹${n}` : "-";

// ✅ THIS is the key: force chip objects to be typed properly (no "string" widening)
const chip = (c: ServiceChip) => c;

/* ================== Component ================== */
const FoodServicesDashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<FoodAPIItem | null>(null);
  const [foods, setFoods] = useState<FoodAPIItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);

  const { setFromAPI } = useFoodServiceStore();

  const fetchFoods = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE}food-services/getall?page=${pageNum}`
      );
      const items: FoodAPIItem[] = res.data.data || res.data.items || [];
      const totalPages = res.data.pagination?.pages ?? res.data.totalPages ?? 1;

      setFoods(Array.isArray(items) ? items : []);
      setPages(Number(totalPages) || 1);
    } catch (e) {
      console.error("Error fetching foods:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFoods(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return foods;
    return foods.filter((f) => {
      const hay = [
        unwrapId(f._id as any),
        f.name,
        f.category,
        f.cuisine?.join(" "),
        f.ingredients?.join(" "),
        f.allergens?.join(" "),
        f.spiceLevel as string,
        f.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [search, foods]);

  const handleEdit = (apiItem: FoodAPIItem) => {
    setFromAPI(apiItem);
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      const id = unwrapId(selected._id as any);
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_BASE}food-services/delete/${id}`
      );
      setFoods((prev) => prev.filter((x) => unwrapId(x._id as any) !== id));
      setSelected(null);
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Failed to delete item");
    }
  };

  /* ------- Delete dialog ------- */
  const [confirmOpen, setConfirmOpen] = useState(false);

  /* =========================
     ✅ MARKUP MODAL (Food)
  ========================= */
  const [openMarkupModal, setOpenMarkupModal] = useState(false);
  const [markupStep, setMarkupStep] = useState<0 | 1>(0);
  const [selectedFoodIds, setSelectedFoodIds] = useState<string[]>([]);
  const [markupMinPrice, setMarkupMinPrice] = useState<number | "">("");
  const [markupMaxPrice, setMarkupMaxPrice] = useState<number | "">("");
  const [savingMarkup, setSavingMarkup] = useState(false);

  const [modalFoodsRaw, setModalFoodsRaw] = useState<FoodAPIItem[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalFetchedOnce, setModalFetchedOnce] = useState(false);

  const fetchAllFoodsForModal = async () => {
    setModalLoading(true);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE}food-services/getall`
      );
      const items: FoodAPIItem[] = res.data.data || res.data.items || [];
      setModalFoodsRaw(Array.isArray(items) ? items : []);
      setModalFetchedOnce(true);
    } catch (e) {
      console.error("Error fetching all food items for modal:", e);
    } finally {
      setModalLoading(false);
    }
  };

  const toggleFoodSelection = (id: string) => {
    setSelectedFoodIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const openMarkup = async () => {
    setMarkupStep(0);
    setSelectedFoodIds([]);
    setMarkupMinPrice("");
    setMarkupMaxPrice("");
    setSearch("");
    setOpenMarkupModal(true);

    if (!modalFetchedOnce) {
      await fetchAllFoodsForModal();
    }
  };

  const closeMarkup = () => setOpenMarkupModal(false);

  const modalFoods = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return modalFoodsRaw;

    return modalFoodsRaw.filter((f) => {
      const hay = [
        unwrapId(f._id as any),
        f.name,
        f.category,
        f.cuisine?.join(" "),
        f.ingredients?.join(" "),
        f.allergens?.join(" "),
        f.spiceLevel as string,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }, [modalFoodsRaw, search]);

  const handleSubmitMarkup = async () => {
    if (!selectedFoodIds.length) return;

    const min = markupMinPrice === "" ? undefined : Number(markupMinPrice);
    const max = markupMaxPrice === "" ? undefined : Number(markupMaxPrice);

    if (min !== undefined && max !== undefined && max < min) {
      alert("Markup Max Price must be >= Markup Min Price");
      return;
    }

    setSavingMarkup(true);
    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_BASE}food-services/bulk-markup`,
        {
          foodIds: selectedFoodIds,
          markup_min_price: min,
          markup_max_price: max,
        }
      );

      setFoods((prev: any) =>
        prev.map((f: any) =>
          selectedFoodIds.includes(unwrapId(f._id))
            ? {
                ...f,
                ...(min !== undefined ? { minPrice: min } : {}),
                ...(max !== undefined ? { maxPrice: max } : {}),
              }
            : f
        )
      );

      setModalFoodsRaw((prev: any) =>
        prev.map((f: any) =>
          selectedFoodIds.includes(unwrapId(f._id))
            ? {
                ...f,
                ...(min !== undefined ? { minPrice: min } : {}),
                ...(max !== undefined ? { maxPrice: max } : {}),
              }
            : f
        )
      );

      setOpenMarkupModal(false);
      router.push("/dashboard/Food-service");
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
          placeholder="Search dishes, cuisines, allergens…"
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
            href="/dashboard/services?type=food-service"
            component={Link as any}
            variant="outlined"
            startIcon={<AddCircleOutline />}
            fullWidth
            sx={{ height: 40, fontWeight: 700 }}
          >
            Add Services
          </Button>

          <Button
            href="/dashboard/Food-service/addfoodservice"
            component={Link as any}
            variant="contained"
            startIcon={<AddCircleOutline />}
            fullWidth
            sx={{ height: 40, fontWeight: 700 }}
          >
            Add Food
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
            Loading food items…
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
          <Typography variant="h6">No items found</Typography>
          <Typography variant="body2" color="text.secondary">
            Try a different search or add a new item.
          </Typography>
        </Box>
      ) : (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(auto-fill, minmax(340px, 1fr))",
                md: "repeat(auto-fill, minmax(360px, 1fr))",
              },
              gap: { xs: 2, sm: 2.5, md: 3 },
            }}
          >
            {filtered.map((f) => {
              const id = unwrapId(f._id as any) || f.name || "";
              const img = mainImage({
                banner: f.banner ?? undefined,
                images: f.images,
              });

              const category = asCategory(f.category);
              const spice = asSpice(f.spiceLevel as any);
              const cuisine = f.cuisine?.join(", ");
              const allergens = f.allergens?.join(", ");
              const diet = f.dietaryInfo || {};

              // ✅ Explicitly typed so TS won't widen to string
              const spiceColor: ServiceChip["color"] =
                spice === "hot" || spice === "extra-hot"
                  ? "error"
                  : spice === "medium"
                  ? "warning"
                  : "default";

              const availabilityColor: ServiceChip["color"] = f.isAvailable
                ? "success"
                : "default";

              // ✅ Fully typed arrays
              const topLeftChips: ServiceChip[] = [
                chip({
                  icon: <Restaurant />,
                  label: money(f.price),
                  color: "primary",
                  sx: { bgcolor: "primary.main", color: "primary.contrastText" },
                }),
                chip({ icon: <LocalDining />, label: category }),
                chip({ icon: <LocalFireDepartment />, label: spice, color: spiceColor }),
              ];

              const metaChips: ServiceChip[] = [
                ...(cuisine
                  ? [chip({ icon: <Fastfood fontSize="small" />, label: cuisine, color: "secondary" })]
                  : []),

                ...(diet.vegetarian ? [chip({ label: "Vegetarian", color: "success" })] : []),
                ...(diet.vegan ? [chip({ label: "Vegan", color: "success" })] : []),
                ...(diet.glutenFree ? [chip({ label: "Gluten-Free", color: "success" })] : []),
                ...(diet.halal ? [chip({ label: "Halal", color: "success" })] : []),

                ...(allergens ? [chip({ label: "Allergens", color: "warning" })] : []),

                ...(typeof f.preparationTime === "number"
                  ? [chip({ label: `~${f.preparationTime} min` })]
                  : []),

                chip({
                  icon: f.isAvailable ? (
                    <CheckCircle fontSize="small" />
                  ) : (
                    <Cancel fontSize="small" />
                  ),
                  label: f.isAvailable ? "Available" : "Unavailable",
                  color: availabilityColor,
                }),

                ...(f.addons?.length ? [chip({ label: `${f.addons.length} add-ons` })] : []),
              ];

              return (
                <CommonServiceCard
                  key={id || f.name}
                  id={id || f.name || ""}
                  title={f.name || "—"}
                  image={img}
                  topLeftChips={topLeftChips}
                  subtitleChip={
                    f.rating
                      ? chip({
                          icon: <WorkspacePremium />,
                          label: Number(f.rating).toFixed(1),
                          color: "success",
                        })
                      : undefined
                  }
                  descriptionHtml={f.description ?? ""}
                  metaChips={metaChips}
                  footerRightText={f.reviewCount ? `${f.reviewCount} reviews` : ""}
                  editHref="/dashboard/Food-service/editfoodservice"
                  onEdit={() => handleEdit(f)}
                  onDelete={() => {
                    setSelected(f);
                    setConfirmOpen(true);
                  }}
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

      {/* ✅ MARKUP MODAL (Food) */}
      <Dialog
        open={openMarkupModal}
        onClose={closeMarkup}
        fullScreen={isMobile}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Select Food Items
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Select items and continue to apply markup.
              </Typography>
            </Box>

            <Chip label={`Selected: ${selectedFoodIds.length}`} variant="outlined" sx={{ fontWeight: 800 }} />
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
              <TextField
                size="small"
                placeholder="Search food items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: "100%",
                  mb: 2,
                  "& .MuiOutlinedInput-root": { borderRadius: 1.5, height: 40 },
                }}
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
                  {modalFoods.map((f) => {
                    const oid = unwrapId(f._id as any);
                    const checked = selectedFoodIds.includes(oid);

                    return (
                      <Card
                        key={oid || f.name}
                        onClick={() => toggleFoodSelection(oid)}
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
                            image={mainImage({ banner: f.banner ?? undefined, images: f.images })}
                            alt={f.name || "Food"}
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
                            {f.name || "—"}
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
                            {asCategory(f.category)} • {money(f.price)}
                          </Typography>
                        </Box>

                        <Checkbox
                          checked={checked}
                          onChange={() => toggleFoodSelection(oid)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Card>
                    );
                  })}

                  {!modalFoods.length && !modalLoading && (
                    <Box sx={{ gridColumn: "1 / -1", py: 4, textAlign: "center" }}>
                      <Typography color="text.secondary">No food items found.</Typography>
                    </Box>
                  )}
                </Box>
              )}
            </>
          ) : (
            <>
              <Typography sx={{ fontWeight: 900, mb: 0.5 }}>
                Add markup for selected food items
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This will update markup prices for <b>{selectedFoodIds.length}</b> items.
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
              disabled={!selectedFoodIds.length || modalLoading}
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

      {/* Delete Confirmation */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Delete Item</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete <strong>{selected?.name || "this item"}</strong>? This action cannot be undone.
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

export default FoodServicesDashboard;
