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
  WorkspacePremium,
  LocalDining,
  Restaurant,
  LocalFireDepartment,
  Fastfood,
  AddCircleOutline,
  CheckCircle,
  Cancel,
} from "@mui/icons-material";

import {
  useFoodServiceStore,
  type FoodAPIItem,
  type Category,
  type SpiceLevel,
} from "@/store/usefoodservice";

/* ================== Helpers ================== */

const asCategory = (c?: string): Category =>
  (["breakfast","lunch","dinner","snacks","beverages"] as const).includes(c as Category)
    ? (c as Category)
    : "breakfast";

const asSpice = (s?: string): SpiceLevel =>
  (["mild","medium","hot","extra-hot"] as const).includes(s as SpiceLevel)
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

/* ================== Component ================== */
const FoodServicesDashboard: React.FC = () => {
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

  const copyId = async (id?: string) => {
    try {
      if (id) await navigator.clipboard.writeText(id);
    } catch {}
  };

  const handleEdit = (apiItem: FoodAPIItem) => {
    // Store full object so edit page has addonsFull
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

        <Box sx={{ display: "flex", gap: 1, width: { xs: "100%", sm: "auto" } }}>
          <Button
            href="/dashboard/services?type=food-service"
            component={Link as any}
            fullWidth
            variant="outlined"
            startIcon={<AddCircleOutline />}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            Add Services
          </Button>

          <Button
            href="/dashboard/Food-service/addfoodservice"
            component={Link as any}
            fullWidth
            sx={{ width: { xs: "100%", sm: "auto" } }}
            variant="contained"
            startIcon={<AddCircleOutline />}
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
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {filtered.map((f) => {
              const id = unwrapId(f._id as any);
              const price = money(f.price);
              const cuisine = f.cuisine?.join(", ");
              const allergens = f.allergens?.join(", ");
              const diet = f.dietaryInfo || {};
              const spice = asSpice(f.spiceLevel as string);
              const category = asCategory(f.category);

              return (
                <Card key={id || f.name} sx={{ width: 360 }}>
                  <Box sx={{ position: "relative" }}>
                    <CardMedia
                      component="img"
                      image={mainImage({ banner: f.banner ?? undefined, images: f.images })}
                      alt={f.name || "Food item"}
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
                        gap: 0.5,
                        flexWrap: "wrap",
                      }}
                    >
                      <Chip
                        size="small"
                        color="primary"
                        icon={<Restaurant />}
                        label={`${price}`}
                        sx={{ bgcolor: "primary.main", color: "primary.contrastText" }}
                      />
                      {category && (
                        <Chip size="small" icon={<LocalDining />} label={category} />
                      )}
                      {spice && (
                        <Chip
                          size="small"
                          icon={<LocalFireDepartment />}
                          label={spice}
                          color={
                            spice === "hot" || spice === "extra-hot"
                              ? "error"
                              : spice === "medium"
                              ? "warning"
                              : "default"
                          }
                        />
                      )}
                    </Box>
                  </Box>

                  <CardContent sx={{ pb: 1 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="h6" noWrap title={f.name}>
                        {f.name}
                      </Typography>
                      {!!f.rating && (
                        <Chip
                          size="small"
                          color="success"
                          icon={<WorkspacePremium />}
                          label={Number(f.rating).toFixed(1)}
                        />
                      )}
                    </Stack>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      mt={1}
                      sx={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                      title={f.description}
                      // API returns HTML; we keep it raw to preview
                      dangerouslySetInnerHTML={{ __html: f.description ?? "" }}
                    />

                    <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                      {cuisine && <Chip size="small" icon={<Fastfood fontSize="small" />} label={cuisine} />}
                      {diet.vegetarian && <Chip size="small" color="success" label="Vegetarian" />}
                      {diet.vegan && <Chip size="small" color="success" label="Vegan" />}
                      {diet.glutenFree && <Chip size="small" color="success" label="Gluten-Free" />}
                      {diet.halal && <Chip size="small" color="success" label="Halal" />}
                      {allergens && (
                        <Tooltip title={`Allergens: ${allergens}`}>
                          <Chip size="small" color="warning" label="Allergens" />
                        </Tooltip>
                      )}
                      {typeof f.preparationTime === "number" && (
                        <Chip size="small" label={`~${f.preparationTime} min`} />
                      )}
                      <Chip
                        size="small"
                        color={f.isAvailable ? "success" : "default"}
                        icon={f.isAvailable ? <CheckCircle fontSize="small" /> : <Cancel fontSize="small" />}
                        label={f.isAvailable ? "Available" : "Unavailable"}
                      />
                      {!!f.addons?.length && <Chip size="small" label={`${f.addons.length} add-ons`} />}
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2, pt: 0.5 }}>
                    <Stack direction="row" spacing={1}>
                      <Button
                        key="edit"
                        component={Link as any}
                        href={`/dashboard/Food-service/editfoodservice`}
                        onClick={() => handleEdit(f)}
                        size="small"
                      >
                        Edit
                      </Button>
                      <Button
                        color="error"
                        size="small"
                        onClick={() => {
                          setSelected(f);
                          setConfirmOpen(true);
                        }}
                      >
                        Delete
                      </Button>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {f.reviewCount ? `${f.reviewCount} reviews` : ""}
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
